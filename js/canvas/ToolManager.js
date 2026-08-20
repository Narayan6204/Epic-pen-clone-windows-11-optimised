/**
 * ToolManager.js
 * Tool Strategies, Quadratic Bézier Calligraphy Interpolation, and Vector Shape Generators
 * Part of the Pen 11 Smart Object Engine.
 */

// ==========================================
// 1. Vector Smart Object Data Structures
// ==========================================

export class VectorStroke {
  constructor(options = {}) {
    this.id = options.id || `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.type = options.type || options.tool || 'stroke'; // 'stroke' | 'highlighter' | 'eraser'
    this.points = options.points || []; // [{ x, y, pressure, width }]
    this.color = options.color || '#000000';
    this.baseWidth = options.baseWidth || options.size || 4;
    this.opacity = options.opacity !== undefined ? options.opacity : 1.0;
    this.blendMode = options.blendMode || 'source-over';
    this.lineCap = options.lineCap || 'round';
    this.lineJoin = options.lineJoin || 'round';
    this.rotation = options.rotation || 0; // In radians around centroid
    this.bounds = null;
  }

  getBounds() {
    if (this.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let maxW = this.baseWidth;

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.width && p.width > maxW) maxW = p.width;
    }

    const pad = maxW;
    return {
      x: minX - pad,
      y: minY - pad,
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2
    };
  }

  hitTest(x, y, tolerance = 8) {
    const b = this.getBounds();
    if (x < b.x - tolerance || x > b.x + b.width + tolerance ||
        y < b.y - tolerance || y > b.y + b.height + tolerance) {
      return false;
    }

    const tolSq = (tolerance + this.baseWidth / 2) ** 2;
    if (this.points.length === 1) {
      const p = this.points[0];
      const distSq = (x - p.x) ** 2 + (y - p.y) ** 2;
      return distSq <= tolSq;
    }

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const distSq = distToSegmentSquared({ x, y }, p1, p2);
      if (distSq <= tolSq) return true;
    }
    return false;
  }

  render(ctx) {
    if (this.points.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = this.blendMode;
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.color;
    ctx.lineCap = this.lineCap;
    ctx.lineJoin = this.lineJoin;

    if (this.points.length === 1) {
      const p = this.points[0];
      const radius = Math.max(1, (p.width || this.baseWidth) / 2);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (this.points.length === 2) {
      const p1 = this.points[0];
      const p2 = this.points[1];
      ctx.lineWidth = p1.width || this.baseWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Smooth Quadratic Bézier interpolation across midpoint chain
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.lineWidth = p1.width || this.baseWidth;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }

    const last = this.points[this.points.length - 1];
    const prev = this.points[this.points.length - 2];
    ctx.lineWidth = last.width || this.baseWidth;
    ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
    ctx.stroke();

    ctx.restore();
  }
}

export class VectorShape {
  constructor(options = {}) {
    this.id = options.id || `shape_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.shapeType = options.shapeType || options.type || 'rectangle'; // 'line' | 'arrow' | 'rectangle' | 'rounded_rectangle' | 'circle' | 'triangle'
    this.x1 = options.x1 !== undefined ? options.x1 : (options.startX !== undefined ? options.startX : 0);
    this.y1 = options.y1 !== undefined ? options.y1 : (options.startY !== undefined ? options.startY : 0);
    this.x2 = options.x2 !== undefined ? options.x2 : (options.endX !== undefined ? options.endX : 0);
    this.y2 = options.y2 !== undefined ? options.y2 : (options.endY !== undefined ? options.endY : 0);
    this.color = options.color || '#000000';
    this.strokeWidth = options.strokeWidth || options.size || 4;
    this.fillColor = options.fillColor || 'transparent';
    this.isFilled = options.isFilled || false;
    this.isRightAngle = options.isRightAngle || false;
    this.opacity = options.opacity !== undefined ? options.opacity : 1.0;
    this.lineCap = options.lineCap || 'round';
    this.lineJoin = options.lineJoin || 'round';
  }

  getBounds() {
    const minX = Math.min(this.x1, this.x2);
    const minY = Math.min(this.y1, this.y2);
    const maxX = Math.max(this.x1, this.x2);
    const maxY = Math.max(this.y1, this.y2);
    const pad = this.strokeWidth + 4;

    return {
      x: minX - pad,
      y: minY - pad,
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2
    };
  }

