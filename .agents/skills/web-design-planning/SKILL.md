---
name: web-design-planning
description: >-
  Expert guide for web design planning, wireframing, layout architecture, typography hierarchy, user journey mapping,
  and component breakdown. Use whenever planning, architecting, or structuring modern web applications, landing pages,
  dashboards, or interactive portals before or during implementation.
---

# Web Design & Architecture Planning Skill

This skill provides an end-to-end framework for conceptualizing, wireframing, architecting, and component-mapping web applications and websites. It ensures that before writing raw code, the application has a coherent layout architecture, clear typography scale, logical user journey, responsive breakpoint matrix, and a clean component design system.

---

## 1. The 5-Phase Web Planning Lifecycle

```
[Phase 1: User Intent & IA] ➔ [Phase 2: Wireframe & Layout Grid] ➔ [Phase 3: Typography & Token Hierarchy] ➔ [Phase 4: Component Inventory] ➔ [Phase 5: Responsive Matrix & State Maps]
```

### Phase 1: User Intent & Information Architecture (IA)
- **Primary Utility**: Define the core job-to-be-done in one sentence.
- **User Personas & Motivations**: Identify the user's primary goal upon landing (e.g., scan info, execute a task, configure settings, checkout).
- **Core User Journey**: Map the shortest frictionless path from entry to primary call-to-action (CTA):
  1. Entry & Anchor Context (Hero / Value Proposition)
  2. Evidence & Feature Proof (Interactive preview / Metrics / Testimonials)
  3. Action Engagement (Input / Selection / Interactive sandbox)
  4. Final Commitment & Conversion (Submission / Next steps)

### Phase 2: Wireframe & Layout Architecture
- **Z-Pattern vs. F-Pattern**:
  - *Z-Pattern*: Landing pages, marketing sites, onboarding screens with clear visual storytelling.
  - *F-Pattern*: Content-heavy documentation, dashboards, data tables, search result feeds.
- **Layout Shell Archetypes**:
  1. **Marketing / Landing**: Sticky adaptive header -> Full-width Hero -> Alternating Feature Sections -> Social Proof / Bento Grid -> CTA Banner -> Multi-column Footer.
  2. **Application / Dashboard**: App Bar (Top) -> Adaptive Nav (Sidebar Drawer / Rail / Bottom Nav) -> Main Canvas with Sub-header -> Card/Grid Workspace -> Drawer / Action Panel.
  3. **Content / Docs**: Header -> Sticky Left TOC / Hierarchy Tree -> Center Content (max-w 72ch) -> Right-hand "On this page" anchor scroll spy.

### Phase 3: Typography & Token Hierarchy
Always establish a crisp type scale with intentional line heights and letter spacing.

| Token Role | Size (rem / px) | Line Height | Letter Spacing | Weight | Typical Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-large` | 3.5rem (56px) | 4.0rem (64px) | -0.025em | 700/800 | Hero splash headlines |
| `display-medium` | 2.8rem (45px) | 3.25rem (52px) | -0.02em | 700 | Primary landing headlines |
| `headline-large` | 2.0rem (32px) | 2.5rem (40px) | -0.015em | 600 | Major section titles |
| `headline-medium` | 1.75rem (28px) | 2.25rem (36px) | 0 | 600 | Sub-section headings |
| `title-large` | 1.375rem (22px) | 1.75rem (28px) | 0 | 600 | Card titles, dialog headers |
| `title-medium` | 1.0rem (16px) | 1.5rem (24px) | +0.01em | 600 | Table headers, list group headers |
| `body-large` | 1.0rem (16px) | 1.5rem (24px) | +0.015em | 400 | Main body reading copy |
| `body-medium` | 0.875rem (14px) | 1.25rem (20px) | +0.02em | 400 | Supporting descriptions |
| `label-large` | 0.875rem (14px) | 1.25rem (20px) | +0.01em | 500/600 | Buttons, tabs, interactive chips |
| `label-small` | 0.6875rem (11px) | 1.0rem (16px) | +0.05em | 500 | Badges, timestamps, overlines |

### Phase 4: Component Inventory & Mapping
Break the UI down into modular components before building:
1. **Primitives**: Buttons, Icons, Badges, Tooltips, Text Inputs, Selects, Checkboxes.
2. **Composite Blocks**: Search Bar with Auto-complete, Navigation Header, Hero Section, Pricing Card, Metric Stat Widget.
3. **Template Shells**: Global Layout Container, Modal/Dialog Stack, Toast Notification Manager.

### Phase 5: Responsive Breakpoint Matrix

| Screen Size | Breakpoint Category | Navigation Pattern | Max Container Width | Column Grid |
| :--- | :--- | :--- | :--- | :--- |
| `< 600px` | Mobile (Compact) | Bottom Navigation Bar | `100%` (16px margin) | 4-column |
| `600px - 839px` | Tablet (Medium) | Navigation Rail | `720px` (24px margin) | 8-column |
| `840px - 1199px` | Desktop (Expanded) | Modal / Mini Drawer | `1040px` (32px margin) | 12-column |
| `>= 1200px` | Ultra-wide (Large) | Persistent Standard Drawer | `1280px` / `1440px` | 12-column |

---

## 2. Practical Blueprint: Design Planning Manifest Template

When initiating a new web feature or project, formulate a concise Planning Manifest:

```markdown
# [Project / Page Name] Design Planning Manifest

## 1. Purpose & User Goal
- **Core Utility**: [e.g. Real-time collaborative screen drawing & recording]
- **Target Audience**: [e.g. Presenters, educators, developers]
- **Success Metric**: [e.g. Zero-lag drawing, 1-click export]

## 2. Layout Structure
- **Shell Style**: [Top App Bar + Floating Overlay Toolbar / Persistent Sidebar Dashboard]
- **Key Sections**:
  1. Hero / Canvas Stage
  2. Control Bar (Tool selection, brush dynamics, palette)
  3. Export / Layer Management Panel

## 3. Typography & Color Tokens
- **Font Family**: Google Fonts `Plus Jakarta Sans` / `Inter`
- **Primary Seed Color**: `#0061A4` (Dynamic M3 Tonal Palette)
- **Background Mode**: Dark / Light adaptive with container tiers

## 4. Component Hierarchy
- `AppShell`
  ├── `TopAppBar` (Logo, Title, ThemeToggle, ActionCTA)
  ├── `MainCanvasStage` (WebGL/Canvas2D viewport)
  ├── `FloatingToolRail` (ToolButtons, SizeSlider, ColorSwatches)
  └── `StatusSnackbarHost` (Save confirmations, hotkey hints)

## 5. Interaction & State Specifications
- Default State: Pencil tool active, 4px width, primary color.
- Responsive Behavior: Toolbar docks to bottom on mobile (<600px), floats on desktop (>840px).
```

---

## 3. Cross-References & Detailed Modules

For deep-dive specifications, refer to:
- [`layout-architecture.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-design-planning/references/layout-architecture.md) — Grid systems, CSS Subgrid, Flexbox patterns, and responsive shell architectures.
- [`typography-and-tokens.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-design-planning/references/typography-and-tokens.md) — Font pairing rules, fluid typography `clamp()`, and CSS custom property token mappings.
- [`user-journeys-wireframes.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-design-planning/references/user-journeys-wireframes.md) — Low-fi ASCII wireframing, UX heuristics, micro-copy, and cognitive load reduction techniques.
