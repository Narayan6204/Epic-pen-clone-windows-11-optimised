/**
 * index.js
 * Entry barrel for the Pen 11 High-Performance Canvas & Smart Object Engine.
 */

export { CanvasEngine } from './CanvasEngine.js';
export { ToolManager, VectorStroke, VectorShape } from './ToolManager.js';
export { LassoSelector } from './LassoSelector.js';
export {
  HistoryManager,
  HistoryAction,
  AddObjectAction,
  DeleteObjectsAction,
  TransformObjectsAction,
  ClearCanvasAction,
  BatchAction
} from './HistoryManager.js';
