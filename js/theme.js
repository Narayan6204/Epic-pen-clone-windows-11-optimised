/**
 * theme.js
 * Material Design 3 Dynamic HCT Seed Color Generator & Theme Switcher Engine.
 * Supports Windows 11 Blue, Purple Velvet, Emerald, Sunset Amber & Monochrome.
 * Features WCAG 2.2 AA Contrast Clamping, Light/Dark/System modes & Canvas Vector Re-tinting.
 */

export const THEME_SEEDS = {
  'warm-parchment': {
    name: 'Warm Parchment',
    hex: '#7C5C35',
    hue: 35,
    chroma: 38
  },
  'win11-blue': {
    name: 'Windows 11 Blue',
    hex: '#0061A4',
    hue: 220,
    chroma: 48
  },
  'purple-velvet': {
    name: 'Purple Velvet',
    hex: '#7B1FA2',
    hue: 288,
    chroma: 54
  },
  'emerald': {
    name: 'Emerald',
    hex: '#00897B',
    hue: 174,
    chroma: 42
  },
  'sunset-amber': {
    name: 'Sunset Amber',
    hex: '#E65100',
    hue: 36,
    chroma: 60
  },
  'monochrome': {
    name: 'Monochrome',
    hex: '#5C5F66',
    hue: 220,
    chroma: 4
  }
};

/**
 * Converts Hex string to RGB object
 * @param {string} hex 
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex.length === 3 
    ? cleanHex.split('').map(c => c + c).join('') 
    : cleanHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

/**
 * Converts RGB to Hex string
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {string}
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Converts RGB to HSL
 */
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Converts HSL to RGB
 */
export function hslToRgb(h, s, l) {
  h = (h % 360 + 360) % 360;
  s /= 100;
  l /= 100;

  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4))
  };
}

/**
 * Calculates Relative Luminance according to WCAG 2.1/2.2 specs
 * @param {string} hex
 * @returns {number}
 */
export function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates WCAG 2.2 Contrast Ratio between two hex colors
 * @param {string} hex1 
 * @param {string} hex2 
 * @returns {number}
 */
export function getContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Generates an M3 Tonal Palette (tones 0..100) from H, S base
 */
export function generateTonalPalette(hue, chroma) {
  const tones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
  const palette = {};

  tones.forEach(tone => {
    if (tone === 0) {
      palette[tone] = '#000000';
    } else if (tone === 100) {
      palette[tone] = '#ffffff';
    } else {
      // Scale saturation smoothly with lightness to emulate M3 Cam16/HCT chroma curve
      const satScale = Math.min(100, chroma * (1.1 - Math.abs(tone - 50) / 75));
      const rgb = hslToRgb(hue, satScale, tone);
      palette[tone] = rgbToHex(rgb.r, rgb.g, rgb.b);
    }
  });

  return palette;
}

export class ThemeEngine {
  constructor() {
    this.currentMode = 'light'; // Default to light warm parchment
    this.currentSeedKey = 'warm-parchment';
    this.canvasRetintListeners = new Set();

    this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._mediaQueryListener = (e) => {
      if (this.currentMode === 'system') {
        this._applyTheme();
      }
    };
    this._mediaQuery.addEventListener('change', this._mediaQueryListener);

    this._loadSettings();
    this._applyTheme();
  }

