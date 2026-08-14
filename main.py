import sys
if sys.platform != "win32":
    print("This application is heavily optimized for Windows and uses Windows-specific APIs.")
    print("It will not run on macOS or Linux.")
    sys.exit(1)

import ctypes
import keyboard
import math
from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QGridLayout, QSystemTrayIcon, QMenu, QFrame
from PyQt6.QtCore import Qt, QPoint, QRect, QRectF, pyqtSignal, QObject, QTimer, QPointF
from PyQt6.QtGui import QPainter, QPen, QColor, QPainterPath, QPixmap, QIcon, QCursor, QFont

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

COLORS = [
    "#000000", "#FFFFFF", "#717171", "#FF3B30",
    "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA",
    "#007AFF", "#5856D6", "#FF2D55", "#A2845E"
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
    change_pen_size = pyqtSignal(int)
    change_highlighter_size = pyqtSignal(int)

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
        
        virtual_rect = QRect()
        for screen in QApplication.screens():
            virtual_rect = virtual_rect.united(screen.geometry())
        self.setGeometry(virtual_rect)
        
        self.canvas_cache = QPixmap(virtual_rect.size())
        self.canvas_cache.fill(Qt.GlobalColor.transparent)
        
        self.mode = ToolMode.PEN
        self.bg_mode = BackgroundMode.TRANSPARENT
        self.is_click_through = False
        self.ink_visible = True
        self.shape_detected = False
        
        self.pen_color = QColor(COLORS[0])
        self.highlighter_color = QColor(COLORS[5])
        
        self.pen_size = 5
        self.highlighter_size = 25
        
        self.MAX_UNDO_STEPS = 50
        self.paths = []
        self.current_path = None
        self.last_point = None
        self.raw_points = []
        
        self.drawing = False
        self.shape_timer = QTimer()
        self.shape_timer.setSingleShot(True)
        self.shape_timer.timeout.connect(self.detect_shape)
        
        self.signals.switch_pen.connect(lambda: self.set_mode(ToolMode.PEN))
        self.signals.switch_highlighter.connect(lambda: self.set_mode(ToolMode.HIGHLIGHTER))
        self.signals.switch_eraser.connect(lambda: self.set_mode(ToolMode.ERASER))
        self.signals.switch_cursor.connect(lambda: self.set_mode(ToolMode.CURSOR))
        self.signals.clear_screen.connect(self.clear_screen)
        self.signals.undo.connect(self.undo)
        self.signals.change_color.connect(self.set_color)
        self.signals.toggle_background.connect(self.toggle_background)
        self.signals.toggle_visibility.connect(self.toggle_visibility)
        self.signals.change_pen_size.connect(self.set_pen_size)
        self.signals.change_highlighter_size.connect(self.set_highlighter_size)
        self.signals.exit_app.connect(QApplication.instance().quit)

        self.set_mode(ToolMode.PEN)

    def set_pen_size(self, size):
        self.pen_size = size
        self.set_mode(ToolMode.PEN)
        
    def set_highlighter_size(self, size):
        self.highlighter_size = size
        self.set_mode(ToolMode.HIGHLIGHTER)

    def update_cursor(self):
        if self.is_click_through or self.mode == ToolMode.CURSOR:
            self.setCursor(Qt.CursorShape.ArrowCursor)
            return

        size = 128
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        center = size / 2

        if self.mode == ToolMode.PEN:
            radius = max(2.0, self.pen_size / 2.0)
            painter.setBrush(self.pen_color)
            painter.setPen(QPen(QColor("black"), 1))
            painter.drawEllipse(QPointF(center, center), radius, radius)
            # Draw tiny pen icon
            painter.setPen(QPen(QColor("black"), 1))
            painter.setFont(QFont("Segoe UI Emoji", 10))
            painter.drawText(int(center + radius + 2), int(center - radius - 2), "🖊️")
            
        elif self.mode == ToolMode.HIGHLIGHTER:
            width = max(4.0, float(self.highlighter_size))
            rect = QRectF(center - width/2, center - width/2, width, width)
            color = QColor(self.highlighter_color)
            color.setAlpha(200) 
            painter.setBrush(color)
            painter.setPen(QPen(QColor("black"), 1))
            painter.drawRoundedRect(rect, 4.0, 4.0)
            # Draw tiny highlighter icon
            painter.setPen(QPen(QColor("black"), 1))
            painter.setFont(QFont("Segoe UI Emoji", 10))
            painter.drawText(int(center + width/2 + 2), int(center - width/2 - 2), "🖍️")
            
        elif self.mode == ToolMode.ERASER:
            radius = 40.0 / 2.0
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.setPen(QPen(QColor("black"), 2))
            painter.drawEllipse(QPointF(center, center), radius, radius)
            painter.setPen(QPen(QColor("white"), 1))
            painter.drawEllipse(QPointF(center, center), radius - 1, radius - 1)

        painter.end()
        self.setCursor(QCursor(pixmap, int(center), int(center)))

    def set_mode(self, new_mode):
        self.mode = new_mode
        if new_mode == ToolMode.CURSOR or not self.ink_visible:
            self.set_click_through(True)
        else:
            self.set_click_through(False)
        self.update_cursor()

    def set_color(self, hex_color):
        if self.mode == ToolMode.HIGHLIGHTER:
            self.highlighter_color = QColor(hex_color)
        else:
            self.pen_color = QColor(hex_color)
            self.mode = ToolMode.PEN
            if self.ink_visible:
                self.set_click_through(False)
        self.update_cursor()

    def toggle_background(self):
        self.bg_mode = (self.bg_mode + 1) % 3
        self.update()

    def toggle_visibility(self):
        self.ink_visible = not self.ink_visible
        if self.ink_visible:
            self.set_click_through(self.mode == ToolMode.CURSOR)
        else:
            self.set_click_through(True)
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
            color.setAlpha(60)
            return QPen(color, self.highlighter_size, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)
        elif self.mode == ToolMode.ERASER:
            return QPen(QColor(255, 255, 255, 255), 30, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)
        else:
            return QPen(self.pen_color, self.pen_size, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)

    def rebuild_cache(self):
        self.canvas_cache.fill(Qt.GlobalColor.transparent)
        painter = QPainter(self.canvas_cache)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        for p in self.paths:
            if p['mode'] != ToolMode.ERASER:
                painter.setPen(p['pen'])
                painter.drawPath(p['path'])
        painter.end()

    def mousePressEvent(self, event):
        if not self.ink_visible: return
        if event.button() == Qt.MouseButton.LeftButton and not self.is_click_through:
            self.setCursor(Qt.CursorShape.BlankCursor)
            self.shape_detected = False
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
                if self.shape_detected:
                    return
                self.raw_points.append(event.position())
                
                mid_point = (self.last_point + event.position()) / 2.0
                self.current_path.quadTo(self.last_point, mid_point)
                self.last_point = event.position()
                
                # Large padding to ensure curves and thick strokes are never clipped during drawing
                padding = max(100.0, float(self.get_current_pen().width() * 4))
                update_rect = QRectF(self.last_point, event.position()).normalized()
                update_rect.adjust(-padding, -padding, padding, padding)
                self.update(update_rect.toRect())
                
                if self.mode == ToolMode.PEN:
                    self.shape_timer.start(400)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.shape_timer.stop()
            self.update_cursor()
            if self.drawing and self.current_path:
                if not self.shape_detected:
                    self.current_path.lineTo(event.position())
                
                if len(self.paths) >= self.MAX_UNDO_STEPS:
                    self.paths.pop(0)
                self.paths.append({'path': self.current_path, 'pen': self.get_current_pen(), 'mode': self.mode})
                
                painter = QPainter(self.canvas_cache)
                painter.setRenderHint(QPainter.RenderHint.Antialiasing)
                painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
                painter.setPen(self.get_current_pen())
                painter.drawPath(self.current_path)
                painter.end()
                
                self.current_path = None
                self.update()
            self.drawing = False

    def erase_at(self, pos):
        rect = QRectF(pos.x() - 20, pos.y() - 20, 40, 40)
        removed = False
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
        if not self.drawing or len(self.raw_points) < 10: return
        start, end = self.raw_points[0], self.raw_points[-1]
        min_x = min(p.x() for p in self.raw_points)
        max_x = max(p.x() for p in self.raw_points)
        min_y = min(p.y() for p in self.raw_points)
        max_y = max(p.y() for p in self.raw_points)
        width, height = max_x - min_x, max_y - min_y
        
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
        self.shape_detected = True
        self.current_path = new_path
        self.update()

    def distance(self, p1, p2):
        return math.hypot(p2.x() - p1.x(), p2.y() - p1.y())

    def paintEvent(self, event):
        painter = QPainter(self)
        if self.bg_mode == BackgroundMode.WHITEBOARD:
            painter.fillRect(event.rect(), QColor("white"))
        elif self.bg_mode == BackgroundMode.BLACKBOARD:
            painter.fillRect(event.rect(), QColor("#222222"))
        else:
            painter.fillRect(event.rect(), QColor(0, 0, 0, 2))
            
        if not self.ink_visible: return
            
        painter.drawPixmap(0, 0, self.canvas_cache)
        if self.drawing and self.current_path:
            painter.setRenderHint(QPainter.RenderHint.Antialiasing)
            painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
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
    def __init__(self, signals, parent=None):
        super().__init__(parent)
        self.signals = signals
        self.active_tool_btn = None
        
        self.setWindowFlags(
            Qt.WindowType.Tool |
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint
        )
        
        self.setStyleSheet("""
            QWidget {
                background-color: #F5E8D5;
                border-radius: 20px;
            }
            QPushButton {
                background-color: #E6D5B8;
                color: #333333;
                border: none;
                border-radius: 18px;
                font-size: 18px;
            }
            QPushButton:hover {
                background-color: #D6C3A1;
            }
            QPushButton:pressed {
                background-color: #C6B18D;
            }
            QPushButton#activeTool {
                background-color: #B5A07A;
                border: 2px solid #555555;
            }
            QToolTip {
                background-color: #333333;
                color: white;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 4px;
                font-size: 12px;
            }
            QFrame#separator {
                background-color: #D6C3A1;
                max-height: 2px;
                min-height: 2px;
                border: none;
                margin: 4px 10px 4px 10px;
            }
            QMenu {
                background-color: #F5E8D5;
                color: #333333;
                border: 1px solid #D6C3A1;
                font-size: 14px;
            }
            QMenu::item {
                padding: 6px 20px 6px 20px;
            }
            QMenu::item:selected {
                background-color: #E6D5B8;
            }
        """)
        
        layout = QVBoxLayout()
        layout.setContentsMargins(10, 15, 10, 15)
        layout.setSpacing(10)
        
        # --- SECTION 1: TOOLS ---
        self.btn_pen = self.create_tool_button("🖊️", "Pen (Ctrl+1) - Right-click for Size", lambda: self.set_active_tool(self.btn_pen, self.signals.switch_pen.emit))
        pen_menu = QMenu(self)
        pen_menu.addAction("Mini", lambda: self.signals.change_pen_size.emit(2))
        pen_menu.addAction("Small", lambda: self.signals.change_pen_size.emit(5))
        pen_menu.addAction("Medium", lambda: self.signals.change_pen_size.emit(10))
        pen_menu.addAction("Big", lambda: self.signals.change_pen_size.emit(15))
        pen_menu.addAction("Large", lambda: self.signals.change_pen_size.emit(20))
        self.btn_pen.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.btn_pen.customContextMenuRequested.connect(lambda pos: pen_menu.exec(self.btn_pen.mapToGlobal(pos)))
        layout.addWidget(self.btn_pen, alignment=Qt.AlignmentFlag.AlignCenter)

        self.btn_hl = self.create_tool_button("🖍️", "Highlighter (Ctrl+2) - Right-click for Size", lambda: self.set_active_tool(self.btn_hl, self.signals.switch_highlighter.emit))
        hl_menu = QMenu(self)
        hl_menu.addAction("Mini", lambda: self.signals.change_highlighter_size.emit(10))
        hl_menu.addAction("Small", lambda: self.signals.change_highlighter_size.emit(15))
        hl_menu.addAction("Medium", lambda: self.signals.change_highlighter_size.emit(25))
        hl_menu.addAction("Big", lambda: self.signals.change_highlighter_size.emit(35))
        hl_menu.addAction("Large", lambda: self.signals.change_highlighter_size.emit(45))
        self.btn_hl.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.btn_hl.customContextMenuRequested.connect(lambda pos: hl_menu.exec(self.btn_hl.mapToGlobal(pos)))
        layout.addWidget(self.btn_hl, alignment=Qt.AlignmentFlag.AlignCenter)
        
        self.btn_eraser = self.create_tool_button("🧽", "Eraser (Ctrl+3)", lambda: self.set_active_tool(self.btn_eraser, self.signals.switch_eraser.emit))
        layout.addWidget(self.btn_eraser, alignment=Qt.AlignmentFlag.AlignCenter)
        
        self.btn_cursor = self.create_tool_button("🖱️", "Cursor Mode (Ctrl+4)", lambda: self.set_active_tool(self.btn_cursor, self.signals.switch_cursor.emit))
        layout.addWidget(self.btn_cursor, alignment=Qt.AlignmentFlag.AlignCenter)
        
        # Set Pen as default active
        self.set_active_tool(self.btn_pen, None)
        
        # Separator
        sep1 = QFrame()
        sep1.setObjectName("separator")
        layout.addWidget(sep1)

        # --- SECTION 2: COLORS ---
        self.color_buttons = {}
        palette_grid = QGridLayout()
        palette_grid.setSpacing(4)
        for i, color_hex in enumerate(COLORS):
            btn = QPushButton()
            btn.setFixedSize(24, 24)
            btn.setToolTip("Select Color")
            btn.clicked.connect(lambda checked, c=color_hex: self.select_color(c))
            palette_grid.addWidget(btn, i // 4, i % 4)
            self.color_buttons[color_hex] = btn
        layout.addLayout(palette_grid)
        self.select_color(COLORS[0], emit=False)
        
        # Separator
        sep2 = QFrame()
        sep2.setObjectName("separator")
        layout.addWidget(sep2)

        # --- SECTION 3: ACTIONS ---
        self.add_button(layout, "↩️", "Undo (Ctrl+Z)", self.signals.undo.emit)
        self.add_button(layout, "👁️", "Toggle Ink Visibility (Ctrl+5)", self.signals.toggle_visibility.emit)
        self.add_button(layout, "⬜", "Toggle Whiteboard/Blackboard", self.signals.toggle_background.emit)
        self.add_button(layout, "🗑️", "Clear Screen (Ctrl+Shift+C)", self.signals.clear_screen.emit)
        
        btn_close = QPushButton("❌")
        btn_close.setFixedSize(36, 36)
        btn_close.setToolTip("Exit App (Ctrl+Q)")
        btn_close.setStyleSheet("background-color: #ff4d4d; color: white; border-radius: 18px; font-size: 14px;")
        btn_close.clicked.connect(self.signals.exit_app.emit)
        layout.addWidget(btn_close, alignment=Qt.AlignmentFlag.AlignCenter)
        
        self.setLayout(layout)
        self._drag_pos = None
        
        # Connect signals for shortcut sync
        self.signals.switch_pen.connect(lambda: self.set_active_tool(self.btn_pen, None))
        self.signals.switch_highlighter.connect(lambda: self.set_active_tool(self.btn_hl, None))
        self.signals.switch_eraser.connect(lambda: self.set_active_tool(self.btn_eraser, None))
        self.signals.switch_cursor.connect(lambda: self.set_active_tool(self.btn_cursor, None))
        self.signals.change_pen_size.connect(lambda size: self.set_active_tool(self.btn_pen, None))
        self.signals.change_highlighter_size.connect(lambda size: self.set_active_tool(self.btn_hl, None))

    def create_tool_button(self, icon, tooltip, callback):
        btn = QPushButton(icon)
        btn.setFixedSize(36, 36)
        btn.setToolTip(tooltip)
        btn.clicked.connect(callback)
        return btn

    def set_active_tool(self, btn, callback):
        if self.active_tool_btn:
            self.active_tool_btn.setObjectName("")
            self.active_tool_btn.style().unpolish(self.active_tool_btn)
            self.active_tool_btn.style().polish(self.active_tool_btn)
            
        self.active_tool_btn = btn
        self.active_tool_btn.setObjectName("activeTool")
        self.active_tool_btn.style().unpolish(self.active_tool_btn)
        self.active_tool_btn.style().polish(self.active_tool_btn)
        
        if callback:
            callback()

    def select_color(self, hex_color, emit=True):
        if emit:
            self.signals.change_color.emit(hex_color)
        for c, btn in self.color_buttons.items():
            if c == hex_color:
                btn.setStyleSheet(f"background-color: {c}; border-radius: 12px; border: 2px solid #333333;")
            else:
                btn.setStyleSheet(f"background-color: {c}; border-radius: 12px; border: 1px solid #D6C3A1;")

    def add_button(self, layout, icon, tooltip, callback):
        btn = QPushButton(icon)
        btn.setFixedSize(36, 36)
        btn.setToolTip(tooltip)
        btn.clicked.connect(callback)
        layout.addWidget(btn, alignment=Qt.AlignmentFlag.AlignCenter)

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
        pixmap = QPixmap(32, 32)
        pixmap.fill(QColor("#FF3B30"))
        icon = QIcon(pixmap)
        
        super().__init__(icon, parent)
        self.setToolTip("Epic Pen Clone")
        
        menu = QMenu()
        
        toggle_action = menu.addAction("Toggle Ink Visibility (Ctrl+5)")
        toggle_action.triggered.connect(signals.toggle_visibility.emit)
        
        clear_action = menu.addAction("Clear Screen (Ctrl+Shift+C)")
        clear_action.triggered.connect(signals.clear_screen.emit)
        
        menu.addSeparator()
        
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
    app.setQuitOnLastWindowClosed(False)
    
    signals = ShortcutSignals()
    
    tray = AppSystemTray(signals)
    tray.show()
    
    overlay = OverlayWindow(signals)
    overlay.show()
    
    toolbar = ToolbarWindow(signals, parent=overlay)
    toolbar.resize(80, 500)
    screen_rect = QApplication.primaryScreen().geometry()
    toolbar.move(screen_rect.width() - 100, (screen_rect.height() - 500) // 2)
    toolbar.show()
    
    setup_global_shortcuts(signals)
    
    sys.exit(app.exec())
