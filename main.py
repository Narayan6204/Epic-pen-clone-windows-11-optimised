"""
Pen 11 — A lightweight screen annotation tool optimized for Windows 11.
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
import os
import gc
from storage import SettingsManager
from process_manager import SingleInstanceGuard

# ── Windows 11 Optimization (Hardware & Process) ──
if sys.platform == "win32":
    try:
        # Force Direct3D 11 backend for PyQt6 RHI
        os.environ["QSG_RHI_BACKEND"] = "d3d11"
        
        # 1. Enable Per-Monitor V2 DPI Awareness for crisp UI
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
        
        # 2. Elevate Process Priority to HIGH_PRIORITY_CLASS to prevent lag
        kernel32 = ctypes.windll.kernel32
        HIGH_PRIORITY_CLASS = 0x00000080
        kernel32.SetPriorityClass(kernel32.GetCurrentProcess(), HIGH_PRIORITY_CLASS)
    except Exception as e:
        print(f"Warning: Optimization setup failed: {e}")

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QGridLayout, QSystemTrayIcon, QMenu, QFrame,
    QGraphicsDropShadowEffect, QMessageBox, QGraphicsOpacityEffect
)
from PyQt6.QtCore import Qt, QPoint, QRect, QRectF, pyqtSignal, QObject, QTimer, QPointF, QPropertyAnimation, QEasingCurve
from PyQt6.QtGui import QPainter, QPen, QColor, QPainterPath, QPainterPathStroker, QPixmap, QIcon, QCursor, QFont, QTransform, QPolygonF

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
    SHAPE = 4
    SELECT = 5

class ShapeType:
    LINE = "Line"
    ARROW = "Arrow"
    RECTANGLE = "Rectangle"
    ROUNDED_RECTANGLE = "Rounded Rectangle"
    TRIANGLE = "Triangle"
    CIRCLE = "Circle"

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

COLOR_NAMES = {
    "#000000": "Black", "#FFFFFF": "White", "#717171": "Gray", "#FF3B30": "Red",
    "#FF9500": "Orange", "#FFCC00": "Yellow", "#4CD964": "Green", "#5AC8FA": "Light Blue",
    "#007AFF": "Blue", "#5856D6": "Purple", "#FF2D55": "Pink", "#A2845E": "Brown"
}

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
    visibility_changed  = pyqtSignal(bool)
    exit_app            = pyqtSignal()
    change_pen_size     = pyqtSignal(int)
    change_highlighter_size = pyqtSignal(int)
    change_eraser_size  = pyqtSignal(int)
    increment_size      = pyqtSignal()
    decrement_size      = pyqtSignal()
    toolbar_expanded    = pyqtSignal()   # Fired when toolbar finishes expanding
    toggle_color_palette = pyqtSignal()
    switch_shape        = pyqtSignal(str)
    toggle_shape_toolbox = pyqtSignal()
    switch_select       = pyqtSignal()
    toolbar_moved       = pyqtSignal(QPoint)


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


def create_shape_icon(shape_type, size=32):
    pixmap = QPixmap(size, size)
    pixmap.fill(Qt.GlobalColor.transparent)
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    
    # Use a crisp dark gray for icons
    pen = QPen(QColor("#333333"), 2, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)
    painter.setPen(pen)
    
    if shape_type == ShapeType.LINE:
        painter.drawLine(6, 26, 26, 6)
    elif shape_type == ShapeType.ARROW:
        painter.drawLine(6, 26, 24, 8)
        painter.drawLine(24, 8, 14, 8)
        painter.drawLine(24, 8, 24, 18)
    elif shape_type == ShapeType.RECTANGLE:
        painter.drawRect(6, 8, 20, 16)
    elif shape_type == ShapeType.ROUNDED_RECTANGLE:
        painter.drawRoundedRect(6, 8, 20, 16, 4, 4)
    elif shape_type == ShapeType.CIRCLE:
        painter.drawEllipse(4, 4, 24, 24)
    elif shape_type == ShapeType.TRIANGLE:
        path = QPainterPath()
        path.moveTo(16, 6)
        path.lineTo(28, 26)
        path.lineTo(4, 26)
        path.closeSubpath()
        painter.drawPath(path)
        
    painter.end()
    return QIcon(pixmap)


class CustomHoverMenu(QWidget):
    def __init__(self, parent=None):
        # Must pass no parent (or a dummy) so it can be a top-level tool window
        super().__init__(None)
        self.setWindowFlags(Qt.WindowType.Tool | Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setStyleSheet(TOOLBAR_STYLESHEET)
        
        # Setup Fade Animation (Using windowOpacity to prevent Top-Level crashes)
        self.setWindowOpacity(1.0)
        self.fade_anim = QPropertyAnimation(self, b"windowOpacity", self)
        self.fade_anim.setDuration(150)
        self.fade_anim.setEasingCurve(QEasingCurve.Type.InOutQuad)
        self.fade_anim.finished.connect(self._on_fade_finished)
        
        self.layout = QGridLayout(self)
        self.layout.setContentsMargins(15, 15, 15, 15)
        self.layout.setSpacing(8)
        self.layout.setSpacing(8)

    def clear_actions(self):
        while self.layout.count():
            item = self.layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

    def add_action(self, icon_or_text, tooltip, callback):
        btn = QPushButton()
        if isinstance(icon_or_text, str):
            btn.setText(icon_or_text)
        else:
            btn.setIcon(icon_or_text)
            btn.setIconSize(QPixmap(24, 24).size())
            
        btn.setFixedSize(36, 36)
        btn.setToolTip(tooltip)
        btn.clicked.connect(callback)
        btn.clicked.connect(self.hide_menu)
        
        idx = self.layout.count()
        self.layout.addWidget(btn, idx // 2, idx % 2)
        return btn

    # Removed enterEvent and leaveEvent to prevent accidental closing with pen tablets.

    def show_menu(self, anchor_widget):
        self.adjustSize()
        # Position menu to the left of the anchor button with minimal gap
        global_pos = anchor_widget.mapToGlobal(QPoint(-self.width() - 5, 0))
        self.move(global_pos)
        
        self.fade_anim.stop()
        self.setWindowOpacity(0.0)
        self.show()
        
        self.fade_anim.setStartValue(0.0)
        self.fade_anim.setEndValue(1.0)
        self.fade_anim.start()

    def hide_menu(self):
        """Smoothly fade out the menu before hiding it."""
        self.fade_anim.stop()
        self.fade_anim.setStartValue(self.windowOpacity())
        self.fade_anim.setEndValue(0.0)
        self.fade_anim.start()

    def instant_hide(self):
        """Immediately hide without animation (used during canvas hide)."""
        self.fade_anim.stop()
        self.setWindowOpacity(1.0)
        self.hide()

    def _on_fade_finished(self):
        """Called when any fade animation completes. Only hide if we faded OUT."""
        if self.fade_anim.endValue() == 0.0:
            self.hide()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(QRectF(self.rect()), 20, 20)
        painter.fillPath(path, QColor('#F5E8D5'))
        painter.setPen(QPen(QColor('#D6C3A1'), 1))
        painter.drawPath(path)

class FloatingShapeToolbox(QWidget):
    def __init__(self, signals, overlay_window, parent=None):
        super().__init__(parent)
        self.signals = signals
        self.overlay_window = overlay_window
        self._drag_pos = None
        self.has_been_dragged = False
        self._fade_state = 0  # 0=hidden, 1=fading_in, 2=visible, 3=fading_out

        self.setWindowFlags(
            Qt.WindowType.Tool |
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        # Fade animation — safe on Qt.WindowType.Tool windows
        self._opacity_anim = QPropertyAnimation(self, b"windowOpacity")
        self._opacity_anim.setEasingCurve(QEasingCurve.Type.InOutSine)
        self._opacity_anim.finished.connect(self._on_fade_finished)

        layout = QVBoxLayout()
        layout.setContentsMargins(15, 8, 15, 15)

        # Handle
        self.btn_handle = DragHandle(self)
        layout.addWidget(self.btn_handle, alignment=Qt.AlignmentFlag.AlignHCenter)
        layout.addSpacing(5)

        title = QLabel("Shapes & Tools")
        title.setStyleSheet("color: #333333; font-weight: bold; border: none; font-size: 14px;")
        layout.addWidget(title, alignment=Qt.AlignmentFlag.AlignCenter)

        # Grid for tools
        self.grid = QGridLayout()
        self.grid.setSpacing(8)
        self.buttons = []
        
        # Add Select Tool
        self.add_action("↖️", "Select & Transform", lambda: self.signals.switch_select.emit())
        
        shapes = [
            ("📏", "Line", ShapeType.LINE),
            ("↗️", "Arrow", ShapeType.ARROW),
            ("⬛", "Rectangle", ShapeType.RECTANGLE),
            ("🟩", "Rounded Rectangle", ShapeType.ROUNDED_RECTANGLE),
            ("🟡", "Circle", ShapeType.CIRCLE),
            ("🔺", "Triangle", ShapeType.TRIANGLE),
        ]
        for icon, name, stype in shapes:
            self.add_action(icon, name, lambda checked=False, s=stype: self.signals.switch_shape.emit(s))

        layout.addLayout(self.grid)
        self.setLayout(layout)

    def fade_in(self):
        """Fade the panel in smoothly."""
        if self._fade_state in (1, 2):  # Already visible or fading in
            return
        self._fade_state = 1
        self._opacity_anim.stop()
        self.setWindowOpacity(0.0)
        super().show()
        self._opacity_anim.setDuration(180)
        self._opacity_anim.setStartValue(0.0)
        self._opacity_anim.setEndValue(1.0)
        self._opacity_anim.start()

    def fade_out(self):
        """Fade the panel out smoothly, then hide."""
        if self._fade_state in (0, 3):  # Already hidden or fading out
            return
        self._fade_state = 3
        self._opacity_anim.stop()
        self._opacity_anim.setDuration(120)
        self._opacity_anim.setStartValue(self.windowOpacity())
        self._opacity_anim.setEndValue(0.0)
        self._opacity_anim.start()

    def instant_hide(self):
        """Immediately hide without animation (used during canvas hide)."""
        self._opacity_anim.stop()
        self._fade_state = 0
        self.setWindowOpacity(1.0)
        super().hide()

    def _on_fade_finished(self):
        if self._fade_state == 1:   # Finished fading in
            self._fade_state = 2
        elif self._fade_state == 3: # Finished fading out
            self._fade_state = 0
            self.setWindowOpacity(1.0)
            super().hide()

    def add_action(self, icon, tooltip, callback):
        btn = QPushButton(icon)
        btn.setFixedSize(36, 36)
        btn.setToolTip(tooltip)
        btn.clicked.connect(callback)
        btn.setStyleSheet(TOOLBAR_STYLESHEET)
        
        idx = len(self.buttons)
        self.grid.addWidget(btn, idx // 2, idx % 2)
        self.buttons.append(btn)
        return btn

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(QRectF(self.rect()), 20, 20)
        painter.fillPath(path, QColor('#F5E8D5'))
        painter.setPen(QPen(QColor('#D6C3A1'), 1))
        painter.drawPath(path)


class ClickMenuButton(QPushButton):
    def __init__(self, icon, tooltip, parent=None):
        super().__init__(icon, parent)
        self.setToolTip(tooltip)
        self.menu_widget = None
        self.clicked.connect(self._toggle_menu)

    def set_menu(self, menu_widget):
        self.menu_widget = menu_widget

    def _toggle_menu(self):
        if self.text() == "🙈":
            if hasattr(self.window(), 'signals'):
                self.window().signals.toggle_visibility.emit()
            return
            
        if self.menu_widget:
            if self.menu_widget.isVisible():
                self.menu_widget.hide_menu()
            else:
                self.menu_widget.show_menu(self)


class DragHandle(QWidget):

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(40, 12)
        self.setCursor(Qt.CursorShape.OpenHandCursor)
        self._drag_pos = None

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.setCursor(Qt.CursorShape.ClosedHandCursor)
            self._drag_pos = event.globalPosition().toPoint()
            event.accept()

    def mouseMoveEvent(self, event):
        if self._drag_pos is not None:
            delta = event.globalPosition().toPoint() - self._drag_pos
            self.parent().move(self.parent().pos() + delta)
            self._drag_pos = event.globalPosition().toPoint()
            self.parent().has_been_dragged = True
            
            if hasattr(self.parent(), 'signals') and hasattr(self.parent().signals, 'toolbar_moved'):
                self.parent().signals.toolbar_moved.emit(delta)
            event.accept()

    def mouseReleaseEvent(self, event):
        self.setCursor(Qt.CursorShape.OpenHandCursor)
        self._drag_pos = None
        event.accept()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setBrush(QColor('#D6C3A1'))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRoundedRect(QRectF(5, 3, 30, 6), 3, 3)


# ── Main Canvas Overlay ──

class OverlayWindow(QMainWindow):
    MAX_UNDO_STEPS = 5000
    MAX_STROKES = 50000

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

        # Span all monitors
        virtual_rect = QRect()
        for screen in QApplication.screens():
            virtual_rect = virtual_rect.united(screen.geometry())
        self.setGeometry(virtual_rect)

        # Tool state
        self.mode = ToolMode.PEN
        self.bg_mode = BackgroundMode.TRANSPARENT
        self.is_click_through = False
        self.ink_visible = True
        self.shape_detected = False
        self.current_shape = ShapeType.LINE

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
        self.undo_stack_size = 0

        # Shape detection timer
        self.shape_timer = QTimer(self)
        self.shape_timer.setSingleShot(True)
        self.shape_timer.timeout.connect(self._detect_shape)

        # Select state
        self.selected_path_indices = []
        self.master_obb = None
        self.selection_start_master_obb = None
        self.is_lassoing = False
        self.lasso_path = None
        self.selection_action = None # None, 'drag', 'rotate'
        self.selection_start_pos = None
        self.selection_start_path = None
        self.selection_start_center = None
        self.selection_rotation_start_angle = 0

        # Connect signals
        self.signals.switch_pen.connect(lambda: self.set_mode(ToolMode.PEN))
        self.signals.switch_highlighter.connect(lambda: self.set_mode(ToolMode.HIGHLIGHTER))
        self.signals.switch_eraser.connect(lambda: self.set_mode(ToolMode.ERASER))
        self.signals.switch_cursor.connect(lambda: self.set_mode(ToolMode.CURSOR))
        self.signals.switch_select.connect(lambda: self.set_mode(ToolMode.SELECT))
        self.signals.clear_screen.connect(self.clear_screen)
        self.signals.undo.connect(self.undo)
        self.signals.change_color.connect(self.set_color)
        self.signals.toggle_background.connect(self.toggle_background)
        self.signals.toggle_visibility.connect(self.toggle_visibility)
        self.signals.switch_shape.connect(self.set_shape)
        self.signals.change_pen_size.connect(self.set_pen_size)
        self.signals.change_highlighter_size.connect(self.set_highlighter_size)
        self.signals.change_eraser_size.connect(self.set_eraser_size)
        self.signals.increment_size.connect(self._increment_active_tool_size)
        self.signals.decrement_size.connect(self._decrement_active_tool_size)
        # Exit app signal is now handled by MainAppCoordinator for clean shutdown

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
        if self.mode == ToolMode.SHAPE:
            self.setCursor(Qt.CursorShape.CrossCursor)
            return
        if self.mode == ToolMode.SELECT:
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
        # Rule 5: Only PEN and HIGHLIGHTER shortcuts can activate a hidden canvas
        if not self.ink_visible and new_mode in (ToolMode.PEN, ToolMode.HIGHLIGHTER):
            self.toggle_visibility()
            
        # Rule 2: Block cursor mode when canvas is hidden
        if not self.ink_visible and new_mode == ToolMode.CURSOR:
            return
            
        if self.mode == ToolMode.SELECT and new_mode != ToolMode.SELECT:
            self.selected_path_indices.clear()
            self._recalculate_master_obb()
            self.is_lassoing = False
            self.lasso_path = None
            self.update()
        self.mode = new_mode
        self.set_click_through(new_mode == ToolMode.CURSOR or not self.ink_visible)
        self._update_cursor()

    def set_shape(self, shape_type):
        self.current_shape = shape_type
        self.set_mode(ToolMode.SHAPE)

    def set_color(self, hex_color):
        if self.mode == ToolMode.SELECT and self.selected_path_indices:
            # Change color of selected object
            for idx in self.selected_path_indices:
                if idx < len(self.paths):
                    self.paths[idx]['pen'].setColor(QColor(hex_color))
            self.update()
            return

        if self.mode == ToolMode.HIGHLIGHTER:
            self.highlighter_color = QColor(hex_color)
        else:
            self.pen_color = QColor(hex_color)
        self._update_cursor()

    def toggle_background(self):
        self.bg_mode = (self.bg_mode + 1) % 3
        self.update()

    def toggle_visibility(self):
        self.ink_visible = not self.ink_visible
        if self.ink_visible and self.mode == ToolMode.CURSOR:
            self.set_mode(ToolMode.PEN)
        self.set_click_through(not self.ink_visible or self.mode == ToolMode.CURSOR)
        self.signals.visibility_changed.emit(self.ink_visible)
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

    def _build_shape_path(self, start_pt, end_pt, shape_type, shift_held):
        path = QPainterPath()
        rect = QRectF(start_pt, end_pt).normalized()

        if shift_held:
            # Force 1:1 aspect ratio based on max dimension
            side = max(rect.width(), rect.height())
            
            # Determine direction of drag to anchor at start_pt correctly
            dx = 1 if end_pt.x() >= start_pt.x() else -1
            dy = 1 if end_pt.y() >= start_pt.y() else -1
            
            end_x = start_pt.x() + (side * dx)
            end_y = start_pt.y() + (side * dy)
            rect = QRectF(start_pt, QPointF(end_x, end_y)).normalized()
            
            # For Line and Arrow, just snap angle to 45 degree increments
            if shape_type in (ShapeType.LINE, ShapeType.ARROW):
                angle = math.atan2(end_pt.y() - start_pt.y(), end_pt.x() - start_pt.x())
                # snap to 45 degrees
                snapped_angle = round(angle / (math.pi/4)) * (math.pi/4)
                length = math.hypot(end_pt.x() - start_pt.x(), end_pt.y() - start_pt.y())
                end_pt = QPointF(start_pt.x() + length * math.cos(snapped_angle), start_pt.y() + length * math.sin(snapped_angle))

        if shape_type == ShapeType.LINE:
            path.moveTo(start_pt)
            path.lineTo(end_pt)
        elif shape_type == ShapeType.ARROW:
            path.moveTo(start_pt)
            path.lineTo(end_pt)
            # draw arrow head
            angle = math.atan2(end_pt.y() - start_pt.y(), end_pt.x() - start_pt.x())
            head_len = max(15, self.pen_size * 3.5)
            
            angle_left = angle - math.pi/7
            wing_left = QPointF(end_pt.x() - head_len * math.cos(angle_left), end_pt.y() - head_len * math.sin(angle_left))
            path.moveTo(end_pt)
            path.lineTo(wing_left)
            
            angle_right = angle + math.pi/7
            wing_right = QPointF(end_pt.x() - head_len * math.cos(angle_right), end_pt.y() - head_len * math.sin(angle_right))
            path.moveTo(end_pt)
            path.lineTo(wing_right)
        elif shape_type == ShapeType.RECTANGLE:
            path.addRect(rect)
        elif shape_type == ShapeType.ROUNDED_RECTANGLE:
            # Radius scales slightly with shape size, capped
            radius = min(rect.width(), rect.height()) * 0.15
            path.addRoundedRect(rect, radius, radius)
        elif shape_type == ShapeType.CIRCLE:
            path.addEllipse(rect)
        elif shape_type == ShapeType.TRIANGLE:
            if shift_held:
                # Right angle triangle (90 deg at bottom-left)
                path.moveTo(rect.left(), rect.top())
                path.lineTo(rect.left(), rect.bottom())
                path.lineTo(rect.right(), rect.bottom())
            else:
                # Isosceles triangle
                path.moveTo(rect.center().x(), rect.top())
                path.lineTo(rect.right(), rect.bottom())
                path.lineTo(rect.left(), rect.bottom())
            path.closeSubpath()
        return path

    @staticmethod
    def _draw_stroke(painter, path, pen, mode):
        """Draw a single stroke with optional pen halo for anti-alias softening."""
        if mode == ToolMode.HIGHLIGHTER:
            painter.setOpacity(0.5)
        else:
            painter.setOpacity(1.0)
            
        painter.setPen(pen)
        painter.drawPath(path)
        painter.setOpacity(1.0)

    # ── Cache management ──
    
    def _recalculate_master_obb(self):
        if not self.selected_path_indices:
            self.master_obb = None
            return
            
        master_rect = QRectF()
        for idx in self.selected_path_indices:
            if idx < len(self.paths):
                obb = self.paths[idx].get('obb', QPolygonF(self.paths[idx]['path'].boundingRect()))
                master_rect = master_rect.united(obb.boundingRect())
                
        if master_rect.width() < 50:
            master_rect.adjust(- (50 - master_rect.width()) / 2, 0, (50 - master_rect.width()) / 2, 0)
        if master_rect.height() < 50:
            master_rect.adjust(0, - (50 - master_rect.height()) / 2, 0, (50 - master_rect.height()) / 2)
            
        self.master_obb = QPolygonF(master_rect)


    def _get_selection_handles(self, obb):
        # obb is a QPolygonF with at least 4 points (0: TL, 1: TR, 2: BR, 3: BL)
        if obb.size() < 4:
            return QPointF(), QPointF(), QPointF()
            
        tl = obb.at(0)
        tr = obb.at(1)
        br = obb.at(2)
        bl = obb.at(3)
        
        # Unit vector along top edge (TL -> TR): width axis (rightward)
        v_top = QPointF(tr.x() - tl.x(), tr.y() - tl.y())
        len_top = math.hypot(v_top.x(), v_top.y())
        if len_top > 0:
            u_right = QPointF(v_top.x() / len_top, v_top.y() / len_top)
        else:
            u_right = QPointF(1.0, 0.0)
            
        # Unit vector along right edge (TR -> BR): height axis (downward)
        v_right = QPointF(br.x() - tr.x(), br.y() - tr.y())
        len_right = math.hypot(v_right.x(), v_right.y())
        if len_right > 0:
            u_down = QPointF(v_right.x() / len_right, v_right.y() / len_right)
        else:
            u_down = QPointF(0.0, 1.0)
            
        u_up = QPointF(-u_down.x(), -u_down.y())
        u_left = QPointF(-u_right.x(), -u_right.y())
        
        # 1. Rotation handle: extends straight UP from top center
        top_center = QPointF((tl.x() + tr.x()) / 2, (tl.y() + tr.y()) / 2)
        rot_center = QPointF(top_center.x() + u_up.x() * 32, top_center.y() + u_up.y() * 32)
        
        # 2. Delete handle: offset outward from Top-Right corner
        del_center = QPointF(tr.x() + u_right.x() * 20 + u_up.x() * 20,
                             tr.y() + u_right.y() * 20 + u_up.y() * 20)
                             
        # 3. Scale / Resize handle: offset outward from Bottom-Right corner
        scale_center = QPointF(br.x() + u_right.x() * 16 + u_down.x() * 16,
                               br.y() + u_right.y() * 16 + u_down.y() * 16)
        
        # --- Collision avoidance between handles ---
        MIN_DIST = 36.0
        
        # Check collision between Rotate and Delete (common on thin vertical shapes)
        d_rot_del = math.hypot(del_center.x() - rot_center.x(), del_center.y() - rot_center.y())
        if d_rot_del < MIN_DIST:
            overlap = MIN_DIST - d_rot_del
            del_center = QPointF(del_center.x() + u_right.x() * (overlap + 8),
                                 del_center.y() + u_right.y() * (overlap + 8))
            rot_center = QPointF(rot_center.x() + u_up.x() * 8,
                                 rot_center.y() + u_up.y() * 8)
                                 
        # Check collision between Delete and Scale (common on thin horizontal shapes)
        d_del_scale = math.hypot(del_center.x() - scale_center.x(), del_center.y() - scale_center.y())
        if d_del_scale < MIN_DIST:
            overlap = MIN_DIST - d_del_scale
            del_center = QPointF(del_center.x() + u_up.x() * (overlap / 2 + 6),
                                 del_center.y() + u_up.y() * (overlap / 2 + 6))
            scale_center = QPointF(scale_center.x() + u_down.x() * (overlap / 2 + 6),
                                   scale_center.y() + u_down.y() * (overlap / 2 + 6))
        
        return rot_center, del_center, scale_center

    # ── Cache management (Removed for Pure Vector Rendering) ──
    # ── Mouse events ──

    def mousePressEvent(self, event):
        if not self.ink_visible:
            return
        if event.button() == Qt.MouseButton.LeftButton and not self.is_click_through:
            if self.mode == ToolMode.SELECT:
                self.selection_action = None
                
                # 1. Handle clicking handles on an existing selection
                if self.selected_path_indices and self.master_obb:
                    rot_center, del_center, scale_center = self._get_selection_handles(self.master_obb)
                    
                    pos = event.position()
                    d_rot = math.hypot(pos.x() - rot_center.x(), pos.y() - rot_center.y())
                    d_del = math.hypot(pos.x() - del_center.x(), pos.y() - del_center.y())
                    d_scale = math.hypot(pos.x() - scale_center.x(), pos.y() - scale_center.y())
                    
                    HANDLE_RADIUS = 18
                    min_dist = min(d_rot, d_del, d_scale)
                    
                    if min_dist <= HANDLE_RADIUS:
                        if min_dist == d_rot:
                            self.selection_action = 'rotate'
                            self.selection_start_pos = event.position()
                            self.selection_start_master_obb = QPolygonF(self.master_obb)
                            self.selection_start_states = [{'path': QPainterPath(self.paths[idx]['path']), 'obb': QPolygonF(self.paths[idx].get('obb', QPolygonF(self.paths[idx]['path'].boundingRect()))), 'index': idx} for idx in self.selected_path_indices if idx < len(self.paths)]
                            
                            center = QPointF((self.master_obb.at(0).x() + self.master_obb.at(2).x()) / 2, (self.master_obb.at(0).y() + self.master_obb.at(2).y()) / 2)
                            self.selection_start_center = center
                            
                            dy = event.position().y() - center.y()
                            dx = event.position().x() - center.x()
                            self.selection_rotation_start_angle = math.atan2(dy, dx)
                            return
                            
                        elif min_dist == d_del:
                            self.selection_action = None
                            for idx in sorted(self.selected_path_indices, reverse=True):
                                if idx < len(self.paths):
                                    del self.paths[idx]
                            self.selected_path_indices.clear()
                            self._recalculate_master_obb()
                            self.undo_stack_size = min(self.undo_stack_size, len(self.paths))
                            self.update()
                            return
                            
                        elif min_dist == d_scale:
                            self.selection_action = 'scale'
                            self.selection_start_pos = event.position()
                            self.selection_start_master_obb = QPolygonF(self.master_obb)
                            self.selection_start_states = [{'path': QPainterPath(self.paths[idx]['path']), 'obb': QPolygonF(self.paths[idx].get('obb', QPolygonF(self.paths[idx]['path'].boundingRect()))), 'index': idx, 'pen_width': self.paths[idx]['pen'].widthF()} for idx in self.selected_path_indices if idx < len(self.paths)]
                            self.selection_start_center = QPointF((self.master_obb.at(0).x() + self.master_obb.at(2).x()) / 2, (self.master_obb.at(0).y() + self.master_obb.at(2).y()) / 2)
                            return
                        
                    elif self.master_obb.boundingRect().contains(event.position()):
                        self.selection_action = 'drag'
                        self.selection_start_pos = event.position()
                        self.selection_start_master_obb = QPolygonF(self.master_obb)
                        self.selection_start_states = [{'path': QPainterPath(self.paths[idx]['path']), 'obb': QPolygonF(self.paths[idx].get('obb', QPolygonF(self.paths[idx]['path'].boundingRect()))), 'index': idx} for idx in self.selected_path_indices if idx < len(self.paths)]
                        return
                
                # 2. Check if clicked on a path directly
                clicked_idx = -1
                hit_box = QRectF(event.position().x() - 10, event.position().y() - 10, 20, 20)
                
                for i in range(len(self.paths) - 1, -1, -1):
                    p = self.paths[i]['path']
                    stroker = QPainterPathStroker()
                    stroker.setWidth(max(10.0, self.paths[i]['pen'].widthF() + 4.0))
                    stroked_path = stroker.createStroke(p)
                    
                    if stroked_path.intersects(hit_box) or p.intersects(hit_box):
                        clicked_idx = i
                        break
                        
                if clicked_idx != -1:
                    # Single click on an unselected item replaces selection
                    if clicked_idx not in self.selected_path_indices:
                        self.selected_path_indices = [clicked_idx]
                        self._recalculate_master_obb()
                    self.selection_action = 'drag'
                    self.selection_start_pos = event.position()
                    self.selection_start_states = [{'path': QPainterPath(self.paths[idx]['path']), 'obb': QPolygonF(self.paths[idx].get('obb', QPolygonF(self.paths[idx]['path'].boundingRect()))), 'index': idx} for idx in self.selected_path_indices if idx < len(self.paths)]
                else:
                    # Clicked empty space -> start lasso
                    self.selected_path_indices.clear()
                    self._recalculate_master_obb()
                    self.is_lassoing = True
                    self.lasso_path = QPainterPath()
                    self.lasso_path.moveTo(event.position())
                    
                self.update()
                return

            if self.mode not in (ToolMode.ERASER, ToolMode.SHAPE):
                self.setCursor(Qt.CursorShape.BlankCursor)
            self.shape_detected = False
            
            # Disable GC during active drawing to prevent micro-stutters
            gc.disable()
            
            if self.mode == ToolMode.ERASER:
                self._erase_at(event.position())
            elif self.mode == ToolMode.SHAPE:
                self.drawing = True
                self.shape_start = event.position()
                self.current_path = QPainterPath()
                self.last_point = event.position()
            else:
                self.drawing = True
                self.raw_points = [event.position()]
                self.current_path = QPainterPath()
                self.current_path.moveTo(event.position())
                self.last_point = event.position()
                self.last_mid_point = event.position()

    def mouseMoveEvent(self, event):
        if not self.ink_visible:
            return
        if (event.buttons() & Qt.MouseButton.LeftButton) and not self.is_click_through:
            if self.mode == ToolMode.SELECT:
                if self.is_lassoing and self.lasso_path is not None:
                    self.lasso_path.lineTo(event.position())
                    self.update()
                    return
                    
                if self.selection_action == 'drag' and self.selected_path_indices:
                    delta = event.position() - self.selection_start_pos
                    transform = QTransform().translate(delta.x(), delta.y())
                    for state in self.selection_start_states:
                        idx = state['index']
                        if idx < len(self.paths):
                            self.paths[idx]['path'] = transform.map(state['path'])
                            self.paths[idx]['obb'] = transform.map(state['obb'])
                    if self.selection_start_master_obb:
                        self.master_obb = transform.map(self.selection_start_master_obb)
                    self.update()
                elif self.selection_action == 'rotate' and self.selected_path_indices:
                    center = self.selection_start_center
                    current_angle = math.atan2(event.position().y() - center.y(), event.position().x() - center.x())
                    angle_diff = math.degrees(current_angle - self.selection_rotation_start_angle)
                    
                    transform = QTransform().translate(center.x(), center.y()).rotate(angle_diff).translate(-center.x(), -center.y())
                    for state in self.selection_start_states:
                        idx = state['index']
                        if idx < len(self.paths):
                            self.paths[idx]['path'] = transform.map(state['path'])
                            self.paths[idx]['obb'] = transform.map(state['obb'])
                    if self.selection_start_master_obb:
                        self.master_obb = transform.map(self.selection_start_master_obb)
                    self.update()
                elif self.selection_action == 'scale' and self.selected_path_indices:
                    start_dist = math.hypot(self.selection_start_pos.x() - self.selection_start_center.x(), 
                                            self.selection_start_pos.y() - self.selection_start_center.y())
                    current_dist = math.hypot(event.position().x() - self.selection_start_center.x(), 
                                              event.position().y() - self.selection_start_center.y())
                    
                    if start_dist > 0:
                        scale_factor = current_dist / start_dist
                        transform = QTransform().translate(self.selection_start_center.x(), self.selection_start_center.y()) \
                                                .scale(scale_factor, scale_factor) \
                                                .translate(-self.selection_start_center.x(), -self.selection_start_center.y())
                        
                        for state in self.selection_start_states:
                            idx = state['index']
                            if idx < len(self.paths):
                                self.paths[idx]['path'] = transform.map(state['path'])
                                self.paths[idx]['obb'] = transform.map(state['obb'])
                                new_width = max(0.1, state['pen_width'] * scale_factor)
                                self.paths[idx]['pen'].setWidthF(new_width)
                        if self.selection_start_master_obb:
                            self.master_obb = transform.map(self.selection_start_master_obb)
                        self.update()
                return

            if self.mode == ToolMode.ERASER:
                self._erase_at(event.position())
            elif self.drawing and self.mode == ToolMode.SHAPE:
                old_rect = self.current_path.boundingRect() if self.current_path else QRectF(self.shape_start, self.shape_start)
                
                shift_held = bool(QApplication.keyboardModifiers() & Qt.KeyboardModifier.ShiftModifier)
                self.current_path = self._build_shape_path(self.shape_start, event.position(), self.current_shape, shift_held)
                
                new_rect = self.current_path.boundingRect()
                update_rect = old_rect.united(new_rect)
                
                padding = max(100.0, self._get_current_pen().widthF() * 4.0)
                update_rect.adjust(-padding, -padding, padding, padding)
                self.update(update_rect.toRect())
                self.last_point = event.position()
            elif self.drawing and self.current_path and not self.shape_detected:
                self.raw_points.append(event.position())
                mid_point = (self.last_point + event.position()) / 2.0
                self.current_path.quadTo(self.last_point, mid_point)

                prev_point = self.raw_points[-2] if len(self.raw_points) > 1 else self.last_point
                self.last_point = event.position()

                padding = max(150.0, self._get_current_pen().widthF() * 6.0)
                
                # Calculate the bounding box of the new curve segment
                update_rect = QRectF(prev_point, event.position()).normalized()
                if hasattr(self, 'last_mid_point'):
                    update_rect = update_rect.united(QRectF(self.last_mid_point, mid_point).normalized())
                self.last_mid_point = mid_point
                
                update_rect.adjust(-padding, -padding, padding, padding)
                self.update(update_rect.toRect())

                if self.mode == ToolMode.PEN:
                    self.shape_timer.start(400)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            if self.mode == ToolMode.SELECT:
                if self.is_lassoing and self.lasso_path is not None:
                    self.lasso_path.lineTo(event.position())
                    self.lasso_path.closeSubpath()
                    
                    self.selected_path_indices.clear()
                    
                    for i in range(len(self.paths)):
                        p = self.paths[i]['path']
                        if self.lasso_path.intersects(p) or self.lasso_path.contains(p):
                            self.selected_path_indices.append(i)
                            
                    self._recalculate_master_obb()
                    self.is_lassoing = False
                    self.lasso_path = None
                    self.update()
                
                self.selection_action = None
                return

            self.shape_timer.stop()
            self._update_cursor()
            if self.drawing and self.current_path:
                if self.mode != ToolMode.SHAPE and not self.shape_detected:
                    self.current_path.lineTo(event.position())

                if len(self.paths) >= self.MAX_STROKES:
                    self.paths.pop(0)

                obb = QPolygonF(self.current_path.boundingRect())
                self.paths.append({'path': self.current_path, 'pen': self._get_current_pen(), 'mode': self.mode, 'obb': obb})
                self.undo_stack_size = min(self.MAX_UNDO_STEPS, self.undo_stack_size + 1)

                self.current_path = None
                self.update()
            self.drawing = False
            
            # Re-enable GC and collect
            gc.enable()
            gc.collect(0)

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
            self.undo_stack_size = min(self.undo_stack_size, len(self.paths))
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
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)

        # Pure Vector Rendering: Draw all saved paths dynamically
        for p in self.paths:
            if p['mode'] != ToolMode.ERASER:
                self._draw_stroke(painter, p['path'], p['pen'], p['mode'])
        
        if self.drawing and self.current_path:
            self._draw_stroke(painter, self.current_path, self._get_current_pen(), self.mode)

        painter.setOpacity(1.0)
        if self.mode == ToolMode.SELECT:
            if self.is_lassoing and self.lasso_path is not None:
                painter.setPen(QPen(QColor(0, 122, 255), 2, Qt.PenStyle.DashLine))
                painter.setBrush(QColor(0, 122, 255, 30))
                painter.drawPath(self.lasso_path)
                
            elif self.selected_path_indices and self.master_obb:
                painter.setRenderHint(QPainter.RenderHint.Antialiasing)
                
                # Draw small outlines around individual items to show what's inside the group
                painter.setPen(QPen(QColor(0, 122, 255, 100), 1, Qt.PenStyle.DashLine))
                painter.setBrush(Qt.BrushStyle.NoBrush)
                for idx in self.selected_path_indices:
                    if idx < len(self.paths):
                        obb = self.paths[idx].get('obb', QPolygonF(self.paths[idx]['path'].boundingRect()))
                        painter.drawPolygon(obb)

                master_obb = self.master_obb
                
                # Draw dashed blue outline for master group
                pen = QPen(QColor(0, 122, 255), 2, Qt.PenStyle.SolidLine)
                painter.setPen(pen)
                painter.setBrush(QColor(0, 122, 255, 20))
                painter.drawPolygon(master_obb)
                
                # Draw 4 corner handles
                painter.setBrush(QColor(255, 255, 255))
                painter.setPen(QPen(QColor(0, 122, 255), 1.5))
                handle_size = 8
                for i in range(min(4, master_obb.size())):
                    pt = master_obb.at(i)
                    painter.drawRect(QRectF(pt.x() - handle_size/2, pt.y() - handle_size/2, handle_size, handle_size))
                    
                # Draw rotation, delete, and scale handles
                rot_center, del_center, scale_center = self._get_selection_handles(master_obb)
                
                if not rot_center.isNull():
                    # Draw stick
                    top_center = QPointF((master_obb.at(0).x() + master_obb.at(1).x()) / 2, (master_obb.at(0).y() + master_obb.at(1).y()) / 2)
                    painter.setPen(QPen(QColor(0, 122, 255), 1.5))
                    painter.drawLine(top_center, rot_center)
                
                # Draw rot handle circle
                painter.setBrush(QColor(255, 255, 255))
                painter.drawEllipse(rot_center, 10, 10)
                
                # Draw rotate icon inside
                painter.setPen(QPen(QColor(0, 122, 255), 1.5, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin))
                painter.setBrush(Qt.BrushStyle.NoBrush)
                painter.drawArc(QRectF(rot_center.x()-5, rot_center.y()-5, 10, 10), 45 * 16, 270 * 16)
                painter.drawLine(QPointF(rot_center.x()+5, rot_center.y()), QPointF(rot_center.x()+5, rot_center.y()-3))
                painter.drawLine(QPointF(rot_center.x()+5, rot_center.y()), QPointF(rot_center.x()+8, rot_center.y()))
                
                # Draw delete handle circle
                painter.setPen(QPen(QColor(220, 50, 50), 1.5))
                painter.setBrush(QColor(255, 255, 255))
                painter.drawEllipse(del_center, 10, 10)
                
                # Draw X inside
                painter.drawLine(QPointF(del_center.x() - 4, del_center.y() - 4), QPointF(del_center.x() + 4, del_center.y() + 4))
                painter.drawLine(QPointF(del_center.x() - 4, del_center.y() + 4), QPointF(del_center.x() + 4, del_center.y() - 4))

                # Draw scale handle circle
                painter.setPen(QPen(QColor(0, 122, 255), 1.5))
                painter.setBrush(QColor(255, 255, 255))
                painter.drawEllipse(scale_center, 10, 10)
                
                # Draw resize arrow inside
                painter.drawLine(QPointF(scale_center.x()-4, scale_center.y()-4), QPointF(scale_center.x()+4, scale_center.y()+4))
                painter.drawLine(QPointF(scale_center.x()+4, scale_center.y()+4), QPointF(scale_center.x()+4, scale_center.y()+1))
                painter.drawLine(QPointF(scale_center.x()+4, scale_center.y()+4), QPointF(scale_center.x()+1, scale_center.y()+4))

    def keyPressEvent(self, event):
        if event.key() == Qt.Key.Key_Delete or event.key() == Qt.Key.Key_Backspace:
            if self.mode == ToolMode.SELECT and self.selected_path_indices:
                for idx in sorted(self.selected_path_indices, reverse=True):
                    if idx < len(self.paths):
                        self.paths.pop(idx)
                self.selected_path_indices.clear()
                self._recalculate_master_obb()
                self.undo_stack_size = min(self.undo_stack_size, len(self.paths))
                self.update()
                return
        super().keyPressEvent(event)

    # ── Actions ──

    def clear_screen(self):
        self.paths.clear()
        self.undo_stack_size = 0
        self.selected_path_indices.clear()
        self._recalculate_master_obb()
        self.update()

    def undo(self):
        if self.paths and self.undo_stack_size > 0:
            self.paths.pop()
            self.undo_stack_size -= 1
            self.selected_path_indices = [idx for idx in self.selected_path_indices if idx < len(self.paths)]
            self._recalculate_master_obb()
            self.update()


# ── Floating Color Palette ──

class FloatingColorPalette(QWidget):
    def __init__(self, signals, parent=None):
        super().__init__(parent)
        self.signals = signals
        self._drag_pos = None
        self.has_been_dragged = False
        self._fade_state = 0  # 0=hidden, 1=fading_in, 2=visible, 3=fading_out

        self.setWindowFlags(
            Qt.WindowType.Tool |
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        # Fade animation — safe on Qt.WindowType.Tool windows
        self._opacity_anim = QPropertyAnimation(self, b"windowOpacity")
        self._opacity_anim.setEasingCurve(QEasingCurve.Type.InOutSine)
        self._opacity_anim.finished.connect(self._on_fade_finished)

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
            color_name = COLOR_NAMES.get(color_hex, "Color")
            btn.setToolTip(color_name)
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
        active_color = hex_color.upper()
        for c, btn in self.color_buttons.items():
            tooltip_color = "#333333" if c.upper() == "#FFFFFF" else c
            if c.upper() == active_color:
                btn.setStyleSheet(f"""
                    QPushButton {{
                        background-color: {c};
                        border-radius: 14px;
                        border: 2px solid {c};
                    }}
                    QToolTip {{ background-color: white; color: {tooltip_color}; border: 1px solid {tooltip_color}; }}
                """)
                shadow = QGraphicsDropShadowEffect(self)
                shadow.setBlurRadius(15)
                shadow.setColor(QColor(c))
                shadow.setOffset(0, 0)
                btn.setGraphicsEffect(shadow)
            else:
                btn.setStyleSheet(f"""
                    QPushButton {{
                        background-color: {c}; 
                        border-radius: 14px; 
                        border: 1px solid #D6C3A1;
                    }}
                    QToolTip {{ background-color: white; color: {tooltip_color}; border: 1px solid {tooltip_color}; }}
                """)
                btn.setGraphicsEffect(None)

    def fade_in(self):
        """Fade the panel in smoothly."""
        if self._fade_state in (1, 2):
            return
        self._fade_state = 1
        self._opacity_anim.stop()
        self.setWindowOpacity(0.0)
        super().show()
        self._opacity_anim.setDuration(180)
        self._opacity_anim.setStartValue(0.0)
        self._opacity_anim.setEndValue(1.0)
        self._opacity_anim.start()

    def fade_out(self):
        """Fade the panel out smoothly, then hide."""
        if self._fade_state in (0, 3):
            return
        self._fade_state = 3
        self._opacity_anim.stop()
        self._opacity_anim.setDuration(120)
        self._opacity_anim.setStartValue(self.windowOpacity())
        self._opacity_anim.setEndValue(0.0)
        self._opacity_anim.start()

    def instant_hide(self):
        """Immediately hide without animation (used during canvas hide)."""
        self._opacity_anim.stop()
        self._fade_state = 0
        self.setWindowOpacity(1.0)
        super().hide()

    def _on_fade_finished(self):
        if self._fade_state == 1:
            self._fade_state = 2
        elif self._fade_state == 3:
            self._fade_state = 0
            self.setWindowOpacity(1.0)
            super().hide()

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
        self.has_been_dragged = False

        self.setWindowFlags(
            Qt.WindowType.Tool |
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setStyleSheet(TOOLBAR_STYLESHEET)

        # Collapse/Expand Animation State
        self._collapse_state = 0  # 0=EXPANDED, 1=COLLAPSING, 2=COLLAPSED, 3=EXPANDING
        self._full_height = None
        self._collapsible_widgets = []
        self._collapsible_separators = []

        # Phase 1: Height shrink/expand animation
        self._height_anim = QPropertyAnimation(self, b"maximumHeight")
        self._height_anim.setDuration(300)
        self._height_anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._height_anim.finished.connect(self._on_height_anim_finished)

        # Phase 2: Opacity fade-in for button reveal (expand only)
        # Safe: windowOpacity on top-level QWidget — no QGraphicsOpacityEffect
        self._toolbar_opacity_anim = QPropertyAnimation(self, b"windowOpacity")
        self._toolbar_opacity_anim.setDuration(200)
        self._toolbar_opacity_anim.setEasingCurve(QEasingCurve.Type.InOutSine)
        self._toolbar_opacity_anim.finished.connect(self._on_opacity_anim_finished)

        layout = QVBoxLayout()
        layout.setContentsMargins(10, 8, 10, 15)
        layout.setSpacing(10)

        # ── Group 1: Navigation ──
        self.btn_handle = DragHandle(self)
        layout.addWidget(self.btn_handle, alignment=Qt.AlignmentFlag.AlignHCenter)
        

        
        layout.addSpacing(2)

        self.btn_cursor = self._create_click_button("🖱️", "Cursor Options (Ctrl+4)")
        self.cursor_menu = CustomHoverMenu(self)
        self.btn_cursor.set_menu(self.cursor_menu)
        layout.addWidget(self.btn_cursor, alignment=Qt.AlignmentFlag.AlignCenter)
        self._add_separator(layout)

        # ── Group 2: Drawing Tools ──
        
        self.btn_select = self._create_tool_button("↖️", "Select / Transform", 
            lambda: self._set_active_tool(self.btn_select, self.signals.switch_select.emit))
        layout.addWidget(self.btn_select, alignment=Qt.AlignmentFlag.AlignCenter)
        
        self.btn_pen = self._create_hold_button("🖊️", "Pen (Ctrl+1) - Hold for Size",
            lambda: self._set_active_tool(self.btn_pen, self.signals.switch_pen.emit))
        self._setup_size_menu(self.btn_pen, [2, 5, 10, 15, 20], self.signals.change_pen_size.emit)
        layout.addWidget(self.btn_pen, alignment=Qt.AlignmentFlag.AlignCenter)

        self.btn_hl = self._create_hold_button("🖍️", "Highlighter (Ctrl+2) - Hold for Size",
            lambda: self._set_active_tool(self.btn_hl, self.signals.switch_highlighter.emit))
        self._setup_size_menu(self.btn_hl, [10, 15, 25, 35, 45], self.signals.change_highlighter_size.emit)
        layout.addWidget(self.btn_hl, alignment=Qt.AlignmentFlag.AlignCenter)

        self.btn_shape = self._create_click_button("📐", "Shapes")
        self.shape_menu = CustomHoverMenu(self)
        
        # Use crisp programmatically generated icons for shapes
        self.shape_menu.add_action(create_shape_icon(ShapeType.LINE), "Line", lambda: self._select_shape(ShapeType.LINE))
        self.shape_menu.add_action(create_shape_icon(ShapeType.ARROW), "Arrow", lambda: self._select_shape(ShapeType.ARROW))
        self.shape_menu.add_action(create_shape_icon(ShapeType.RECTANGLE), "Rectangle", lambda: self._select_shape(ShapeType.RECTANGLE))
        self.shape_menu.add_action(create_shape_icon(ShapeType.ROUNDED_RECTANGLE), "Rounded Rectangle", lambda: self._select_shape(ShapeType.ROUNDED_RECTANGLE))
        self.shape_menu.add_action(create_shape_icon(ShapeType.CIRCLE), "Circle", lambda: self._select_shape(ShapeType.CIRCLE))
        self.shape_menu.add_action(create_shape_icon(ShapeType.TRIANGLE), "Triangle (Shift for Right Angle)", lambda: self._select_shape(ShapeType.TRIANGLE))
        
        self.btn_shape.set_menu(self.shape_menu)
        
        self.current_shape_type = ShapeType.LINE
        self.btn_shape.clicked.connect(lambda: self._set_active_tool(self.btn_shape, lambda: self.signals.switch_shape.emit(self.current_shape_type)))
        
        layout.addWidget(self.btn_shape, alignment=Qt.AlignmentFlag.AlignCenter)

        self.btn_eraser = self._create_hold_button("🧽", "Eraser (Ctrl+3) - Hold for Size",
            lambda: self._set_active_tool(self.btn_eraser, self.signals.switch_eraser.emit))
        self._setup_size_menu(self.btn_eraser, [10, 20, 40, 60, 80], self.signals.change_eraser_size.emit)
        layout.addWidget(self.btn_eraser, alignment=Qt.AlignmentFlag.AlignCenter)

        self._add_separator(layout)

        # ── Group 3: Colors ──
        self.btn_palette = self._create_tool_button("🎨", "Toggle Colors (Ctrl+P)", self.signals.toggle_color_palette.emit)
        layout.addWidget(self.btn_palette, alignment=Qt.AlignmentFlag.AlignCenter)
        self._add_separator(layout)

        # ── Group 4: Actions ──
        self.btn_undo = self._add_button(layout, "↩️", "Undo (Ctrl+Z)", self.signals.undo.emit)
        self.btn_bg = self._add_button(layout, "⬜", "Toggle Whiteboard/Blackboard (Ctrl+B)", self.signals.toggle_background.emit)
        self.btn_clear = self._add_button(layout, "🗑️", "Clear Screen (Ctrl+Shift+C)", self.signals.clear_screen.emit)

        self.setLayout(layout)

        # Build list of widgets to hide during collapse
        self._collapsible_widgets = [
            self.btn_select, self.btn_pen, self.btn_hl, self.btn_shape,
            self.btn_eraser, self.btn_palette, self.btn_undo, self.btn_bg, self.btn_clear,
        ]
        # Find all separator QFrames in the layout
        for i in range(layout.count()):
            item = layout.itemAt(i)
            if item and item.widget() and item.widget().objectName() == "separator":
                self._collapsible_separators.append(item.widget())
        
        # Connect signals to active state
        self.signals.switch_shape.connect(lambda s: self._set_active_tool(self.btn_shape, lambda: None))
        self.signals.switch_select.connect(lambda: self._set_active_tool(self.btn_select, lambda: None))

        # Initial active tool
        self._set_active_tool(self.btn_pen, None)

        # Sync active tool from keyboard shortcuts
        self.signals.switch_pen.connect(lambda: self._set_active_tool(self.btn_pen, None))
        self.signals.switch_highlighter.connect(lambda: self._set_active_tool(self.btn_hl, None))
        self.signals.switch_eraser.connect(lambda: self._set_active_tool(self.btn_eraser, None))
        self.signals.switch_cursor.connect(lambda: self._set_active_tool(self.btn_cursor, None))
        self.signals.change_pen_size.connect(lambda _: self._set_active_tool(self.btn_pen, None))
        self.signals.change_highlighter_size.connect(lambda _: self._set_active_tool(self.btn_hl, None))
        self.signals.change_eraser_size.connect(lambda _: self._set_active_tool(self.btn_eraser, None))
        self.signals.visibility_changed.connect(self._on_visibility_changed)

    def _on_visibility_changed(self, visible):
        self.ink_visible = visible
        
        # Bug 1: Sync active tool visually if backend reverted cursor to pen on unhide
        if visible and getattr(self, 'active_tool_btn', None) == self.btn_cursor:
            self._set_active_tool(self.btn_pen, None)
            
        # Bug 2: Disable irrelevant buttons when hidden
        disable_when_hidden = [
            self.btn_select, self.btn_eraser, self.btn_shape, 
            self.btn_palette, getattr(self, 'btn_undo', None), 
            getattr(self, 'btn_bg', None), getattr(self, 'btn_clear', None)
        ]
        for btn in disable_when_hidden:
            if btn:
                btn.setEnabled(visible)
                
        self._update_cursor_button_icon()

        # Trigger collapse/expand animation
        if not visible:
            self.start_collapse()
        else:
            self.start_expand()

    def _select_shape(self, shape_type):
        self.current_shape_type = shape_type
        self.btn_shape.setText("")
        self.btn_shape.setIcon(create_shape_icon(shape_type))
        from PyQt6.QtCore import QSize
        self.btn_shape.setIconSize(QSize(24, 24))
        self._set_active_tool(self.btn_shape, lambda: self.signals.switch_shape.emit(shape_type))

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

    def _create_click_button(self, icon, tooltip):
        btn = ClickMenuButton(icon, tooltip)
        btn.setFixedSize(36, 36)
        return btn

    def _setup_size_menu(self, btn, sizes, signal_emitter):
        menu = QMenu(self)
        for label, size in zip(["Mini", "Small", "Medium", "Big", "Large"], sizes):
            menu.addAction(label, lambda checked=False, s=size: signal_emitter(s))
        btn.hold_triggered.connect(lambda: menu.exec(btn.mapToGlobal(QPoint(btn.width() + 5, 0))))

    def _set_active_tool(self, btn, callback):
        if hasattr(self, 'shape_menu') and self.shape_menu.isVisible() and btn != self.btn_shape:
            self.shape_menu.hide_menu()
        if hasattr(self, 'cursor_menu') and self.cursor_menu.isVisible() and btn != self.btn_cursor:
            self.cursor_menu.hide_menu()
            
        if hasattr(self, 'active_tool_btn') and self.active_tool_btn:
            self.active_tool_btn.setObjectName("")
            self.active_tool_btn.style().unpolish(self.active_tool_btn)
            self.active_tool_btn.style().polish(self.active_tool_btn)
        self.active_tool_btn = btn
        btn.setObjectName("activeTool")
        btn.style().unpolish(btn)
        btn.style().polish(btn)
        self._update_cursor_button_icon()
        if callback:
            callback()

    def _update_cursor_button_icon(self):
        ink_vis = getattr(self, 'ink_visible', True)
        is_cursor_active = getattr(self, 'active_tool_btn', None) == self.btn_cursor
        
        self.cursor_menu.clear_actions()
        
        if not ink_vis:
            self.btn_cursor.setText("🙈")
            self.btn_cursor.setToolTip("Click to Unhide")
            self.btn_cursor.setStyleSheet("")
        elif is_cursor_active:
            self.btn_cursor.setText("🖱️")
            self.btn_cursor.setToolTip("Drawing Options")
            self.btn_cursor.setStyleSheet("")
            self.cursor_menu.add_action("🐵", "Drawing Mode", 
                                        lambda: self._set_active_tool(self.btn_pen, self.signals.switch_pen.emit))
            self.cursor_menu.add_action("🙈", "Hide Canvas (Ctrl+5)", 
                                        self.signals.toggle_visibility.emit)
        else:
            self.btn_cursor.setText("🐵")
            self.btn_cursor.setToolTip("Cursor Options")
            self.btn_cursor.setStyleSheet("")
            self.cursor_menu.add_action("🖱️", "Cursor Mode (Keep Ink) (Ctrl+4)", 
                                        lambda: self._set_active_tool(self.btn_cursor, self.signals.switch_cursor.emit))
            self.cursor_menu.add_action("🙈", "Hide Canvas (Ctrl+5)", 
                                        self.signals.toggle_visibility.emit)

    def _add_button(self, layout, icon, tooltip, callback):
        btn = QPushButton(icon)
        btn.setFixedSize(36, 36)
        btn.setToolTip(tooltip)
        btn.clicked.connect(callback)
        layout.addWidget(btn, alignment=Qt.AlignmentFlag.AlignCenter)
        return btn

    @staticmethod
    def _add_separator(layout):
        sep = QFrame()
        sep.setObjectName("separator")
        layout.addWidget(sep)

    # ── Collapse / Expand Animation ──

    def start_collapse(self):
        """Smoothly shrink toolbar to pill (handle + cursor button only)."""
        if self._collapse_state == 2:  # Already collapsed
            return
        if self._collapse_state == 3:  # Currently expanding — reverse it
            self._height_anim.stop()

        # Stop any ongoing opacity animation and reset opacity
        self._toolbar_opacity_anim.stop()
        self.setWindowOpacity(1.0)

        self._collapse_state = 1  # COLLAPSING
        self._full_height = self.height()

        # Lock current height so hiding buttons doesn't cause visual jump
        self.setFixedHeight(self._full_height)

        # Hide all collapsible buttons and separators
        for w in self._collapsible_widgets:
            w.hide()
        for s in self._collapsible_separators:
            s.hide()

        # Release the fixed height lock and set up animation constraints
        self.setMinimumHeight(0)
        self.setMaximumHeight(self._full_height)

        # Target: pill handle (12) + spacing (2) + cursor btn (36) + margins (8+15) = ~73
        target_height = 80

        self._height_anim.setStartValue(self._full_height)
        self._height_anim.setEndValue(target_height)
        self._height_anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._height_anim.start()

    def start_expand(self):
        """Reverse of collapse: expand toolbar back to full size."""
        if self._collapse_state == 0:  # Already expanded
            return
        if self._collapse_state == 1:  # Currently collapsing — reverse it
            self._height_anim.stop()

        # Stop any ongoing opacity animation, keep toolbar visible during height animation
        self._toolbar_opacity_anim.stop()
        self.setWindowOpacity(1.0)

        self._collapse_state = 3  # EXPANDING

        current_h = self.height()
        target_h = self._full_height or 400

        # Buttons stay HIDDEN during height animation (avoids layout fight + circles bug)
        self.setMinimumHeight(0)
        self.setMaximumHeight(current_h)

        self._height_anim.setStartValue(current_h)
        self._height_anim.setEndValue(target_h)
        self._height_anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._height_anim.start()

    def _on_height_anim_finished(self):
        """Handle animation completion for both collapse and expand."""
        if self._collapse_state == 1:  # Was collapsing → now collapsed
            self._collapse_state = 2
            self.setFixedHeight(self.height())

        elif self._collapse_state == 3:  # Height done → now start button fade-in
            # Reset height constraints
            self.setMinimumHeight(0)
            self.setMaximumHeight(16777215)  # QWIDGETSIZE_MAX
            if self._full_height:
                self.setFixedHeight(self._full_height)

            # Show buttons while toolbar is invisible, then fade in
            self.setWindowOpacity(0.0)
            for w in self._collapsible_widgets:
                w.show()
            for s in self._collapsible_separators:
                s.show()

            # Phase 2: Fade toolbar from 0 → 1 so buttons appear to fade in
            self._toolbar_opacity_anim.setStartValue(0.0)
            self._toolbar_opacity_anim.setEndValue(1.0)
            self._toolbar_opacity_anim.start()
            # NOTE: _collapse_state stays at 3 until opacity finishes

    def _on_opacity_anim_finished(self):
        """Called after the button fade-in completes. Toolbar is now fully expanded."""
        if self._collapse_state == 3:
            self._collapse_state = 0
            # Signal coordinators: toolbar is fully expanded AND visible
            self.signals.toolbar_expanded.emit()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(QRectF(self.rect()), 20, 20)
        painter.fillPath(path, QColor('#F5E8D5'))
        painter.setPen(QPen(QColor('#D6C3A1'), 1))
        painter.drawPath(path)

    def moveEvent(self, event):
        super().moveEvent(event)
        if hasattr(self, 'shape_menu') and self.shape_menu and self.shape_menu.isVisible():
            self.shape_menu.show_menu(self.btn_shape)
        if hasattr(self, 'cursor_menu') and self.cursor_menu and self.cursor_menu.isVisible():
            self.cursor_menu.show_menu(self.btn_cursor)


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
        icon = QIcon(icon_path)
        if icon.isNull():
            pixmap = QPixmap(16, 16)
            pixmap.fill(Qt.GlobalColor.transparent)
            icon = QIcon(pixmap)
        super().__init__(icon, parent)
        self.setToolTip("Pen 11")

        menu = QMenu()
        menu.addAction("Toggle Ink Visibility (Ctrl+5)").triggered.connect(signals.toggle_visibility.emit)
        menu.addAction("Clear Screen (Ctrl+Shift+C)").triggered.connect(signals.clear_screen.emit)
        menu.addSeparator()
        menu.addAction("About").triggered.connect(self._show_about)
        menu.addAction("Exit").triggered.connect(signals.exit_app.emit)
        self.setContextMenu(menu)
        
    def _show_about(self):
        QMessageBox.information(None, "About Pen 11", "Pen 11\n\nDeveloped by Narayan Dev\n\nAn optimized screen annotation tool for Windows 11.")


# ── Global Shortcuts ──

def setup_global_shortcuts(coordinator):
    signals = coordinator.signals
    
    def execute_if_visible(callback):
        def wrapper():
            if getattr(coordinator.overlay, 'ink_visible', True):
                callback()
        return wrapper
            
    hotkeys = {
        'ctrl+1': signals.switch_pen.emit,
        'ctrl+2': signals.switch_highlighter.emit,
        'ctrl+3': execute_if_visible(signals.switch_eraser.emit),
        'ctrl+4': execute_if_visible(signals.switch_cursor.emit),
        'ctrl+5': signals.toggle_visibility.emit,
        'ctrl+z': execute_if_visible(signals.undo.emit),
        'ctrl+shift+c': execute_if_visible(signals.clear_screen.emit),
        'ctrl+q': signals.exit_app.emit,
        'ctrl+]': execute_if_visible(signals.increment_size.emit),
        'ctrl+[': execute_if_visible(signals.decrement_size.emit),
        'ctrl+p': execute_if_visible(signals.toggle_color_palette.emit),
        'ctrl+b': execute_if_visible(signals.toggle_background.emit),
    }
    for combo, callback in hotkeys.items():
        keyboard.add_hotkey(combo, callback, suppress=True)


# ── App Coordinator ──

class MainAppCoordinator(QObject):
    def __init__(self):
        super().__init__()
        self.signals = ShortcutSignals()
        self.settings = SettingsManager()

        self.tray = AppSystemTray(self.signals)
        self.tray.show()

        self.overlay = OverlayWindow(self.signals)
        self.overlay.show()

        self.toolbar = ToolbarWindow(self.signals, parent=self.overlay)
        self.toolbar.resize(80, 400)
        screen_rect = QApplication.primaryScreen().geometry()
        self.toolbar.move(screen_rect.right() - 100, screen_rect.top() + 20)
        self.toolbar.show()

        self.color_palette = FloatingColorPalette(self.signals, parent=self.overlay)
        self.color_palette.resize(150, 150)
        self.color_palette.hide()

        self.shape_toolbox = FloatingShapeToolbox(self.signals, self.overlay, parent=self.overlay)
        self.shape_toolbox.resize(150, 180)
        self.shape_toolbox.hide()

        # Connect toggle signals
        self.signals.toggle_color_palette.connect(self.toggle_color_palette)
        self.signals.toolbar_moved.connect(self._sync_toolboxes_position)
        self.signals.toggle_shape_toolbox.connect(self._toggle_shape_toolbox)
        self.signals.exit_app.connect(self._quit_app)

        # Palette persistence state
        self._palette_was_visible = False

        # Canvas visibility: save/close sub-panels immediately
        self.signals.visibility_changed.connect(self._on_canvas_visibility_changed)
        # Toolbar expansion done: NOW restore palette (correct order)
        self.signals.toolbar_expanded.connect(self._on_toolbar_expanded)
        
        # Auto-hide popup menus (NOT color palette) when selecting another tool
        self.signals.switch_pen.connect(lambda: self._on_tool_switched('pen'))
        self.signals.switch_highlighter.connect(lambda: self._on_tool_switched('highlighter'))
        self.signals.switch_eraser.connect(lambda: self._on_tool_switched('eraser'))
        self.signals.switch_select.connect(lambda: self._on_tool_switched('select'))
        self.signals.switch_cursor.connect(lambda: self._on_tool_switched('cursor'))
        
        # Auto-save settings when they change
        self.signals.change_pen_size.connect(lambda s: self.settings.set('pen_size', s))
        self.signals.change_highlighter_size.connect(lambda s: self.settings.set('highlighter_size', s))
        self.signals.change_eraser_size.connect(lambda s: self.settings.set('eraser_size', s))
        self.signals.change_color.connect(lambda c: self._save_color(c))
        self.signals.switch_shape.connect(lambda s: self.settings.set('current_shape', s))
        self.signals.increment_size.connect(self._save_current_sizes)
        self.signals.decrement_size.connect(self._save_current_sizes)

        # Load saved settings and apply them
        self._apply_saved_settings()
        
        setup_global_shortcuts(self)

    def _apply_saved_settings(self):
        """Restore all saved settings from disk."""
        s = self.settings
        
        # Restore sizes
        self.overlay.pen_size = s.get('pen_size')
        self.overlay.highlighter_size = s.get('highlighter_size')
        self.overlay.eraser_size = s.get('eraser_size')
        
        # Restore colors
        self.overlay.pen_color = QColor(s.get('pen_color'))
        self.overlay.highlighter_color = QColor(s.get('highlighter_color'))
        
        # Restore shape type
        self.overlay.current_shape = s.get('current_shape')
        self.toolbar.current_shape_type = s.get('current_shape')
        
        # Restore toolbar position
        tx = s.get('toolbar_x')
        ty = s.get('toolbar_y')
        if tx is not None and ty is not None:
            # Validate the saved position is still on-screen
            screen_rect = QRect()
            for screen in QApplication.screens():
                screen_rect = screen_rect.united(screen.geometry())
            if screen_rect.contains(QPoint(tx, ty)):
                self.toolbar.move(tx, ty)
        
        # Refresh the cursor to reflect restored sizes/colors
        self.overlay._update_cursor()

    def _save_color(self, hex_color):
        """Save the color to the correct key based on current mode."""
        if self.overlay.mode == ToolMode.HIGHLIGHTER:
            self.settings.set('highlighter_color', hex_color)
        else:
            self.settings.set('pen_color', hex_color)

    def _save_current_sizes(self):
        """Save all sizes after an increment/decrement."""
        self.settings.set_many({
            'pen_size': self.overlay.pen_size,
            'highlighter_size': self.overlay.highlighter_size,
            'eraser_size': self.overlay.eraser_size,
        })

    def _save_toolbar_position(self):
        """Save the toolbar's current screen position."""
        pos = self.toolbar.pos()
        self.settings.set_many({'toolbar_x': pos.x(), 'toolbar_y': pos.y()})

    def wakeup(self):
        """Called when a duplicate instance tries to launch. Show and raise the toolbar."""
        self.toolbar.show()
        self.toolbar.raise_()
        self.toolbar.activateWindow()
        self.overlay.show()
        self.overlay.raise_()

    def hide_toolboxes(self):
        """Instantly close everything (used during canvas hide)."""
        if self.shape_toolbox.isVisible() or self.shape_toolbox._fade_state != 0:
            self.shape_toolbox.instant_hide()
        if self.color_palette.isVisible() or self.color_palette._fade_state != 0:
            self.color_palette.instant_hide()
        # Close any open CustomHoverMenus
        if hasattr(self.toolbar, 'cursor_menu'):
            self.toolbar.cursor_menu.instant_hide()
        if hasattr(self.toolbar, 'shape_menu'):
            self.toolbar.shape_menu.instant_hide()

    def _hide_popup_menus(self):
        """Close popup menus and shape toolbox with fade, but NEVER the color palette."""
        if self.shape_toolbox._fade_state in (1, 2):
            self.shape_toolbox.fade_out()
        if hasattr(self.toolbar, 'cursor_menu') and self.toolbar.cursor_menu.isVisible():
            self.toolbar.cursor_menu.hide_menu()
        if hasattr(self.toolbar, 'shape_menu') and self.toolbar.shape_menu.isVisible():
            self.toolbar.shape_menu.hide_menu()

    def _on_tool_switched(self, tool_name):
        """Handle tool switch: close popup menus, save/restore palette for cursor mode."""
        self._hide_popup_menus()

        if tool_name == 'cursor':
            # Entering cursor mode — save palette state and fade it out
            self._palette_was_visible = self.color_palette._fade_state in (1, 2)
            if self.color_palette._fade_state in (1, 2):
                self.color_palette.fade_out()
        else:
            # Exiting cursor mode — fade palette back in if it was open
            if self._palette_was_visible:
                self._palette_was_visible = False
                self.color_palette.fade_in()

    def _on_canvas_visibility_changed(self, visible):
        """Save sub-panel states when canvas is hidden. Restore is deferred."""
        if not visible:
            # Save palette state BEFORE hiding
            self._palette_was_visible = self.color_palette._fade_state in (1, 2)
            self.hide_toolboxes()
        # When visible=True: do NOT restore here.
        # Wait for toolbar_expanded signal so toolbar finishes first.

    def _on_toolbar_expanded(self):
        """Called after toolbar fully expands. Now safe to fade in palette."""
        if self._palette_was_visible:
            self._palette_was_visible = False
            self.color_palette.fade_in()

    def _sync_toolboxes_position(self, delta):
        if not self.color_palette.has_been_dragged:
            self.color_palette.move(self.color_palette.pos() + delta)
        if not self.shape_toolbox.has_been_dragged:
            self.shape_toolbox.move(self.shape_toolbox.pos() + delta)

    def toggle_color_palette(self):
        if self.color_palette._fade_state in (1, 2):
            self.color_palette.fade_out()
        else:
            if not self.color_palette.has_been_dragged:
                global_pos = self.toolbar.btn_palette.mapToGlobal(QPoint(0, 0))
                self.color_palette.move(global_pos.x() - self.color_palette.width() - 10, global_pos.y())
            self.color_palette.fade_in()

    def _toggle_shape_toolbox(self):
        if self.shape_toolbox._fade_state in (1, 2):
            self.shape_toolbox.fade_out()
        else:
            if not self.shape_toolbox.has_been_dragged:
                btn_pos = self.toolbar.btn_shape.mapToGlobal(QPoint(0, 0))
                self.shape_toolbox.move(btn_pos.x() - self.shape_toolbox.width() - 10, btn_pos.y())
            self.shape_toolbox.fade_in()

    def _quit_app(self):
        """Cleanly shut down the application, saving final state."""
        # Save toolbar position on exit
        self._save_toolbar_position()
        # Save current sizes one last time
        self.settings.set_many({
            'pen_size': self.overlay.pen_size,
            'highlighter_size': self.overlay.highlighter_size,
            'eraser_size': self.overlay.eraser_size,
        })
        keyboard.unhook_all()
        if hasattr(self, 'tray') and self.tray:
            self.tray.hide()
        QApplication.instance().quit()


# ── Entry point ──

if __name__ == '__main__':
    app = QApplication(sys.argv)
    app.setWindowIcon(QIcon(resource_path("app_icon.ico")))
    app.setQuitOnLastWindowClosed(False)

    # Single instance guard — prevent duplicate processes
    guard = SingleInstanceGuard()
    if not guard.try_acquire():
        # Another instance is already running; we sent it WAKEUP. Exit cleanly.
        sys.exit(0)

    coordinator = MainAppCoordinator()
    guard.wakeup.connect(coordinator.wakeup)
    sys.exit(app.exec())