  hitTest(x, y, tolerance = 8) {
    const b = this.getBounds();
    if (x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height) {
      return false;
    }
    if (this.isFilled && this.fillColor !== 'transparent') return true;

    const tolSq = (tolerance + this.strokeWidth / 2) ** 2;

    // Edge proximity hit testing
    if (this.shapeType === 'line' || this.shapeType === 'arrow') {
      const distSq = distToSegmentSquared({ x, y }, { x: this.x1, y: this.y1 }, { x: this.x2, y: this.y2 });
      return distSq <= tolSq;
    }

    if (this.shapeType === 'rectangle' || this.shapeType === 'rounded_rectangle' || this.shapeType === 'rounded-rectangle') {
      const minX = Math.min(this.x1, this.x2);
      const minY = Math.min(this.y1, this.y2);
      const maxX = Math.max(this.x1, this.x2);
      const maxY = Math.max(this.y1, this.y2);
      const tl = { x: minX, y: minY }, tr = { x: maxX, y: minY };
      const br = { x: maxX, y: maxY }, bl = { x: minX, y: maxY };

      return (
        distToSegmentSquared({ x, y }, tl, tr) <= tolSq ||
        distToSegmentSquared({ x, y }, tr, br) <= tolSq ||
        distToSegmentSquared({ x, y }, br, bl) <= tolSq ||
        distToSegmentSquared({ x, y }, bl, tl) <= tolSq
      );
    }

    if (this.shapeType === 'circle' || this.shapeType === 'ellipse') {
      const cx = (this.x1 + this.x2) / 2;
      const cy = (this.y1 + this.y2) / 2;
      const rx = Math.max(1, Math.abs(this.x2 - this.x1) / 2);
      const ry = Math.max(1, Math.abs(this.y2 - this.y1) / 2);
      
      // Normalized distance from center to point
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const normDist = Math.hypot(dx, dy);
      const avgR = (rx + ry) / 2;
      const pixelDist = Math.abs(normDist - 1) * avgR;
      return pixelDist <= (tolerance + this.strokeWidth / 2);
    }

    if (this.shapeType === 'triangle') {
      let p1, p2, p3;
      if (this.isRightAngle) {
        p1 = { x: this.x1, y: this.y1 };
        p2 = { x: this.x1, y: this.y2 };
        p3 = { x: this.x2, y: this.y2 };
      } else {
        p1 = { x: (this.x1 + this.x2) / 2, y: this.y1 };
        p2 = { x: this.x2, y: this.y2 };
        p3 = { x: this.x1, y: this.y2 };
      }
      return (
        distToSegmentSquared({ x, y }, p1, p2) <= tolSq ||
        distToSegmentSquared({ x, y }, p2, p3) <= tolSq ||
        distToSegmentSquared({ x, y }, p3, p1) <= tolSq
      );
    }

    return true;
  }

  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.fillColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = this.lineCap;
    ctx.lineJoin = this.lineJoin;

    const x = Math.min(this.x1, this.x2);
    const y = Math.min(this.y1, this.y2);
    const w = Math.abs(this.x2 - this.x1);
    const h = Math.abs(this.y2 - this.y1);

