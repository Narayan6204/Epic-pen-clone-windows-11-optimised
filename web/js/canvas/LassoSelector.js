/**
 * LassoSelector.js
 * "Circle to Select" Lasso Mechanic, Oriented Bounding Box (OBB) Calculation,
 * Real-Time Translation, Scaling, and Centroid Rotation Transforms.
 * Part of the Pen 11 Smart Object Engine.
 */

export class LassoSelector {
  /**
   * @param {import('./CanvasEngine.js').CanvasEngine} engine
   * @param {import('./ToolManager.js').ToolManager} toolManager
   * @param {import('./HistoryManager.js').HistoryManager} [historyManager]
   */
  constructor(engine, toolManager, historyManager = null) {
    this.engine = engine;
    this.toolManager = toolManager;
    this.historyManager = historyManager;

    // Selection State
    /** @type {Array<any>} */
    this.selectedObjects = [];
    this.obb = null; // { cx, cy, width, height, rotation, corners: [TL, TR, BR, BL], handles }
    
    // Lasso Path State
    this.isLassoing = false;
    this.lassoPoints = [];

    // Transform Drag State
    this.isTransforming = false;
    this.transformMode = null; // 'translate' | 'rotate' | 'scale-tl' | 'scale-tr' | 'scale-br' | 'scale-bl' | 'scale-t' | 'scale-r' | 'scale-b' | 'scale-l'
    this.dragStart = null;
    this.initialTransformState = null; // Snapshot of object positions/points before transform

    this.engine.lassoSelector = this;
    this._bindEvents();
  }

  // ==========================================
  // 1. Pointer Event Interception
  // ==========================================

  _bindEvents() {
    this.engine.on('pointerdown', (pt) => this.onPointerDown(pt));
    this.engine.on('pointermove', (pt) => this.onPointerMove(pt));
    this.engine.on('pointerup', (pt) => this.onPointerUp(pt));
    this.engine.on('pointercancel', () => this.cancelInteraction());
  }

  onPointerDown(pt) {
    const isLassoTool = this.toolManager.currentTool === 'lasso' || this.toolManager.currentTool === 'select';
    
    // Check if clicking on existing selection handles or inside selection box
    if (this.selectedObjects.length > 0 && this.obb) {
      const hitHandle = this.hitTestHandles(pt.x, pt.y);
      if (hitHandle) {
        this.startTransform(hitHandle, pt);
        return;
      }

      if (this.isPointInsideOBB(pt.x, pt.y, this.obb)) {
        this.startTransform('translate', pt);
        return;
      }
    }

    // Otherwise, if Lasso/Select tool is active, start drawing selection lasso loop
    if (isLassoTool) {
      this.clearSelection();
      this.isLassoing = true;
      this.lassoPoints = [{ x: pt.x, y: pt.y }];
      this.engine.invalidateOverlay();
    }
  }

  onPointerMove(pt) {
    if (this.isTransforming) {
      this.updateTransform(pt);
      return;
    }

    if (this.isLassoing) {
      this.lassoPoints.push({ x: pt.x, y: pt.y });
      this.engine.invalidateOverlay();
    }
  }

  onPointerUp(pt) {
    if (this.isTransforming) {
      this.endTransform();
      return;
    }

    if (this.isLassoing) {
      this.isLassoing = false;
      if (this.lassoPoints.length > 2) {
        this.selectObjectsInLasso(this.lassoPoints);
      }
      this.lassoPoints = [];
      this.engine.invalidateOverlay();
    }
  }

  cancelInteraction() {
    this.isLassoing = false;
    this.lassoPoints = [];
    this.isTransforming = false;
    this.engine.invalidateOverlay();
  }

  // ==========================================
  // 2. Lasso Containment & Hit Testing
  // ==========================================

  /**
   * Finds all objects enclosed or intersected by the lasso polygon path.
   * @param {Array<{ x: number, y: number }>} polygon
   */
  selectObjectsInLasso(polygon) {
    const selected = [];

    for (let i = 0; i < this.engine.objects.length; i++) {
      const obj = this.engine.objects[i];
      if (this.isObjectEnclosedByPolygon(obj, polygon)) {
        selected.push(obj);
      }
    }

    this.setSelection(selected);
  }

