/**
 * shortcuts.js
 * Pen 11 Keyboard Shortcuts & Interactive Matrix Search Engine.
 * Handles the 14 exact global key bindings from main.py
 * (Ctrl+1..5, Ctrl+Z, Ctrl+Shift+C, Ctrl+P, Ctrl+B, Ctrl+], Ctrl+[, Ctrl+Q, Delete/Backspace, Shift+Drag)
 * and powers the dynamic Hotkey Matrix search and category filter table.
 */

export const SHORTCUTS_DATA = [
  {
    category: 'Drawing Tools',
    action: 'Select Pen Tool',
    keys: ['Ctrl', '1'],
    description: 'Activates smooth, pressure-sensitive vector pen nib for writing and sketching.',
    toolId: 'pen'
  },
  {
    category: 'Drawing Tools',
    action: 'Select Highlighter Tool',
    keys: ['Ctrl', '2'],
    description: 'Switches to semi-transparent chisel marker with multiply blend mode.',
    toolId: 'highlighter'
  },
  {
    category: 'Drawing Tools',
    action: 'Select Eraser Tool',
    keys: ['Ctrl', '3'],
    description: 'Erases strokes point-by-point or smart objects by proximity.',
    toolId: 'eraser'
  },
  {
    category: 'Selection & Smart Objects',
    action: 'Select / Cursor Mode',
    keys: ['Ctrl', '4'],
    description: 'Enables cursor click-through mode, lasso circle-to-select, and OBB transformation.',
    toolId: 'select'
  },
  {
    category: 'Canvas Controls',
    action: 'Toggle Canvas Visibility',
    keys: ['Ctrl', '5'],
    description: 'Collapses toolbar to minimal pill (🙈) and temporarily hides ink without clearing.',
    actionId: 'toggle-visibility'
  },
  {
    category: 'Canvas Controls',
    action: 'Undo Last Action',
    keys: ['Ctrl', 'Z'],
    description: 'Steps backward in the 5,000-step memory-safe undo stack.',
    actionId: 'undo'
  },
  {
    category: 'Canvas Controls',
    action: 'Clear Screen',
    keys: ['Ctrl', 'Shift', 'C'],
    description: 'Instantly wipes all drawings and strokes from the screen.',
    actionId: 'clear'
  },
  {
    category: 'Styling & Sizing',
    action: 'Toggle Color Palette',
    keys: ['Ctrl', 'P'],
    description: 'Opens or closes the floating 12-color curated swatch toolbox.',
    actionId: 'toggle-palette'
  },
  {
    category: 'Canvas Controls',
    action: 'Toggle Background Mode',
    keys: ['Ctrl', 'B'],
    description: 'Cycles between Transparent Desktop, Whiteboard, and Blackboard.',
    actionId: 'toggle-backdrop'
  },
  {
    category: 'Styling & Sizing',
    action: 'Increase Nib Size',
    keys: ['Ctrl', ']'],
    description: 'Increments active stroke nib thickness by +2px.',
    actionId: 'size-increase'
  },
  {
    category: 'Styling & Sizing',
    action: 'Decrease Nib Size',
    keys: ['Ctrl', '['],
    description: 'Decrements active stroke nib thickness by -2px.',
    actionId: 'size-decrease'
  },
  {
    category: 'Canvas Controls',
    action: 'Exit Pen 11',
    keys: ['Ctrl', 'Q'],
    description: 'Instantly closes and exits the Pen 11 application.',
    actionId: 'exit-app'
  },
  {
    category: 'Selection & Smart Objects',
    action: 'Delete Selected Objects',
    keys: ['Delete', 'Backspace'],
    description: 'Removes all currently highlighted lasso selections from the screen.',
    actionId: 'delete-selected'
  },
  {
    category: 'Drawing Tools',
    action: 'Constrain Shapes & Angles',
    keys: ['Shift', 'Drag'],
    description: 'Snaps line/arrow angles to 45°, rectangle/ellipse to 1:1, and triangle to 90° right angle.',
    actionId: 'constrain'
  }
];

