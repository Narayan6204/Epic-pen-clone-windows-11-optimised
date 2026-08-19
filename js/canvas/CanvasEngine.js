/**
 * CanvasEngine.js
 * High-Performance Double-Buffered Multi-Layer Canvas Compositor with Dirty-Rect Invalidation
 * Part of the Pen 11 Smart Object Engine.
 */

export class CanvasEngine {
  /**
   * @param {HTMLElement|string} container - Parent container element or selector
   * @param {Object} options - Engine options
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) {
      throw new Error('[CanvasEngine] Container element not found');
    }

    this.options = {
      backgroundColor: options.backgroundColor || 'transparent',
      gridType: options.gridType || 'none', // 'none' | 'dots' | 'lines' | 'grid'
      gridSize: options.gridSize || 24,
      gridColor: options.gridColor || 'rgba(0, 0, 0, 0.06)',
      maxDPR: options.maxDPR || 3,
      throttleFPS: options.throttleFPS || 0, // 0 for uncapped 60/120Hz rAF
      ...options
    };

    // Vector Smart Object Storage
    /** @type {Array<any>} */
    this.objects = [];
    /** @type {Set<string>} */
    this.selectedIds = new Set();

    // Canvas Layers (Layer 0: Background/Grid, Layer 1: Stored Objects, Layer 2: Active Draft & Interaction)
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d', { alpha: true });

    this.mainCanvas = document.createElement('canvas');
    this.mainCtx = this.mainCanvas.getContext('2d', { alpha: true });

    this.overlayCanvas = document.createElement('canvas');
    this.overlayCtx = this.overlayCanvas.getContext('2d', { alpha: true });

    // Internal resolution & metrics
    this.dpr = 1;
    this.width = 0;
    this.height = 0;
    this.cssWidth = 0;
    this.cssHeight = 0;

    // Viewport transform (Pan & Zoom support)
    this.viewport = {
      x: 0,
      y: 0,
      scale: 1
    };

    // Rendering & Dirty Rectangle Invalidation state
    this.isDirty = false;
    this.isOverlayDirty = false;
    this.dirtyRect = null; // null means entire viewport, or { x, y, width, height }
    this.rafId = null;
    this.lastFrameTime = 0;

    // Event listeners map
    this.listeners = new Map();

    // Active tool and interaction hook
    this.activeTool = null;
    this.lassoSelector = null;

