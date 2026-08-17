---
name: pyqt-animation-skill
description: >
  Safe PyQt6 animation patterns for the Pen 11 screen annotation app.
  Covers crash-free toolbar collapse/expand, sub-panel sequencing, opacity
  fades, and position slides on frameless translucent overlay windows.
  Use this skill BEFORE writing any animation code in main.py.
---

# PyQt6 Animation Skill — Pen 11

## MANDATORY: Read Before Writing Any Animation Code

This skill documents every crash, every failed approach, and every
working solution discovered during Pen 11 development. Ignoring these
rules WILL cause the app to crash silently or freeze on Windows 11.

---

## 1. Architecture of Pen 11 (Context You Must Know)

```
MainAppCoordinator (QObject)
+-- OverlayWindow          — Full-screen transparent drawing canvas
¦                            Flags: FramelessWindowHint + WA_TranslucentBackground
+-- ToolbarWindow          — Floating pill-shaped toolbar
¦                            Flags: FramelessWindowHint + WA_TranslucentBackground
¦                            Custom paintEvent using QPainter + QPainterPath
+-- FloatingColorPalette   — Sub-panel for color picking
+-- FloatingShapeToolbox   — Sub-panel for shape selection

ShortcutSignals (QObject)  — Central signal bus connecting all windows
```

Critical constraints:
- ALL windows use WA_TranslucentBackground + FramelessWindowHint
- ToolbarWindow draws itself using a custom paintEvent with QPainter
- The overlay canvas ALSO uses QPainter for all drawing operations
- These two constraints create specific crash conditions (see Section 3)

---

## 2. Safe Animation Properties (Use These)

The following Qt properties are SAFE to animate with QPropertyAnimation
on any widget in Pen 11:

| Property        | Qt Type | What It Animates            | Notes                        |
|:----------------|:--------|:----------------------------|:-----------------------------|
| maximumHeight   | int     | Collapse/expand vertically  | Best for toolbar shrink      |
| minimumHeight   | int     | Expand from zero upward     | Use with maximumHeight       |
| pos             | QPoint  | Slide widget across screen  | Safe on top-level windows    |
| windowOpacity   | float   | Fade entire window in/out   | Only on top-level QWidget    |
| geometry        | QRect   | RESTRICTED — see Section 3  | Only safe on non-layout widgets |

### How to Use maximumHeight Animation (Recommended for Toolbar)

```python
from PyQt6.QtCore import QPropertyAnimation, QEasingCurve

anim = QPropertyAnimation(self, b"maximumHeight")
anim.setDuration(300)                               # 300ms feels natural
anim.setEasingCurve(QEasingCurve.Type.InOutCubic)  # Smooth start and end
anim.setStartValue(self.height())                   # Current height
anim.setEndValue(target_height)                     # Target height
anim.finished.connect(self._on_anim_finished)       # ALWAYS connect finished
anim.start()
```

### How to Use pos Animation (Slide-in/out)

```python
anim = QPropertyAnimation(widget, b"pos")
anim.setDuration(250)
anim.setEasingCurve(QEasingCurve.Type.OutCubic)
anim.setStartValue(widget.pos())
anim.setEndValue(QPoint(target_x, target_y))
anim.start()
```

### How to Use windowOpacity Fade (Top-level windows only)

```python
anim = QPropertyAnimation(window, b"windowOpacity")
anim.setDuration(200)
anim.setEasingCurve(QEasingCurve.Type.InOutSine)
anim.setStartValue(0.0)
anim.setEndValue(1.0)
anim.start()
# After fade-out finishes: call window.hide(), reset opacity to 1.0
```

---

## 3. CRASH REFERENCE — Banned Techniques

### CRASH #1 — QGraphicsOpacityEffect Segfault

Symptom: App crashes silently with no Python traceback. Process dies.

Root Cause: QGraphicsOpacityEffect interacts with Qt's graphics pipeline.
On Windows with WA_TranslucentBackground, the compositor re-composites
the widget's alpha channel during paint. This double-composition causes a
null pointer dereference inside QGraphicsEffectPrivate.

BANNED CODE:
```python
# NEVER DO THIS in Pen 11
effect = QGraphicsOpacityEffect()
widget.setGraphicsEffect(effect)
anim = QPropertyAnimation(effect, b"opacity")
```

Safe Alternative: Use windowOpacity on top-level windows, or
hide/show widgets without fading.

---

### CRASH #2 — Geometry Animation on Layout-Managed Widgets

Symptom: App crashes with "QPainter: It is not safe to use pixmaps outside
the GUI thread" or "QPainter::begin: A paint device can only be painted
by one painter at a time".

Root Cause: Animating geometry on a widget inside a QVBoxLayout triggers
a layout recalculation on EVERY frame, forcing a repaint() which starts
a new QPainter pass while the previous frame's QPainter may still be active.

BANNED CODE:
```python
# NEVER DO THIS — widget is inside a QVBoxLayout
anim = QPropertyAnimation(toolbar_button, b"geometry")
```

