# Firebase Hosting & Custom Domain Deployment Reference

This reference covers deploying web applications to Firebase Hosting, configuring live preview channels for pull requests, and provisioning custom domain SSL certificates.

---

## 1. Firebase Hosting CLI Commands

```bash
# 1. Initialize Firebase Hosting non-interactively
npx -y firebase-tools@latest init hosting

# 2. Deploy to live production channel
npx -y firebase-tools@latest deploy --only hosting

# 3. Deploy to ephemeral preview channel (expires in 7 days)
npx -y firebase-tools@latest hosting:channel:deploy pr-preview --expires 7d
```

---

## 2. GitHub Actions Firebase PR Preview & Live Deploy

Create `.github/workflows/firebase-deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]
  pull_request:
    types: [ opened, synchronize ]

jobs:
  build_and_preview:
    if: '${{ github.event_name == ''pull_request'' }}'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: '${{ secrets.FIREBASE_PROJECT_ID }}'

  build_and_deploy_live:
    if: '${{ github.event_name == ''push'' && github.ref == ''refs/heads/main'' }}'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: '${{ secrets.FIREBASE_PROJECT_ID }}'
          channelId: live
```