    // Initialize layout and events
    this._initDOM();
    this._initDPI();
    this._initEvents();
    this._startRenderLoop();
  }

  // ==========================================
  // 1. DOM & DPI Initialization
  // ==========================================

  _initDOM() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.style.touchAction = 'none';
    this.container.style.userSelect = 'none';
    this.container.style.webkitUserSelect = 'none';

    const setupCanvas = (canvas, zIndex) => {
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = zIndex === 2 ? 'auto' : 'none';
      canvas.style.zIndex = String(zIndex);
      this.container.appendChild(canvas);
    };

    setupCanvas(this.bgCanvas, 0);
    setupCanvas(this.mainCanvas, 1);
    setupCanvas(this.overlayCanvas, 2);
  }

  _initDPI() {
    this.updateDimensions();

    // Observe container resizes with zero buffer loss
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateDimensions();
      });
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', () => this.updateDimensions());
    }
  }

  /**
   * Recalculates canvas pixel buffers with Hi-DPI DPR compensation without losing drawing objects.
   */
  updateDimensions() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.options.maxDPR);

    if (rect.width <= 0 || rect.height <= 0) return;

    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    this.dpr = dpr;

    const pixelWidth = Math.round(rect.width * dpr);
    const pixelHeight = Math.round(rect.height * dpr);

    if (this.width !== pixelWidth || this.height !== pixelHeight) {
      this.width = pixelWidth;
      this.height = pixelHeight;

      const resizeBuffer = (canvas, ctx) => {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.resetTransform?.();
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      };

      resizeBuffer(this.bgCanvas, this.bgCtx);
      resizeBuffer(this.mainCanvas, this.mainCtx);
      resizeBuffer(this.overlayCanvas, this.overlayCtx);

      this.renderBackground();
      this.invalidate(); // Full redraw on resolution/size change
    }
  }

  // ==========================================
  // 2. Pointer Event Normalization & Capture
  // ==========================================

  _initEvents() {
    const overlay = this.overlayCanvas;

    const normalizePointer = (e) => {
      const rect = overlay.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;

      // Coordinate relative to container in CSS pixels
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;

      // Convert through viewport zoom/pan matrix
      const canvasX = (screenX - this.viewport.x) / this.viewport.scale;
      const canvasY = (screenY - this.viewport.y) / this.viewport.scale;

      // Pressure normalization (stylus gives 0.0 - 1.0, mouse fallback)
      let pressure = e.pressure;
      if (pressure === undefined || pressure === 0) {
        pressure = (e.pointerType === 'mouse' && (e.buttons & 1)) ? 0.5 : (e.pressure || 0.5);
      }

      return {
        x: canvasX,
        y: canvasY,
        screenX,
        screenY,
        pressure,
        tiltX: e.tiltX || 0,
        tiltY: e.tiltY || 0,
        pointerType: e.pointerType || 'mouse',
        pointerId: e.pointerId,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey || e.metaKey,
        buttons: e.buttons,
        originalEvent: e
      };
    };

    const setDrawingState = (drawing) => {
      if (drawing) {
        this.container.classList.add('is-drawing');
        const stage = document.getElementById('canvas-stage-wrapper');
        if (stage) stage.classList.add('is-drawing');
      } else {
        this.container.classList.remove('is-drawing');
        const stage = document.getElementById('canvas-stage-wrapper');
        if (stage) stage.classList.remove('is-drawing');
      }
    };

    overlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        overlay.setPointerCapture(e.pointerId);
      } catch (_) {}

      setDrawingState(true);
      const pt = normalizePointer(e);
      this.emit('pointerdown', pt);
    });

    overlay.addEventListener('pointermove', (e) => {
      e.preventDefault();
      const pt = normalizePointer(e);
      this.emit('pointermove', pt);
    });

    overlay.addEventListener('pointerup', (e) => {
      e.preventDefault();
      try {
        overlay.releasePointerCapture(e.pointerId);
      } catch (_) {}

      setDrawingState(false);
      const pt = normalizePointer(e);
      this.emit('pointerup', pt);
    });

    overlay.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      try {
        overlay.releasePointerCapture(e.pointerId);
      } catch (_) {}

      setDrawingState(false);
      const pt = normalizePointer(e);
      this.emit('pointercancel', pt);
    });

    window.addEventListener('pointerup', () => setDrawingState(false));
    window.addEventListener('pointercancel', () => setDrawingState(false));

    // Prevent context menu on touch / drawing
    overlay.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ==========================================
  // 3. Double-Buffered Rendering & Dirty Rects
  // ==========================================

  /**
   * Schedules a render frame, optionally specifying a dirty rectangle region.
   * @param {{ x: number, y: number, width: number, height: number }|null} [rect]
   */
  invalidate(rect = null) {
    if (this.isDirty && this.dirtyRect === null) {
      return;
    }
    if (!rect || !this.dirtyRect) {
      this.dirtyRect = rect ? { ...rect } : null;
    } else {
      // Union dirty rects
      const minX = Math.min(this.dirtyRect.x, rect.x);
      const minY = Math.min(this.dirtyRect.y, rect.y);
      const maxX = Math.max(this.dirtyRect.x + this.dirtyRect.width, rect.x + rect.width);
      const maxY = Math.max(this.dirtyRect.y + this.dirtyRect.height, rect.y + rect.height);
      this.dirtyRect = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
    this.isDirty = true;
  }

  invalidateOverlay() {
    this.isOverlayDirty = true;
  }

  _startRenderLoop() {
    const loop = (timestamp) => {
      if (this.options.throttleFPS > 0) {
        const interval = 1000 / this.options.throttleFPS;
        if (timestamp - this.lastFrameTime < interval - 1) {
          this.rafId = requestAnimationFrame(loop);
          return;
        }
      }
      this.lastFrameTime = timestamp;

      if (this.isDirty) {
        this.renderMainLayer();
        this.isDirty = false;
        this.dirtyRect = null;
      }

      if (this.isOverlayDirty) {
        this.renderOverlayLayer();
        this.isOverlayDirty = false;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Renders background grid or solid canvas color on Layer 0.
   */
  renderBackground() {
    const ctx = this.bgCtx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (this.options.backgroundColor && this.options.backgroundColor !== 'transparent') {
      ctx.fillStyle = this.options.backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  /**
   * Main Layer Render: Draws all committed vector objects.
   */
  renderMainLayer() {
    const ctx = this.mainCtx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // If dirty rect is localized and smaller than 70% of screen, use clipping
    if (this.dirtyRect && (this.dirtyRect.width * this.dirtyRect.height < w * h * 0.7)) {
      const pad = 10;
      ctx.beginPath();
      ctx.rect(
        this.dirtyRect.x - pad,
        this.dirtyRect.y - pad,
        this.dirtyRect.width + pad * 2,
        this.dirtyRect.height + pad * 2
      );
      ctx.clip();
      ctx.clearRect(
        this.dirtyRect.x - pad,
        this.dirtyRect.y - pad,
        this.dirtyRect.width + pad * 2,
        this.dirtyRect.height + pad * 2
      );
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    // Apply viewport scale/translate
    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.scale, this.viewport.scale);

    // Draw each committed smart object
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      if (obj && typeof obj.render === 'function') {
        ctx.save();
        obj.render(ctx, {
          isSelected: this.selectedIds.has(obj.id),
          engine: this
        });
        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * Overlay Layer Render: In-flight drawing stroke previews & selection bounding boxes.
   */
  renderOverlayLayer() {
    const ctx = this.overlayCtx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Apply viewport transform
    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.scale, this.viewport.scale);

    // Render active tool draft preview (e.g. active pen stroke, shape rubberband)
    if (this.activeTool && typeof this.activeTool.renderDraft === 'function') {
      ctx.save();
      this.activeTool.renderDraft(ctx);
      ctx.restore();
    }

    // Render Lasso selection OBB and handles
    if (this.lassoSelector && typeof this.lassoSelector.renderOverlay === 'function') {
      ctx.save();
      this.lassoSelector.renderOverlay(ctx);
      ctx.restore();
    }

    ctx.restore();
  }

  // ==========================================
  // 4. Object Registry & Spatial Management
  // ==========================================

  /**
   * Adds an object and requests re-render.
   * @param {any} object
   */
  addObject(object) {
    if (!object.id) {
      object.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    this.objects.push(object);
    this.invalidate(object.getBounds ? object.getBounds() : null);
    this.emit('object:added', object);
  }

  /**
   * Removes an object by instance or ID.
   * @param {string|any} objectOrId
   */
  removeObject(objectOrId) {
    const id = typeof objectOrId === 'string' ? objectOrId : objectOrId.id;
    const idx = this.objects.findIndex(o => o.id === id);
    if (idx !== -1) {
      const removed = this.objects.splice(idx, 1)[0];
      this.selectedIds.delete(id);
      this.invalidate(removed.getBounds ? removed.getBounds() : null);
      this.emit('object:removed', removed);
      return removed;
    }
    return null;
  }

  /**
   * Replaces all objects (e.g. for undo/redo snapshots or document open).
   * @param {Array<any>} objects
   */
  setObjects(objects) {
    this.objects = [...objects];
    this.selectedIds.clear();
    this.invalidate();
    this.emit('objects:set', this.objects);
  }

  clear() {
    this.objects = [];
    this.selectedIds.clear();
    this.invalidate();
    this.invalidateOverlay();
    this.emit('cleared');
  }

  /**
   * Finds objects intersecting with a point (hit testing).
   * @param {number} x
   * @param {number} y
   * @param {number} [tolerance=8]
   * @returns {Array<any>}
   */
  hitTest(x, y, tolerance = 8) {
    const hits = [];
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (obj.hitTest && obj.hitTest(x, y, tolerance)) {
        hits.push(obj);
      }
    }
    return hits;
  }

  // ==========================================
  // 5. Event Dispatcher & Cleanup
  // ==========================================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  emit(event, data) {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[CanvasEngine] Error in '${event}' event listener:`, err);
        }
      }
    }
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.listeners.clear();
    this.container.innerHTML = '';
  }
}