Safe Alternative: Animate maximumHeight on the container widget
instead of geometry of children. Hide/show children BEFORE the animation.

---

### CRASH #3 — QPixmap Snapshot During Paint

Symptom: "QPainter::begin: Paint device returned engine == 0, type: 3"

Root Cause: Taking a QPixmap snapshot (widget.grab()) while its
paintEvent is in progress causes a recursive paint cycle.

BANNED CODE:
```python
# NEVER DO THIS inside paintEvent or during animation
snapshot = widget.grab()
```

Safe Alternative: Never use pixel snapshots for animation.
Use maximumHeight or opacity instead.

---

### CRASH #4 — setFixedSize During Active Animation

Symptom: Widget jumps to wrong size, layout corrupts, or silent crash.

Root Cause: setFixedSize() sets BOTH minimumSize and maximumSize
simultaneously. If called while QPropertyAnimation is animating
maximumHeight, the minimum constraint fights the animation target.

BANNED CODE:
```python
# NEVER call setFixedSize while an animation is running
anim.start()
widget.setFixedSize(80, 80)  # This will corrupt the animation
```

Safe Alternative: Call setFixedHeight() only inside the
anim.finished handler, AFTER the animation fully completes.

---

### WARNING — Starting Animation Before Widget is Shown

Symptom: Animation plays but widget does not move/resize.

Root Cause: self.height() returns 0 if the widget has not been shown yet.

Fix: Always call widget.show() and QApplication.processEvents()
before starting an animation that reads the current widget size.

---

## 4. The 4-State Machine Pattern (Mandatory for Toggle Animations)

Any animation that can be triggered repeatedly MUST use a state machine.

### States
  0 = EXPANDED    — Fully visible, animation idle
  1 = COLLAPSING  — Currently shrinking (animation running)
  2 = COLLAPSED   — Fully hidden, animation idle
  3 = EXPANDING   — Currently growing (animation running)

### Complete Implementation Template

```python
class AnimatedToolbar(QWidget):
    def __init__(self):
        super().__init__()
        self._collapse_state = 0        # Start EXPANDED
        self._full_height = None
        self._collapsible_widgets = []
        self._collapsible_separators = []

        self._height_anim = QPropertyAnimation(self, b"maximumHeight")
        self._height_anim.setDuration(300)
        self._height_anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._height_anim.finished.connect(self._on_anim_finished)

    def start_collapse(self):
        if self._collapse_state == 2:   # Already collapsed
            return
        if self._collapse_state == 3:   # Currently expanding — reverse
            self._height_anim.stop()

        self._collapse_state = 1
        self._full_height = self.height()

        # Step 1: Lock height to prevent layout jump when hiding children
        self.setFixedHeight(self._full_height)

        # Step 2: Hide children BEFORE animating
        for w in self._collapsible_widgets:
            w.hide()
        for s in self._collapsible_separators:
            s.hide()

        # Step 3: Release fixed height, set soft constraint
        self.setMinimumHeight(0)
        self.setMaximumHeight(self._full_height)

        # Step 4: Start animation
        self._height_anim.setStartValue(self._full_height)
        self._height_anim.setEndValue(80)  # Pill height
        self._height_anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._height_anim.start()

    def start_expand(self):
        if self._collapse_state == 0:   # Already expanded
            return
        if self._collapse_state == 1:   # Currently collapsing — reverse
            self._height_anim.stop()

        self._collapse_state = 3
        current_h = self.height()
        target_h = self._full_height or 400

        self.setMinimumHeight(0)
        self.setMaximumHeight(current_h)

        self._height_anim.setStartValue(current_h)
        self._height_anim.setEndValue(target_h)
        self._height_anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._height_anim.start()

    def _on_anim_finished(self):
        if self._collapse_state == 1:   # Finished collapsing
            self._collapse_state = 2
            self.setFixedHeight(self.height())

        elif self._collapse_state == 3: # Finished expanding
            for w in self._collapsible_widgets:
                w.show()
            for s in self._collapsible_separators:
                s.show()
            self.setMinimumHeight(0)
            self.setMaximumHeight(16777215)  # QWIDGETSIZE_MAX
            if self._full_height:
                self.setFixedHeight(self._full_height)
            self._collapse_state = 0
```

---

## 5. Multi-Window Animation Sequencing

Use Qt signals to chain animations. NEVER use QTimer.singleShot with
hardcoded millisecond delays.

### Signal-Based Chaining Pattern

```python
# In ShortcutSignals:
toolbar_animation_finished = pyqtSignal(bool)  # True=expanded, False=collapsed

# In ToolbarWindow._on_anim_finished:
self.signals.toolbar_animation_finished.emit(True)  # After expanding

# In MainAppCoordinator:
self.signals.toolbar_animation_finished.connect(self._on_toolbar_done)

def _on_toolbar_done(self, expanded):
    if expanded and self._palette_was_visible:
        self.color_palette.show()  # Appears AFTER toolbar is full
```

