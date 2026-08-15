# Pen 11

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%2011-lightgrey.svg)

A high-performance, lightweight, and completely free screen annotation tool built specifically and optimized for Windows 11. 

![Pen 11 UI](assets/screenshot.png)

## 📖 Story & Motivation

> "While taking my NIELIT 'O Level' course, I found myself in need of a good screen annotation tool. However, I quickly realized that most existing options were either locked behind paywalls, bloated with unnecessary features, or suffered from laggy, outdated user interfaces. 
> 
> Frustrated by these limitations, I decided to build my own solution using AI. The result is **Pen 11**—a blazing-fast, highly responsive, and meticulously optimized screen marker that respects your system's resources. It is entirely free and open-source, allowing anyone in the community to use it, learn from it, or modify it to suit their own needs."

## ✨ Key Features

- **Hardware Acceleration:** Uses a Direct3D 11 rendering backend for ultra-smooth ink performance.
- **Zero-Footprint Idle:** Advanced Python garbage collection tuning and event loop pausing keeps background CPU usage near 0%.
- **Rich Annotation Tools:** Pen, highlighter, smart shape detection, and interactive selection.
- **Smart Objects:** Drawn shapes aren't just pixels; they are interactable objects that can be moved, rotated, and scaled.
- **System Tray Integration:** Runs quietly in the background without cluttering the taskbar.

## 🚀 Installation & Usage

1. **Download:** Grab the latest `Pen 11.exe` from the [Releases](#) page.
2. **Run Portable:** No installation required! Just double-click the `.exe` file.

### 📚 How to Use

- **The Toolbar:** When launched, a compact toolbar will appear at the top-right of your screen. 
- **Drawing Tools:** Click the Pen (or press `Ctrl+1`), Highlighter (`Ctrl+2`), or Eraser (`Ctrl+3`). You can click and hold any of these tools to adjust the line size.
- **Colors & Shapes:** Hover over the color palette or the shapes icon to open sub-menus. Available shapes include lines, rectangles, circles, and triangles. 
- **Interactive Selection Tool:** Select the Cursor icon (`Ctrl+4`). You can now click on any shape or stroke you have drawn. You will see a bounding box allowing you to drag it around, rotate it using the corner handle, or press `Delete` on your keyboard to remove it.
- **System Tray:** Pen 11 minimizes to your Windows System Tray (by the clock). Right-click its icon to find options like "About", "Clear Screen", or to quickly exit the application.

### ⌨️ Complete Shortcut Guide

Pen 11 includes a robust set of global hotkeys that work no matter what application you have open:

| Shortcut | Action |
| --- | --- |
| `Ctrl` + `1` | Select Pen Tool |
| `Ctrl` + `2` | Select Highlighter Tool |
| `Ctrl` + `3` | Select Eraser Tool |
| `Ctrl` + `4` | Select Cursor Mode (Interact with shapes) |
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

## 🛠️ For Developers (Building from Source)

Pen 11 is built using Python 3.14 and PyQt6.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Narayan6204/Epic-pen-clone-windows-11-optimised.git
   cd "Epic-pen-clone-windows-11-optimised"
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Compile the executable:**
   ```bash
   python -m PyInstaller --noconfirm main.spec
   ```
   *Your optimized executable will be located in the `dist` folder.*

## 📄 License & Credits

Released under the **MIT License**.

Developed with ♥ by **Narayan Dev**.
