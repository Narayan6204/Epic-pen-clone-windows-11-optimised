# WCAG 2.2 AA/AAA Accessibility Guidelines Reference

This reference provides compliance checks, contrast ratios, and keyboard trapping patterns for accessible interfaces.

---

## 1. Contrast Ratios & Color Accessibility

- **Normal Text (<18pt / <24px)**: Minimum `4.5:1` contrast ratio (AA), `7:1` (AAA).
- **Large Text (>=18pt or >=14pt bold)**: Minimum `3:1` contrast ratio (AA), `4.5:1` (AAA).
- **UI Components & Graphical Objects**: Minimum `3:1` contrast against adjacent background colors.
- **Never rely on color alone**: Combine color cues with icons, labels, or patterns (e.g. error borders + icon + text).

---

## 2. Accessible Modal Dialog with Focus Trap

```javascript
class AccessibleModal {
  constructor(dialogElement) {
    this.dialog = dialogElement;
    this.previouslyFocusedElement = null;
    this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  }

  open() {
    this.previouslyFocusedElement = document.activeElement;
    this.dialog.showModal(); // Native dialog handles backdrop and basic trapping
    
    // Focus first interactive element
    const first = this.dialog.querySelector(this.focusableElements);
    if (first) first.focus();

    this.dialog.addEventListener('keydown', this.handleKeyDown);
  }

  close() {
    this.dialog.close();
    this.dialog.removeEventListener('keydown', this.handleKeyDown);
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
    }
  }

  handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      this.close();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = Array.from(this.dialog.querySelectorAll(this.focusableElements));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };
}
```
