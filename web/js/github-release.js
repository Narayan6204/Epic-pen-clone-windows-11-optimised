/**
 * github-release.js
 * GitHub REST API v3 Latest Release Fetcher with 4-Tier Fallback Cache.
 * Retrieves version tags, download asset links, changelogs, and file sizes for Pen 11.
 */

const REPO_OWNER = 'Narayan6204';
const REPO_NAME = 'Epic-pen-clone-windows-11-optimised';
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const CACHE_KEY = 'pen11_github_release_cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Tier 4: Hardcoded Resilience Fallback (Guarantees UI never breaks offline or during rate-limits)
const STATIC_FALLBACK = {
  tagName: 'v2.4.0',
  version: '2.4.0',
  name: 'Pen 11 v2.4.0 (Windows 11 Direct3D Update)',
  publishedAt: '2026-08-14T00:00:00Z',
  downloadUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
  directDownloadUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest/download/main.exe`,
  assetName: 'main.exe',
  assetSize: 19398656, // ~18.5 MB
  sizeFormatted: '18.5 MB',
  body: 'High-performance screen annotation with Direct3D 11 hardware acceleration, Smart Objects, and Circle-to-Select Lasso.',
  source: 'static_fallback'
};

/**
 * Formats bytes to human-readable size string
 * @param {number} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '18.5 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export class GitHubReleaseManager {
  constructor() {
    this.cachedData = null;
  }

  /**
   * Fetches the latest release using the 4-tier fallback system
   * @returns {Promise<Object>}
   */
  async getLatestRelease() {
    // 1. Tier 2: Check localStorage cache
    const localCached = this._readCache(localStorage);
    if (localCached && Date.now() - localCached.timestamp < CACHE_TTL_MS) {
      this.cachedData = { ...localCached.data, source: 'localStorage' };
      return this.cachedData;
    }

    // 2. Tier 1: Try Fresh Network Fetch from GitHub REST API
    try {
      const response = await fetch(API_URL, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = this._parseReleaseJson(json);
        this._writeCache(localStorage, parsed);
        this._writeCache(sessionStorage, parsed);
        this.cachedData = { ...parsed, source: 'network' };
        return this.cachedData;
      }
    } catch (err) {
      console.warn('[GitHubReleaseManager] Network fetch failed, falling back to cache tiers:', err);
    }

    // 3. Tier 3: Check sessionStorage or stale localStorage
    const sessionCached = this._readCache(sessionStorage);
    if (sessionCached) {
      this.cachedData = { ...sessionCached.data, source: 'sessionStorage' };
      return this.cachedData;
    }

    if (localCached) {
      this.cachedData = { ...localCached.data, source: 'stale_localStorage' };
      return this.cachedData;
    }

    // 4. Tier 4: Static Fallback
    this.cachedData = STATIC_FALLBACK;
    return this.cachedData;
  }

  _parseReleaseJson(json) {
    const assets = json.assets || [];
    const exeAsset = assets.find(a => a.name.endsWith('.exe')) || assets[0];

    return {
      tagName: json.tag_name || 'v2.4.0',
      version: (json.tag_name || 'v2.4.0').replace(/^v/, ''),
      name: json.name || 'Pen 11 Release',
      publishedAt: json.published_at,
      downloadUrl: json.html_url || STATIC_FALLBACK.downloadUrl,
      directDownloadUrl: exeAsset ? exeAsset.browser_download_url : STATIC_FALLBACK.directDownloadUrl,
      assetName: exeAsset ? exeAsset.name : STATIC_FALLBACK.assetName,
      assetSize: exeAsset ? exeAsset.size : STATIC_FALLBACK.assetSize,
      sizeFormatted: exeAsset ? formatBytes(exeAsset.size) : STATIC_FALLBACK.sizeFormatted,
      body: json.body || STATIC_FALLBACK.body
    };
  }

  _readCache(storage) {
    try {
      const raw = storage.getItem(CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // Storage blocked or invalid
    }
    return null;
  }

  _writeCache(storage, data) {
    try {
      storage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch (e) {
      // Storage quota exceeded or disabled
    }
  }

  /**
   * Automatically updates all download links and version badges in the DOM
   */
  async updateDOM() {
    const release = await this.getLatestRelease();

    // Update Version Badges & Text
    document.querySelectorAll('[data-gh-version]').forEach(el => {
      el.textContent = release.tagName;
    });

    // Update Download Links
    document.querySelectorAll('[data-gh-download-url]').forEach(el => {
      el.setAttribute('href', release.directDownloadUrl || release.downloadUrl);
    });

    // Update File Size Badges
    document.querySelectorAll('[data-gh-size]').forEach(el => {
      el.textContent = release.sizeFormatted;
    });

    // Update Release Notes / Date
    document.querySelectorAll('[data-gh-date]').forEach(el => {
      if (release.publishedAt) {
        const date = new Date(release.publishedAt);
        el.textContent = date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    });

    return release;
  }
}

export const gitHubReleaseManager = new GitHubReleaseManager();
