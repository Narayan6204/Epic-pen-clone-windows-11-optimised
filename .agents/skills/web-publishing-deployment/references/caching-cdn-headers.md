# Web Server Caching & HTTP Security Headers Reference

This reference covers Cache-Control configurations, Content Security Policies (CSP), and Service Worker caching strategies.

---

## 1. Optimal Cache-Control Architecture

1. **HTML documents (`index.html`)**:
   `Cache-Control: public, max-age=0, must-revalidate`
   *Ensures visitors always get the latest version immediately upon new deployment.*
2. **Versioned/Hashed Assets (`bundle.[hash].js`, `style.[hash].css`, fonts, images)**:
   `Cache-Control: public, max-age=31536000, immutable`
   *Allows browsers and CDNs to cache forever without re-validation.*
3. **API Responses**:
   `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`

---

## 2. Hardened Security Headers

Add these HTTP headers to your web server / CDN:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;
```
