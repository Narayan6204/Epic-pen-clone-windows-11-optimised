import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QPointF, Qt
from PyQt6.QtGui import QMouseEvent, QPainterPath, QPen
import main

class MockSignal:
    def connect(self, *args, **kwargs):
        pass
    def emit(self, *args, **kwargs):
        pass

class MockSignals:
    def __getattr__(self, name):
        return MockSignal()

app = QApplication(sys.argv)
signals = MockSignals()
window = main.OverlayWindow(signals)
window.ink_visible = True
window.mode = main.ToolMode.PEN

# Mock a path
path = QPainterPath()
path.addRect(10, 10, 100, 100)
window.paths.append({'path': path, 'pen': QPen(), 'mode': main.ToolMode.PEN})
window.selected_path_index = 0
window.mode = main.ToolMode.SELECT

# Select mode, simulate click on rotate handle
# First calculate rot_handle
rot_center, del_center = window._get_selection_handles(window.paths[0].get('obb', main.QPolygonF(path.boundingRect())))
print("rot_center:", rot_center)
print("del_center:", del_center)

event = QMouseEvent(QMouseEvent.Type.MouseButtonPress, rot_center, Qt.MouseButton.LeftButton, Qt.MouseButton.LeftButton, Qt.KeyboardModifier.NoModifier)
try:
    window.mousePressEvent(event)
    print("Mouse press passed")
except Exception as e:
    import traceback
    traceback.print_exc()

# Simulate move
try:
    move_event = QMouseEvent(QMouseEvent.Type.MouseMove, QPointF(rot_center.x() + 10, rot_center.y() + 10), Qt.MouseButton.LeftButton, Qt.MouseButton.LeftButton, Qt.KeyboardModifier.NoModifier)
    window.mouseMoveEvent(move_event)
    print("Mouse move passed")
except Exception as e:
    import traceback
    traceback.print_exc()

# Simulate paint event to see if it crashes there
try:
    from PyQt6.QtGui import QPaintEvent
    from PyQt6.QtCore import QRect
    paint_event = QPaintEvent(QRect(0,0,100,100))
    window.paintEvent(paint_event)
    print("Paint passed")
except Exception as e:
    import traceback
    traceback.print_exc()

# Simulate delete handle
event2 = QMouseEvent(QMouseEvent.Type.MouseButtonPress, del_center, Qt.MouseButton.LeftButton, Qt.MouseButton.LeftButton, Qt.KeyboardModifier.NoModifier)
try:
    window.mousePressEvent(event2)
    print("Mouse press 2 passed")
except Exception as e:
    import traceback
    traceback.print_exc()

sys.exit(0)
