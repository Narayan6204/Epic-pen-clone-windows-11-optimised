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
  { id: 'line', icon: '<svg width="24" height="24" viewBox="0 0 32 32"><line x1="6" y1="26" x2="26" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', name: 'Line' },
  { id: 'arrow', icon: '<svg width="24" height="24" viewBox="0 0 32 32"><line x1="6" y1="26" x2="24" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="14,8 24,8 24,18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', name: 'Arrow' },
  { id: 'rectangle', icon: '<svg width="24" height="24" viewBox="0 0 32 32"><rect x="6" y="8" width="20" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>', name: 'Rectangle' },
  { id: 'rounded_rectangle', icon: '<svg width="24" height="24" viewBox="0 0 32 32"><rect x="6" y="8" width="20" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>', name: 'Rounded Rectangle' },
  { id: 'circle', icon: '<svg width="24" height="24" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2"/></svg>', name: 'Circle' },
  { id: 'triangle', icon: '<svg width="24" height="24" viewBox="0 0 32 32"><polygon points="16,6 28,26 4,26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>', name: 'Triangle' }
];

class App {
  constructor() {
    this.canvasEngine = null;
    this.toolManager = null;
    this.historyManager = null;
    this.lassoSelector = null;
    
    this.currentColor = '#000000';
    this.backdropModes = ['transparent', 'whiteboard', 'blackboard'];
    this.currentBackdropIndex = 0;

    this.penSize = 5;
    this.highlighterSize = 25;
    this.eraserSize = 40;
    this.penColor = '#000000';
    this.highlighterColor = '#FFCC00';

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

    console.log('Pen 11 Web Experience Initialized with Exact Desktop UI & Shortcuts.');
  }

