/**
 * app.js
 * Main Application Orchestrator for the Pen 11 Web Application.
 * Connects CanvasEngine, ToolManager, HistoryManager, LassoSelector, ThemeEngine,
 * ShortcutsManager, GitHubReleaseManager, Draggable Floating Toolbar, 12-Color Palette,
 * Shape Menu, and Toast HUD.
 */

import { CanvasEngine, ToolManager, HistoryManager, LassoSelector, VectorStroke, VectorShape } from './canvas/index.js';
import { themeEngine, THEME_SEEDS } from './theme.js';
import { rippleEngine } from './ripple.js';
import { shortcutsManager } from './shortcuts.js';
import { gitHubReleaseManager } from './github-release.js';

export const PEN_COLORS = [
  { hex: '#000000', name: 'Black' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#717171', name: 'Gray' },
  { hex: '#FF3B30', name: 'Red' },
  { hex: '#FF9500', name: 'Orange' },
  { hex: '#FFCC00', name: 'Yellow' },
  { hex: '#4CD964', name: 'Green' },
  { hex: '#5AC8FA', name: 'Light Blue' },
  { hex: '#007AFF', name: 'Blue' },
  { hex: '#5856D6', name: 'Purple' },
  { hex: '#FF2D55', name: 'Pink' },
  { hex: '#A2845E', name: 'Brown' }
];

export const PEN_SHAPES = [
  { id: 'line', icon: '📏', name: 'Line' },
  { id: 'arrow', icon: '↗️', name: 'Arrow' },
  { id: 'rectangle', icon: '⬛', name: 'Rectangle' },
  { id: 'rounded_rectangle', icon: '🟩', name: 'Rounded Rectangle' },
  { id: 'circle', icon: '🟡', name: 'Circle' },
  { id: 'triangle', icon: '🔺', name: 'Triangle (Shift for 90° Right Angle)' }
];

class App {
  constructor() {
    this.canvasEngine = null;
    this.toolManager = null;
    this.historyManager = null;
    this.lassoSelector = null;
    
    this.currentColor = '#000000';
    this.backdropModes = ['whiteboard', 'blackboard', 'transparent'];
    this.currentBackdropIndex = 0;

    // Monkey State: 'active' (🐵) | 'cursor' (🐒) | 'hidden' (🙈)
    this.monkeyState = 'active';
    this.isCanvasVisible = true;

    this.toastTimer = null;
  }

  async init() {
    // 1. Initialize Interactive Canvas Sandbox
    this._initCanvas();

    // 2. Initialize Draggable Floating Pen 11 Toolbar
    this._initDraggableToolbar();

    // 3. Initialize Theme Controls
    this._initThemeControls();

    // 4. Initialize Top App Bar & Navigation
    this._initNavigation();

    // 5. Initialize Shortcuts Matrix & Global Key Listener
    this._initShortcuts();

    // 6. Fetch Latest Release Data from GitHub
    this._initGitHubReleases();

    // 7. Seed Initial Demo Vector Artwork
    this._seedDemoArtwork();

    console.log('Pen 11 Web Experience Initialized with Exact Desktop UI & Shortcuts.');
  }

  // ==========================================================================
  // 1. Canvas Engine Setup
  // ==========================================================================
  _initCanvas() {
    const container = document.getElementById('pen-hero-canvas-container');
    if (!container) return;

    this.canvasEngine = new CanvasEngine(container, {
      backgroundColor: 'transparent',
      gridType: 'dots',
      gridSize: 24,
      gridColor: 'rgba(0, 97, 164, 0.12)'
    });

    this.historyManager = new HistoryManager(this.canvasEngine);
    this.toolManager = new ToolManager(this.canvasEngine, this.historyManager);
    this.lassoSelector = new LassoSelector(this.canvasEngine, this.toolManager, this.historyManager);

    // Initial tool & color settings
    this.toolManager.setColor('#000000');
    this.toolManager.setSize(4);

    // Sync History Button States (Undo)
    this.historyManager.onChange((state) => {
      const undoBtn = document.getElementById('tb-btn-undo');
      if (undoBtn) undoBtn.disabled = !state.canUndo;
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
      if (this.canvasEngine) {
        this.canvasEngine.resize();
      }
    });

    // Subscribe to Theme Engine Re-tinting
    themeEngine.onCanvasRetint((theme) => {
      if (!this.canvasEngine) return;
      this.canvasEngine.options.gridColor = theme.isDark 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 97, 164, 0.12)';
      this.canvasEngine.invalidate();
    });
  }

  // ==========================================================================
  // 2. Draggable Warm Sand Toolbar Setup
  // ==========================================================================
  _initDraggableToolbar() {
    const toolbar = document.getElementById('pen-live-toolbar');
    const dragHandle = document.getElementById('pen-toolbar-drag');
    const stageWrapper = document.getElementById('canvas-stage-wrapper');
    if (!toolbar || !dragHandle || !stageWrapper) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    const onPointerDown = (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = toolbar.getBoundingClientRect();
      const parentRect = stageWrapper.getBoundingClientRect();
      initialLeft = rect.left - parentRect.left;
      initialTop = rect.top - parentRect.top;

      toolbar.style.transition = 'none';
      dragHandle.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const parentRect = stageWrapper.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();

      let newLeft = Math.max(8, Math.min(parentRect.width - toolbarRect.width - 8, initialLeft + dx));
      let newTop = Math.max(8, Math.min(parentRect.height - toolbarRect.height - 8, initialTop + dy));

      toolbar.style.left = `${newLeft}px`;
      toolbar.style.top = `${newTop}px`;
      toolbar.style.transform = 'none';
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      toolbar.style.transition = '';
      try {
        dragHandle.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };

    dragHandle.addEventListener('pointerdown', onPointerDown);
    dragHandle.addEventListener('pointermove', onPointerMove);
    dragHandle.addEventListener('pointerup', onPointerUp);
    dragHandle.addEventListener('pointercancel', onPointerUp);

    // ── Monkey Button State Handler ──
    const monkeyBtn = document.getElementById('tb-btn-monkey');
    if (monkeyBtn) {
      monkeyBtn.addEventListener('click', () => {
        if (!this.isCanvasVisible) {
          // Unhide canvas and restore to Active Ink (🐵)
          this.setCanvasVisibility(true);
          this.selectTool('pen');
        } else if (this.monkeyState === 'active') {
          // Switch to Cursor Click-Through (🐒)
          this.selectTool('select');
        } else {
          // Switch back to Pen (🐵)
          this.selectTool('pen');
        }
      });
    }

    // ── Bind Tool Buttons ──
    toolbar.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.selectTool(tool);
      });
    });

    // ── Bind Shapes Flyout ──
    const shapesBtn = document.getElementById('tb-btn-shapes');
    const shapesFlyout = document.getElementById('tb-shapes-flyout');
    if (shapesBtn && shapesFlyout) {
      shapesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = shapesFlyout.style.display === 'flex';
        this._closeAllPopovers();
        shapesFlyout.style.display = isOpen ? 'none' : 'flex';
      });

      shapesFlyout.querySelectorAll('[data-shape]').forEach(shapeItem => {
        shapeItem.addEventListener('click', () => {
          const shape = shapeItem.dataset.shape;
          this.selectTool(shape);
          shapesFlyout.style.display = 'none';
          this.showToast(`Selected Shape: ${shape.toUpperCase()}`, 'shapes');
        });
      });
    }

    // ── Bind Floating 12-Color Palette ──
    const paletteBtn = document.getElementById('tb-btn-palette');
    const palettePopover = document.getElementById('tb-palette-popover');
    if (paletteBtn && palettePopover) {
      paletteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = palettePopover.style.display === 'flex';
        this._closeAllPopovers();
        palettePopover.style.display = isOpen ? 'none' : 'flex';
      });

      palettePopover.querySelectorAll('.palette-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const hex = btn.dataset.hex;
          this.selectColor(hex);
          this.showToast(`Color: ${btn.title || hex}`, 'palette');
        });
      });
    }

    // ── Bind Undo / Clear Actions ──
    const undoBtn = document.getElementById('tb-btn-undo');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (this.historyManager) this.historyManager.undo();
      });
    }

    const clearBtn = document.getElementById('tb-btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (this.historyManager) {
          this.historyManager.executeClearCanvas();
          this.showToast('Canvas Cleared (Ctrl+Shift+C)', 'delete');
        }
      });
    }

    // ── Bind Backdrop Switcher ──
    const backdropBtn = document.getElementById('tb-btn-bg');
    if (backdropBtn) {
      backdropBtn.addEventListener('click', () => {
        const mode = this.cycleBackdrop();
        this.showToast(`Background: ${mode.toUpperCase()} (Ctrl+B)`, 'wallpaper');
      });
    }

    // Close popovers on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#pen-live-toolbar') && !e.target.closest('#tb-shapes-flyout') && !e.target.closest('#tb-palette-popover')) {
        this._closeAllPopovers();
      }
    });
  }

  _closeAllPopovers() {
    const popovers = document.querySelectorAll('.toolbar-palette-popover, .toolbar-shape-flyout');
    popovers.forEach(p => p.style.display = 'none');
  }

  selectTool(toolName) {
    if (!this.toolManager) return;
    this.toolManager.setTool(toolName);

    // If canvas was hidden, restore it
    if (!this.isCanvasVisible) {
      this.setCanvasVisibility(true);
    }

    // Update Monkey Button State
    const monkeyBtn = document.getElementById('tb-btn-monkey');
    if (toolName === 'select' || toolName === 'cursor') {
      this.monkeyState = 'cursor';
      if (monkeyBtn) {
        monkeyBtn.querySelector('span').textContent = '🐒';
        monkeyBtn.title = 'Cursor Mode Active (Click to switch to Pen)';
      }
    } else {
      this.monkeyState = 'active';
      if (monkeyBtn) {
        monkeyBtn.querySelector('span').textContent = '🐵';
        monkeyBtn.title = 'Active Ink Mode (Click to switch to Cursor)';
      }
    }

    // Update active toolbar button state
    document.querySelectorAll('#pen-live-toolbar [data-tool]').forEach(btn => {
      if (btn.dataset.tool === toolName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Shape menu button if a shape is active
    const shapeBtn = document.getElementById('tb-btn-shapes');
    if (shapeBtn) {
      if (['line', 'arrow', 'rectangle', 'rounded_rectangle', 'circle', 'triangle'].includes(toolName)) {
        shapeBtn.classList.add('active');
      } else {
        shapeBtn.classList.remove('active');
      }
    }

    // Update canvas cursor
    const stage = document.getElementById('canvas-stage-wrapper');
    if (stage) {
      stage.className = stage.className.replace(/\bcursor-\S+/g, '');
      if (toolName === 'pen') stage.classList.add('cursor-pen');
      else if (toolName === 'highlighter') stage.classList.add('cursor-highlighter');
      else if (toolName === 'eraser') stage.classList.add('cursor-eraser');
      else stage.classList.add('cursor-pointer');
    }
  }

  selectColor(hex) {
    this.currentColor = hex;
    if (this.toolManager) {
      this.toolManager.setColor(hex);
    }

    document.querySelectorAll('.palette-color-btn').forEach(btn => {
      if (btn.dataset.hex.toUpperCase() === hex.toUpperCase()) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setCanvasVisibility(visible) {
    this.isCanvasVisible = visible;
    const toolbar = document.getElementById('pen-live-toolbar');
    const monkeyBtn = document.getElementById('tb-btn-monkey');
    const canvasContainer = document.getElementById('pen-hero-canvas-container');

    if (visible) {
      if (toolbar) toolbar.classList.remove('collapsed');
      if (canvasContainer) canvasContainer.style.display = 'block';
      this.monkeyState = 'active';
      if (monkeyBtn) {
        monkeyBtn.querySelector('span').textContent = '🐵';
        monkeyBtn.title = 'Active Ink Mode (Click to switch to Cursor)';
      }
      this.showToast('Canvas Visible (Ctrl+5)', 'visibility');
    } else {
      if (toolbar) toolbar.classList.add('collapsed');
      if (canvasContainer) canvasContainer.style.display = 'none';
      this._closeAllPopovers();
      this.monkeyState = 'hidden';
      if (monkeyBtn) {
        monkeyBtn.querySelector('span').textContent = '🙈';
        monkeyBtn.title = 'Canvas Hidden (Click to unhide)';
      }
      this.showToast('Canvas Hidden & Toolbar Collapsed (Ctrl+5)', 'visibility_off');
    }
  }

  toggleCanvasVisibility() {
    this.setCanvasVisibility(!this.isCanvasVisible);
  }

  togglePalette() {
    const popover = document.getElementById('tb-palette-popover');
    if (popover) {
      const isOpen = popover.style.display === 'flex';
      this._closeAllPopovers();
      popover.style.display = isOpen ? 'none' : 'flex';
      this.showToast(isOpen ? 'Color Palette Closed' : 'Color Palette Opened', 'palette');
    }
  }

  cycleBackdrop() {
    this.currentBackdropIndex = (this.currentBackdropIndex + 1) % this.backdropModes.length;
    const mode = this.backdropModes[this.currentBackdropIndex];
    const stage = document.getElementById('canvas-stage-wrapper');
    if (stage) {
      stage.classList.remove('canvas-backdrop-whiteboard', 'canvas-backdrop-blackboard', 'canvas-backdrop-transparent');
      stage.classList.add(`canvas-backdrop-${mode}`);
    }
    return mode;
  }

  // ==========================================
  // 3. Theme Controls & Dynamic Seeds
  // ==========================================
  _initThemeControls() {
    document.querySelectorAll('[data-theme-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.themeMode;
        themeEngine.setMode(mode);
        this._updateThemeModeUI(mode);
        this.showToast(`Theme Mode: ${mode.toUpperCase()}`, 'palette');
      });
    });

    document.querySelectorAll('[data-theme-seed]').forEach(btn => {
      btn.addEventListener('click', () => {
        const seedKey = btn.dataset.themeSeed;
        themeEngine.setSeed(seedKey);
        this._updateThemeSeedUI(seedKey);
        this.showToast(`Theme Color: ${THEME_SEEDS[seedKey]?.name || 'Custom'}`, 'palette');
      });
    });

    this._updateThemeModeUI(themeEngine.currentMode);
    this._updateThemeSeedUI(themeEngine.currentSeedKey);
  }

  _updateThemeModeUI(mode) {
    document.querySelectorAll('[data-theme-mode]').forEach(btn => {
      if (btn.dataset.themeMode === mode) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  _updateThemeSeedUI(seedKey) {
    document.querySelectorAll('[data-theme-seed]').forEach(btn => {
      if (btn.dataset.themeSeed === seedKey) {
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      }
    });
  }

  // ==========================================
  // 4. Navigation & App Bar Elevation
  // ==========================================
  _initNavigation() {
    const topAppBar = document.querySelector('.m3-top-app-bar');
    if (topAppBar) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          topAppBar.classList.add('scrolled');
        } else {
          topAppBar.classList.remove('scrolled');
        }
      }, { passive: true });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#' || href === '') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ==========================================
  // 5. Shortcuts Matrix & Global Event Bus
  // ==========================================
  _initShortcuts() {
    shortcutsManager.setContext({
      canvasEngine: this.canvasEngine,
      toolManager: this.toolManager,
      historyManager: this.historyManager,
      lassoSelector: this.lassoSelector,
      updateToolbarUI: (tool) => this.selectTool(tool),
      toggleCanvasVisibility: () => this.toggleCanvasVisibility(),
      togglePalette: () => this.togglePalette(),
      cycleBackdrop: () => this.cycleBackdrop(),
      showToast: (msg, icon) => this.showToast(msg, icon)
    });

    const tableBody = document.getElementById('hotkey-table-body');
    const searchInput = document.getElementById('hotkey-search-input');
    const chipContainer = document.getElementById('hotkey-category-chips');

    if (tableBody) {
      shortcutsManager.initTable({ tableBody, searchInput, chipContainer });
    }
  }

  // ==========================================
  // 6. GitHub Release Manager
  // ==========================================
  async _initGitHubReleases() {
    try {
      await gitHubReleaseManager.updateDOM();
    } catch (e) {
      console.warn('[App] GitHub release update DOM failed:', e);
    }
  }

  // ==========================================
  // 7. Demo Initial Artwork
  // ==========================================
  _seedDemoArtwork() {
    if (!this.canvasEngine || !this.toolManager) return;

    setTimeout(() => {
      // 1. Stylized "Pen 11" Header Vector Stroke
      const stroke1 = new VectorStroke({
        tool: 'pen',
        color: '#2C1F0E',
        size: 5,
        opacity: 1,
        points: [
          { x: 120, y: 140, pressure: 0.6, width: 4 },
          { x: 140, y: 120, pressure: 0.8, width: 5 },
          { x: 160, y: 130, pressure: 0.9, width: 5.5 },
          { x: 180, y: 180, pressure: 0.7, width: 4.5 },
          { x: 200, y: 160, pressure: 0.5, width: 3.5 }
        ]
      });

      // 2. Highlighter Accent
      const highlight = new VectorStroke({
        tool: 'highlighter',
        color: '#E6A23C',
        size: 24,
        opacity: 0.45,
        points: [
          { x: 100, y: 170, pressure: 0.5, width: 24 },
          { x: 260, y: 170, pressure: 0.5, width: 24 }
        ]
      });

      // 3. Arrow Shape Pointing to Features
      const arrow = new VectorShape({
        shapeType: 'arrow',
        color: '#FF3B30',
        size: 3,
        startX: 320,
        startY: 220,
        endX: 420,
        endY: 150
      });

      this.canvasEngine.addObject(highlight);
      this.canvasEngine.addObject(stroke1);
      this.canvasEngine.addObject(arrow);
      this.canvasEngine.invalidate();
    }, 200);
  }

  // ==========================================
  // 8. Toast Notification System
  // ==========================================
  showToast(message, icon = 'info') {
    let snackbar = document.getElementById('m3-global-snackbar');
    if (!snackbar) {
      snackbar = document.createElement('aside');
      snackbar.id = 'm3-global-snackbar';
      snackbar.className = 'm3-snackbar';
      snackbar.setAttribute('role', 'status');
      snackbar.setAttribute('aria-live', 'polite');
      snackbar.innerHTML = `
        <span class="m3-flex-row m3-align-center m3-gap-sm">
          <span class="material-symbols-rounded" id="m3-snackbar-icon" style="font-size: 20px;">info</span>
          <span id="m3-snackbar-text">Notification</span>
        </span>
        <button class="m3-btn m3-btn-text" id="m3-snackbar-dismiss" style="color: var(--md-sys-color-inverse-primary); padding: 0 8px; height: 32px;">DISMISS</button>
      `;
      document.body.appendChild(snackbar);

      snackbar.querySelector('#m3-snackbar-dismiss').addEventListener('click', () => {
        snackbar.classList.remove('active');
      });
    }

    const textEl = snackbar.querySelector('#m3-snackbar-text');
    const iconEl = snackbar.querySelector('#m3-snackbar-icon');
    if (textEl) textEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;

    snackbar.classList.add('active');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      snackbar.classList.remove('active');
    }, 3200);
  }
}

// Instantiate and Boot App on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const app = new App();
    await app.init();
    window.__PEN11_APP_LOADED__ = true;
  } catch (err) {
    console.error('[Pen 11] App initialization error:', err);
  }
});
