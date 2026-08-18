# Typography & Design Token Architecture Reference

This reference covers mathematical fluid typography, font pairing rules, and custom property token architectures for state-of-the-art web projects.

---

## 1. Fluid Typography Scale with CSS `clamp()`

Fluid typography scales smoothly between mobile (e.g. 360px viewport) and desktop (1280px viewport) without abrupt font size jumps at arbitrary media query breakpoints.

Formula:
$$V_f = \text{clamp}(V_{\min}, V_{\min} + (V_{\max} - V_{\min}) \cdot \frac{100\text{vw} - W_{\min}}{W_{\max} - W_{\min}}, V_{\max})$$

### Production Fluid Typography Tokens

```css
:root {
  /* Fluid Scale from 360px (mobile) to 1280px (desktop) */
  --font-display-large: clamp(2.5rem, 1.85rem + 2.89vw, 3.75rem); /* 40px -> 60px */
  --font-display-medium: clamp(2.0rem, 1.58rem + 1.85vw, 2.8rem); /* 32px -> 45px */
  --font-headline-large: clamp(1.75rem, 1.54rem + 0.93vw, 2.25rem); /* 28px -> 36px */
  --font-headline-medium: clamp(1.375rem, 1.25rem + 0.56vw, 1.75rem); /* 22px -> 28px */
  --font-title-large: clamp(1.125rem, 1.04rem + 0.37vw, 1.375rem); /* 18px -> 22px */
  --font-title-medium: 1rem; /* 16px */
  --font-body-large: clamp(1rem, 0.96rem + 0.19vw, 1.125rem); /* 16px -> 18px */
  --font-body-medium: 0.875rem; /* 14px */
  --font-label-large: 0.875rem; /* 14px */
  --font-label-small: 0.6875rem; /* 11px */

  /* Line Heights */
  --leading-tight: 1.15;
  --leading-snug: 1.3;
  --leading-normal: 1.5;
  --leading-relaxed: 1.65;

  /* Letter Spacing */
  --tracking-tighter: -0.03em;
  --tracking-tight: -0.015em;
  --tracking-normal: 0em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;

  /* Font Families */
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}
```

---

## 2. Professional Typography Pairing Best Practices

1. **Brand & High Personality**: `Plus Jakarta Sans` (Geometric, clean, modern) paired with `JetBrains Mono` for code/data.
2. **Editorial & High Legibility**: `Inter` or `Roboto Flex` for versatile high-density dashboards.
3. **Contrast Rules**:
   - Never pair two similar geometric sans-serifs.
   - Maintain a minimum 1.25x scale ratio between adjacent headline levels.
   - Never set body copy below 14px (0.875rem) or line-height below 1.4 for paragraph text.
