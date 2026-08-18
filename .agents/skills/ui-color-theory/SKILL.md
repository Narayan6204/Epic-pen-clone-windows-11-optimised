---
name: ui-color-theory
description: Expert guide for advanced UI color theory, perceptual color spaces, WCAG/APCA contrast math, and systematic CSS design tokens architecture.
---

# UI Color Theory & Architecture

This skill provides the theoretical foundation and practical algorithms for engineering world-class color systems in user interfaces. Follow these guidelines to build accessible, scalable, and mathematically sound color architectures.

## 1. Perceptual Color Spaces & Color Math

Modern UI design relies on perceptually uniform color spaces to ensure predictable color scaling and contrast.

*   **HCT (Hue, Chroma, Tone):** The foundation of Material Design 3. Tone (lightness) is mathematically decoupled from Hue and Chroma, ensuring that any two colors with the same Tone have identical perceived lightness, guaranteeing contrast ratios.
*   **OKLCH (Lightness, Chroma, Hue):** A perceptually uniform space natively supported in modern CSS (`oklch()`). It corrects the lightness shifts seen in HSL (e.g., pure yellow appearing lighter than pure blue at the same lightness value).
*   **HSL (Hue, Saturation, Lightness):** Legacy web color space. Easy to reason about but mathematically flawed for accessibility because it ignores human eye sensitivity to different wavelengths (relative luminance).
*   **RGB (Red, Green, Blue):** Hardware-oriented color space. Useful for rendering but useless for algorithmic color manipulation.

**The Math of Lightness:**
Perceptual lightness ($L^*$) is derived from relative luminance ($Y$). The human eye is most sensitive to green (approx 71%), then red (21%), then blue (7%).

## 2. Functional Palette Architecture & The 60-30-10 Distribution Rule

A scalable color system separates semantic intent from absolute color values.

*   **The 60-30-10 Rule:**
    *   **60% Dominant (Surfaces/Backgrounds):** Neutral, low-chroma tones. Creates the canvas.
    *   **30% Secondary (Containers/Supporting Elements):** Mid-chroma brand colors or subtle variations of the dominant hue to create hierarchy.
    *   **10% Accent (Primary Actions/Badges):** High-chroma, high-contrast colors used sparingly to draw the eye to critical interaction points.

*   **Core Tonal Palettes:**
    *   **Primary:** Main brand color, used for prominent UI elements (FABs, primary buttons, active states).
    *   **Secondary:** Less prominent brand color, used for filter chips, selection controls.
    *   **Tertiary:** Contrasting accent color to balance primary and secondary.
    *   **Neutral:** Backgrounds, surfaces, typography.
    *   **Neutral Variant:** Medium-contrast elements like outlines, dividers, and secondary text.
    *   **Error/Semantic:** Status indicators (Red for error, Green for success, etc.).

## 3. WCAG 2.2 & APCA Contrast Standards

### WCAG 2.2 (Relative Luminance Based)
WCAG calculates contrast using a simple ratio between relative luminance values: $CR = (L1 + 0.05) / (L2 + 0.05)$
*   **AA Standard:** 4.5:1 for normal text, 3.0:1 for large text/UI components.
*   **AAA Standard:** 7.0:1 for normal text, 4.5:1 for large text/UI components.

### APCA (Advanced Perceptual Contrast Algorithm)
WCAG 3.0 draft standard. APCA uses a perceptually uniform model that accounts for text weight, size, and context. It returns a Lightness Contrast ($L_c$) value.
*   $L_c 90$: Preferred for body text.
*   $L_c 75$: Minimum for body text.
*   $L_c 60$: Minimum for large headings.
*   $L_c 45$: Minimum for UI components and large icons.

## 4. Tonal Stepping & Surface Container Tiers

Generate palettes by mapping a single hue/chroma to a sequence of lightness steps (0 to 100).

*   **Tonal Scale (0-100):**
    *   `0`: Pure Black
    *   `10-40`: Dark mode surfaces / Light mode text.
    *   `50`: Midtone (often the baseline brand color).
    *   `80-99`: Light mode surfaces / Dark mode text.
    *   `100`: Pure White.

*   **Surface Container Tiers (Elevation without Shadows):**
    Use tonal shifts to convey depth and hierarchy.
    *   `surface-container-lowest`: Lowest level (app background).
    *   `surface-container-low`: E.g., Card backgrounds.
    *   `surface-container`: Default surface.
    *   `surface-container-high`: E.g., Modals, dialogs.
    *   `surface-container-highest`: Highest level, floating elements.

*   **Dark Mode Inversion:**
    Do not simply invert RGB values. Invert the *tonal mapping*. If light mode uses Tone 90 for a surface, dark mode should use Tone 10 or 20 for that same semantic surface. Maintain high contrast for text (e.g., Tone 10 in light mode, Tone 90 in dark mode).

