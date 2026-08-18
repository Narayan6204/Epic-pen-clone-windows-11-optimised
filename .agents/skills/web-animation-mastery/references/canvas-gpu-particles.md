# Canvas GPU Accelerations & Particle Systems Reference

This reference provides production code for high-performance canvas particle bursts, laser pointers, and annotation blending modes.

---

## 1. High-Performance Particle Engine (Burst & Trail)

```javascript
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
  }

  emit(x, y, count = 20, color = '#0061A4') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 2,
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.015,
        color
      });
    }
    if (!this.animId) this.loop();
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      p.radius *= 0.96;

      if (p.alpha <= 0 || p.radius < 0.5) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.animId = null;
    }
  }
}
```

---

## 2. Canvas Composite Modes for Annotation & Highlighting

Use hardware compositing operations for specialized drawing modes:

```javascript
// 1. Highlighter Mode (Translucent over text without obscuring ink underneath)
function setHighlighterMode(ctx, color = 'rgba(255, 235, 59, 0.45)') {
  ctx.globalCompositeOperation = 'multiply'; // Blends cleanly over dark text
  ctx.strokeStyle = color;
  ctx.lineWidth = 24;
  ctx.lineCap = 'square';
}

// 2. Laser Pointer Mode (Self-decaying glowing trail)
function setLaserPointerMode(ctx, color = '#FF1744') {
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
}

// 3. True Eraser Mode (Cuts transparent hole in canvas)
function setEraserMode(ctx) {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30;
}
```
