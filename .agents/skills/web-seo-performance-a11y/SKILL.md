---
name: web-seo-performance-a11y
description: >-
  Expert guide for Core Web Vitals optimization (LCP, INP, CLS), Lighthouse 100 audits, ARIA semantics,
  WCAG 2.2 AA/AAA compliance, keyboard navigation focus rings, OpenGraph metadata, and JSON-LD structured data.
  Use whenever optimizing website performance, auditing accessibility, improving search engine indexing, or tuning responsiveness.
---

# Web SEO, Performance & Accessibility (A11y) Skill

This skill provides a rigorous blueprint to achieve perfect Lighthouse scores (100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO), sub-second Largest Contentful Paint (LCP), <50ms Interaction to Next Paint (INP), zero Cumulative Layout Shift (CLS), and WCAG 2.2 AA/AAA compliance.

---

## 1. Core Web Vitals Optimization Checklist

| Metric | Target Threshold | Root Causes of Failure | Golden Fix |
| :--- | :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | `< 1.2s` | Render-blocking CSS/JS, lazy-loaded hero images, uncompressed fonts | `fetchpriority="high"` on hero img, preload critical fonts, inline critical CSS |
| **INP** (Interaction to Next Paint) | `< 50ms` | Long tasks on main thread, un-debounced inputs, synchronous canvas operations | Chunk tasks via `scheduler.yield()` or `setTimeout`, use `requestIdleCallback()` |
| **CLS** (Cumulative Layout Shift) | `0.00` | Unsized images/videos, dynamically injected banners, web font swap shifts | Explicit `width` and `height` attributes, `font-display: optional` or `size-adjust` fallback |

---

## 2. Complete Head Template: SEO, OpenGraph & Preloading

Always configure HTML `<head>` with full meta and social sharing attributes:

```html
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Pen 11 — Fast Screen Annotation & Studio for Web</title>
  <meta name="description" content="Annotate, sketch, and collaborate effortlessly directly in your browser. Modern Material You canvas with GPU acceleration.">
  <meta name="theme-color" content="#0061a4">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://example.com/pen-11">

  <!-- OpenGraph / Facebook / LinkedIn -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://example.com/pen-11">
  <meta property="og:title" content="Pen 11 — Fast Screen Annotation & Studio">
  <meta property="og:description" content="Annotate, sketch, and collaborate effortlessly directly in your browser.">
  <meta property="og:image" content="https://example.com/assets/og-preview.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@pen11app">
  <meta name="twitter:title" content="Pen 11 — Fast Screen Annotation & Studio">
  <meta name="twitter:description" content="Annotate, sketch, and collaborate effortlessly directly in your browser.">
  <meta name="twitter:image" content="https://example.com/assets/og-preview.png">

  <!-- Structured Data JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Pen 11 Web Studio",
    "url": "https://example.com/pen-11",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }
  </script>

  <!-- Preconnect & Preload Critical Assets -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" href="/fonts/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
</head>
```

---

## 3. WCAG 2.2 Accessibility (A11y) Rules

### 3.1 Focus Visible & Keyboard Navigation
Never disable outlines without providing high-contrast focus rings:

```css
/* High-contrast accessible focus ring */
:focus-visible {
  outline: 3px solid var(--md-sys-color-primary, #0061A4);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Skip link for screen readers & keyboard navigators */
.skip-to-content {
  position: absolute;
  top: -100px;
  left: 1rem;
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  padding: 0.75rem 1.25rem;
  z-index: 9999;
  border-radius: 8px;
  transition: top 200ms ease;
}

.skip-to-content:focus {
  top: 1rem;
}
```

### 3.2 Semantic HTML & ARIA Attributes
- Every interactive icon-only button **MUST** have an `aria-label` or visually hidden text.
- Form inputs must have explicit `<label for="...">` associations.
- Modals must use `<dialog>` or `role="dialog" aria-modal="true" aria-labelledby="dialog-title"`.
- Live alerts and snackbars must use `role="status" aria-live="polite"`.

---

## 4. Cross-References & Detailed Audits

- [`core-web-vitals-tuning.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-seo-performance-a11y/references/core-web-vitals-tuning.md) — Advanced INP task scheduling, font subsetting, and critical path CSS rendering.
- [`wcag-a11y-standards.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-seo-performance-a11y/references/wcag-a11y-standards.md) — 4.5:1 / 7:1 color contrast rules, screen reader announcements, and keyboard trapping.
- [`seo-structured-data.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-seo-performance-a11y/references/seo-structured-data.md) — Schema.org JSON-LD templates for software, SaaS, articles, FAQs, and BreadcrumbList.