  // ==========================================================================
  // 1. Canvas Engine Setup
  // ==========================================================================
  _initCanvas() {
    const container = document.getElementById('pen-hero-canvas-container');
    if (!container) return;

    this.canvasEngine = new CanvasEngine(container, {
      backgroundColor: 'rgba(0,0,0,0.008)',
      gridType: 'none'
    });

    this.historyManager = new HistoryManager(this.canvasEngine);
    this.toolManager = new ToolManager(this.canvasEngine, this.historyManager);
    this.lassoSelector = new LassoSelector(this.canvasEngine, this.toolManager, this.historyManager);

    // Initial tool & color settings
    this.toolManager.setColor(this.penColor);
    this.toolManager.setSize(this.penSize);

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
      toolbar.style.right = 'auto';
      toolbar.style.bottom = 'auto';
      dragHandle.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const parentRect = stageWrapper.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();

      const minLeft = 8;
      const maxLeft = Math.max(minLeft, parentRect.width - 40);
      const minTop = 8;
      const maxTop = Math.max(minTop, parentRect.height - 40);

      let newLeft = Math.max(minLeft, Math.min(maxLeft, initialLeft + dx));
      let newTop = Math.max(minTop, Math.min(maxTop, initialTop + dy));

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

    // ── Monkey Button & Cursor Flyout Handler (1:1 with main.py) ──
    const monkeyBtn = document.getElementById('tb-btn-monkey');
    const monkeyFlyout = document.getElementById('tb-monkey-flyout');
    const monkeyIcon = document.getElementById('tb-monkey-icon');

    const updateMonkeyMenu = () => {
      if (!monkeyFlyout) return;
      if (this.monkeyState === 'cursor') {
        monkeyFlyout.innerHTML = `
          <button class="toolbar-tool-btn" data-monkey="active" title="Active Ink Mode" aria-label="Active Ink">
            <span>🐵</span>
          </button>
          <button class="toolbar-tool-btn" data-monkey="hidden" title="Hide Canvas (Ctrl+5)" aria-label="Hide Canvas">
            <span>🙈</span>
          </button>
        `;
      } else {
        monkeyFlyout.innerHTML = `
          <button class="toolbar-tool-btn" data-monkey="cursor" title="Cursor Mode (Click-through)" aria-label="Cursor Mode">
            <span>🐒</span>
          </button>
          <button class="toolbar-tool-btn" data-monkey="hidden" title="Hide Canvas (Ctrl+5)" aria-label="Hide Canvas">
            <span>🙈</span>
          </button>
        `;
      }

      monkeyFlyout.querySelectorAll('[data-monkey]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.getAttribute('data-monkey');
          this._closeAllPopovers();

          if (action === 'active') {
            this.setCanvasVisibility(true);
            this.selectTool('pen');
          } else if (action === 'cursor') {
            this.setCanvasVisibility(true);
            this.selectTool('cursor');
          } else if (action === 'hidden') {
            this.setCanvasVisibility(false);
          }
        });
      });
    };

    if (monkeyBtn && monkeyFlyout) {
      monkeyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.isCanvasVisible || toolbar.classList.contains('collapsed')) {
          this.setCanvasVisibility(true);
          this.selectTool('pen');
          return;
        }

        const isCurrentlyOpen = monkeyFlyout.classList.contains('active');
        this._closeAllPopovers();

        if (!isCurrentlyOpen) {
          updateMonkeyMenu();
          monkeyFlyout.style.display = 'flex';
          void monkeyFlyout.offsetWidth; // Force reflow
          monkeyFlyout.classList.add('active');
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
        const isCurrentlyOpen = shapesFlyout.classList.contains('active');
        this._closeAllPopovers();

        if (!isCurrentlyOpen) {
          shapesFlyout.style.display = 'flex';
          void shapesFlyout.offsetWidth; // Force reflow
          shapesFlyout.classList.add('active');
        }
      });

      shapesFlyout.querySelectorAll('[data-shape]').forEach(shapeItem => {
        shapeItem.addEventListener('click', (e) => {
          e.stopPropagation();
          const shape = shapeItem.dataset.shape;
          this.selectTool(shape);
          this._closeAllPopovers();
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
        this.showToast(`Background: ${mode}`, 'wallpaper');
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
    const popovers = document.querySelectorAll('.toolbar-palette-popover, .toolbar-shape-flyout, .toolbar-monkey-flyout');
    popovers.forEach(p => {
      p.style.display = 'none';
      p.classList.remove('active');
    });
  }

  selectTool(toolName) {
    if (!this.toolManager) return;
    this.toolManager.setTool(toolName);
    
    if (toolName === 'pen') {
      this.toolManager.setSize(this.penSize);
      this.toolManager.setColor(this.penColor);
    } else if (toolName === 'highlighter') {
      this.toolManager.setSize(this.highlighterSize);
      this.toolManager.setColor(this.highlighterColor);
    } else if (toolName === 'eraser') {
      this.toolManager.setSize(this.eraserSize);
    }

    // If canvas was hidden, restore it
    if (!this.isCanvasVisible) {
      this.setCanvasVisibility(true);
    }

    const canvasContainer = document.getElementById('pen-hero-canvas-container');

    // Update Monkey Button State
    const monkeyBtn = document.getElementById('tb-btn-monkey');
    const monkeyIcon = document.getElementById('tb-monkey-icon') || (monkeyBtn ? monkeyBtn.querySelector('span') : null);
    if (toolName === 'select' || toolName === 'cursor') {
      this.monkeyState = 'cursor';
      if (monkeyIcon) monkeyIcon.textContent = '🐒';
      if (monkeyBtn) monkeyBtn.title = 'Cursor Mode Active (Click to switch to Pen)';
      if (canvasContainer) {
        canvasContainer.style.pointerEvents = 'none';
      }
    } else {
      this.monkeyState = 'active';
      if (monkeyIcon) monkeyIcon.textContent = '🐵';
      if (monkeyBtn) monkeyBtn.title = 'Active Ink Mode (Click to switch to Cursor)';
      if (canvasContainer) {
        canvasContainer.style.pointerEvents = 'auto';
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

    // Update canvas cursor matching main.py
    const stage = document.getElementById('canvas-stage-wrapper');
    if (stage) {
      stage.classList.remove('cursor-pen', 'cursor-highlighter', 'cursor-eraser', 'cursor-pointer');
      if (toolName === 'pen') {
        stage.classList.add('cursor-pen');
      } else if (toolName === 'highlighter') {
        stage.classList.add('cursor-highlighter');
      } else if (toolName === 'eraser') {
        stage.classList.add('cursor-eraser');
      } else {
        stage.classList.add('cursor-pointer');
      }
    }
  }

  selectColor(hex) {
    this.currentColor = hex;
    const currentTool = this.toolManager ? this.toolManager.currentTool : 'pen';
    if (currentTool === 'highlighter') {
      this.highlighterColor = hex;
    } else {
      this.penColor = hex;
    }
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
    const monkeyIcon = document.getElementById('tb-monkey-icon') || (monkeyBtn ? monkeyBtn.querySelector('span') : null);
    const canvasContainer = document.getElementById('pen-hero-canvas-container');
    const stage = document.getElementById('canvas-stage-wrapper');

    if (visible) {
      if (toolbar) toolbar.classList.remove('collapsed');
      if (canvasContainer) canvasContainer.style.display = 'block';
      if (stage) stage.classList.remove('canvas-hidden');
      this.monkeyState = 'active';
      if (monkeyIcon) monkeyIcon.textContent = '🐵';
      if (monkeyBtn) monkeyBtn.title = 'Active Ink Mode (Click to switch to Cursor)';
      this.showToast('Canvas Visible (Ctrl+5)', 'visibility');
    } else {
      if (toolbar) toolbar.classList.add('collapsed');
      if (canvasContainer) canvasContainer.style.display = 'none';
      if (stage) stage.classList.add('canvas-hidden');
      this._closeAllPopovers();
      this.monkeyState = 'hidden';
      if (monkeyIcon) monkeyIcon.textContent = '🙈';
      if (monkeyBtn) monkeyBtn.title = 'Canvas Hidden (Click to unhide)';
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
    if (this.canvasEngine) {
      if (mode === 'transparent') {
        this.canvasEngine.options.backgroundColor = 'rgba(0,0,0,0.008)';
      } else if (mode === 'whiteboard') {
        this.canvasEngine.options.backgroundColor = '#FFFFFF';
      } else if (mode === 'blackboard') {
        this.canvasEngine.options.backgroundColor = '#222222';
      }
      this.canvasEngine.invalidate();
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
  // 8. Toast Notification System
  // ==========================================
  showRestrictedToast() {
    this.showToast(
      '🔒 Download Pen 11 to use all features',
      'lock',
      '<a href="https://github.com/Narayan6204/Epic-pen-clone-windows-11-optimised/releases/latest" class="m3-btn m3-btn-filled" style="height: 32px; font-size: 13px; padding: 0 12px; text-decoration: none; background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary);">Download</a>'
    );
  }

  showToast(message, icon = 'info', actionHtml = '') {
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
        <div id="m3-snackbar-action" class="m3-flex-row m3-align-center" style="margin-left: auto;"></div>
        <button class="m3-btn m3-btn-text" id="m3-snackbar-dismiss" style="color: var(--md-sys-color-inverse-primary); padding: 0 8px; height: 32px; margin-left: 8px;">DISMISS</button>
      `;
      document.body.appendChild(snackbar);

      snackbar.querySelector('#m3-snackbar-dismiss').addEventListener('click', () => {
        snackbar.classList.remove('active');
      });
    }

    const textEl = snackbar.querySelector('#m3-snackbar-text');
    const iconEl = snackbar.querySelector('#m3-snackbar-icon');
    const actionEl = snackbar.querySelector('#m3-snackbar-action');
    if (textEl) textEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;
    
    if (actionEl) {
      actionEl.innerHTML = actionHtml || '';
      actionEl.style.display = actionHtml ? 'flex' : 'none';
    }

    snackbar.classList.add('active');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      snackbar.classList.remove('active');
    }, actionHtml ? 5000 : 3200);
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
