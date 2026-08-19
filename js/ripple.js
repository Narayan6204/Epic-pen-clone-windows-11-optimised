/**
 * ripple.js
 * Material Design 3 Dynamic Radial Ink Ripple & State Layer Engine.
 * Creates click-origin expanding ink ripples with authentic M3 deceleration curves
 * and state layers (hover 8%, focus 12%, pressed 12%).
 */

export class RippleEngine {
  constructor() {
    this.boundElements = new WeakSet();
    this.init();
  }

  init() {
    // Attach listener via event delegation for maximum performance
    document.addEventListener('pointerdown', (e) => this.handlePointerDown(e), { passive: true });
    
    // Inject required ripple keyframes and CSS if not present
    this._injectStyles();
  }

  _injectStyles() {
    if (document.getElementById('m3-ripple-styles')) return;

    const style = document.createElement('style');
    style.id = 'm3-ripple-styles';
    style.textContent = `
      .m3-ripple-surface {
        position: relative !important;
        overflow: hidden !important;
      }
      .m3-ripple-wave {
        position: absolute;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.12;
        pointer-events: none;
        transform: scale(0);
        animation: m3-ripple-expand 400ms cubic-bezier(0.2, 0, 0, 1) forwards,
                   m3-ripple-fade 350ms cubic-bezier(0.2, 0, 0, 1) 250ms forwards;
      }
      @keyframes m3-ripple-expand {
        0% {
          transform: scale(0);
        }
        100% {
          transform: scale(2.5);
        }
      }
      @keyframes m3-ripple-fade {
        0% {
          opacity: 0.12;
        }
        100% {
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Evaluates whether an element or any of its ancestors is an interactive ripple surface
   * @param {HTMLElement} target
   * @returns {HTMLElement|null}
   */
  findRippleTarget(target) {
    if (!target || !(target instanceof HTMLElement)) return null;
    return target.closest('.m3-btn, .m3-chip, .m3-fab, .m3-fab-extended, .m3-icon-btn, .m3-drawer-item, .m3-nav-item, .toolbar-tool-btn, [data-ripple]');
  }

  handlePointerDown(e) {
    // Only primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const target = this.findRippleTarget(e.target);
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;

    this.createRipple(target, e.clientX, e.clientY);
  }

  /**
   * Programmatically creates an M3 radial ripple on a target element
   * @param {HTMLElement} target 
   * @param {number} clientX 
   * @param {number} clientY 
   */
  createRipple(target, clientX, clientY) {
    if (!target.classList.contains('m3-ripple-surface')) {
      target.classList.add('m3-ripple-surface');
    }

    const rect = target.getBoundingClientRect();
    const x = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const y = clientY !== undefined ? clientY - rect.top : rect.height / 2;

    const radius = Math.hypot(
      Math.max(x, rect.width - x),
      Math.max(y, rect.height - y)
    );

    const wave = document.createElement('span');
    wave.className = 'm3-ripple-wave';
    wave.style.width = `${radius * 2}px`;
    wave.style.height = `${radius * 2}px`;
    wave.style.left = `${x - radius}px`;
    wave.style.top = `${y - radius}px`;

    target.appendChild(wave);

    // Remove wave after animation completes
    const removeWave = () => {
      if (wave.parentNode) {
        wave.parentNode.removeChild(wave);
      }
    };

    wave.addEventListener('animationend', removeWave, { once: true });
    setTimeout(removeWave, 650);
  }

  /**
   * Binds an element explicitly for ripple effect
   * @param {HTMLElement} element 
   */
  attach(element) {
    if (!element || this.boundElements.has(element)) return;
    element.classList.add('m3-ripple-surface');
    this.boundElements.add(element);
  }
}

// Global Singleton
export const rippleEngine = new RippleEngine();
