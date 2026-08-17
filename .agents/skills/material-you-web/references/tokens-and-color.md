# Material Design 3 (Material You) Design Tokens & Dynamic Color Engine

This guide provides deep reference documentation for implementing Material Design 3 token architecture, HCT (Hue, Chroma, Tone) color system, dynamic color scheme generation, and contrast-safe tonal palettes.

---

## 1. The HCT (Hue-Chroma-Tone) Color Space

Traditional color spaces (RGB, HSL, HSV) are not **perceptually uniform**. For example, in HSL, pure yellow (Hue 60, Lightness 50%) appears significantly brighter than pure blue (Hue 240, Lightness 50%), causing unpredictable accessibility contrast failures.

Material Design 3 uses **HCT**:
- **H (Hue)**: Color degree 0° to 360° (CAM16 color appearance model).
- **C (Chroma)**: Colorfulness / purity (0 to ~120).
- **T (Tone)**: Perceived luminance from 0 (absolute black) to 100 (pure white), identical to CIELAB $L^*$.

### Key Advantage
A contrast ratio between Tone $T_1$ and Tone $T_2$ is mathematically guaranteed regardless of Hue or Chroma:
- Tone delta $\Delta T \ge 40$ ensures WCAG AA contrast for large text (3:1).
- Tone delta $\Delta T \ge 50$ ensures WCAG AA contrast for normal text (4.5:1).
- Tone delta $\Delta T \ge 70$ ensures WCAG AAA contrast (7:1).

---

## 2. The 5 Core Tonal Palettes

From a single seed color (e.g. `#0061A4`), M3 generates 5 primary palettes, each sampled at tones:
`0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100`.

1. **Primary**: Seed Hue, Chroma ~48 (Key accent color).
2. **Secondary**: Seed Hue, Chroma ~16 (Complementary, muted accent).
3. **Tertiary**: Seed Hue + 60° (or harmonic offset), Chroma ~24 (Playful contrast accent).
4. **Neutral**: Seed Hue, Chroma ~4 (Surfaces, backgrounds).
5. **Neutral Variant**: Seed Hue, Chroma ~8 (Borders, outlines, muted surface variants).
6. **Error**: Fixed Hue ~25°, Chroma ~84 (Error states).

---

## 3. Light & Dark Role Mapping Matrix

| Semantic Token Role | Light Mode Tone Value | Dark Mode Tone Value |
| :--- | :--- | :--- |
| **primary** | Primary 40 | Primary 80 |
| **on-primary** | Primary 100 | Primary 20 |
| **primary-container** | Primary 90 | Primary 30 |
| **on-primary-container** | Primary 10 | Primary 90 |
| **secondary** | Secondary 40 | Secondary 80 |
| **on-secondary** | Secondary 100 | Secondary 20 |
| **secondary-container** | Secondary 90 | Secondary 30 |
| **on-secondary-container** | Secondary 10 | Secondary 90 |
| **tertiary** | Tertiary 40 | Tertiary 80 |
| **on-tertiary** | Tertiary 100 | Tertiary 20 |
| **tertiary-container** | Tertiary 90 | Tertiary 30 |
| **on-tertiary-container** | Tertiary 10 | Tertiary 90 |
| **error** | Error 40 | Error 80 |
| **on-error** | Error 100 | Error 20 |
| **error-container** | Error 90 | Error 30 |
| **on-error-container** | Error 10 | Error 90 |
| **background** / **surface** | Neutral 98 | Neutral 6 |
| **on-background** / **on-surface** | Neutral 10 | Neutral 90 |
| **surface-dim** | Neutral 87 | Neutral 6 |
| **surface-bright** | Neutral 98 | Neutral 24 |
| **surface-container-lowest** | Neutral 100 | Neutral 4 |
| **surface-container-low** | Neutral 96 | Neutral 10 |
| **surface-container** | Neutral 94 | Neutral 12 |
| **surface-container-high** | Neutral 92 | Neutral 17 |
| **surface-container-highest** | Neutral 90 | Neutral 22 |
| **surface-variant** | Neutral Variant 90 | Neutral Variant 30 |
| **on-surface-variant** | Neutral Variant 30 | Neutral Variant 80 |
| **outline** | Neutral Variant 50 | Neutral Variant 60 |
| **outline-variant** | Neutral Variant 80 | Neutral Variant 30 |
| **inverse-surface** | Neutral 20 | Neutral 90 |
| **inverse-on-surface** | Neutral 95 | Neutral 20 |
| **inverse-primary** | Primary 80 | Primary 40 |

---

## 4. Pure Browser-Side Dynamic Theme Generator Script

You can include this lightweight JavaScript module to generate dynamic M3 themes in real-time from any user-selected hex color or wallpaper:

