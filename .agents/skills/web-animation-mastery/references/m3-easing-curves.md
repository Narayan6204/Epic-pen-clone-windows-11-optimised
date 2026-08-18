# Material Design 3 Motion Curves & Spring Physics Reference

This reference details the mathematical physics and CSS implementations of M3 motion curves and physics-based spring animations.

---

## 1. M3 Motion Curve Matrix

| Easing Token | Cubic-Bezier Value | Motion Character | Best Use Case |
| :--- | :--- | :--- | :--- |
| `emphasized` | `cubic-bezier(0.2, 0.0, 0.0, 1.0)` | Dramatic deceleration with expressive entry | Modals, full-screen container morphs, FAB expansions |
| `emphasized-accelerate` | `cubic-bezier(0.3, 0.0, 0.8, 0.15)` | Fast initial acceleration off-screen | Dismissing sheets, closing dialogs |
| `emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1.0)` | Smooth landing into view | Incoming tooltips, toasts, drawer slide-in |
| `standard` | `cubic-bezier(0.2, 0.0, 0, 1.0)` | Natural, balanced motion | Button hover, icon state shifts, color transitions |
| `standard-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | Direct exit | Fade outs, collapsed menu closing |
| `standard-decelerate` | `cubic-bezier(0, 0, 0, 1)` | Direct entry | Fade ins, dropdown opens |

---

## 2. Spring Physics in CSS via `linear()` Generator

CSS `linear()` allows true spring physics directly in stylesheets without runtime JavaScript calculation:

```css
:root {
  /* Bouncy spring curve (Stiffness 180, Damping 12) */
  --spring-bounce: linear(
    0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%,
    1.017, 1.077, 1.121 23%, 1.149 26.3%, 1.159 29.7%, 1.138 34.1%,
    1.051 43.1%, 1.017 48%, 0.993 54.2%, 0.985 61.2%, 0.992 68.2%,
    1 78.5%, 1.002 87.2%, 1
  );
}

.interactive-bounce-fab {
  transition: transform 600ms var(--spring-bounce);
}

.interactive-bounce-fab:hover {
  transform: scale(1.08);
}

.interactive-bounce-fab:active {
  transform: scale(0.92);
}
```

---

## 3. `prefers-reduced-motion` Compliance

Always wrap motion with reduced-motion fallbacks for accessibility:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
