import sys
if sys.platform != "win32":
    print("This application is heavily optimized for Windows and uses Windows-specific APIs.")
    print("It will not run on macOS or Linux.")
    sys.exit(1)

import ctypes
import keyboard
import math
from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QGridLayout, QSystemTrayIcon, QMenu
from PyQt6.QtCore import Qt, QPoint, QRect, QRectF, pyqtSignal, QObject, QTimer, QPointF
from PyQt6.QtGui import QPainter, QPen, QColor, QPainterPath, QPixmap, QIcon

# Windows API constants for click-through
WS_EX_TRANSPARENT = 0x00000020
WS_EX_LAYERED = 0x00080000
GWL_EXSTYLE = -20

class ToolMode:
    PEN = 0
    HIGHLIGHTER = 1
    ERASER = 2
    CURSOR = 3

class BackgroundMode:
    TRANSPARENT = 0
    WHITEBOARD = 1
    BLACKBOARD = 2

# Microsoft Journal inspired color palette
COLORS = [
    "#000000", # Black
    "#FFFFFF", # White
    "#717171", # Gray
    "#FF3B30", # Red
    "#FF9500", # Orange
    "#FFCC00", # Yellow
    "#4CD964", # Green
    "#5AC8FA", # Light Blue
    "#007AFF", # Blue
    "#5856D6", # Purple
    "#FF2D55", # Pink
    "#A2845E"  # Brown
]

class ShortcutSignals(QObject):
    switch_pen = pyqtSignal()
    switch_highlighter = pyqtSignal()
    switch_eraser = pyqtSignal()
    switch_cursor = pyqtSignal()
    clear_screen = pyqtSignal()
    undo = pyqtSignal()
    change_color = pyqtSignal(str)
    toggle_background = pyqtSignal()
    toggle_visibility = pyqtSignal()
    exit_app = pyqtSignal()

