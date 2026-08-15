"""
Epic Pen Clone — A lightweight screen annotation tool optimized for Windows 11.
Supports pen, highlighter, eraser, shape detection, global shortcuts, and system tray.
"""
import sys
if sys.platform != "win32":
    print("This application is heavily optimized for Windows and uses Windows-specific APIs.")
    print("It will not run on macOS or Linux.")
    sys.exit(1)

import ctypes
import math
import keyboard
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QGridLayout, QSystemTrayIcon, QMenu, QFrame
)
from PyQt6.QtCore import Qt, QPoint, QRect, QRectF, pyqtSignal, QObject, QTimer, QPointF
from PyQt6.QtGui import QPainter, QPen, QColor, QPainterPath, QPixmap, QIcon, QCursor, QFont

# ── Windows API constants for click-through ──
WS_EX_TRANSPARENT = 0x00000020
WS_EX_LAYERED     = 0x00080000
GWL_EXSTYLE       = -20

# ── Enumerations ──
class ToolMode:
    PEN = 0
    HIGHLIGHTER = 1
    ERASER = 2
    CURSOR = 3

class BackgroundMode:
    TRANSPARENT = 0
    WHITEBOARD = 1
    BLACKBOARD = 2

# ── Color palette ──
COLORS = [
    "#000000", "#FFFFFF", "#717171", "#FF3B30",
    "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA",
    "#007AFF", "#5856D6", "#FF2D55", "#A2845E"
]

# ── Signals ──
class ShortcutSignals(QObject):
    switch_pen          = pyqtSignal()
    switch_highlighter  = pyqtSignal()
    switch_eraser       = pyqtSignal()
    switch_cursor       = pyqtSignal()
    clear_screen        = pyqtSignal()
    undo                = pyqtSignal()
    change_color        = pyqtSignal(str)
    toggle_background   = pyqtSignal()
    toggle_visibility   = pyqtSignal()
    exit_app            = pyqtSignal()
    change_pen_size     = pyqtSignal(int)
    change_highlighter_size = pyqtSignal(int)
    change_eraser_size  = pyqtSignal(int)
    increment_size      = pyqtSignal()
    decrement_size      = pyqtSignal()
    toggle_color_palette = pyqtSignal()


# ── Reusable Widgets ──

class HoldButton(QPushButton):
    """QPushButton that emits hold_triggered after a long press (400ms)."""
    hold_triggered = pyqtSignal()

    def __init__(self, icon, tooltip, parent=None):
        super().__init__(icon, parent)
        self.setToolTip(tooltip)
        self.hold_timer = QTimer(self)
        self.hold_timer.setSingleShot(True)
        self.hold_timer.timeout.connect(self._on_hold)
        self._held = False

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self._held = False
            self.hold_timer.start(400)
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.hold_timer.stop()
        super().mouseReleaseEvent(event)

    def _on_hold(self):
        self._held = True
        self.hold_triggered.emit()