export class ShortcutsManager {
  /**
   * @param {Object} context - App context with toolManager, canvasEngine, historyManager, toast, etc.
   */
  constructor(context = {}) {
    this.context = context;
    this.tableBody = null;
    this.searchInput = null;
    this.chipContainer = null;
    this.activeCategory = 'all';
    this.searchQuery = '';
    
    this._bindKeyboardListener();
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  _bindKeyboardListener() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    // Ignore keystrokes when typing into input or textarea
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const key = e.key;
    const code = e.code || '';

    // Ctrl + 1: Pen
    if (isCtrl && !isShift && (key === '1' || code === 'Digit1' || code === 'Numpad1')) {
      e.preventDefault();
      this.triggerTool('pen', 'Pen Tool (Ctrl+1)');
    }
    // Ctrl + 2: Highlighter
    else if (isCtrl && !isShift && (key === '2' || code === 'Digit2' || code === 'Numpad2')) {
      e.preventDefault();
      this.triggerTool('highlighter', 'Highlighter (Ctrl+2)');
    }
    // Ctrl + 3: Eraser
    else if (isCtrl && !isShift && (key === '3' || code === 'Digit3' || code === 'Numpad3')) {
      e.preventDefault();
      this.triggerTool('eraser', 'Eraser (Ctrl+3)');
    }
    // Ctrl + 4: Cursor / Select
    else if (isCtrl && !isShift && (key === '4' || code === 'Digit4' || code === 'Numpad4')) {
      e.preventDefault();
      this.triggerTool('select', 'Select / Cursor (Ctrl+4)');
    }
    // Ctrl + 5: Toggle Canvas Visibility
    else if (isCtrl && !isShift && (key === '5' || code === 'Digit5' || code === 'Numpad5')) {
      e.preventDefault();
      this.triggerAction('toggle-visibility', 'Toggled Canvas Visibility (Ctrl+5)');
    }
    // Ctrl + Shift + Z or Ctrl + Y: Redo
    else if ((isCtrl && isShift && (key === 'z' || key === 'Z' || code === 'KeyZ')) || (isCtrl && !isShift && (key === 'y' || key === 'Y' || code === 'KeyY'))) {
      e.preventDefault();
      this.triggerAction('redo', 'Redo (Ctrl+Y)');
    }
    // Ctrl + Z: Undo
    else if (isCtrl && !isShift && (key === 'z' || key === 'Z' || code === 'KeyZ')) {
      e.preventDefault();
      this.triggerAction('undo', 'Undo (Ctrl+Z)');
    }
    // Ctrl + Shift + C: Clear Screen
    else if (isCtrl && isShift && (key === 'C' || key === 'c' || code === 'KeyC')) {
      e.preventDefault();
      this.triggerAction('clear', 'Clear Screen (Ctrl+Shift+C)');
    }
    // Ctrl + ]: Increase Size
    else if (isCtrl && (key === ']' || code === 'BracketRight')) {
      e.preventDefault();
      this.triggerAction('size-increase', 'Nib Size Increased (Ctrl+] )');
    }
    // Ctrl + [: Decrease Size
    else if (isCtrl && (key === '[' || code === 'BracketLeft')) {
      e.preventDefault();
      this.triggerAction('size-decrease', 'Nib Size Decreased (Ctrl+[ )');
    }
    // Ctrl + P: Toggle Color Palette
    else if (isCtrl && !isShift && (key === 'p' || key === 'P' || code === 'KeyP')) {
      e.preventDefault();
      this.triggerAction('toggle-palette', 'Toggled Color Palette (Ctrl+P)');
    }
    // Ctrl + B: Toggle Backdrop
    else if (isCtrl && !isShift && (key === 'b' || key === 'B' || code === 'KeyB')) {
      e.preventDefault();
      this.triggerAction('toggle-backdrop', 'Toggled Background (Ctrl+B)');
    }
    // Ctrl + Q: Exit App
    else if (isCtrl && !isShift && (key === 'q' || key === 'Q' || code === 'KeyQ')) {
      e.preventDefault();
      this.triggerAction('exit-app', 'Pen 11 Exit Shortcut (Ctrl+Q)');
    }
    // Delete / Backspace: Delete selected
    else if (key === 'Delete' || key === 'Backspace' || code === 'Delete' || code === 'Backspace') {
      if (this.context.lassoSelector && this.context.lassoSelector.selectedObjects && this.context.lassoSelector.selectedObjects.length > 0) {
        e.preventDefault();
        this.triggerAction('delete-selected', 'Deleted Selected Objects');
      }
    }
  }

  triggerTool(toolName, feedbackMessage) {
    if (this.context.toolManager) {
      this.context.toolManager.setTool(toolName);
      if (this.context.updateToolbarUI) {
        this.context.updateToolbarUI(toolName);
      }
    }
    if (this.context.showToast && feedbackMessage) {
      this.context.showToast(feedbackMessage, 'edit');
    }
  }

