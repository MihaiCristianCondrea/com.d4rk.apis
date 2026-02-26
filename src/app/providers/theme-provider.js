/**
 * @file App-level theme and visual runtime provider.
 *
 * Change Rationale:
 * - Theme/style boot and animation patching were previously embedded in
 *   `bootstrap.js`, mixing provider concerns with route runtime setup.
 * - This provider centralizes Material 3 token style imports and runtime
 *   animation guards while preserving existing rendering behavior.
 */

import 'beercss';
import '@lottiefiles/dotlottie-wc';
import 'material-symbols/outlined.css';
import 'material-symbols/rounded.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@fontsource/google-sans/latin-400.css';
import '@fontsource/google-sans/latin-500.css';
import '@fontsource/google-sans/latin-700.css';
import '@fontsource/google-sans-code/latin-400.css';
import '@fontsource/google-sans-code/latin-500.css';

import '../../styles/tailwind.css';
import '../../styles/variables.css';
import '../../styles/base/base.css';
import '../../styles/components/components.css';
import '../../styles/base/pages.css';
import '../../styles/base/fonts.css';
import '../../styles/components/layered-panels.css';
import '../../styles/base/viewport-optimizations.css';

/**
 * Installs theme-related startup hooks.
 *
 * @returns {void}
 */
export function installThemeProvider() {
  const globalScope = typeof window !== 'undefined' ? window : globalThis;

  if (typeof Element !== 'undefined' && Element.prototype?.animate && !globalScope.__APP_ANIMATE_PATCH__) {
    const originalAnimate = Element.prototype.animate;

    /**
     * @param {Keyframe[] | PropertyIndexedKeyframes | null | undefined} keyframes
     * @returns {Keyframe[] | PropertyIndexedKeyframes | null | undefined}
     */
    const sanitizeKeyframes = (keyframes) => {
      if (!Array.isArray(keyframes)) {
        return keyframes;
      }
      let mutated = false;
      const cleaned = keyframes.map((frame) => {
        if (frame && typeof frame === 'object' && typeof frame.transform === 'string') {
          const normalizedTransform = frame.transform.replace(/NaN/g, '0');
          if (normalizedTransform !== frame.transform) {
            mutated = true;
            return { ...frame, transform: normalizedTransform };
          }
        }
        return frame;
      });
      return mutated ? cleaned : keyframes;
    };

    Element.prototype.animate = function patchedAnimate(keyframes, options) {
      return originalAnimate.call(this, sanitizeKeyframes(keyframes), options);
    };

    globalScope.__APP_ANIMATE_PATCH__ = true;
  }
}
