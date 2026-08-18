---
name: web-animation-mastery
description: >-
  Expert guide for web animations, GPU-accelerated micro-interactions, HTML5/WebGL Canvas drawing engines,
  Material Design 3 cubic-bezier motion curves, container morphs, FLIP transitions, and CSS scroll-driven animations.
  Use whenever crafting fluid animations, interactive canvas tools, buttery-smooth state transitions, or high-performance UI motion.
---

# Web Animation & Motion Mastery Skill

This skill provides production-grade motion patterns, GPU acceleration strategies, mathematical bezier easings, View Transitions API techniques, and high-performance Canvas/WebGL rendering pipelines.

---

## 1. Core Principles of High-Performance Web Motion

### 1.1 The GPU Compositor Rule (Zero Main-Thread Jank)
To maintain locked 60fps / 120fps motion:
- **Animate ONLY Compositor Properties**: `transform` and `opacity`.
- **NEVER Animate Layout / Reflow Properties**: `width`, `height`, `top`, `left`, `margin`, `padding`.
- **NEVER Animate Paint-Heavy Properties Directly**: `box-shadow`, `filter` (blur), `border-width`. Instead, cross-fade a pre-rendered pseudo-element (`::after`) with the target shadow/filter using `opacity`.
- **Force GPU Layer Promotion**: Use `will-change: transform, opacity;` sparingly during active animations, removing it when idle to prevent memory bloat.

### 1.2 Material Design 3 Cubic-Bezier Motion Curves

Always use the standardized M3 motion tokens:

```css
:root {
  /* M3 Motion Curves */
  --md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0.0, 0.0, 1.0);
  --md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0.0, 0.8, 0.15);
  --md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0);
  --md-sys-motion-easing-standard: cubic-bezier(0.2, 0.0, 0, 1.0);
  --md-sys-motion-easing-standard-accelerate: cubic-bezier(0.3, 0, 1, 1);
  --md-sys-motion-easing-standard-decelerate: cubic-bezier(0, 0, 0, 1);

  /* M3 Duration Tokens */
  --md-sys-motion-duration-short1: 50ms;
  --md-sys-motion-duration-short2: 100ms;
  --md-sys-motion-duration-short3: 150ms;
  --md-sys-motion-duration-short4: 200ms;
  --md-sys-motion-duration-medium1: 250ms;
  --md-sys-motion-duration-medium2: 300ms;
  --md-sys-motion-duration-medium3: 350ms;
  --md-sys-motion-duration-medium4: 400ms;
  --md-sys-motion-duration-long1: 450ms;
  --md-sys-motion-duration-long2: 500ms;
}
```

---

## 2. Interactive Micro-Interactions Blueprint

### 2.1 Dynamic Origin Ink Ripple (Click & Touch)
```javascript
function attachRippleEffect(element) {
  element.addEventListener('pointerdown', (e) => {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'm3-ripple-ink';
    
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    element.appendChild(ripple);

    const cleanup = () => {
      ripple.classList.add('fade-out');
      setTimeout(() => ripple.remove(), 400);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
    };

    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  });
}
```

```css
.m3-interactive-target {
  position: relative;
  overflow: hidden;
  user-select: none;
}

.m3-ripple-ink {
  position: absolute;
  border-radius: 50%;
  background-color: var(--md-sys-color-primary, currentColor);
  opacity: 0.12;
  transform: scale(0);
  pointer-events: none;
  animation: ripple-expand 350ms var(--md-sys-motion-easing-emphasized-decelerate) forwards;
}

.m3-ripple-ink.fade-out {
  opacity: 0;
  transition: opacity 300ms ease-out;
}

@keyframes ripple-expand {
  to {
    transform: scale(1);
  }
}
```

---

## 3. High-Performance Canvas 2D Drawing Engine

When implementing screen drawing, annotations, or graphic engines in the browser:

```javascript
class CanvasDrawingEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.isDrawing = false;
    this.points = [];
    this.color = '#0061A4';
    this.lineWidth = 4;
    this.initDPI();
  }

  initDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  start(x, y) {
    this.isDrawing = true;
    this.points = [{ x, y }];
  }

  draw(x, y) {
    if (!this.isDrawing) return;
    this.points.push({ x, y });
    
    // Smooth Bezier interpolation between midpoints to avoid jagged lines
    if (this.points.length > 2) {
      const p1 = this.points[this.points.length - 3];
      const p2 = this.points[this.points.length - 2];
      const p3 = this.points[this.points.length - 1];

      const mid1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

      this.ctx.beginPath();
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.moveTo(mid1.x, mid1.y);
      this.ctx.quadraticCurveTo(p2.x, p2.y, mid2.x, mid2.y);
      this.ctx.stroke();
    }
  }

  stop() {
    this.isDrawing = false;
    this.points = [];
  }
}
```

---

## 4. Cross-References & Advanced Guides

For specialized animation implementations:
- [`m3-easing-curves.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-animation-mastery/references/m3-easing-curves.md) — Comprehensive visual curve references, duration scaling matrix, and spring physics.
- [`view-transitions-morphing.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-animation-mastery/references/view-transitions-morphing.md) — Native View Transitions API (`document.startViewTransition`), FLIP morphing, and shared element transitions.
- [`canvas-gpu-particles.md`](file:///c:/Users/krish/OneDrive/Documents/Anitgravity%20Projects/Pen%2011/.agents/skills/web-animation-mastery/references/canvas-gpu-particles.md) — Particle burst effects, laser pointers, highlighter blending modes, and WebGL shader basics.