    switch (this.shapeType) {
      case 'line': {
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
        break;
      }

      case 'arrow': {
        // Stem
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
        const headLength = Math.max(14, this.strokeWidth * 3.5);
        const headAngle = Math.PI / 6; // 30 degrees

        ctx.beginPath();
        ctx.moveTo(this.x2, this.y2);
        ctx.lineTo(
          this.x2 - headLength * Math.cos(angle - headAngle),
          this.y2 - headLength * Math.sin(angle - headAngle)
        );
        ctx.moveTo(this.x2, this.y2);
        ctx.lineTo(
          this.x2 - headLength * Math.cos(angle + headAngle),
          this.y2 - headLength * Math.sin(angle + headAngle)
        );
        ctx.stroke();
        break;
      }

      case 'rectangle': {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        if (this.isFilled && this.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
      }

      case 'rounded_rectangle':
      case 'rounded-rectangle': {
        const radius = Math.min(16, Math.min(w, h) / 4);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
        else ctx.rect(x, y, w, h);
        if (this.isFilled && this.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
      }

      case 'circle':
      case 'ellipse': {
        const cx = (this.x1 + this.x2) / 2;
        const cy = (this.y1 + this.y2) / 2;
        const rx = Math.max(1, w / 2);
        const ry = Math.max(1, h / 2);

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (this.isFilled && this.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
      }

      case 'triangle': {
        ctx.beginPath();
        if (this.isRightAngle) {
          // 90° Right-angle triangle from (x1, y1) to (x1, y2) to (x2, y2)
          ctx.moveTo(this.x1, this.y1);
          ctx.lineTo(this.x1, this.y2);
          ctx.lineTo(this.x2, this.y2);
        } else {
          // Isosceles triangle
          const topX = (this.x1 + this.x2) / 2;
          const topY = this.y1;
          const botLeftX = this.x1;
          const botLeftY = this.y2;
          const botRightX = this.x2;
          const botRightY = this.y2;

          ctx.moveTo(topX, topY);
          ctx.lineTo(botRightX, botRightY);
          ctx.lineTo(botLeftX, botLeftY);
        }
        ctx.closePath();

        if (this.isFilled && this.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}

// ==========================================
// 2. Tool Manager & Strategies
// ==========================================

export class ToolManager {
  /**
   * @param {import('./CanvasEngine.js').CanvasEngine} engine
   * @param {import('./HistoryManager.js').HistoryManager} [historyManager]
   */
  constructor(engine, historyManager = null) {
    this.engine = engine;
    this.historyManager = historyManager;

    // Tool config
    this.currentTool = 'pen'; // 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'rounded_rectangle' | 'circle' | 'triangle' | 'select'
    this.color = '#000000'; // Default black
    this.size = 4;
    this.opacity = 1.0;
    this.fillColor = 'transparent';
    this.isFilled = false;

    // In-flight drawing draft state
    this.isDrawing = false;
    this.startPoint = null;
    this.currentPoints = [];
    this.draftShape = null;

    // Connect to engine
    this.engine.activeTool = this;
    this._bindEngineEvents();
  }

  setTool(toolName) {
    this.currentTool = toolName;
    this.cancelCurrentDraft();
  }

  setColor(color) {
    this.color = color;
  }

  setSize(size) {
    this.size = Math.max(1, size);
  }

  setOpacity(opacity) {
    this.opacity = Math.max(0.01, Math.min(1.0, opacity));
  }

  setFillColor(fillColor) {
    this.fillColor = fillColor;
  }

  setFilled(isFilled) {
    this.isFilled = isFilled;
  }

  // ==========================================
  // 3. Pointer Interaction Lifecycle
  // ==========================================

  _bindEngineEvents() {
    this.engine.on('pointerdown', (pt) => this.onPointerDown(pt));
    this.engine.on('pointermove', (pt) => this.onPointerMove(pt));
    this.engine.on('pointerup', (pt) => this.onPointerUp(pt));
    this.engine.on('pointercancel', () => this.cancelCurrentDraft());
  }

  onPointerDown(pt) {
    if (this.currentTool === 'select' || this.currentTool === 'cursor') {
      return; // Handled by LassoSelector
    }

    this.isDrawing = true;
    this.startPoint = { ...pt };

    if (this.isStrokeTool(this.currentTool)) {
      const pWidth = this.calculateDynamicWidth(this.size, pt.pressure);
      this.currentPoints = [{
        x: pt.x,
        y: pt.y,
        pressure: pt.pressure,
        width: pWidth,
        time: performance.now()
      }];
    } else if (this.isShapeTool(this.currentTool)) {
      this.draftShape = new VectorShape({
        shapeType: this.currentTool,
        x1: pt.x,
        y1: pt.y,
        x2: pt.x,
        y2: pt.y,
        color: this.color,
        strokeWidth: this.size,
        fillColor: this.fillColor,
        isFilled: this.isFilled,
        isRightAngle: false,
        opacity: this.opacity
      });
    } else if (this.currentTool === 'eraser') {
      this.lastEraserPt = { x: pt.x, y: pt.y };
      this.handleEraserAt(pt.x, pt.y);
    }

    this.engine.invalidateOverlay();
  }

  onPointerMove(pt) {
    if (!this.isDrawing) return;

    if (this.isStrokeTool(this.currentTool)) {
      const pWidth = this.calculateDynamicWidth(this.size, pt.pressure);
      this.currentPoints.push({
        x: pt.x,
        y: pt.y,
        pressure: pt.pressure,
        width: pWidth,
        time: performance.now()
      });
      this.engine.invalidateOverlay();
    } else if (this.isShapeTool(this.currentTool) && this.draftShape) {
      let curX = pt.x;
      let curY = pt.y;

      // Shift key 1:1 Aspect Ratio / Right Angle / 45° Angle Snap
      if (pt.shiftKey) {
        const dx = curX - this.startPoint.x;
        const dy = curY - this.startPoint.y;

        if (this.currentTool === 'rectangle' || this.currentTool === 'rounded_rectangle' || this.currentTool === 'rounded-rectangle' || this.currentTool === 'circle' || this.currentTool === 'ellipse') {
          const side = Math.max(Math.abs(dx), Math.abs(dy));
          curX = this.startPoint.x + Math.sign(dx || 1) * side;
          curY = this.startPoint.y + Math.sign(dy || 1) * side;
        } else if (this.currentTool === 'line' || this.currentTool === 'arrow') {
          const angle = Math.atan2(dy, dx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const len = Math.hypot(dx, dy);
          curX = this.startPoint.x + Math.cos(snappedAngle) * len;
          curY = this.startPoint.y + Math.sin(snappedAngle) * len;
        } else if (this.currentTool === 'triangle') {
          this.draftShape.isRightAngle = true;
        }
      } else {
        if (this.currentTool === 'triangle') {
          this.draftShape.isRightAngle = false;
        }
      }

      this.draftShape.x2 = curX;
      this.draftShape.y2 = curY;
      this.engine.invalidateOverlay();
    } else if (this.currentTool === 'eraser') {
      const lastPt = this.lastEraserPt || pt;
      const dx = pt.x - lastPt.x;
      const dy = pt.y - lastPt.y;
      const dist = Math.hypot(dx, dy);
      const step = Math.max(6, this.size / 2);
      const numSteps = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= numSteps; i++) {
        const sx = lastPt.x + (dx * i) / numSteps;
        const sy = lastPt.y + (dy * i) / numSteps;
        this.handleEraserAt(sx, sy);
      }
      this.lastEraserPt = { x: pt.x, y: pt.y };
    }
  }

  onPointerUp(pt) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.lastEraserPt = null;

    if (this.isStrokeTool(this.currentTool) && this.currentPoints.length > 0) {
      const isHighlighter = this.currentTool === 'highlighter';
      const stroke = new VectorStroke({
        type: this.currentTool,
        points: [...this.currentPoints],
        color: this.color,
        baseWidth: this.size,
        opacity: isHighlighter ? 0.117 : this.opacity,
        blendMode: 'source-over',
        lineCap: 'round',
        lineJoin: 'round'
      });

      this.commitObject(stroke);
      this.currentPoints = [];
    } else if (this.isShapeTool(this.currentTool) && this.draftShape) {
      const dist = Math.hypot(this.draftShape.x2 - this.draftShape.x1, this.draftShape.y2 - this.draftShape.y1);
      if (dist >= 3) {
        this.commitObject(this.draftShape);
      }
      this.draftShape = null;
    }

    this.engine.invalidateOverlay();
  }

  cancelCurrentDraft() {
    this.isDrawing = false;
    this.currentPoints = [];
    this.draftShape = null;
    this.engine.invalidateOverlay();
  }

  handleEraserAt(x, y) {
    const hits = this.engine.hitTest(x, y, Math.max(12, this.size * 2));
    if (hits.length > 0) {
      if (this.historyManager) {
        this.historyManager.executeDeleteObjects(hits);
      } else {
        hits.forEach(obj => this.engine.removeObject(obj));
      }
    }
  }

  commitObject(object) {
    if (this.historyManager) {
      this.historyManager.executeAddObject(object);
    } else {
      this.engine.addObject(object);
    }
  }

  // ==========================================
  // 4. In-Flight Draft Rendering on Overlay
  // ==========================================

  renderDraft(ctx) {
    if (this.isStrokeTool(this.currentTool) && this.currentPoints.length > 0) {
      const isHighlighter = this.currentTool === 'highlighter';
      const stroke = new VectorStroke({
        type: this.currentTool,
        points: this.currentPoints,
        color: this.color,
        baseWidth: this.size,
        opacity: isHighlighter ? 0.117 : this.opacity,
        blendMode: 'source-over',
        lineCap: 'round'
      });
      stroke.render(ctx);
    } else if (this.isShapeTool(this.currentTool) && this.draftShape) {
      this.draftShape.render(ctx);
    }
  }

  // ==========================================
  // 5. Utility Helpers
  // ==========================================

  calculateDynamicWidth(baseWidth, pressure) {
    const p = pressure !== undefined && pressure > 0 ? pressure : 0.5;
    return Math.max(1, baseWidth * (0.6 + p * 0.8));
  }

  isStrokeTool(tool) {
    return tool === 'pen' || tool === 'highlighter';
  }

  isShapeTool(tool) {
    return ['line', 'arrow', 'rectangle', 'rounded_rectangle', 'rounded-rectangle', 'circle', 'ellipse', 'triangle'].includes(tool);
  }
}

// Distance from point P to segment AB squared
function distToSegmentSquared(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
}
