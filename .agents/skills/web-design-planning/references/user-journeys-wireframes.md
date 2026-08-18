# User Journeys & Wireframing Architecture Reference

This reference covers user flow modeling, low-fidelity ASCII wireframing, and interaction mapping for web applications.

---

## 1. ASCII Wireframing Blueprints

Before building HTML/CSS, sketch the visual composition:

### 1.1 Responsive Application Shell with Overlay Tools
```
+------------------------------------------------------------------------+
| [Logo] Pen 11 Web Studio          [Board Name v]   [Share] [Export] [O]|
+------------------------------------------------------------------------+
| +--------------------+ +----------------------------------------------+|
| | [Pencil] (Active)  | |                                              ||
| | [Highlighter]      | |                                              ||
| | [Arrow / Shapes]   | |             CANVAS VIEWPORT                  ||
| | [Text]             | |                                              ||
| | [Eraser]           | |          (Infinite 60fps Stage)              ||
| |--------------------| |                                              ||
| | [Color Swatches]   | |                                              ||
| | [Size Slider: 4px] | |                                              ||
| | [Opacity: 100%]    | |                                              ||
| +--------------------+ +----------------------------------------------+|
| [Bottom Status / Zoom Controls: 100% (-/+)]             [Undo] [Redo]  |
+------------------------------------------------------------------------+
```

### 1.2 SaaS Landing Page Z-Pattern Flow
```
+------------------------------------------------------------------------+
| [Logo] Pen 11         Features   Templates   Pricing       [Try Free]  |
+------------------------------------------------------------------------+
|                                                                        |
|    [Badge: v2.0 Released]                                              |
|    Lightning Fast Screen Annotation for Web & Desktop                  |
|    Annotate, record, and collaborate in real-time with 0 latency.      |
|                                                                        |
|    [  Get Started Free  ]   [  Watch 1-min Demo >  ]                   |
|                                                                        |
|    +-------------------------------------------------------------+     |
|    |           [Interactive Live Product Playground]             |     |
|    +-------------------------------------------------------------+     |
|                                                                        |
+------------------------------------------------------------------------+
| [Social Proof: Trusted by 50,000+ creators and educators]              |
|                                                                        |
| +---------------------+ +---------------------+ +--------------------+ |
| | Feature 1: GPU Draw | | Feature 2: M3 UI    | | Feature 3: Export  | |
| +---------------------+ +---------------------+ +--------------------+ |
+------------------------------------------------------------------------+
```

---

## 2. UX Heuristic Evaluation Checklist

Before considering a layout finished, verify against Jakob Nielsen's heuristics:
1. **Visibility of System Status**: Show loading skeletons, active tool highlights, and save indicators.
2. **Match Between System and Real World**: Use recognizable icons (Pencil, Eraser, Download, Settings).
3. **User Control and Freedom**: Clear Undo/Redo (`Ctrl+Z`, `Ctrl+Y`), Escape closes modals.
4. **Consistency and Standards**: Follow platform conventions (e.g. Spacebar + Drag pans the canvas).
5. **Error Prevention & Recovery**: Confirmation dialogs on destructive clear actions with "Undo" snackbars.