  isObjectEnclosedByPolygon(obj, polygon) {
    // For strokes: check if > 60% of points or the bounds center is enclosed
    if (obj.points && obj.points.length > 0) {
      let insideCount = 0;
      const step = Math.max(1, Math.floor(obj.points.length / 10));
      let totalChecked = 0;

      for (let i = 0; i < obj.points.length; i += step) {
        totalChecked++;
        if (isPointInPolygon(obj.points[i], polygon)) {
          insideCount++;
        }
      }

      if (insideCount / totalChecked >= 0.5) return true;
    }

    // For shapes: check corners / center
    const bounds = obj.getBounds ? obj.getBounds() : null;
    if (bounds) {
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      if (isPointInPolygon(center, polygon)) return true;

      const corners = [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        { x: bounds.x, y: bounds.y + bounds.height }
      ];
      let insideCorners = 0;
      for (const c of corners) {
        if (isPointInPolygon(c, polygon)) insideCorners++;
      }
      if (insideCorners >= 2) return true;
    }

    return false;
  }

  setSelection(objects) {
    this.selectedObjects = [...objects];
    this.engine.selectedIds.clear();
    for (const obj of this.selectedObjects) {
      this.engine.selectedIds.add(obj.id);
    }
    this.recalculateOBB();
    this.engine.invalidate();
    this.engine.invalidateOverlay();
    this.engine.emit('selection:change', this.selectedObjects);
  }

  clearSelection() {
    if (this.selectedObjects.length === 0) return;
    this.selectedObjects = [];
    this.obb = null;
    this.engine.selectedIds.clear();
    this.engine.invalidate();
    this.engine.invalidateOverlay();
    this.engine.emit('selection:change', []);
  }

  deleteSelection() {
    if (this.selectedObjects.length === 0) return;
    const toDelete = [...this.selectedObjects];
    this.clearSelection();
    if (this.historyManager) {
      this.historyManager.executeDeleteObjects(toDelete);
    } else {
      for (const obj of toDelete) {
        this.engine.removeObject(obj);
      }
      this.engine.invalidate();
    }
  }

  // ==========================================
  // 3. Oriented Bounding Box (OBB) Calculation
  // ==========================================

  recalculateOBB() {
    if (this.selectedObjects.length === 0) {
      this.obb = null;
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const obj of this.selectedObjects) {
      const b = obj.getBounds ? obj.getBounds() : null;
      if (b) {
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.x + b.width > maxX) maxX = b.x + b.width;
        if (b.y + b.height > maxY) maxY = b.y + b.height;
      }
    }

    if (minX === Infinity) {
      this.obb = null;
      return;
    }

    const pad = 8;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    let width = maxX - minX;
    let height = maxY - minY;

    if (width < 50) {
      minX -= (50 - width) / 2;
      maxX += (50 - width) / 2;
      width = 50;
    }
    if (height < 50) {
      minY -= (50 - height) / 2;
      maxY += (50 - height) / 2;
      height = 50;
    }

    const cx = minX + width / 2;
    const cy = minY + height / 2;
    const rotation = 0; // Canonical unrotated axis for collective bounding box

    const TL = { x: minX, y: minY };
    const TR = { x: maxX, y: minY };
    const BR = { x: maxX, y: maxY };
    const BL = { x: minX, y: maxY };

    const rotStalkDist = 26;
    const rotHandle = { x: cx, y: minY - rotStalkDist };