class DragHandle(QWidget):
    """Small pill-shaped drag handle for frameless windows."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(40, 12)
        self.setCursor(Qt.CursorShape.OpenHandCursor)

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.setCursor(Qt.CursorShape.ClosedHandCursor)
            self.window()._drag_pos = event.globalPosition().toPoint()
            event.accept()

    def mouseMoveEvent(self, event):
        win = self.window()
        if event.buttons() == Qt.MouseButton.LeftButton and getattr(win, '_drag_pos', None) is not None:
            delta = event.globalPosition().toPoint() - win._drag_pos
            win.move(win.pos() + delta)
            win._drag_pos = event.globalPosition().toPoint()
            event.accept()

    def mouseReleaseEvent(self, event):
        self.setCursor(Qt.CursorShape.OpenHandCursor)
        self.window()._drag_pos = None
        event.accept()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setBrush(QColor('#D6C3A1'))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRoundedRect(QRectF(5, 3, 30, 6), 3, 3)


# ── Main Canvas Overlay ──

class OverlayWindow(QMainWindow):
    MAX_UNDO_STEPS = 50

    def __init__(self, signals):
        super().__init__()
        self.signals = signals

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        # Span all monitors
        virtual_rect = QRect()
        for screen in QApplication.screens():
            virtual_rect = virtual_rect.united(screen.geometry())
        self.setGeometry(virtual_rect)

        # High-DPI aware canvas cache
        dpr = QApplication.primaryScreen().devicePixelRatio()
        self.canvas_cache = QPixmap(int(virtual_rect.width() * dpr), int(virtual_rect.height() * dpr))
        self.canvas_cache.setDevicePixelRatio(dpr)
        self.canvas_cache.fill(Qt.GlobalColor.transparent)

        # Tool state
        self.mode = ToolMode.PEN
        self.bg_mode = BackgroundMode.TRANSPARENT
        self.is_click_through = False
        self.ink_visible = True
        self.shape_detected = False

        # Colors and sizes
        self.pen_color = QColor(COLORS[0])
        self.highlighter_color = QColor(COLORS[5])
        self.pen_size = 5
        self.highlighter_size = 25
        self.eraser_size = 40

        # Stroke data
        self.paths = []
        self.current_path = None
        self.last_point = None
        self.raw_points = []
        self.drawing = False

        # Shape detection timer
        self.shape_timer = QTimer(self)
        self.shape_timer.setSingleShot(True)
        self.shape_timer.timeout.connect(self._detect_shape)

        # Connect signals
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
        self.signals.change_eraser_size.connect(self.set_eraser_size)
        self.signals.increment_size.connect(self._increment_active_tool_size)
        self.signals.decrement_size.connect(self._decrement_active_tool_size)
        self.signals.exit_app.connect(QApplication.instance().quit)

        self.set_mode(ToolMode.PEN)

    # ── Size adjustments ──

    def _increment_active_tool_size(self):
        if self.mode == ToolMode.PEN:
            self.set_pen_size(min(50, self.pen_size + 2))
        elif self.mode == ToolMode.HIGHLIGHTER:
            self.set_highlighter_size(min(100, self.highlighter_size + 5))
        elif self.mode == ToolMode.ERASER:
            self.set_eraser_size(min(200, self.eraser_size + 10))

    def _decrement_active_tool_size(self):
        if self.mode == ToolMode.PEN:
            self.set_pen_size(max(2, self.pen_size - 2))
        elif self.mode == ToolMode.HIGHLIGHTER:
            self.set_highlighter_size(max(5, self.highlighter_size - 5))
        elif self.mode == ToolMode.ERASER:
            self.set_eraser_size(max(10, self.eraser_size - 10))

    def set_pen_size(self, size):
        self.pen_size = size
        self.set_mode(ToolMode.PEN)

    def set_highlighter_size(self, size):
        self.highlighter_size = size
        self.set_mode(ToolMode.HIGHLIGHTER)

    def set_eraser_size(self, size):
        self.eraser_size = size
        self.set_mode(ToolMode.ERASER)

    # ── Cursor rendering ──

    def _update_cursor(self):
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
            painter.setFont(QFont("Segoe UI Emoji", 10))
            painter.drawText(int(center + radius + 2), int(center - radius - 2), "🖊️")

        elif self.mode == ToolMode.HIGHLIGHTER:
            w = max(4.0, float(self.highlighter_size))
            rect = QRectF(center - w / 2, center - w / 2, w, w)
            color = QColor(self.highlighter_color)
            color.setAlpha(200)
            painter.setBrush(color)
            painter.setPen(QPen(QColor("black"), 1))
            painter.drawRoundedRect(rect, 4.0, 4.0)
            painter.setFont(QFont("Segoe UI Emoji", 10))
            painter.drawText(int(center + w / 2 + 2), int(center - w / 2 - 2), "🖍️")

        elif self.mode == ToolMode.ERASER:
            radius = max(5.0, self.eraser_size / 2.0)
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.setPen(QPen(QColor(0, 0, 0, 150), 2))
            painter.drawEllipse(QPointF(center, center), radius, radius)
            painter.setPen(QPen(QColor(255, 255, 255, 150), 1))
            painter.drawEllipse(QPointF(center, center), radius - 1, radius - 1)

        painter.end()
        self.setCursor(QCursor(pixmap, int(center), int(center)))

    # ── Mode / state ──

    def set_mode(self, new_mode):
        self.mode = new_mode
        self.set_click_through(new_mode == ToolMode.CURSOR or not self.ink_visible)
        self._update_cursor()

    def set_color(self, hex_color):
        if self.mode == ToolMode.HIGHLIGHTER:
            self.highlighter_color = QColor(hex_color)
        else:
            self.pen_color = QColor(hex_color)
            self.mode = ToolMode.PEN
            if self.ink_visible:
                self.set_click_through(False)
        self._update_cursor()

    def toggle_background(self):
        self.bg_mode = (self.bg_mode + 1) % 3
        self.update()

    def toggle_visibility(self):
        self.ink_visible = not self.ink_visible
        self.set_click_through(not self.ink_visible or self.mode == ToolMode.CURSOR)
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

    # ── Pen helpers ──

    def _get_current_pen(self):
        if self.mode == ToolMode.HIGHLIGHTER:
            color = QColor(self.highlighter_color)
            color.setAlpha(60)
            return QPen(color, self.highlighter_size, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)
        elif self.mode == ToolMode.ERASER:
            return QPen(QColor(255, 255, 255, 255), self.eraser_size, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)
        else:
            return QPen(self.pen_color, self.pen_size, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)

    @staticmethod
    def _draw_stroke(painter, path, pen, mode):
        """Draw a single stroke with optional pen halo for anti-alias softening."""
        if mode == ToolMode.PEN:
            halo = QPen(pen)
            c = halo.color()
            c.setAlpha(int(c.alpha() * 0.04))
            halo.setColor(c)
            halo.setWidth(halo.width() + 4)
            painter.setPen(halo)
            painter.drawPath(path)
        painter.setPen(pen)
        painter.drawPath(path)

    # ── Cache management ──

    def _rebuild_cache(self):
        dpr = self.canvas_cache.devicePixelRatio()
        sz = self.size()
        self.canvas_cache = QPixmap(int(sz.width() * dpr), int(sz.height() * dpr))
        self.canvas_cache.setDevicePixelRatio(dpr)
        self.canvas_cache.fill(Qt.GlobalColor.transparent)
        painter = QPainter(self.canvas_cache)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        for p in self.paths:
            if p['mode'] != ToolMode.ERASER:
                self._draw_stroke(painter, p['path'], p['pen'], p['mode'])
        painter.end()

    # ── Mouse events ──

    def mousePressEvent(self, event):
        if not self.ink_visible:
            return
        if event.button() == Qt.MouseButton.LeftButton and not self.is_click_through:
            if self.mode != ToolMode.ERASER:
                self.setCursor(Qt.CursorShape.BlankCursor)
            self.shape_detected = False
            if self.mode == ToolMode.ERASER:
                self._erase_at(event.position())
            else:
                self.drawing = True
                self.raw_points = [event.position()]
                self.current_path = QPainterPath()
                self.current_path.moveTo(event.position())
                self.last_point = event.position()

    def mouseMoveEvent(self, event):
        if not self.ink_visible:
            return
        if (event.buttons() & Qt.MouseButton.LeftButton) and not self.is_click_through:
            if self.mode == ToolMode.ERASER:
                self._erase_at(event.position())
            elif self.drawing and self.current_path and not self.shape_detected:
                self.raw_points.append(event.position())
                mid_point = (self.last_point + event.position()) / 2.0
                self.current_path.quadTo(self.last_point, mid_point)

                prev_point = self.raw_points[-2] if len(self.raw_points) > 1 else self.last_point
                self.last_point = event.position()

                padding = max(100.0, float(self._get_current_pen().width() * 4))
                update_rect = QRectF(prev_point, event.position()).normalized()
                update_rect.adjust(-padding, -padding, padding, padding)
                self.update(update_rect.toRect())

                if self.mode == ToolMode.PEN:
                    self.shape_timer.start(400)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.shape_timer.stop()
            self._update_cursor()
            if self.drawing and self.current_path:
                if not self.shape_detected:
                    self.current_path.lineTo(event.position())

                if len(self.paths) >= self.MAX_UNDO_STEPS:
                    self.paths.pop(0)
                self.paths.append({'path': self.current_path, 'pen': self._get_current_pen(), 'mode': self.mode})

                # Bake the new stroke into the cache
                painter = QPainter(self.canvas_cache)
                painter.setRenderHint(QPainter.RenderHint.Antialiasing)
                painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
                self._draw_stroke(painter, self.current_path, self._get_current_pen(), self.mode)
                painter.end()

                self.current_path = None
                self.update()
            self.drawing = False

    # ── Eraser ──

    def _erase_at(self, pos):
        radius = float(self.eraser_size) / 2.0
        rect = QRectF(pos.x() - radius, pos.y() - radius, radius * 2, radius * 2)
        removed = False
        for i in range(len(self.paths) - 1, -1, -1):
            p = self.paths[i]['path']
            if p.boundingRect().intersects(rect) and p.intersects(rect):
                self.paths.pop(i)
                removed = True
        if removed:
            self._rebuild_cache()
            self.update()

    # ── Shape detection ──

    def _detect_shape(self):
        if not self.drawing or len(self.raw_points) < 10:
            return
        start, end = self.raw_points[0], self.raw_points[-1]
        xs = [p.x() for p in self.raw_points]
        ys = [p.y() for p in self.raw_points]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        width, height = max_x - min_x, max_y - min_y

        path_length = sum(
            math.hypot(self.raw_points[i + 1].x() - self.raw_points[i].x(),
                       self.raw_points[i + 1].y() - self.raw_points[i].y())
            for i in range(len(self.raw_points) - 1)
        )
        direct_dist = math.hypot(end.x() - start.x(), end.y() - start.y())

        new_path = QPainterPath()
        # Circle / ellipse detection
        if direct_dist < max(width, height) * 0.3:
            new_path.addEllipse(QRectF(min_x, min_y, width, height))
            self._replace_current_path(new_path)
            return
        # Straight line detection
        if path_length > 0 and (direct_dist / path_length) > 0.85:
            new_path.moveTo(start)
            new_path.lineTo(end)
            self._replace_current_path(new_path)

    def _replace_current_path(self, new_path):
        self.shape_detected = True
        self.current_path = new_path
        self.update()

    # ── Painting ──

    def paintEvent(self, event):
        painter = QPainter(self)
        if self.bg_mode == BackgroundMode.WHITEBOARD:
            painter.fillRect(event.rect(), QColor("white"))
        elif self.bg_mode == BackgroundMode.BLACKBOARD:
            painter.fillRect(event.rect(), QColor("#222222"))
        else:
            painter.fillRect(event.rect(), QColor(0, 0, 0, 2))

        if not self.ink_visible:
            return

        painter.setClipRect(event.rect())
        painter.drawPixmap(0, 0, self.canvas_cache)

        if self.drawing and self.current_path:
            painter.setRenderHint(QPainter.RenderHint.Antialiasing)
            painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
            self._draw_stroke(painter, self.current_path, self._get_current_pen(), self.mode)

    # ── Actions ──

    def clear_screen(self):
        self.paths.clear()
        self._rebuild_cache()
        self.update()

    def undo(self):
        if self.paths:
            self.paths.pop()
            self._rebuild_cache()
            self.update()


# ── Floating Color Palette ──

class FloatingColorPalette(QWidget):
    def __init__(self, signals, parent=None):
        super().__init__(parent)
        self.signals = signals
        self._drag_pos = None

        self.setWindowFlags(
            Qt.WindowType.Tool |
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        layout = QVBoxLayout()
        layout.setContentsMargins(15, 8, 15, 15)

        # Handle
        self.btn_handle = DragHandle(self)
        layout.addWidget(self.btn_handle, alignment=Qt.AlignmentFlag.AlignHCenter)
        layout.addSpacing(5)

        title = QLabel("Colors")
        title.setStyleSheet("color: #333333; font-weight: bold; border: none; font-size: 14px;")
        layout.addWidget(title, alignment=Qt.AlignmentFlag.AlignCenter)

        # Color grid
        self.color_buttons = {}
        palette_grid = QGridLayout()
        palette_grid.setSpacing(8)
        for i, color_hex in enumerate(COLORS):
            btn = QPushButton()
            btn.setFixedSize(28, 28)
            btn.setToolTip("Select Color")
            btn.clicked.connect(lambda checked, c=color_hex: self._select_color(c))
            palette_grid.addWidget(btn, i // 4, i % 4)
            self.color_buttons[color_hex] = btn

        layout.addLayout(palette_grid)
        self.setLayout(layout)

        self.signals.change_color.connect(self._sync_color_selection)
        self._select_color(COLORS[0], emit=False)

    def _select_color(self, hex_color, emit=True):
        if emit:
            self.signals.change_color.emit(hex_color)
        self._sync_color_selection(hex_color)

    def _sync_color_selection(self, hex_color):
        for c, btn in self.color_buttons.items():
            if c == hex_color:
                btn.setStyleSheet(f"background-color: {c}; border-radius: 14px; border: 3px solid #333333;")
            else:
                btn.setStyleSheet(f"background-color: {c}; border-radius: 14px; border: 1px solid #D6C3A1;")

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(QRectF(self.rect()), 20, 20)
        painter.fillPath(path, QColor('#F5E8D5'))
        painter.setPen(QPen(QColor('#D6C3A1'), 1))
        painter.drawPath(path)


# ── Main Toolbar ──

TOOLBAR_STYLESHEET = """
    QPushButton {
        background-color: #E6D5B8; color: #333333;
        border: none; border-radius: 18px; font-size: 18px;
    }
    QPushButton:hover { background-color: #D6C3A1; }
    QPushButton:pressed { background-color: #C6B18D; }
    QPushButton#activeTool { background-color: #B5A07A; border: 2px solid #555555; }
    QToolTip {
        background-color: #333333; color: white;
        border: 1px solid #555; border-radius: 4px; padding: 4px; font-size: 12px;
    }
    QFrame#separator {
        background-color: #D6C3A1; max-height: 2px; min-height: 2px;
        border: none; margin: 4px 10px 4px 10px;
    }
    QMenu { background-color: #F5E8D5; color: #333333; border: 1px solid #D6C3A1; font-size: 14px; }
    QMenu::item { padding: 6px 20px; }
    QMenu::item:selected { background-color: #E6D5B8; }
"""

class ToolbarWindow(QWidget):
    def __init__(self, signals, parent=None):
        super().__init__(parent)
        self.signals = signals
        self.active_tool_btn = None
        self._drag_pos = None

        self.setWindowFlags(
            Qt.WindowType.Tool |
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setStyleSheet(TOOLBAR_STYLESHEET)

        layout = QVBoxLayout()
        layout.setContentsMargins(10, 8, 10, 15)
        layout.setSpacing(10)

        # Handle
        self.btn_handle = DragHandle(self)
        layout.addWidget(self.btn_handle, alignment=Qt.AlignmentFlag.AlignHCenter)
        layout.addSpacing(2)

        # Visibility toggle
        self._add_button(layout, "👁️", "Toggle Ink Visibility (Ctrl+5)", self.signals.toggle_visibility.emit)
        self._add_separator(layout)

        # Tools
        self.btn_pen = self._create_hold_button("🖊️", "Pen (Ctrl+1) - Hold for Size",
            lambda: self._set_active_tool(self.btn_pen, self.signals.switch_pen.emit))
        self._setup_size_menu(self.btn_pen, [2, 5, 10, 15, 20], self.signals.change_pen_size.emit)
        layout.addWidget(self.btn_pen, alignment=Qt.AlignmentFlag.AlignCenter)

        self.btn_hl = self._create_hold_button("🖍️", "Highlighter (Ctrl+2) - Hold for Size",
            lambda: self._set_active_tool(self.btn_hl, self.signals.switch_highlighter.emit))
        self._setup_size_menu(self.btn_hl, [10, 15, 25, 35, 45], self.signals.change_highlighter_size.emit)
        layout.addWidget(self.btn_hl, alignment=Qt.AlignmentFlag.AlignCenter)

        self.btn_eraser = self._create_hold_button("🧽", "Eraser (Ctrl+3) - Hold for Size",
            lambda: self._set_active_tool(self.btn_eraser, self.signals.switch_eraser.emit))
        self._setup_size_menu(self.btn_eraser, [10, 20, 40, 60, 80], self.signals.change_eraser_size.emit)
        layout.addWidget(self.btn_eraser, alignment=Qt.AlignmentFlag.AlignCenter)

        self.btn_cursor = self._create_tool_button("🖱️", "Cursor Mode (Ctrl+4)",
            lambda: self._set_active_tool(self.btn_cursor, self.signals.switch_cursor.emit))
        layout.addWidget(self.btn_cursor, alignment=Qt.AlignmentFlag.AlignCenter)

        self._set_active_tool(self.btn_pen, None)
        self._add_separator(layout)

        # Palette toggle
        self.btn_palette = self._create_tool_button("🎨", "Toggle Colors", self.signals.toggle_color_palette.emit)
        layout.addWidget(self.btn_palette, alignment=Qt.AlignmentFlag.AlignCenter)
        self._add_separator(layout)

        # Actions
        self._add_button(layout, "↩️", "Undo (Ctrl+Z)", self.signals.undo.emit)
        self._add_button(layout, "⬜", "Toggle Whiteboard/Blackboard", self.signals.toggle_background.emit)
        self._add_button(layout, "🗑️", "Clear Screen (Ctrl+Shift+C)", self.signals.clear_screen.emit)

        self.setLayout(layout)

        # Sync active tool from keyboard shortcuts
        self.signals.switch_pen.connect(lambda: self._set_active_tool(self.btn_pen, None))
        self.signals.switch_highlighter.connect(lambda: self._set_active_tool(self.btn_hl, None))
        self.signals.switch_eraser.connect(lambda: self._set_active_tool(self.btn_eraser, None))
        self.signals.switch_cursor.connect(lambda: self._set_active_tool(self.btn_cursor, None))
        self.signals.change_pen_size.connect(lambda _: self._set_active_tool(self.btn_pen, None))
        self.signals.change_highlighter_size.connect(lambda _: self._set_active_tool(self.btn_hl, None))
        self.signals.change_eraser_size.connect(lambda _: self._set_active_tool(self.btn_eraser, None))

    # ── Button factory helpers ──

    def _create_tool_button(self, icon, tooltip, callback):
        btn = QPushButton(icon)
        btn.setFixedSize(36, 36)
        btn.setToolTip(tooltip)
        btn.clicked.connect(callback)
        return btn

    def _create_hold_button(self, icon, tooltip, callback):
        btn = HoldButton(icon, tooltip)
        btn.setFixedSize(36, 36)
        btn.clicked.connect(callback)
        return btn

    def _setup_size_menu(self, btn, sizes, signal_emitter):
        menu = QMenu(self)
        for label, size in zip(["Mini", "Small", "Medium", "Big", "Large"], sizes):
            menu.addAction(label, lambda checked=False, s=size: signal_emitter(s))
        btn.hold_triggered.connect(lambda: menu.exec(btn.mapToGlobal(QPoint(btn.width() + 5, 0))))

    def _set_active_tool(self, btn, callback):
        if self.active_tool_btn:
            self.active_tool_btn.setObjectName("")
            self.active_tool_btn.style().unpolish(self.active_tool_btn)
            self.active_tool_btn.style().polish(self.active_tool_btn)
        self.active_tool_btn = btn
        btn.setObjectName("activeTool")
        btn.style().unpolish(btn)
        btn.style().polish(btn)
        if callback:
            callback()

    def _add_button(self, layout, icon, tooltip, callback):
        btn = QPushButton(icon)
        btn.setFixedSize(36, 36)
        btn.setToolTip(tooltip)
        btn.clicked.connect(callback)
        layout.addWidget(btn, alignment=Qt.AlignmentFlag.AlignCenter)

    @staticmethod
    def _add_separator(layout):
        sep = QFrame()
        sep.setObjectName("separator")
        layout.addWidget(sep)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(QRectF(self.rect()), 20, 20)
        painter.fillPath(path, QColor('#F5E8D5'))
        painter.setPen(QPen(QColor('#D6C3A1'), 1))
        painter.drawPath(path)


# ── System Tray ──

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    import os
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

class AppSystemTray(QSystemTrayIcon):
    def __init__(self, signals, parent=None):
        icon_path = resource_path("app_icon.ico")
        super().__init__(QIcon(icon_path), parent)
        self.setToolTip("Epic Pen Clone")

        menu = QMenu()
        menu.addAction("Toggle Ink Visibility (Ctrl+5)").triggered.connect(signals.toggle_visibility.emit)
        menu.addAction("Clear Screen (Ctrl+Shift+C)").triggered.connect(signals.clear_screen.emit)
        menu.addSeparator()
        menu.addAction("Exit").triggered.connect(signals.exit_app.emit)
        self.setContextMenu(menu)


# ── Global Shortcuts ──

def setup_global_shortcuts(signals):
    hotkeys = {
        'ctrl+1': signals.switch_pen.emit,
        'ctrl+2': signals.switch_highlighter.emit,
        'ctrl+3': signals.switch_eraser.emit,
        'ctrl+4': signals.switch_cursor.emit,
        'ctrl+5': signals.toggle_visibility.emit,
        'ctrl+z': signals.undo.emit,
        'ctrl+shift+c': signals.clear_screen.emit,
        'ctrl+q': signals.exit_app.emit,
        'ctrl+]': signals.increment_size.emit,
        'ctrl+[': signals.decrement_size.emit,
    }
    for combo, callback in hotkeys.items():
        keyboard.add_hotkey(combo, callback, suppress=True)


# ── App Coordinator ──

class MainAppCoordinator(QObject):
    def __init__(self):
        super().__init__()
        self.signals = ShortcutSignals()

        self.tray = AppSystemTray(self.signals)
        self.tray.show()

        self.overlay = OverlayWindow(self.signals)
        self.overlay.show()

        self.toolbar = ToolbarWindow(self.signals, parent=self.overlay)
        self.toolbar.resize(80, 400)
        screen_rect = QApplication.primaryScreen().geometry()
        self.toolbar.move(screen_rect.width() - 100, (screen_rect.height() - 400) // 2)
        self.toolbar.show()

        self.color_palette = FloatingColorPalette(self.signals, parent=self.overlay)
        self.color_palette.resize(150, 150)
        self.color_palette.move(self.toolbar.x() - 180, self.toolbar.y())
        self.color_palette.hide()

        self.signals.toggle_color_palette.connect(self._toggle_palette)
        setup_global_shortcuts(self.signals)

    def _toggle_palette(self):
        self.color_palette.setVisible(not self.color_palette.isVisible())


# ── Entry point ──

if __name__ == '__main__':
    app = QApplication(sys.argv)
    app.setWindowIcon(QIcon(resource_path("app_icon.ico")))
    app.setQuitOnLastWindowClosed(False)
    coordinator = MainAppCoordinator()
    sys.exit(app.exec())
