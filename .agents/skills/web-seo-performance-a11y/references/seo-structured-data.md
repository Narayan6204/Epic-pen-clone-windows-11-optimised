# SEO Structured Data (JSON-LD) Reference

This reference provides Schema.org JSON-LD templates for modern web apps, SaaS products, articles, and rich snippets.

---

## 1. WebApplication Schema (SaaS / Web App)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Pen 11 Web Studio",
  "url": "https://pen11.app",
  "description": "GPU-accelerated, lightweight web annotation and digital whiteboard tool built with Material You principles.",
  "applicationCategory": "DesignApplication",
  "browserRequirements": "Requires HTML5 Canvas and WebGL support",
  "operatingSystem": "All modern browsers",
  "screenshot": "https://pen11.app/assets/screenshot-main.png",
  "featureList": [
    "Real-time 60fps canvas drawing",
    "Material 3 dynamic color engine",
    "Multi-format PNG/SVG/PDF export",
    "Offline PWA capability"
  ],
  "author": {
    "@type": "Organization",
    "name": "Pen 11 Team",
    "url": "https://pen11.app"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
</script>
```

---

## 2. FAQPage Schema (Rich Google Search Results)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can I use Pen 11 completely offline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Pen 11 uses modern Service Workers and LocalStorage/IndexedDB to function completely offline without internet connectivity."
      }
    },
    {
      "@type": "Question",
      "name": "Does Pen 11 support stylus and touch pressure sensitivity?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Pen 11 listens to Pointer Events API and supports pressure sensitivity, tilt, and palm rejection on supported devices."
      }
    }
  ]
}
</script>
```
