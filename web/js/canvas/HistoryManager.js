/**
 * HistoryManager.js
 * High-Capacity 5,000-Step Memory-Safe Undo/Redo Command Engine
 * Part of the Pen 11 Smart Object Engine.
 */

// ==========================================
// 1. Base Action Interface & Concrete Actions
// ==========================================

export class HistoryAction {
  constructor(name = 'Action') {
    this.name = name;
  }
  undo() { throw new Error('undo() not implemented'); }
  redo() { throw new Error('redo() not implemented'); }
}

export class AddObjectAction extends HistoryAction {
  /**
   * @param {import('./CanvasEngine.js').CanvasEngine} engine
   * @param {any} object
   */
  constructor(engine, object) {
    super('Add Object');
    this.engine = engine;
    this.object = object;
  }

  undo() {
    this.engine.removeObject(this.object);
  }

  redo() {
    this.engine.addObject(this.object);
  }
}

export class DeleteObjectsAction extends HistoryAction {
  /**
   * @param {import('./CanvasEngine.js').CanvasEngine} engine
   * @param {Array<any>} objects
   */
  constructor(engine, objects) {
    super('Delete Objects');
    this.engine = engine;
    this.objects = [...objects];
    // Record original indices so they can be restored in exact layer order
    this.indexedObjects = this.objects.map(obj => ({
      obj,
      index: this.engine.objects.indexOf(obj)
    }));
  }

  undo() {
    // Re-insert at original indices sorted ascending
    const sorted = [...this.indexedObjects].sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      if (item.index >= 0 && item.index <= this.engine.objects.length) {
        this.engine.objects.splice(item.index, 0, item.obj);
      } else {
        this.engine.objects.push(item.obj);
      }
    }
    this.engine.invalidate();
  }

  redo() {
    for (const item of this.indexedObjects) {
      const idx = this.engine.objects.indexOf(item.obj);
      if (idx !== -1) {
        this.engine.objects.splice(idx, 1);
        this.engine.selectedIds.delete(item.obj.id);
      }
    }
    this.engine.invalidate();
  }
}

export class TransformObjectsAction extends HistoryAction {
  /**
   * @param {import('./CanvasEngine.js').CanvasEngine} engine
   * @param {Array<any>} objects
   * @param {Array<any>} oldStates
   * @param {Array<any>} newStates
   */
  constructor(engine, objects, oldStates, newStates) {
    super('Transform Objects');
    this.engine = engine;
    this.objects = [...objects];
    this.oldStates = typeof structuredClone === 'function' ? structuredClone(oldStates) : JSON.parse(JSON.stringify(oldStates));
    this.newStates = typeof structuredClone === 'function' ? structuredClone(newStates) : JSON.parse(JSON.stringify(newStates));
  }

  _applyState(states) {
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      const state = states[i];
      if (!obj || !state) continue;

      if (state.type === 'stroke' && obj.points && state.points) {
        obj.points = state.points.map(p => ({ ...p }));
      } else if (state.type === 'shape') {
        obj.x1 = state.x1;
        obj.y1 = state.y1;
        obj.x2 = state.x2;
        obj.y2 = state.y2;
      }
    }

    if (this.engine.lassoSelector) {
      this.engine.lassoSelector.recalculateOBB();
    }
    this.engine.invalidate();
    this.engine.invalidateOverlay();
  }

  undo() {
    this._applyState(this.oldStates);
  }

  redo() {
    this._applyState(this.newStates);
  }
}

export class ClearCanvasAction extends HistoryAction {
  /**
   * @param {import('./CanvasEngine.js').CanvasEngine} engine
   * @param {Array<any>} oldObjects
   */
  constructor(engine, oldObjects) {
    super('Clear Canvas');
    this.engine = engine;
    this.oldObjects = [...oldObjects];
  }

  undo() {
    this.engine.setObjects(this.oldObjects);
  }

  redo() {
    this.engine.clear();
  }
}

export class BatchAction extends HistoryAction {
  /**
   * @param {Array<HistoryAction>} actions
   * @param {string} [name='Batch Action']
   */
  constructor(actions = [], name = 'Batch Action') {
    super(name);
    this.actions = [...actions];
  }

  undo() {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo();
    }
  }

  redo() {
    for (let i = 0; i < this.actions.length; i++) {
      this.actions[i].redo();
    }
  }
}

// ==========================================
// 2. History Manager Engine
// ==========================================

export class HistoryManager {
  /**
   * @param {import('./CanvasEngine.js').CanvasEngine} engine
   * @param {number} [maxStackSize=5000]
   */
  constructor(engine, maxStackSize = 5000) {
    this.engine = engine;
    this.maxStackSize = maxStackSize;

    /** @type {Array<HistoryAction>} */
    this.undoStack = [];
    /** @type {Array<HistoryAction>} */
    this.redoStack = [];

    this.listeners = new Set();
  }

  /**
   * Executes and pushes an action onto the undo stack.
   * Clears the redo stack and safely truncates if > maxStackSize.
   * @param {HistoryAction} action
   */
  execute(action) {
    if (!action || typeof action.undo !== 'function' || typeof action.redo !== 'function') {
      throw new Error('[HistoryManager] Invalid HistoryAction provided');
    }

    this.undoStack.push(action);
    this.redoStack.length = 0; // Truncate redo history

    // Keep within maximum safety boundary
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this._notify();
  }

  /**
   * Reverts the most recent action.
   * @returns {boolean} Whether an action was undone.
   */
  undo() {
    if (this.undoStack.length === 0) return false;

    const action = this.undoStack.pop();
    try {
      action.undo();
      this.redoStack.push(action);
      this._notify();
      return true;
    } catch (err) {
      console.error('[HistoryManager] Error executing undo on action:', action.name, err);
      return false;
    }
  }

  /**
   * Re-applies the most recently reverted action.
   * @returns {boolean} Whether an action was redone.
   */
  redo() {
    if (this.redoStack.length === 0) return false;

    const action = this.redoStack.pop();
    try {
      action.redo();
      this.undoStack.push(action);
      this._notify();
      return true;
    } catch (err) {
      console.error('[HistoryManager] Error executing redo on action:', action.name, err);
      return false;
    }
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this._notify();
  }

  // ==========================================
  // 3. Convenience Action Helpers
  // ==========================================

  executeAddObject(object) {
    this.engine.addObject(object);
    this.execute(new AddObjectAction(this.engine, object));
  }

  executeDeleteObjects(objects) {
    if (!objects || objects.length === 0) return;
    const action = new DeleteObjectsAction(this.engine, objects);
    action.redo();
    this.execute(action);
  }

  executeTransformObjects(objects, oldStates, newStates) {
    if (!objects || objects.length === 0) return;
    const action = new TransformObjectsAction(this.engine, objects, oldStates, newStates);
    this.execute(action);
  }

  executeClearCanvas() {
    if (this.engine.objects.length === 0) return;
    const oldObjects = [...this.engine.objects];
    const action = new ClearCanvasAction(this.engine, oldObjects);
    action.redo();
    this.execute(action);
  }

  // ==========================================
  // 4. Change Listener System
  // ==========================================

  onChange(callback) {
    this.listeners.add(callback);
    // Initial call
    callback({
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    });
    return () => this.listeners.delete(callback);
  }

  _notify() {
    const state = {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    };

    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[HistoryManager] Error in change listener:', err);
      }
    }
  }
}