class OverlayWindow(QMainWindow):
    def __init__(self, signals):
        super().__init__()
        self.signals = signals
        
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        # Make full screen
        virtual_rect = QRect()
        for screen in QApplication.screens():
            virtual_rect = virtual_rect.united(screen.geometry())
        self.setGeometry(virtual_rect)
        
        # Optimization: O(1) Rendering Cache
        self.canvas_cache = QPixmap(virtual_rect.size())
        self.canvas_cache.fill(Qt.GlobalColor.transparent)
        
        self.mode = ToolMode.PEN
        self.bg_mode = BackgroundMode.TRANSPARENT
        self.is_click_through = False
        self.ink_visible = True
        
        self.pen_color = QColor(COLORS[0])
        self.highlighter_color = QColor(COLORS[5])
        
        self.MAX_UNDO_STEPS = 50
        self.paths = [] # {'path': QPainterPath, 'pen': QPen, 'mode': ToolMode}
        self.current_path = None
        self.last_point = None
        self.raw_points = []
        
        self.drawing = False
        
        # Smart shapes timer
        self.shape_timer = QTimer()
        self.shape_timer.setSingleShot(True)
        self.shape_timer.timeout.connect(self.detect_shape)
        
        # Setup signals
        self.signals.switch_pen.connect(lambda: self.set_mode(ToolMode.PEN))
        self.signals.switch_highlighter.connect(lambda: self.set_mode(ToolMode.HIGHLIGHTER))
        self.signals.switch_eraser.connect(lambda: self.set_mode(ToolMode.ERASER))
        self.signals.switch_cursor.connect(lambda: self.set_mode(ToolMode.CURSOR))
        self.signals.clear_screen.connect(self.clear_screen)
        self.signals.undo.connect(self.undo)
        self.signals.change_color.connect(self.set_color)
        self.signals.toggle_background.connect(self.toggle_background)
        self.signals.toggle_visibility.connect(self.toggle_visibility)
        self.signals.exit_app.connect(QApplication.instance().quit)

        # Set initial cursor
        self.set_mode(ToolMode.PEN)

    def set_mode(self, new_mode):
        self.mode = new_mode
        if new_mode == ToolMode.CURSOR:
            self.set_click_through(True)
            self.setCursor(Qt.CursorShape.ArrowCursor)
        else:
            self.set_click_through(False)
            self.setCursor(Qt.CursorShape.CrossCursor)

    def set_color(self, hex_color):
        if self.mode == ToolMode.HIGHLIGHTER:
            self.highlighter_color = QColor(hex_color)
        else:
            self.pen_color = QColor(hex_color)
            self.set_mode(ToolMode.PEN)

    def toggle_background(self):
        self.bg_mode = (self.bg_mode + 1) % 3
        self.update()

    def toggle_visibility(self):
        self.ink_visible = not self.ink_visible
        self.update()

    def set_click_through(self, enabled):
        if self.is_click_through == enabled:
            return
        self.is_click_through = enabled
        hwnd = int(self.winId())
        ex_style = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
        if enabled:
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_TRANSPARENT | WS_EX_LAYERED)
        else:
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style & ~WS_EX_TRANSPARENT)

    def get_current_pen(self):
        if self.mode == ToolMode.HIGHLIGHTER:
            color = QColor(self.highlighter_color)
            color.setAlpha(60) # Much lower alpha to prevent text blocking
            return QPen(color, 25, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)
        elif self.mode == ToolMode.ERASER:
            return QPen(QColor(255, 255, 255, 255), 30, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)
        else:
            return QPen(self.pen_color, 5, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)

    def rebuild_cache(self):
        """Redraws all completed strokes onto the static pixmap."""
        self.canvas_cache.fill(Qt.GlobalColor.transparent)
        painter = QPainter(self.canvas_cache)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        for p in self.paths:
            if p['mode'] != ToolMode.ERASER:
                painter.setPen(p['pen'])
                painter.drawPath(p['path'])
        painter.end()

    def mousePressEvent(self, event):
        if not self.ink_visible: return
        if event.button() == Qt.MouseButton.LeftButton and not self.is_click_through:
            if self.mode == ToolMode.ERASER:
                self.erase_at(event.position())
            else:
                self.drawing = True
                self.raw_points = [event.position()]
                self.current_path = QPainterPath()
                self.current_path.moveTo(event.position())
                self.last_point = event.position()

    def mouseMoveEvent(self, event):
        if not self.ink_visible: return
        if (event.buttons() & Qt.MouseButton.LeftButton) and not self.is_click_through:
            if self.mode == ToolMode.ERASER:
                self.erase_at(event.position())
            elif self.drawing and self.current_path:
                self.raw_points.append(event.position())
                mid_point = (self.last_point + event.position()) / 2.0
                self.current_path.quadTo(self.last_point, mid_point)
                self.last_point = event.position()
                self.update()
                
                if self.mode == ToolMode.PEN:
                    self.shape_timer.start(400)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.shape_timer.stop()
            if self.drawing and self.current_path:
                self.current_path.lineTo(event.position())
                
                # Enforce Max Undo Steps memory limit
                if len(self.paths) >= self.MAX_UNDO_STEPS:
                    self.paths.pop(0)
                    
                self.paths.append({'path': self.current_path, 'pen': self.get_current_pen(), 'mode': self.mode})
                
                # Incrementally draw on the cache
                painter = QPainter(self.canvas_cache)
                painter.setRenderHint(QPainter.RenderHint.Antialiasing)
                painter.setPen(self.get_current_pen())
                painter.drawPath(self.current_path)
                painter.end()
                
                self.current_path = None
                self.update()
            self.drawing = False

    def erase_at(self, pos):
        # Increased eraser size for better UX
        rect = QRectF(pos.x() - 20, pos.y() - 20, 40, 40)
        removed = False
        
        # Traverse backwards and use fast bounding box rejection
        for i in range(len(self.paths) - 1, -1, -1):
            p = self.paths[i]['path']
            if p.boundingRect().intersects(rect):
                if p.intersects(rect):
                    self.paths.pop(i)
                    removed = True
                    
        if removed:
            self.rebuild_cache()
            self.update()

    def detect_shape(self):
        if not self.drawing or len(self.raw_points) < 10:
            return
            
        start = self.raw_points[0]
        end = self.raw_points[-1]
        
        min_x = min(p.x() for p in self.raw_points)
        max_x = max(p.x() for p in self.raw_points)
        min_y = min(p.y() for p in self.raw_points)
        max_y = max(p.y() for p in self.raw_points)
        width = max_x - min_x
        height = max_y - min_y
        
        path_length = sum(self.distance(self.raw_points[i], self.raw_points[i+1]) for i in range(len(self.raw_points)-1))
        direct_dist = self.distance(start, end)
        
        new_path = QPainterPath()
        
        if direct_dist < max(width, height) * 0.3:
            new_path.addEllipse(QRectF(min_x, min_y, width, height))
            self.replace_current_path(new_path)
            return

        if path_length > 0 and (direct_dist / path_length) > 0.85:
            new_path.moveTo(start)
            new_path.lineTo(end)
            self.replace_current_path(new_path)
            return

    def replace_current_path(self, new_path):
        self.current_path = new_path
        self.update()

    def distance(self, p1, p2):
        return math.hypot(p2.x() - p1.x(), p2.y() - p1.y())

    def paintEvent(self, event):
        painter = QPainter(self)
        
        # 1. Draw Background
        if self.bg_mode == BackgroundMode.WHITEBOARD:
            painter.fillRect(self.rect(), QColor("white"))
        elif self.bg_mode == BackgroundMode.BLACKBOARD:
            painter.fillRect(self.rect(), QColor("#222222"))
            
        if not self.ink_visible:
            return
            
        # 2. Draw Cached Strokes (O(1) operation)
        painter.drawPixmap(0, 0, self.canvas_cache)
        
        # 3. Draw Active Stroke
        if self.drawing and self.current_path:
            painter.setRenderHint(QPainter.RenderHint.Antialiasing)
            painter.setPen(self.get_current_pen())
            painter.drawPath(self.current_path)
            
    def clear_screen(self):
        self.paths.clear()
        self.rebuild_cache()
        self.update()
        
    def undo(self):
        if self.paths:
            self.paths.pop()
            self.rebuild_cache()
            self.update()

