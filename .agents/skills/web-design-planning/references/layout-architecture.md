# Layout Architecture & Responsive Systems Reference

This reference details modern, production-grade layout architectures for web applications, including CSS Grid, Subgrid, Container Queries, and adaptive UI shells.

---

## 1. Modern CSS Layout Primitives

### 1.1 The Holy Grail Modern App Shell (CSS Grid)

```css
.app-layout-root {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    "header  header  header"
    "nav     main    aside"
    "footer  footer  footer";
  min-height: 100dvh;
  width: 100%;
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  overflow-x: hidden;
}

@media (max-width: 840px) {
  .app-layout-root {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "nav";
  }
}
```

### 1.2 Fluid Content Columns with CSS `minmax()` and `fit-content`

```css
/* Responsive auto-fitting grid without media queries */
.card-grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

/* Constrained reading column with breakout elements */
.article-grid {
  display: grid;
  grid-template-columns:
    [full-start] minmax(1rem, 1fr)
    [content-start] minmax(auto, 72ch) [content-end]
    minmax(1rem, 1fr) [full-end];
}

.article-grid > * {
  grid-column: content;
}

.article-grid > .breakout-full {
  grid-column: full;
  width: 100%;
}
```

### 1.3 Container Queries for Component-Driven Layout

Container queries decouple components from the viewport width:

```css
.widget-container {
  container-type: inline-size;
  container-name: widget;
}

.widget-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@container widget (min-width: 450px) {
  .widget-card {
    flex-direction: row;
    align-items: center;
  }
  .widget-card .thumbnail {
    width: 160px;
    height: 120px;
  }
}
```

---

## 2. Spacing and Elevation Grid

Follow a strict 4px/8px modular spacing scale:

```css
:root {
  --space-0: 0px;
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1.0rem;   /* 16px */
  --space-5: 1.5rem;   /* 24px */
  --space-6: 2.0rem;   /* 32px */
  --space-8: 3.0rem;   /* 48px */
  --space-10: 4.0rem;  /* 64px */
  --space-12: 6.0rem;  /* 96px */
}
```
