"""
Pen 11 — Settings Manager
Handles persistent storage of user preferences using a JSON file in %APPDATA%/Pen11/.
Settings are saved instantly on every change to protect against crashes.
"""
import json
import os

# Default settings — used when no settings file exists yet
DEFAULTS = {
    'pen_size': 5,
    'highlighter_size': 25,
    'eraser_size': 40,
    'pen_color': '#000000',
    'highlighter_color': '#FFCC00',
    'current_shape': 'Line',
    'toolbar_x': None,  # None means "use default position"
    'toolbar_y': None,
}


class SettingsManager:
    def __init__(self):
        self._dir = os.path.join(os.environ.get('APPDATA', '.'), 'Pen11')
        self._path = os.path.join(self._dir, 'settings.json')
        self._data = dict(DEFAULTS)
        self._load()

    def _load(self):
        """Load settings from disk, falling back to defaults for missing keys."""
        try:
            if os.path.exists(self._path):
                with open(self._path, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                # Merge: use saved values but fill in any missing keys with defaults
                for key, default_val in DEFAULTS.items():
                    self._data[key] = saved.get(key, default_val)
        except (json.JSONDecodeError, OSError, PermissionError):
            # Corrupted or unreadable file — start fresh with defaults
            self._data = dict(DEFAULTS)

    def _flush(self):
        """Write current settings to disk immediately."""
        try:
            os.makedirs(self._dir, exist_ok=True)
            with open(self._path, 'w', encoding='utf-8') as f:
                json.dump(self._data, f, indent=2)
        except (OSError, PermissionError):
            pass  # Silently fail — don't crash the app over a settings write

    def get(self, key):
        """Get a setting value, returning the default if the key is unknown."""
        return self._data.get(key, DEFAULTS.get(key))

    def set(self, key, value):
        """Set a single setting and immediately flush to disk."""
        self._data[key] = value
        self._flush()

    def set_many(self, updates: dict):
        """Set multiple settings at once, flushing only once at the end."""
        self._data.update(updates)
        self._flush()

    def all(self) -> dict:
        """Return a copy of all current settings."""
        return dict(self._data)