  triggerAction(actionId, feedbackMessage) {
    const ctx = this.context;
    
    switch (actionId) {
      case 'undo':
        if (ctx.historyManager) {
          if (ctx.historyManager.canUndo()) {
            ctx.historyManager.undo();
          } else {
            feedbackMessage = 'Nothing to Undo';
          }
        }
        break;
      case 'redo':
        if (ctx.historyManager) {
          if (ctx.historyManager.canRedo()) {
            ctx.historyManager.redo();
          } else {
            feedbackMessage = 'Nothing to Redo';
          }
        }
        break;
      case 'clear':
        if (ctx.historyManager) {
          ctx.historyManager.executeClearCanvas();
        } else if (ctx.canvasEngine) {
          ctx.canvasEngine.clear();
        }
        break;
      case 'toggle-visibility':
        if (ctx.toggleCanvasVisibility) {
          ctx.toggleCanvasVisibility();
          return; // Toast handled by callback
        }
        break;
      case 'size-increase':
        if (ctx.toolManager) {
          const newSize = Math.min(45, ctx.toolManager.size + 2);
          ctx.toolManager.setSize(newSize);
          if (ctx.updateSizeUI) ctx.updateSizeUI(newSize);
          feedbackMessage = `Nib Size: ${newSize}px`;
        }
        break;
      case 'size-decrease':
        if (ctx.toolManager) {
          const newSize = Math.max(1, ctx.toolManager.size - 2);
          ctx.toolManager.setSize(newSize);
          if (ctx.updateSizeUI) ctx.updateSizeUI(newSize);
          feedbackMessage = `Nib Size: ${newSize}px`;
        }
        break;
      case 'toggle-palette':
        if (ctx.togglePalette) {
          ctx.togglePalette();
          return;
        }
        break;
      case 'toggle-backdrop':
        if (ctx.cycleBackdrop) {
          const mode = ctx.cycleBackdrop();
          feedbackMessage = `Background: ${mode.toUpperCase()}`;
        }
        break;
      case 'exit-app':
        feedbackMessage = 'Pen 11 Exit Shortcut (Ctrl+Q)';
        break;
      case 'delete-selected':
        if (ctx.lassoSelector && ctx.lassoSelector.selectedObjects.length > 0) {
          ctx.lassoSelector.deleteSelection();
        }
        break;
    }

    if (ctx.showToast && feedbackMessage) {
      ctx.showToast(feedbackMessage, 'keyboard');
    }
  }

  /**
   * Initializes interactive search & filter table in the DOM
   * @param {Object} elements - { tableBody, searchInput, chipContainer }
   */
  initTable(elements) {
    this.tableBody = elements.tableBody;
    this.searchInput = elements.searchInput;
    this.chipContainer = elements.chipContainer;

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTable();
      });
    }

    if (this.chipContainer) {
      this.chipContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.m3-chip');
        if (!chip) return;
        
        this.chipContainer.querySelectorAll('.m3-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeCategory = chip.dataset.category || 'all';
        this.renderTable();
      });
    }

    this.renderTable();
  }

  renderTable() {
    if (!this.tableBody) return;

    const filtered = SHORTCUTS_DATA.filter(item => {
      const matchCategory = this.activeCategory === 'all' || item.category === this.activeCategory;
      const matchSearch = !this.searchQuery || 
        item.action.toLowerCase().includes(this.searchQuery) ||
        item.description.toLowerCase().includes(this.searchQuery) ||
        item.keys.join(' ').toLowerCase().includes(this.searchQuery);
      return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; padding: 32px; color: var(--md-sys-color-outline);">
            <div class="m3-flex-col m3-align-center m3-gap-sm">
              <span class="material-symbols-rounded" style="font-size: 36px;">search_off</span>
              <p>No matching keyboard shortcuts found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = filtered.map(item => `
      <tr>
        <td class="shortcut-action">
          ${item.action}
        </td>
        <td class="shortcut-keys">
          <div class="m3-kbd-group">
            ${item.keys.map(k => `<kbd>${k}</kbd>`).join(' + ')}
          </div>
        </td>
        <td class="shortcut-desc">
          ${item.description}
        </td>
      </tr>
    `).join('');
  }
}

export const shortcutsManager = new ShortcutsManager();
