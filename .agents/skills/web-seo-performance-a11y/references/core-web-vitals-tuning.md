# Core Web Vitals Tuning & Performance Architecture Reference

This reference covers deep optimizations for LCP, INP, and CLS to ensure 95+ score on mobile and 100 on desktop.

---

## 1. Interaction to Next Paint (INP) Yielding

Long JavaScript tasks (>50ms) block the main thread and degrade INP. Break up long processing loops using `scheduler.yield()`:

```javascript
async function yieldToMain() {
  if ('scheduler' in window && 'yield' in window.scheduler) {
    return window.scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Example: Processing high-density canvas stroke batches without UI freezing
async function processLargeStrokeBatch(strokes) {
  for (let i = 0; i < strokes.length; i++) {
    renderStroke(strokes[i]);
    
    // Yield every 16ms (every frame)
    if (i % 20 === 0) {
      await yieldToMain();
    }
  }
}
```

---

## 2. Largest Contentful Paint (LCP) Hardening

1. **Inline Critical CSS**: Put above-the-fold tokens and hero styles directly in `<style>` inside `<head>`.
2. **Hero Image Optimization**:
```html
<img
  src="/images/hero-preview-800w.webp"
  srcset="/images/hero-preview-400w.webp 400w, /images/hero-preview-800w.webp 800w, /images/hero-preview-1200w.webp 1200w"
  sizes="(max-width: 600px) 100vw, 800px"
  alt="Pen 11 Canvas Application Preview"
  width="800"
  height="450"
  fetchpriority="high"
  decoding="async"
/>
```
3. **Font Display**:
```css
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('/fonts/plus-jakarta-sans.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F;
}
```