class ToolbarWindow(QWidget):
    def __init__(self, signals):
        super().__init__()
        self.signals = signals
        self.setWindowFlags(
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool |
            Qt.WindowType.FramelessWindowHint
        )
        self.setStyleSheet("background-color: #2b2b2b; border-radius: 10px;")
        
        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)
        
        title = QLabel("Epic Pen Clone")
        title.setStyleSheet("color: white; font-weight: bold;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        palette_grid = QGridLayout()
        palette_grid.setSpacing(5)
        for i, color_hex in enumerate(COLORS):
            btn = QPushButton()
            btn.setFixedSize(25, 25)
            btn.setStyleSheet(f"background-color: {color_hex}; border: 1px solid #555; border-radius: 12px;")
            btn.clicked.connect(lambda checked, c=color_hex: self.signals.change_color.emit(c))
            palette_grid.addWidget(btn, i // 4, i % 4)
        layout.addLayout(palette_grid)
        
        self.add_button(layout, "Pen (Ctrl+1)", self.signals.switch_pen.emit)
        self.add_button(layout, "Highlighter (Ctrl+2)", self.signals.switch_highlighter.emit)
        self.add_button(layout, "Eraser (Ctrl+3)", self.signals.switch_eraser.emit)
        self.add_button(layout, "Cursor (Ctrl+4)", self.signals.switch_cursor.emit)
        self.add_button(layout, "Undo (Ctrl+Z)", self.signals.undo.emit)
        self.add_button(layout, "Hide Ink (Ctrl+5)", self.signals.toggle_visibility.emit)
        self.add_button(layout, "Clear (Ctrl+Shift+C)", self.signals.clear_screen.emit)
        self.add_button(layout, "Toggle Whiteboard", self.signals.toggle_background.emit)
        
        btn_close = QPushButton("Exit (Ctrl+Q)")
        btn_close.setStyleSheet("background-color: #ff4444; color: white; padding: 8px; border-radius: 5px;")
        btn_close.clicked.connect(self.signals.exit_app.emit)
        layout.addWidget(btn_close)
        
        self.setLayout(layout)
        self._drag_pos = None

    def add_button(self, layout, text, callback):
        btn = QPushButton(text)
        btn.setStyleSheet("""
            QPushButton { background-color: #444; color: white; padding: 8px; border-radius: 5px; }
            QPushButton:hover { background-color: #555; }
            QPushButton:pressed { background-color: #666; }
        """)
        btn.clicked.connect(callback)
        layout.addWidget(btn)

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_pos = event.globalPosition().toPoint()

    def mouseMoveEvent(self, event):
        if self._drag_pos is not None:
            delta = event.globalPosition().toPoint() - self._drag_pos
            self.move(self.pos() + delta)
            self._drag_pos = event.globalPosition().toPoint()

    def mouseReleaseEvent(self, event):
        self._drag_pos = None

class AppSystemTray(QSystemTrayIcon):
    def __init__(self, signals, parent=None):
        # Create a simple red icon
        pixmap = QPixmap(32, 32)
        pixmap.fill(QColor("#FF3B30"))
        icon = QIcon(pixmap)
        
        super().__init__(icon, parent)
        self.setToolTip("Epic Pen Clone")
        
        menu = QMenu()
        exit_action = menu.addAction("Exit")
        exit_action.triggered.connect(signals.exit_app.emit)
        
        self.setContextMenu(menu)

def setup_global_shortcuts(signals):
    keyboard.add_hotkey('ctrl+1', lambda: signals.switch_pen.emit(), suppress=True)
    keyboard.add_hotkey('ctrl+2', lambda: signals.switch_highlighter.emit(), suppress=True)
    keyboard.add_hotkey('ctrl+3', lambda: signals.switch_eraser.emit(), suppress=True)
    keyboard.add_hotkey('ctrl+4', lambda: signals.switch_cursor.emit(), suppress=True)
    keyboard.add_hotkey('ctrl+5', lambda: signals.toggle_visibility.emit(), suppress=True)
    keyboard.add_hotkey('ctrl+z', lambda: signals.undo.emit(), suppress=True)
    keyboard.add_hotkey('ctrl+shift+c', lambda: signals.clear_screen.emit(), suppress=True)
    keyboard.add_hotkey('ctrl+q', lambda: signals.exit_app.emit(), suppress=True)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    # Ensure app doesn't close if toolbar is hidden but tray is alive
    app.setQuitOnLastWindowClosed(False)
    
    signals = ShortcutSignals()
    
    # System Tray
    tray = AppSystemTray(signals)
    tray.show()
    
    overlay = OverlayWindow(signals)
    overlay.show()
    
    toolbar = ToolbarWindow(signals)
    toolbar.resize(150, 450)
    screen_rect = QApplication.primaryScreen().geometry()
    toolbar.move(screen_rect.width() - 200, 50)
    toolbar.show()
    
    setup_global_shortcuts(signals)
    
    sys.exit(app.exec())
