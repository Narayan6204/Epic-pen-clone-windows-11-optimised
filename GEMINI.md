# Antigravity Workspace Rules

## 1. MANDATORY MULTI-AGENT SWARM ORCHESTRATION (NEVER SOLVE ALONE)
- **Aggressive Subagent Policy**: On ANY non-trivial programming, bug investigation, architecture decision, feature development, or code review:
  - **MANDATORY**: The lead agent MUST NOT work in a single linear thread.
  - **Always Launch Parallel Subagents**:
    1. **Researcher Subagent (`research`)**: Deeply explore the codebase, AST call hierarchy, dependencies, and docs.
    2. **Adversarial Critic Subagent (`self`)**: Simultaneously audit proposed changes for edge cases, memory leaks, race conditions, and regressions.
    3. **Implementation Subagent (`self`)**: Handle parallel module/file edits.
  - Only trivial 1-line syntax answers may be answered directly without subagents.

## 2. Default Engineering Principle: Ponytail (Senior Dev Efficiency Mode)
- **Mandatory Default**: Apply **Ponytail** principles on all coding, refactoring, debugging, and architecture tasks.
- **Skill Usage**: Unconditionally activate `.agents/plugins/ponytail/skills/ponytail/SKILL.md`.
- **Core Principles**:
  1. **YAGNI**: Question unnecessary complexity. The best code is the code never written.
  2. **Codebase Reuse**: Check existing helpers and patterns before writing new ones.
  3. **Standard Library & Native APIs First**: Reach for the stdlib / native platform features before adding external dependencies.
  4. **Minimal Diff**: Write the simplest, cleanest, shortest working solution. Deletion over addition.
  5. **Root Cause Fixes**: Fix bugs at the shared root cause rather than patching individual symptoms.
  6. **No Unasked-for Abstractions or Boilerplate**: Keep solutions concrete, direct, and maintainable.

## 3. Default Web Design & Development Standard: Material Design 3 & Web Lifecycle Suite
Whenever the user requests to build, design, style, or refactor any website, web application, dashboard, or UI component:
- **Mandatory Default**: ALWAYS default to **Material Design 3 (Material You / m3.material.io)** principles.
- **Skill Suite Orchestration**:
  1. **Core M3 Design System**: Follow `.agents/skills/material-you-web/SKILL.md`.
  2. **Planning & IA**: Follow `.agents/skills/web-design-planning/SKILL.md` (wireframing, layout architecture, typography hierarchy, user journeys, component mapping).
  3. **Motion & Interaction**: Follow `.agents/skills/web-animation-mastery/SKILL.md` (GPU acceleration, canvas drawing engines, M3 bezier curves, container morphs, scroll-driven animations).
  4. **SEO, Performance & A11y**: Follow `.agents/skills/web-seo-performance-a11y/SKILL.md` (Lighthouse 100, Core Web Vitals LCP/INP/CLS, WCAG 2.2 AA/AAA, ARIA, structured JSON-LD).
  5. **Publishing & Deployment**: Follow `.agents/skills/web-publishing-deployment/SKILL.md` (GitHub Pages via Actions, Firebase Hosting, custom domain DNS, cache headers, SSL/TLS).
- **Color & Theming**:
  - Implement dynamic HCT / tonal color palettes (Primary, Secondary, Tertiary, Neutral, Neutral Variant).
  - Define CSS custom properties with the full `--md-sys-color-*` token specification for both Light and Dark themes.
  - Use surface container tiers (`surface-container-lowest` to `surface-container-highest`) rather than plain single-tone backgrounds.
- **Interactions & States**:
  - Every interactive button, card, chip, navigation item, and list tile must have M3 state layers (8% hover, 12% focus/press) and dynamic click-origin radial ink ripples.
- **Typography & Elevation**:
  - Use Google Fonts (Plus Jakarta Sans, Roboto Flex, or Roboto) with the official 15-tier M3 type scale (Display, Headline, Title, Body, Label).
  - Use surface tinting and multi-layer elevation shadows (Levels 0–5).
- **Navigation**:
  - Use adaptive navigation patterns: Navigation Bar for mobile (<600px), Navigation Rail for tablet (600–840px), and Navigation Drawer for desktop (>840px).

## 4. Animation & Desktop Rules (Pen 11 App)
- **PyQt6 Animations**: Before writing any animation code in `main.py` (transitions, collapse/expand, fades, slides), strictly follow `.agents/skills/pyqt-animation-skill/SKILL.md`.
- **Lottie & Gemini**: Follow `.agents/skills/lottie-gemini-skill/SKILL.md` to prevent runtime crashes.

