---
name: material-you-web
description: >-
  Expert guide for designing and developing modern Material Design 3 (Material You / m3.material.io) websites and web applications.
  Use whenever the user wants to build, style, or refactor web interfaces using Material Design 3, dynamic HCT color schemes, tonal palettes,
  M3 design tokens, adaptive navigation (Navigation Bar, Rail, Drawer), M3 component specifications (Buttons, Cards, FABs, Chips, Dialogs),
  state layers, ripple effects, surface tints, or M3 motion curves and transitions.
---

# Material Design 3 (Material You) Web Development Skill

This skill provides comprehensive instructions, design tokens, mathematical algorithms, CSS architectures, and component patterns for building state-of-the-art web interfaces mirroring **[m3.material.io](https://m3.material.io)** (Google Material Design 3 / Material You).

---

## 1. Core Architecture & Philosophy

Material You (M3) centers on **personalization, adaptivity, and expressive surfaces**:
1. **Dynamic Color & HCT**: Color is generated dynamically from seed/wallpaper colors using the Hue-Chroma-Tone (HCT) color space, generating 5 core tonal palettes (Primary, Secondary, Tertiary, Neutral, Neutral Variant) with guaranteed contrast ratios.
2. **Surface Elevation via Tints & Containers**: Instead of relying purely on heavy drop shadows, M3 uses surface container tiers (`surface-container-lowest` to `surface-container-highest`) and translucent primary surface tint overlays.
3. **State Layers & Interactive Ripples**: Hover, focus, press, and drag states use semi-transparent overlays on top of the container, plus dynamic radial ink ripples.
4. **Adaptive Navigation**: Breakpoint-driven navigation transitioning seamlessly between Mobile Bottom Navigation Bar (<600px), Tablet Navigation Rail (600–840px), and Desktop Navigation Drawer (>840px).
5. **Expressive Motion**: Custom cubic-bezier easings (Emphasized, Standard) and container morphing transitions.

---

## 2. Design Token System

Always structure CSS using the official M3 token hierarchy:
- **Reference Tokens**: Raw values (e.g., `--md-ref-palette-primary40: #0061A4;`)
- **System Tokens**: Semantic roles (e.g., `--md-sys-color-primary: var(--md-ref-palette-primary40);`)
- **Component Tokens**: Component-scoped (e.g., `--md-filled-button-container-color: var(--md-sys-color-primary);`)

### Complete System Color Tokens (Light & Dark)

```css
:root {
  /* Light Theme Color Roles */
  --md-sys-color-primary: #0061a4;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #d1e4ff;
  --md-sys-color-on-primary-container: #001d36;

  --md-sys-color-secondary: #535f70;
  --md-sys-color-on-secondary: #ffffff;
  --md-sys-color-secondary-container: #d7e3f7;
  --md-sys-color-on-secondary-container: #101c2b;

  --md-sys-color-tertiary: #6b5778;
  --md-sys-color-on-tertiary: #ffffff;
  --md-sys-color-tertiary-container: #f2daff;
  --md-sys-color-on-tertiary-container: #251431;

  --md-sys-color-error: #ba1a1a;
  --md-sys-color-on-error: #ffffff;
  --md-sys-color-error-container: #ffdad6;
  --md-sys-color-on-error-container: #410002;

  --md-sys-color-background: #fdfcff;
  --md-sys-color-on-background: #1a1c1e;

  --md-sys-color-surface: #fdfcff;
  --md-sys-color-on-surface: #1a1c1e;
  --md-sys-color-surface-variant: #dfe2eb;
  --md-sys-color-on-surface-variant: #43474e;

  /* Surface Container Tiers */
  --md-sys-color-surface-dim: #ded8e1;
  --md-sys-color-surface-bright: #fdfcff;
  --md-sys-color-surface-container-lowest: #ffffff;
  --md-sys-color-surface-container-low: #f7f2fa;
  --md-sys-color-surface-container: #f3edf7;
  --md-sys-color-surface-container-high: #ece6f0;
  --md-sys-color-surface-container-highest: #e6e0e9;

  --md-sys-color-outline: #73777f;
  --md-sys-color-outline-variant: #c3c7d0;
  --md-sys-color-shadow: #000000;
  --md-sys-color-scrim: #000000;
  --md-sys-color-inverse-surface: #2f3033;
  --md-sys-color-inverse-on-surface: #f1f0f4;
  --md-sys-color-inverse-primary: #9ecaff;

  /* Shape Corner Radius Tokens */
  --md-sys-shape-corner-none: 0px;
  --md-sys-shape-corner-extra-small: 4px;
  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-medium: 12px;
  --md-sys-shape-corner-large: 16px;
  --md-sys-shape-corner-extra-large: 28px;
  --md-sys-shape-corner-full: 9999px;

  /* State Layer Opacities */
  --md-sys-state-hover-opacity: 0.08;
  --md-sys-state-focus-opacity: 0.12;
  --md-sys-state-pressed-opacity: 0.12;
  --md-sys-state-dragged-opacity: 0.16;

  /* Motion Curves (Easing) */
  --md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-easing-standard-accelerate: cubic-bezier(0.3, 0, 1, 1);
  --md-sys-motion-easing-standard-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
  --md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);

  /* Motion Durations */
  --md-sys-motion-duration-short1: 50ms;
  --md-sys-motion-duration-short2: 100ms;
  --md-sys-motion-duration-short3: 150ms;
  --md-sys-motion-duration-short4: 200ms;
  --md-sys-motion-duration-medium1: 250ms;
  --md-sys-motion-duration-medium2: 300ms;
  --md-sys-motion-duration-medium3: 350ms;
  --md-sys-motion-duration-medium4: 400ms;
  --md-sys-motion-duration-long1: 450ms;
  --md-sys-motion-duration-long2: 500ms;
  --md-sys-motion-duration-long3: 550ms;
  --md-sys-motion-duration-long4: 600ms;
}

[data-theme="dark"] {
  --md-sys-color-primary: #9ecaff;
  --md-sys-color-on-primary: #003258;
  --md-sys-color-primary-container: #00497d;
  --md-sys-color-on-primary-container: #d1e4ff;

  --md-sys-color-secondary: #bbc7db;
  --md-sys-color-on-secondary: #253140;
  --md-sys-color-secondary-container: #3b4858;
  --md-sys-color-on-secondary-container: #d7e3f7;

  --md-sys-color-tertiary: #d6bee4;
  --md-sys-color-on-tertiary: #3b2948;
  --md-sys-color-tertiary-container: #523f5f;
  --md-sys-color-on-tertiary-container: #f2daff;

  --md-sys-color-error: #ffb4ab;
  --md-sys-color-on-error: #690005;
  --md-sys-color-error-container: #93000a;
  --md-sys-color-on-error-container: #ffdad6;

  --md-sys-color-background: #111318;
  --md-sys-color-on-background: #e2e2e9;

  --md-sys-color-surface: #111318;
  --md-sys-color-on-surface: #e2e2e9;
  --md-sys-color-surface-variant: #44474e;
  --md-sys-color-on-surface-variant: #c4c7d0;

  --md-sys-color-surface-dim: #111318;
  --md-sys-color-surface-bright: #37393e;
  --md-sys-color-surface-container-lowest: #0c0e13;
  --md-sys-color-surface-container-low: #191c20;
  --md-sys-color-surface-container: #1d2024;
  --md-sys-color-surface-container-high: #282a2f;
  --md-sys-color-surface-container-highest: #33353a;

  --md-sys-color-outline: #8e9099;
  --md-sys-color-outline-variant: #44474e;
  --md-sys-color-inverse-surface: #e2e2e9;
  --md-sys-color-inverse-on-surface: #2e3036;
  --md-sys-color-inverse-primary: #0061a4;
}
```

---

## 3. Typography Scale

Use Google Fonts (`Roboto`, `Roboto Flex`, or `Plus Jakarta Sans` / `Google Sans`).

| Role | Font Size | Line Height | Tracking (Letter Spacing) | Weight |
| :--- | :--- | :--- | :--- | :--- |
| **Display Large** | 57px (3.56rem) | 64px | -0.25px | 400 |
| **Display Medium** | 45px (2.81rem) | 52px | 0px | 400 |
| **Display Small** | 36px (2.25rem) | 44px | 0px | 400 |
| **Headline Large** | 32px (2.0rem) | 40px | 0px | 400 |
| **Headline Medium** | 28px (1.75rem) | 36px | 0px | 400 |
| **Headline Small** | 24px (1.5rem) | 32px | 0px | 400 |
| **Title Large** | 22px (1.375rem) | 28px | 0px | 400 |
| **Title Medium** | 16px (1.0rem) | 24px | +0.15px | 500 |
| **Title Small** | 14px (0.875rem) | 20px | +0.1px | 500 |
| **Body Large** | 16px (1.0rem) | 24px | +0.5px | 400 |
| **Body Medium** | 14px (0.875rem) | 20px | +0.25px | 400 |
| **Body Small** | 12px (0.75rem) | 16px | +0.4px | 400 |
| **Label Large** | 14px (0.875rem) | 20px | +0.1px | 500 |
| **Label Medium** | 12px (0.75rem) | 16px | +0.5px | 500 |
| **Label Small** | 11px (0.6875rem) | 16px | +0.5px | 500 |

---

## 4. Key Component Blueprint & Ripple Implementation

### Universal Ripple & State Layer (CSS + JS)

```css
.m3-interactive {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  transition: background-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              box-shadow var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

.m3-interactive::before {
  content: "";
  position: absolute;
  inset: 0;
  background-color: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
  border-radius: inherit;
}

.m3-interactive:hover::before {
  opacity: var(--md-sys-state-hover-opacity);
}

.m3-interactive:focus-visible::before {
  opacity: var(--md-sys-state-focus-opacity);
}

.m3-ripple-ink {
  position: absolute;
  border-radius: 50%;
  background-color: currentColor;
  opacity: var(--md-sys-state-pressed-opacity);
  transform: scale(0);
  pointer-events: none;
  animation: m3-ripple 400ms var(--md-sys-motion-easing-standard-decelerate) forwards;
}

@keyframes m3-ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

```javascript
function attachM3Ripple(element) {
  element.addEventListener('pointerdown', (e) => {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.classList.add('m3-ripple-ink');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 450);
  });
}
```

---

## 5. M3 Buttons Suite

1. **Filled Button**: High emphasis (`background: var(--md-sys-color-primary)`, `color: var(--md-sys-color-on-primary)`, `border-radius: var(--md-sys-shape-corner-full)`).
2. **Elevated Button**: Low shadow + surface container low (`background: var(--md-sys-color-surface-container-low)`, `color: var(--md-sys-color-primary)`, elevation level 1).
3. **Tonal (Filled Tonal) Button**: Medium emphasis (`background: var(--md-sys-color-secondary-container)`, `color: var(--md-sys-color-on-secondary-container)`).
4. **Outlined Button**: Outline border (`border: 1px solid var(--md-sys-color-outline)`, `color: var(--md-sys-color-primary)`).
5. **Text Button**: Flush (`background: transparent`, `color: var(--md-sys-color-primary)`).
6. **Floating Action Button (FAB)**: Large container (`border-radius: var(--md-sys-shape-corner-large)`, `background: var(--md-sys-color-primary-container)`, `color: var(--md-sys-color-on-primary-container)`).

---

## 6. Dynamic Color Generator (HCT Integration)

To enable client-side Material You dynamic color generation from a single HEX seed or image:
- Reference: [Dynamic Color & Tokens Details](./references/tokens-and-color.md)
- Components Guide: [Full Components Specs](./references/components-guide.md)
- Motion & Elevation: [Motion & Transitions Guide](./references/motion-and-elevation.md)
