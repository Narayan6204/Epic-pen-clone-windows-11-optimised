# View Transitions API & FLIP Container Morphing Reference

This reference covers seamless DOM state transitions using native browser View Transitions and the FLIP (First, Last, Invert, Play) technique.

---

## 1. Native View Transitions API

Modern browsers support `document.startViewTransition()` for single-page and multi-page state transitions.

### 1.1 Progressive Enhancement Implementation

```javascript
function updateDOMWithTransition(updateCallback) {
  if (!document.startViewTransition) {
    updateCallback();
    return;
  }
  
  document.startViewTransition(() => {
    updateCallback();
  });
}

// Example usage: switching active views
function switchView(newViewId) {
  updateDOMWithTransition(() => {
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    document.getElementById(newViewId).classList.add('active');
  });
}
```

### 1.2 Customizing View Transition Animations with CSS

```css
/* Assign shared name to morphing elements */
.gallery-thumbnail {
  view-transition-name: active-media-hero;
}

.gallery-detail-hero {
  view-transition-name: active-media-hero;
}

/* Custom view transition duration & easing */
::view-transition-group(active-media-hero) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.2, 0.0, 0.0, 1.0);
}

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 250ms;
}
```

---

## 2. The FLIP Technique (Vanilla JavaScript)

When View Transitions are not available or fine-grained local element control is needed:

```javascript
class FlipMorpher {
  static morph(element, mutationFn, duration = 300) {
    // 1. FIRST: Record initial bounding box
    const first = element.getBoundingClientRect();

    // 2. MUTATE: Apply DOM/style changes
    mutationFn();

    // 3. LAST: Record final bounding box
    const last = element.getBoundingClientRect();

    // 4. INVERT: Calculate delta and apply inverse transform
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    const deltaW = first.width / (last.width || 1);
    const deltaH = first.height / (last.height || 1);

    element.style.transformOrigin = 'top left';
    element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
    element.style.transition = 'none';

    // 5. PLAY: Animate to identity transform
    requestAnimationFrame(() => {
      element.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.0, 0.0, 1.0)`;
      element.style.transform = 'none';

      element.addEventListener('transitionend', () => {
        element.style.transition = '';
        element.style.transformOrigin = '';
      }, { once: true });
    });
  }
}
```