### Correct Collapse Order (Canvas Hide)
  1. visibility_changed(False) fires
  2. Coordinator saves _palette_was_visible state
  3. Coordinator closes sub-panels (palette, shape toolbox, menus)
  4. ToolbarWindow.start_collapse() runs — hides buttons — animates shrink
  5. [300ms animation plays]
  6. _on_anim_finished() — state = COLLAPSED — emit toolbar_animation_finished(False)

### Correct Expand Order (Canvas Show)
  1. visibility_changed(True) fires
  2. ToolbarWindow.start_expand() runs — animates grow
  3. [300ms animation plays]
  4. _on_anim_finished() — restores buttons — state = EXPANDED
  5. emit toolbar_animation_finished(True)
  6. Coordinator receives signal — restores color palette if it was open

---

## 6. Problem ? Solution Quick Reference

Problem: Collapse/shrink a widget smoothly
Solution: Section 4 — 4-State Machine + maximumHeight animation

Problem: Fade a floating sub-window in or out
Solution: windowOpacity animation (Section 2). Window must be top-level.

Problem: Slide a panel in from the side
Solution: pos animation (Section 2). Store hidden position off-screen.

Problem: Animate two things one after the other
Solution: Qt signals — finished.connect(start_next). Never use QTimer delays.

Problem: Animate two things at the same time
Solution:
```python
group = QParallelAnimationGroup()
group.addAnimation(anim_a)
group.addAnimation(anim_b)
group.start()
```

Problem: App crashes silently when adding opacity
Solution: You used QGraphicsOpacityEffect. Remove it. See Section 3 Crash #1.

Problem: App crashes with QPainter errors when animating size
Solution: You animated geometry on a layout widget. Use maximumHeight. Crash #2.

Problem: Animation works once but breaks on rapid key presses
Solution: Implement the 4-State Machine from Section 4.

Problem: Widget jumps to wrong size before animation starts
Solution: Follow Step 1-2-3-4 order exactly in start_collapse() in Section 4.

Problem: Sub-panel appears before toolbar finishes expanding
Solution: Use signal-chaining from Section 5 instead of restoring in visibility_changed.

Problem: Animation does nothing (widget stays same size)
Solution: Widget was not shown yet so height() returned 0. Or animation was
garbage collected. Always store animation as self._anim instance variable.

---

## 7. Easing Curve Cheat Sheet

| Easing Curve   | Feel                | Best Use Case              |
|:---------------|:--------------------|:---------------------------|
| InOutCubic     | Slow-fast-slow      | Toolbar expand/collapse    |
| OutCubic       | Fast then slow      | Panels sliding in          |
| InCubic        | Slow then fast      | Panels sliding out         |
| OutBack        | Slight overshoot    | Popups appearing (playful) |
| InOutSine      | Gentle and smooth   | Opacity fades              |
| Linear         | Constant speed      | Progress bars only         |

---

## 8. Animation Duration Guidelines

| Animation Type          | Duration | Notes                           |
|:------------------------|:---------|:--------------------------------|
| Toolbar collapse/expand | 300ms    | Longer feels sluggish           |
| Sub-panel slide in      | 200ms    | Faster feels snappier           |
| Sub-panel slide out     | 150ms    | Slightly faster than slide in   |
| Opacity fade in         | 180ms    |                                 |
| Opacity fade out        | 120ms    | Fade out is always faster       |
| Menu popup              | 150ms    | Instant-feeling                 |
| Menu dismiss            | 100ms    |                                 |

---

## 9. Required Imports Checklist

```python
from PyQt6.QtCore import (
    QPropertyAnimation,
    QEasingCurve,
    QParallelAnimationGroup,
    QSequentialAnimationGroup,
    QAbstractAnimation,
)
```

Check existing imports at top of main.py before adding duplicates.

---

## 10. Testing Checklist After Every Animation Change

- [ ] App starts without crash
- [ ] Ctrl+5 once — toolbar shrinks, canvas hides
- [ ] Ctrl+5 again — toolbar expands, canvas shows
- [ ] Ctrl+5 rapidly 5 times — no crash, no stuck state
- [ ] Open Color Palette, press Ctrl+5 twice — palette restores correctly
- [ ] Open Shape Toolbox, press Ctrl+5 — toolbox closes before collapse
- [ ] Drawing works normally after animation completes
- [ ] Dragging toolbar pill works when collapsed
- [ ] _collapse_state ends at 0 (EXPANDED) or 2 (COLLAPSED), never 1 or 3

---

## 11. Key File Reference

| File      | Relevant Section                                      |
|:----------|:------------------------------------------------------|
| main.py   | ShortcutSignals — add coordination signals here       |
| main.py   | ToolbarWindow.__init__ — init _height_anim, states    |
| main.py   | ToolbarWindow — add start_collapse, start_expand      |
| main.py   | MainAppCoordinator.__init__ — connect signals         |
| main.py   | MainAppCoordinator — hide_toolboxes, visibility logic |
