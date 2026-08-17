# Material Design 3 Motion, Elevation & Surface Tint

This reference details the physics-based motion choreography and elevation tinting model used in Material Design 3.

---

## 1. Elevation and Surface Tint Model

In Material 3, elevation is communicated primarily through **Surface Tints** rather than harsh dark shadows.

### Surface Tint Overlay Mechanics
When an element gains elevation in light or dark mode, an overlay of the `primary` color is applied with varying opacity over the base `surface` color:

| Elevation Level | Elevation (dp) | Shadow Value | Primary Surface Tint Opacity |
| :--- | :--- | :--- | :--- |
| **Level 0** | 0dp | `none` | 0% |
| **Level 1** | 1dp | `0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)` | 5% |
| **Level 2** | 3dp | `0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)` | 8% |
| **Level 3** | 6dp | `0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3)` | 11% |
| **Level 4** | 8dp | `0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.3)` | 12% |
| **Level 5** | 12dp | `0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px rgba(0,0,0,0.3)` | 14% |

### Surface Container Strategy (M3 Updated Specs)
Prefer using modern container tokens directly instead of calculating manual tints:
- Page canvas: `--md-sys-color-surface`
- Lowest card / dialog behind: `--md-sys-color-surface-container-lowest`
- Default card: `--md-sys-color-surface-container-low`
- Floating card / bar: `--md-sys-color-surface-container`
- Active / hovered surface: `--md-sys-color-surface-container-high`
- Modal dialog / pickers: `--md-sys-color-surface-container-highest`

---

## 2. Motion Easing Curves

Material Design 3 defines specific cubic Bézier curves for natural motion:

```css
:root {
  /* Emphasized Easing (Used for expressive transitions like container transforms) */
  --md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0.0, 0, 1.0);
  --md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0);
  --md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0.0, 0.8, 0.15);

  /* Standard Easing (Used for standard UI elements like chips, switches, icons) */
  --md-sys-motion-easing-standard: cubic-bezier(0.2, 0.0, 0, 1.0);
  --md-sys-motion-easing-standard-decelerate: cubic-bezier(0, 0, 0.2, 1.0);
  --md-sys-motion-easing-standard-accelerate: cubic-bezier(0.3, 0, 1.0, 1.0);
}
```

---

## 3. Container Transform Transition (Card to Detail View)

The Container Transform pattern seamlessly morphs a compact card into a full-screen or expanded modal detail view.

```javascript
export function animateContainerTransform(originElement, targetElement) {
  const first = originElement.getBoundingClientRect();
  targetElement.style.display = 'block';
  const last = targetElement.getBoundingClientRect();

  const deltaX = first.left - last.left;
  const deltaY = first.top - last.top;
  const deltaW = first.width / last.width;
  const deltaH = first.height / last.height;

  targetElement.animate([
    {
      transformOrigin: 'top left',
      transform: `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`,
      borderRadius: 'var(--md-sys-shape-corner-medium)'
    },
    {
      transformOrigin: 'top left',
      transform: 'none',
      borderRadius: 'var(--md-sys-shape-corner-large)'
    }
  ], {
    duration: 350,
    easing: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)'
  });
}
```