    this.obb = {
      cx,
      cy,
      width,
      height,
      rotation,
      corners: { TL, TR, BR, BL },
      handles: {
        'scale-tl': TL,
        'scale-tr': TR,
        'scale-br': BR,
        'scale-bl': BL,
        'scale-t': { x: cx, y: minY },
        'scale-r': { x: maxX, y: cy },
        'scale-b': { x: cx, y: maxY },
        'scale-l': { x: minX, y: cy },
        'rotate': rotHandle
      }
    };
  }

  // ==========================================
  // 4. Hit Testing Handles & Bounding Box
  // ==========================================

  hitTestHandles(x, y, radius = 10) {
    if (!this.obb || !this.obb.handles) return null;
    const rSq = radius * radius;

    for (const [mode, pt] of Object.entries(this.obb.handles)) {
      const distSq = (x - pt.x) ** 2 + (y - pt.y) ** 2;
      if (distSq <= rSq) {
        return mode;
      }
    }
    return null;
  }

  isPointInsideOBB(x, y, obb) {
    if (!obb) return false;
    const halfW = obb.width / 2;
    const halfH = obb.height / 2;
    return (x >= obb.cx - halfW && x <= obb.cx + halfW &&
            y >= obb.cy - halfH && y <= obb.cy + halfH);
  }

  // ==========================================
  // 5. Interactive Transformations (Move, Scale, Rotate)
  // ==========================================

  startTransform(mode, pt) {
    this.isTransforming = true;
    this.transformMode = mode;
    this.dragStart = { ...pt };

    // Deep clone snapshot of selected objects' initial geometry for accurate delta calculation
    this.initialTransformState = this.selectedObjects.map(obj => {
      if (obj.points) {
        return {
          id: obj.id,
          type: 'stroke',
          points: obj.points.map(p => ({ ...p }))
        };
      } else {
        return {
          id: obj.id,
          type: 'shape',
          x1: obj.x1,
          y1: obj.y1,
          x2: obj.x2,
          y2: obj.y2
        };
      }
    });

    this.initialOBB = JSON.parse(JSON.stringify(this.obb));
  }

  updateTransform(pt) {
    if (!this.isTransforming || !this.dragStart || !this.initialOBB) return;

    const dx = pt.x - this.dragStart.x;
    const dy = pt.y - this.dragStart.y;
    const init = this.initialOBB;

    if (this.transformMode === 'translate') {
      for (let i = 0; i < this.selectedObjects.length; i++) {
        const obj = this.selectedObjects[i];
        const state = this.initialTransformState[i];

        if (obj.points) {
          for (let j = 0; j < obj.points.length; j++) {
            obj.points[j].x = state.points[j].x + dx;
            obj.points[j].y = state.points[j].y + dy;
          }
        } else {
          obj.x1 = state.x1 + dx;
          obj.y1 = state.y1 + dy;
          obj.x2 = state.x2 + dx;
          obj.y2 = state.y2 + dy;
        }
      }
    } else if (this.transformMode === 'rotate') {
      const initialAngle = Math.atan2(this.dragStart.y - init.cy, this.dragStart.x - init.cx);
      const currentAngle = Math.atan2(pt.y - init.cy, pt.x - init.cx);
      const deltaAngle = currentAngle - initialAngle;

      const cos = Math.cos(deltaAngle);
      const sin = Math.sin(deltaAngle);

      for (let i = 0; i < this.selectedObjects.length; i++) {
        const obj = this.selectedObjects[i];
        const state = this.initialTransformState[i];

        if (obj.points) {
          for (let j = 0; j < obj.points.length; j++) {
            const relX = state.points[j].x - init.cx;
            const relY = state.points[j].y - init.cy;
            obj.points[j].x = init.cx + (relX * cos - relY * sin);
            obj.points[j].y = init.cy + (relX * sin + relY * cos);
          }
        } else {
          const rx1 = state.x1 - init.cx, ry1 = state.y1 - init.cy;
          const rx2 = state.x2 - init.cx, ry2 = state.y2 - init.cy;
          obj.x1 = init.cx + (rx1 * cos - ry1 * sin);
          obj.y1 = init.cy + (rx1 * sin + ry1 * cos);
          obj.x2 = init.cx + (rx2 * cos - ry2 * sin);
          obj.y2 = init.cy + (rx2 * sin + ry2 * cos);
        }
      }
    } else if (this.transformMode.startsWith('scale')) {
      // Scale from center or opposite corner
      let scaleX = 1;
      let scaleY = 1;

      if (this.transformMode === 'scale-br') {
        scaleX = Math.max(0.05, (init.width + dx) / init.width);
        scaleY = Math.max(0.05, (init.height + dy) / init.height);
      } else if (this.transformMode === 'scale-tl') {
        scaleX = Math.max(0.05, (init.width - dx) / init.width);
        scaleY = Math.max(0.05, (init.height - dy) / init.height);
      } else if (this.transformMode === 'scale-tr') {
        scaleX = Math.max(0.05, (init.width + dx) / init.width);
        scaleY = Math.max(0.05, (init.height - dy) / init.height);
      } else if (this.transformMode === 'scale-bl') {
        scaleX = Math.max(0.05, (init.width - dx) / init.width);
        scaleY = Math.max(0.05, (init.height + dy) / init.height);
      } else if (this.transformMode === 'scale-r') {
        scaleX = Math.max(0.05, (init.width + dx) / init.width);
      } else if (this.transformMode === 'scale-l') {
        scaleX = Math.max(0.05, (init.width - dx) / init.width);
      } else if (this.transformMode === 'scale-b') {
        scaleY = Math.max(0.05, (init.height + dy) / init.height);
      } else if (this.transformMode === 'scale-t') {
        scaleY = Math.max(0.05, (init.height - dy) / init.height);
      }

      if (pt.shiftKey) {
        // Uniform aspect ratio lock
        const uniformScale = Math.max(scaleX, scaleY);
        scaleX = uniformScale;
        scaleY = uniformScale;
      }

      for (let i = 0; i < this.selectedObjects.length; i++) {
        const obj = this.selectedObjects[i];
        const state = this.initialTransformState[i];

        if (obj.points) {
          for (let j = 0; j < obj.points.length; j++) {
            const relX = state.points[j].x - init.cx;
            const relY = state.points[j].y - init.cy;
            obj.points[j].x = init.cx + relX * scaleX;
            obj.points[j].y = init.cy + relY * scaleY;
          }
        } else {
          const rx1 = state.x1 - init.cx, ry1 = state.y1 - init.cy;
          const rx2 = state.x2 - init.cx, ry2 = state.y2 - init.cy;
          obj.x1 = init.cx + rx1 * scaleX;
          obj.y1 = init.cy + ry1 * scaleY;
          obj.x2 = init.cx + rx2 * scaleX;
          obj.y2 = init.cy + ry2 * scaleY;
        }
      }
    }

    this.engine.invalidate();
    this.recalculateOBB();
    this.engine.invalidateOverlay();
  }

  endTransform() {
    if (!this.isTransforming) return;
    this.isTransforming = false;

    // Record transform action in history
    if (this.historyManager && this.initialTransformState) {
      const finalState = this.selectedObjects.map(obj => {
        if (obj.points) {
          return {
            id: obj.id,
            type: 'stroke',
            points: obj.points.map(p => ({ ...p }))
          };
        } else {
          return {
            id: obj.id,
            type: 'shape',
            x1: obj.x1,
            y1: obj.y1,
            x2: obj.x2,
            y2: obj.y2
          };
        }
      });

      this.historyManager.executeTransformObjects(
        this.selectedObjects,
        this.initialTransformState,
        finalState
      );
    }

    this.initialTransformState = null;
    this.initialOBB = null;
    this.recalculateOBB();
    this.engine.invalidate();
    this.engine.invalidateOverlay();
  }

  // ==========================================
  // 6. Visual Rendering of Lasso & OBB Overlay
  // ==========================================

  renderOverlay(ctx) {
    // 1. Render in-flight Lasso Path (Freehand circle loop)
    if (this.isLassoing && this.lassoPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#0061A4'; // M3 Primary
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.fillStyle = 'rgba(0, 97, 164, 0.08)';

      ctx.beginPath();
      ctx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
      for (let i = 1; i < this.lassoPoints.length; i++) {
        ctx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
      }
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Selection OBB Bounding Box and Transform Handles
    if (this.selectedObjects.length > 0 && this.obb) {
      ctx.save();

      const { cx, cy, width, height, handles } = this.obb;
      const halfW = width / 2;
      const halfH = height / 2;

      // Selection Bounding Box Outline
      ctx.strokeStyle = '#0061A4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.fillStyle = 'rgba(0, 97, 164, 0.05)';
      ctx.strokeRect(cx - halfW, cy - halfH, width, height);
      ctx.fillRect(cx - halfW, cy - halfH, width, height);

      // Rotation Stalk Connector Line
      ctx.setLineDash([]);
      ctx.strokeStyle = '#0061A4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - halfH);
      ctx.lineTo(handles['rotate'].x, handles['rotate'].y);
      ctx.stroke();

      // Render Handles
      const handleRadius = 5.5;

      for (const [key, pt] of Object.entries(handles)) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);

        if (key === 'rotate') {
          // Rotation knob
          ctx.fillStyle = '#0061A4';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Corner & Edge scale handles
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#0061A4';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
}

// Point in polygon Ray-Casting algorithm
function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