```javascript
/**
 * Generates an M3 HSL-approximated dynamic color system
 * For exact CAM16/HCT calculation, use @material/material-color-utilities
 */
export function generateM3ThemeFromHex(seedHex) {
  // Convert HEX to RGB
  const r = parseInt(seedHex.slice(1, 3), 16) / 255;
  const g = parseInt(seedHex.slice(3, 5), 16) / 255;
  const b = parseInt(seedHex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }

  const primaryH = h;
  const secondaryH = (h + 10) % 360;
  const tertiaryH = (h + 60) % 360;

  return {
    light: {
      '--md-sys-color-primary': `hsl(${primaryH}, 75%, 35%)`,
      '--md-sys-color-on-primary': '#ffffff',
      '--md-sys-color-primary-container': `hsl(${primaryH}, 80%, 90%)`,
      '--md-sys-color-on-primary-container': `hsl(${primaryH}, 80%, 12%)`,
      '--md-sys-color-secondary': `hsl(${secondaryH}, 25%, 40%)`,
      '--md-sys-color-on-secondary': '#ffffff',
      '--md-sys-color-secondary-container': `hsl(${secondaryH}, 30%, 90%)`,
      '--md-sys-color-on-secondary-container': `hsl(${secondaryH}, 35%, 15%)`,
      '--md-sys-color-tertiary': `hsl(${tertiaryH}, 40%, 40%)`,
      '--md-sys-color-on-tertiary': '#ffffff',
      '--md-sys-color-tertiary-container': `hsl(${tertiaryH}, 50%, 90%)`,
      '--md-sys-color-on-tertiary-container': `hsl(${tertiaryH}, 50%, 15%)`,
      '--md-sys-color-surface': `hsl(${primaryH}, 15%, 98%)`,
      '--md-sys-color-surface-dim': `hsl(${primaryH}, 12%, 88%)`,
      '--md-sys-color-surface-bright': `hsl(${primaryH}, 15%, 99%)`,
      '--md-sys-color-surface-container-lowest': '#ffffff',
      '--md-sys-color-surface-container-low': `hsl(${primaryH}, 14%, 96%)`,
      '--md-sys-color-surface-container': `hsl(${primaryH}, 14%, 94%)`,
      '--md-sys-color-surface-container-high': `hsl(${primaryH}, 14%, 92%)`,
      '--md-sys-color-surface-container-highest': `hsl(${primaryH}, 14%, 90%)`,
      '--md-sys-color-on-surface': `hsl(${primaryH}, 15%, 12%)`,
      '--md-sys-color-surface-variant': `hsl(${primaryH}, 15%, 90%)`,
      '--md-sys-color-on-surface-variant': `hsl(${primaryH}, 12%, 30%)`,
      '--md-sys-color-outline': `hsl(${primaryH}, 10%, 50%)`,
      '--md-sys-color-outline-variant': `hsl(${primaryH}, 12%, 80%)`,
    },
    dark: {
      '--md-sys-color-primary': `hsl(${primaryH}, 80%, 80%)`,
      '--md-sys-color-on-primary': `hsl(${primaryH}, 80%, 20%)`,
      '--md-sys-color-primary-container': `hsl(${primaryH}, 75%, 30%)`,
      '--md-sys-color-on-primary-container': `hsl(${primaryH}, 80%, 90%)`,
      '--md-sys-color-secondary': `hsl(${secondaryH}, 35%, 80%)`,
      '--md-sys-color-on-secondary': `hsl(${secondaryH}, 35%, 20%)`,
      '--md-sys-color-secondary-container': `hsl(${secondaryH}, 30%, 30%)`,
      '--md-sys-color-on-secondary-container': `hsl(${secondaryH}, 30%, 90%)`,
      '--md-sys-color-tertiary': `hsl(${tertiaryH}, 50%, 80%)`,
      '--md-sys-color-on-tertiary': `hsl(${tertiaryH}, 50%, 20%)`,
      '--md-sys-color-tertiary-container': `hsl(${tertiaryH}, 45%, 30%)`,
      '--md-sys-color-on-tertiary-container': `hsl(${tertiaryH}, 50%, 90%)`,
      '--md-sys-color-surface': `hsl(${primaryH}, 15%, 8%)`,
      '--md-sys-color-surface-dim': `hsl(${primaryH}, 15%, 7%)`,
      '--md-sys-color-surface-bright': `hsl(${primaryH}, 15%, 22%)`,
      '--md-sys-color-surface-container-lowest': `hsl(${primaryH}, 15%, 5%)`,
      '--md-sys-color-surface-container-low': `hsl(${primaryH}, 14%, 10%)`,
      '--md-sys-color-surface-container': `hsl(${primaryH}, 14%, 12%)`,
      '--md-sys-color-surface-container-high': `hsl(${primaryH}, 14%, 16%)`,
      '--md-sys-color-surface-container-highest': `hsl(${primaryH}, 14%, 20%)`,
      '--md-sys-color-on-surface': `hsl(${primaryH}, 10%, 90%)`,
      '--md-sys-color-surface-variant': `hsl(${primaryH}, 10%, 26%)`,
      '--md-sys-color-on-surface-variant': `hsl(${primaryH}, 10%, 75%)`,
      '--md-sys-color-outline': `hsl(${primaryH}, 8%, 55%)`,
      '--md-sys-color-outline-variant': `hsl(${primaryH}, 10%, 28%)`,
    }
  };
}

export function applyM3Theme(themeObj, isDark = false) {
  const root = document.documentElement;
  const tokens = isDark ? themeObj.dark : themeObj.light;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}
```
