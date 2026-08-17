# Material Design 3 (Material You) Components Guide

This document contains complete, standards-compliant HTML and CSS implementation blueprints for Material 3 components.

---

## 1. Buttons

```html
<!-- Filled Button -->
<button class="m3-btn m3-btn-filled m3-interactive">
  <span class="material-symbols-rounded icon">add</span>
  <span>Filled Button</span>
</button>

<!-- Elevated Button -->
<button class="m3-btn m3-btn-elevated m3-interactive">
  <span>Elevated Button</span>
</button>

<!-- Filled Tonal Button -->
<button class="m3-btn m3-btn-tonal m3-interactive">
  <span>Tonal Button</span>
</button>

<!-- Outlined Button -->
<button class="m3-btn m3-btn-outlined m3-interactive">
  <span>Outlined Button</span>
</button>

<!-- Text Button -->
<button class="m3-btn m3-btn-text m3-interactive">
  <span>Text Button</span>
</button>

<!-- Floating Action Button (FAB) -->
<button class="m3-fab m3-interactive" aria-label="Add item">
  <span class="material-symbols-rounded">edit</span>
</button>

<!-- Extended FAB -->
<button class="m3-fab-extended m3-interactive">
  <span class="material-symbols-rounded">edit</span>
  <span>Compose</span>
</button>
```

```css
.m3-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 24px;
  border-radius: var(--md-sys-shape-corner-full);
  border: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.1px;
  text-decoration: none;
  box-sizing: border-box;
}

.m3-btn .icon {
  font-size: 18px;
  margin-left: -4px;
}

/* Filled */
.m3-btn-filled {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* Elevated */
.m3-btn-elevated {
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-primary);
  box-shadow: 0 1px 3px 1px rgba(0,0,0,0.15), 0 1px 2px 0 rgba(0,0,0,0.30);
}
.m3-btn-elevated:hover {
  box-shadow: 0 2px 6px 2px rgba(0,0,0,0.15), 0 1px 2px 0 rgba(0,0,0,0.30);
}

/* Tonal */
.m3-btn-tonal {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

/* Outlined */
.m3-btn-outlined {
  background-color: transparent;
  color: var(--md-sys-color-primary);
  border: 1px solid var(--md-sys-color-outline);
}

/* Text */
.m3-btn-text {
  background-color: transparent;
  color: var(--md-sys-color-primary);
  padding: 0 12px;
}

/* FAB */
.m3-fab {
  width: 56px;
  height: 56px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12);
}

.m3-fab-extended {
  height: 56px;
  padding: 0 20px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  box-shadow: 0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12);
}
```

---

## 2. Cards (Elevated, Filled, Outlined)

```html
<!-- Elevated Card -->
<div class="m3-card m3-card-elevated m3-interactive">
  <div class="m3-card-media" style="background-image: url('...');"></div>
  <div class="m3-card-content">
    <h3 class="m3-card-title">Elevated Card</h3>
    <p class="m3-card-subhead">Secondary supporting text</p>
    <p class="m3-card-body">Cards contain content and actions about a single subject.</p>
  </div>
</div>

<!-- Filled Card -->
<div class="m3-card m3-card-filled m3-interactive">
  <div class="m3-card-content">
    <h3 class="m3-card-title">Filled Card</h3>
    <p class="m3-card-body">A card with a filled container color.</p>
  </div>
</div>

<!-- Outlined Card -->
<div class="m3-card m3-card-outlined m3-interactive">
  <div class="m3-card-content">
    <h3 class="m3-card-title">Outlined Card</h3>
    <p class="m3-card-body">A card with clean outline strokes.</p>
  </div>
</div>
```

```css
.m3-card {
  border-radius: var(--md-sys-shape-corner-medium);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.m3-card-content {
  padding: 16px;
}

.m3-card-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}

.m3-card-subhead {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--md-sys-color-on-surface-variant);
}

.m3-card-body {
  margin: 0;
  font-size: 14px;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 20px;
}

/* Elevated */
.m3-card-elevated {
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: 0 1px 3px 1px rgba(0,0,0,0.15), 0 1px 2px 0 rgba(0,0,0,0.30);
}

/* Filled */
.m3-card-filled {
  background-color: var(--md-sys-color-surface-container-highest);
  border: none;
}

/* Outlined */
.m3-card-outlined {
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
}
```

---

## 3. Adaptive Navigation System

### Navigation Bar (Mobile / Compact <600px)

```html
<nav class="m3-nav-bar">
  <a href="#explore" class="m3-nav-item active m3-interactive">
    <div class="m3-nav-pill"><span class="material-symbols-rounded">explore</span></div>
    <span class="m3-nav-label">Explore</span>
  </a>
  <a href="#saved" class="m3-nav-item m3-interactive">
    <div class="m3-nav-pill"><span class="material-symbols-rounded">bookmark</span></div>
    <span class="m3-nav-label">Saved</span>
  </a>
  <a href="#settings" class="m3-nav-item m3-interactive">
    <div class="m3-nav-pill"><span class="material-symbols-rounded">settings</span></div>
    <span class="m3-nav-label">Settings</span>
  </a>
</nav>
```

```css
.m3-nav-bar {
  display: flex;
  height: 80px;
  background-color: var(--md-sys-color-surface-container);
  border-top: 1px solid var(--md-sys-color-outline-variant);
  justify-content: space-around;
  align-items: center;
  padding: 0 12px;
}

.m3-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-large);
  padding: 4px 12px;
}

.m3-nav-pill {
  width: 64px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.m3-nav-item.active .m3-nav-pill {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-nav-item.active .m3-nav-label {
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.m3-nav-label {
  font-size: 12px;
  font-weight: 500;
}
```

---

## 4. Chips, Sliders & Switches

```html
<!-- Assist Chip -->
<button class="m3-chip m3-interactive">
  <span class="material-symbols-rounded icon">event</span>
  <span>Add to Calendar</span>
</button>

<!-- Filter Chip (Selected) -->
<button class="m3-chip m3-chip-selected m3-interactive">
  <span class="material-symbols-rounded icon">check</span>
  <span>Favorites</span>
</button>

<!-- Switch -->
<label class="m3-switch">
  <input type="checkbox" checked />
  <span class="m3-switch-track">
    <span class="m3-switch-thumb"></span>
  </span>
</label>
```

```css
.m3-chip {
  height: 32px;
  padding: 0 16px;
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline);
  background-color: transparent;
  color: var(--md-sys-color-on-surface);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.m3-chip-selected {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  border-color: transparent;
}

/* Switch */
.m3-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.m3-switch input { display: none; }
.m3-switch-track {
  width: 52px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-highest);
  border: 2px solid var(--md-sys-color-outline);
  position: relative;
  transition: all 200ms ease;
}
.m3-switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--md-sys-color-outline);
  position: absolute;
  top: 6px;
  left: 6px;
  transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
}
.m3-switch input:checked + .m3-switch-track {
  background-color: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
}
.m3-switch input:checked + .m3-switch-track .m3-switch-thumb {
  left: calc(100% - 28px);
  width: 24px;
  height: 24px;
  top: 2px;
  background-color: var(--md-sys-color-on-primary);
}
```