## 5. Semantic Status, State Layers & Interactive Feedback

Colors must change predictably to provide interaction feedback.

*   **Semantic Colors:**
    *   **Error:** High-chroma red (e.g., Tone 40 light / Tone 80 dark).
    *   **Success:** High-chroma green.
    *   **Warning:** High-chroma orange/yellow.
    *   **Info:** High-chroma blue.

*   **State Layers (Opacity-based Overlays):**
    Instead of calculating a new hex color for every hover state, apply an opacity layer using the text/icon color (`on-surface` or `on-primary`) over the base component.
    *   **Hover:** `opacity: 0.08`
    *   **Focus / Keyboard Active:** `opacity: 0.12`
    *   **Pressed / Ripple:** `opacity: 0.12`
    *   **Dragged:** `opacity: 0.16`
    *   **Disabled:** Container at `opacity: 0.12` of the `on-surface` color; Text at `opacity: 0.38`.

## 6. Copy-Paste JavaScript Algorithms

```javascript
/**
 * Calculates Relative Luminance (Y) from RGB.
 * RGB values must be [0, 255].
 */
function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calculates WCAG Contrast Ratio.
 * Returns a value between 1 and 21.
 */
function getContrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Generates an OKLCH Tonal Palette for a given Hue and Chroma.
 * Steps: 0 to 100.
 */
function generateOklchPalette(hue, chroma) {
    const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
    const palette = {};
    steps.forEach(step => {
        // Lightness ranges from 0.0 to 1.0 in OKLCH
        const lightness = step / 100;
        palette[step] = `oklch(${lightness} ${chroma} ${hue})`;
    });
    return palette;
}
```

## 7. Modern CSS Design Tokens Blueprint

Use CSS Custom Properties to define the color system. Map absolute palette values to semantic tokens.

```css
:root {
  /* 1. Core Palette (OKLCH Example) */
  --palette-primary-40: oklch(0.45 0.15 250);
  --palette-primary-90: oklch(0.92 0.05 250);
  --palette-neutral-10: oklch(0.20 0.01 250);
  --palette-neutral-90: oklch(0.95 0.01 250);
  --palette-neutral-98: oklch(0.98 0.005 250);

  /* 2. Semantic Light Theme Tokens */
  --color-primary: var(--palette-primary-40);
  --color-on-primary: #FFFFFF;
  --color-primary-container: var(--palette-primary-90);
  --color-on-primary-container: var(--palette-primary-10);

  --color-background: var(--palette-neutral-98);
  --color-on-background: var(--palette-neutral-10);
  
  --color-surface: var(--palette-neutral-98);
  --color-surface-variant: var(--palette-neutral-90);
  --color-on-surface: var(--palette-neutral-10);
  --color-on-surface-variant: var(--palette-neutral-30);

  --color-outline: var(--palette-neutral-50);
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Semantic Dark Theme Tokens */
    --color-primary: var(--palette-primary-80);
    --color-on-primary: var(--palette-primary-20);
    --color-primary-container: var(--palette-primary-30);
    --color-on-primary-container: var(--palette-primary-90);

    --color-background: var(--palette-neutral-10);
    --color-on-background: var(--palette-neutral-90);
    
    --color-surface: var(--palette-neutral-10);
    --color-surface-variant: var(--palette-neutral-30);
    --color-on-surface: var(--palette-neutral-90);
    --color-on-surface-variant: var(--palette-neutral-80);

    --color-outline: var(--palette-neutral-60);
  }
}
```

## 8. Quality Assurance & Color Audit Checklist

Before finalizing any color system, perform the following verifications:

- [ ] **WCAG AA Compliance Check:** Ensure all text against its background passes the 4.5:1 ratio (3.0:1 for large text).
- [ ] **Component Boundary Contrast:** Ensure form inputs, buttons, and card borders have at least a 3.0:1 contrast against their surrounding canvas.
- [ ] **Semantic Consistency:** Verify that `on-*` tokens are strictly used for text/icons placed *on top* of their respective container (e.g., `--color-on-primary` is only used on top of `--color-primary`).
- [ ] **State Layer Visibility:** Confirm that hover and focus overlays (8% and 12% opacity) produce a visible shift in contrast on all surface tiers.
- [ ] **Color Blindness Simulation:** Test the UI through Protanopia, Deuteranopia, and Tritanopia simulators. Ensure critical information is not conveyed by color alone.
- [ ] **Dark Mode Glare Reduction:** Avoid pure `#FFFFFF` text on pure `#000000` backgrounds; use Tone 90 text on Tone 10 backgrounds to prevent halation/astigmatism bleed.
