---
name: lottie-gemini-skill
description: Rules for using Lottie animations and Gemini API in Python without app crashes.
---

# Lottie Animation & Gemini Integration Rules

1. **Threading & Offloading:**
   - Run Gemini API data fetching/streaming on a secondary thread (e.g., Python `threading` or `QThread`).
   - Keep animation rendering strictly on the Main UI thread to prevent UI freezing.

2. **Memory & Lifecycle:**
   - Properly stop Lottie animation loops and close API streams when window or widget closes.

3. **Crash Prevention:**
   - Catch network and API errors (`try-except`) during Gemini calls so the UI doesn't crash.
   - Limit state updates during text streaming so the frame rate does not drop.