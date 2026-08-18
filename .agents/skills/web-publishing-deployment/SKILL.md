---
name: web-publishing-deployment
description: >-
  Expert guide for automated web deployment pipelines, GitHub Actions workflows, GitHub Pages, Firebase Hosting,
  Vercel/Cloudflare Pages, custom domain DNS configuration (CNAME/A/AAAA), cache-control headers, SSL/TLS, and PWA manifests.
  Use whenever setting up CI/CD deployment, deploying static sites or web apps, configuring domains, or tuning web server caching.
---

# Web Publishing & Deployment Skill

This skill provides turnkey CI/CD workflows, infrastructure configs, DNS management blueprints, and caching policies for publishing web applications with 99.99% availability and instant global CDN propagation.

---

## 1. Multi-Platform Deployment Matrix

| Platform | Best For | SSL/TLS | Custom Domain | Preview Channels | Config File |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GitHub Pages** | Open-source, docs, client-side SPAs | Automated (Let's Encrypt) | Supported (`CNAME` file or repo settings) | Environment-based | `.github/workflows/deploy.yml` |
| **Firebase Hosting** | Full-stack web apps, dynamic routing, Auth/Firestore | Automated (Google CA) | Supported (1-click verification) | `firebase hosting:channel:deploy` | `firebase.json` |
| **Cloudflare Pages** | High-traffic static sites, edge functions | Automated (Universal SSL) | Supported (Direct DNS proxy) | Branch previews | `_headers`, `_routes.json` |
| **Vercel / Netlify** | Next.js, Vite, serverless microfrontends | Automated | Supported | Automated PR previews | `vercel.json` / `netlify.toml` |

---

## 2. GitHub Pages Deployment via GitHub Actions (Zero External Dependencies)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Web Application to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact (Static files)
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.' # Or './dist' for Vite / Next export

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 3. Firebase Hosting Configuration (`firebase.json`)

Configure high-performance cache headers and single-page routing:

```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|woff2|webp|png|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=0, must-revalidate"
          }
        ]
      }
    ]
  }
}
```

---

## 4. Custom Domain & DNS Configuration

| Record Type | Host / Name | Target / Value | TTL |
| :--- | :--- | :--- | :--- |
| **CNAME** | `www` or subdomain (`app`) | `<username>.github.io` or `hosting.firebaseapp.com` | `300` / Automatic |
| **A** | `@` (Root Apex Domain) | `185.199.108.153`<br>`185.199.109.153`<br>`185.199.110.153`<br>`185.199.111.153` (GitHub Pages) | `300` |
| **TXT** | `_github-pages-challenge-...` | Verification token for domain ownership | `300` |

---

## 5. Cross-References & Detailed Modules

- [`github-actions-deploy.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-publishing-deployment/references/github-actions-deploy.md) — Multi-environment workflows, secret masking, and automated staging/prod triggers.
- [`firebase-hosting-custom-domain.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-publishing-deployment/references/firebase-hosting-custom-domain.md) — CLI deploy steps, preview channels, and Firebase custom domain provisioning.
- [`caching-cdn-headers.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-publishing-deployment/references/caching-cdn-headers.md) — Cache-Control heuristics, immutable hashing, CSP headers, and Service Worker cache strategies.
