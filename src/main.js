/**
 * Change Rationale:
 * - The previous entrypoint lived under the Android-style source tree and bootstrapped the app directly.
 * - A Vite-native SPA expects `index.html` to import `src/main.js` as the startup module.
 * - Importing the bootstrap module preserves existing behavior while aligning with standard Vite structure.
 */
import './app/bootstrap.js';