  _loadSettings() {
    try {
      const savedMode = localStorage.getItem('pen11_theme_mode');
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        this.currentMode = savedMode;
      } else {
        this.currentMode = 'light';
      }
      const savedSeed = localStorage.getItem('pen11_theme_seed');
      if (savedSeed && THEME_SEEDS[savedSeed] && savedSeed !== 'win11-blue') {
        this.currentSeedKey = savedSeed;
      } else {
        this.currentSeedKey = 'warm-parchment';
      }
    } catch (e) {
      console.warn('[ThemeEngine] LocalStorage unavailable:', e);
    }
  }

  _saveSettings() {
    try {
      localStorage.setItem('pen11_theme_mode', this.currentMode);
      localStorage.setItem('pen11_theme_seed', this.currentSeedKey);
    } catch (e) {
      // Ignored if storage disabled
    }
  }

  get isDark() {
    if (this.currentMode === 'dark') return true;
    if (this.currentMode === 'light') return false;
    return this._mediaQuery.matches;
  }

  /**
   * Sets the active theme mode ('light', 'dark', or 'system')
   * @param {'light'|'dark'|'system'} mode 
   */
  setMode(mode) {
    if (!['light', 'dark', 'system'].includes(mode)) return;
    this.currentMode = mode;
    this._saveSettings();
    this._applyTheme();
  }

  /**
   * Sets the active theme seed
   * @param {string} seedKey - Key from THEME_SEEDS or custom hex
   */
  setSeed(seedKey) {
    this.currentSeedKey = seedKey;
    this._saveSettings();
    this._applyTheme();
  }

  /**
   * Registers a callback triggered when themes change to re-tint canvas strokes
   * @param {Function} callback 
   */
  onCanvasRetint(callback) {
    this.canvasRetintListeners.add(callback);
    return () => this.canvasRetintListeners.delete(callback);
  }

  _applyTheme() {
    const root = document.documentElement;
    const isDarkMode = this.isDark;

    // 1. Set HTML data-theme attribute
    if (this.currentMode === 'system') {
      root.removeAttribute('data-theme');
      root.setAttribute('data-theme-resolved', isDarkMode ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', this.currentMode);
      root.setAttribute('data-theme-resolved', this.currentMode);
    }

    // 2. Compute dynamic HCT palettes
    const seed = THEME_SEEDS[this.currentSeedKey] || {
      name: 'Custom',
      hex: this.currentSeedKey,
      hue: rgbToHsl(hexToRgb(this.currentSeedKey).r, hexToRgb(this.currentSeedKey).g, hexToRgb(this.currentSeedKey).b).h,
      chroma: 48
    };

    const primaryPalette = generateTonalPalette(seed.hue, seed.chroma);
    const secondaryPalette = generateTonalPalette(seed.hue, Math.max(12, seed.chroma * 0.35));
    const tertiaryPalette = generateTonalPalette((seed.hue + 60) % 360, Math.max(16, seed.chroma * 0.5));
    const neutralPalette = generateTonalPalette(seed.hue, 6);
    const neutralVariantPalette = generateTonalPalette(seed.hue, 10);

    // 3. Inject CSS Variables
    const prefix = '--md-ref-palette-';
    const applyPalette = (name, pal) => {
      Object.entries(pal).forEach(([tone, hex]) => {
        root.style.setProperty(`${prefix}${name}${tone}`, hex);
      });
    };

    applyPalette('primary', primaryPalette);
    applyPalette('secondary', secondaryPalette);
    applyPalette('tertiary', tertiaryPalette);
    applyPalette('neutral', neutralPalette);
    applyPalette('neutral-variant', neutralVariantPalette);

    // WCAG 2.2 AA Contrast Clamping (Delta T >= 50)
    let primary = isDarkMode ? primaryPalette[80] : primaryPalette[40];
    let onPrimary = isDarkMode ? primaryPalette[20] : primaryPalette[100];
    let bg = isDarkMode ? neutralPalette[6] : neutralPalette[98];
    let onBg = isDarkMode ? neutralPalette[90] : neutralPalette[10];

    // Verify minimum contrast ratio (4.5:1)
    if (getContrastRatio(primary, bg) < 4.5) {
      primary = isDarkMode ? primaryPalette[90] : primaryPalette[30];
    }
    if (getContrastRatio(onPrimary, primary) < 4.5) {
      onPrimary = isDarkMode ? '#000000' : '#ffffff';
    }

    root.style.setProperty('--md-sys-color-primary', primary);
    root.style.setProperty('--md-sys-color-on-primary', onPrimary);
    
    // High-Contrast Surface Text
    root.style.setProperty('--md-sys-color-on-surface', isDarkMode ? '#FFF7ED' : '#1A0F00');
    root.style.setProperty('--md-sys-color-on-surface-variant', isDarkMode ? '#E2D1B8' : '#3A2810');
    root.style.setProperty('--md-sys-color-on-background', isDarkMode ? '#FFF7ED' : '#1A0F00');

    // 4. Notify Canvas & UI elements for instant re-tinting
    const themeContext = {
      isDark: isDarkMode,
      mode: this.currentMode,
      seedKey: this.currentSeedKey,
      primaryColor: primary,
      onPrimaryColor: onPrimary,
      surfaceColor: isDarkMode ? neutralPalette[12] : neutralPalette[94],
      backgroundColor: bg
    };

    this.canvasRetintListeners.forEach(fn => {
      try {
        fn(themeContext);
      } catch (e) {
        console.error('[ThemeEngine] Error during canvas re-tint listener:', e);
      }
    });

    // 5. Update Meta Theme Color
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', isDarkMode ? '#111318' : primary);
  }
}

// Global Singleton
export const themeEngine = new ThemeEngine();
