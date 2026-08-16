# Pen 11

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%2011-lightgrey.svg)
![Python](https://img.shields.io/badge/python-3.10+-yellow.svg)

A high-performance, lightweight, and completely free screen annotation tool built specifically and optimized for Windows 11. 

![Pen 11 UI](assets/screenshot.png)

## 📖 Story & Motivation

> "While taking my NIELIT 'O Level' course, I found myself in need of a good screen annotation tool. However, I quickly realized that most existing options were either locked behind paywalls, bloated with unnecessary features, or suffered from laggy, outdated user interfaces. 
> 
> Frustrated by these limitations, I decided to build my own solution using AI. The result is **Pen 11**—a blazing-fast, highly responsive, and meticulously optimized screen marker that respects your system's resources. It is entirely free and open-source, allowing anyone in the community to use it, learn from it, or modify it to suit their own needs."

## ✨ Key Features & Recent Updates

- **Hardware Acceleration:** Uses a Direct3D 11 rendering backend for ultra-smooth ink performance.
- **Zero-Footprint Idle:** Advanced Python garbage collection tuning and event loop pausing keeps background CPU usage near 0%.
- **Smart Objects:** Drawn shapes aren't just pixels; they are interactable objects that can be moved, rotated, and scaled.
- **Lasso & Multi-Selection:** Use the new "Circle to Select" lasso mechanic to instantly select and manipulate hundreds of strokes at once.
- **Persistent Settings (New):** Built-in Storage Manager instantly saves your custom colors, pen sizes, shape preferences, and your exact toolbar screen position so everything is exactly how you left it when you restart the app.
- **Single-Instance Guard (New):** A background IPC Process Manager guarantees that only one instance of Pen 11 runs at a time, completely eliminating keyboard shortcut conflicts and RAM leaks.
- **OOM Protection:** Safely draw infinitely! Pen 11 handles up to 50,000 simultaneous strokes on screen with a massive 5,000-step Undo stack without crashing.
- **System Tray Integration:** Runs quietly in the background without cluttering the taskbar.

## 🐛 Recent Bug Fixes
- **Rotation Engine Overhaul:** Selection handles now perfectly track the Oriented Bounding Box (OBB) of rotated objects, fixing the bug where handles would detach during rotation (similar to Photoshop/Xournal++).
- **Float-Precision Scaling:** Fixed a bug where scaling a selected stroke caused the actual "nib size" of the ink to inflate or distort. 
- **Auto-Hide Toolbars:** Floating toolboxes (shapes, colors) now seamlessly fade away when you switch to primary drawing tools.

## 💻 System Requirements

To run Pen 11 properly, you need the following:
- **OS:** Windows 10 or Windows 11 (Heavily optimized for Windows 11 Desktop Window Manager).
- **RAM:** Minimum 50 MB of available memory.
- **Graphics:** Any GPU supporting Direct3D 11.
- **(If running from source):** Python 3.10 or newer (built against Python 3.14) and PyQt6.

## 🚀 Installation & Usage

1. **Download:** Grab the latest `main.exe` from the [Releases](https://github.com/Narayan6204/Epic-pen-clone-windows-11-optimised/releases/latest) page.
2. **Run Portable:** No installation required! Just double-click the `.exe` file.

### 📚 How to Use

- **The Toolbar:** When launched, a compact toolbar will appear at the top-right of your screen. 
- **Drawing Tools:** Click the Pen (or press `Ctrl+1`), Highlighter (`Ctrl+2`), or Eraser (`Ctrl+3`). You can click and hold any of these tools to adjust the line size.
- **Colors & Shapes:** Hover over the color palette or the shapes icon to open sub-menus. Available shapes include lines, rectangles, circles, and triangles. 
- **Interactive Selection Tool:** Select the Cursor icon (`Ctrl+4`). You can click on individual strokes, or draw a lasso circle around multiple objects! You will see a bounding box allowing you to drag them around, rotate them using the corner handle, or press `Delete` on your keyboard to remove them.
- **System Tray:** Pen 11 minimizes to your Windows System Tray (by the clock). Right-click its icon to find options like "About", "Clear Screen", or to quickly exit the application.

### ⌨️ Complete Shortcut Guide

Pen 11 includes a robust set of global hotkeys that work no matter what application you have open:

| Shortcut | Action |
| --- | --- |
| `Ctrl` + `1` | Select Pen Tool |
| `Ctrl` + `2` | Select Highlighter Tool |
| `Ctrl` + `3` | Select Eraser Tool |
| `Ctrl` + `4` | Select Cursor Mode (Interact / Lasso Selection) |
| `Ctrl` + `5` | Toggle Ink Visibility (Hide/Show markings) |
| `Ctrl` + `Z` | Undo last stroke |
| `Ctrl` + `Shift` + `C` | Clear Screen |
| `Ctrl` + `]` | Increase Pen Size |
| `Ctrl` + `[` | Decrease Pen Size |
| `Ctrl` + `P` | Toggle Color Palette |
| `Ctrl` + `B` | Toggle Background Whiteboard/Blackboard |
| `Ctrl` + `Q` | Exit Application |
| `Delete` / `Backspace` | Delete selected shape (when in Cursor mode) |
| `Shift` + `Draw` | Draw perfect shapes (e.g., perfect circle or right triangle) |

## 💖 Support & Donate

If you found Pen 11 helpful for your studies or your work and want to support its continued development, you can buy me a coffee by scanning the UPI QR code below!

<p align="center">
  <img src="assets/donate_qr.jpg" alt="UPI QR Code" width="300">
</p>

## 🛠️ For Developers (Building & Modifying)

Pen 11 is built using **Python** and **PyQt6**. The code is completely open for you to edit and improve!

### How to Modify the Source Code
You can edit `main.py` directly. **Note:** Although the final executable is heavily optimized (using bytecode optimization `optimize=2`), this optimization only happens during the PyInstaller build process. The source code in `main.py`, `storage.py`, and `process_manager.py` remains perfectly human-readable and safe to edit.

### Build Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Narayan6204/Epic-pen-clone-windows-11-optimised.git
   cd "Epic-pen-clone-windows-11-optimised"
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Run locally for testing:**
   ```bash
   python main.py
   ```
4. **Compile the optimized executable:**
   ```bash
   python -m PyInstaller main.spec
   ```
   *Your newly compiled and optimized executable will be located in the `dist` folder.*

## 📄 License & Credits

Released under the **MIT License**.

Developed with ♥ by **Narayan Dev**.
