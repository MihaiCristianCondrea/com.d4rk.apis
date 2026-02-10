// Change Rationale: Beer CSS previously loaded after the app styles, overriding
// the navigation drawer transform and leaving the drawer permanently visible.
// Importing the framework first and layering our component styles afterwards
// restores the intended off-canvas behavior while keeping the Material 3
// palette aligned with the fixed Android-green brand tokens.
import 'beercss';
// Change Rationale: Runtime icon and font dependencies previously loaded from external CDNs in index.html,
// which made builds non-deterministic and introduced remote availability risk. Importing dotLottie,
// Material Symbols, Font Awesome, and Google Sans families from npm keeps runtime assets versioned
// with the app bundle while preserving Material 3 visual consistency.
import '@lottiefiles/dotlottie-wc';
import 'material-symbols/outlined.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@fontsource/google-sans/latin-400.css';
import '@fontsource/google-sans/latin-500.css';
import '@fontsource/google-sans/latin-700.css';
import '@fontsource/google-sans-code/latin-400.css';
import '@fontsource/google-sans-code/latin-500.css';
// Change Rationale: Theme mode policy is now fixed to the Android-green brand palette
// defined in src/styles/variables.css, so runtime dynamic color generation is disabled.
import '../styles/tailwind.css';
import '../styles/variables.css';
import '../styles/base/base.css';
import '../styles/components/components.css';
import '../styles/base/pages.css';
import '../styles/base/fonts.css';
import '../styles/components/layered-panels.css';
import '../styles/base/viewport-optimizations.css';
import '../core/data/config/appConfig.js';

import * as jsondiffpatchCore from 'jsondiffpatch';
import * as jsondiffpatchHtmlFormatter from 'jsondiffpatch/formatters/html';
import * as jsondiffpatchAnnotatedFormatter from 'jsondiffpatch/formatters/annotated';
import * as jsondiffpatchConsoleFormatter from 'jsondiffpatch/formatters/console';
// Change Rationale: Styles moved into `app/src/main/styles` to align with the Android-style
// asset separation (styles/res/layout) while preserving identical load order and URLs.
// Change Rationale: Crash reporter now resolves from core data services after the feature-first
// migration, keeping monitoring in the data layer and avoiding circular UI dependencies.
import { installFirebaseCrashHandlers, initializeFirebaseMonitoring } from '@/core/data/services/firebaseCrashReporter.js';

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const existingStyleUrls = globalScope.__APP_STYLE_URLS__ || {};
globalScope.__APP_STYLE_URLS__ = {
  ...existingStyleUrls,
};
// Change Rationale: Previously, runtime crashes only surfaced in local consoles, preventing reliable observability.
// Firebase initialization now forwards uncaught errors to Analytics so we can validate crash-free sessions and
// quickly surface stability regressions—supporting Material Design 3's emphasis on dependable, responsive feedback.
installFirebaseCrashHandlers();
void initializeFirebaseMonitoring();

if (typeof Element !== 'undefined' && Element.prototype?.animate && !globalScope.__APP_ANIMATE_PATCH__) {
  const originalAnimate = Element.prototype.animate;
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

if (typeof window !== 'undefined' && !window.jsondiffpatch) {
  window.jsondiffpatch = {
    ...jsondiffpatchCore,
    formatters: {
      html: jsondiffpatchHtmlFormatter,
      annotated: jsondiffpatchAnnotatedFormatter,
      console: jsondiffpatchConsoleFormatter,
    },
  };
}

import '../core/ui/components/dialogs/dialogs.js';
import '../core/ui/components/animations/animations.js';

import '../core/ui/legacyBridge.js';


/*
 * Change Rationale:
 * - Route ownership now lives in `src/routes/routeManifest.js` so startup no
 *   longer depends on ad-hoc feature route imports in bootstrap.
 * - The manifest keeps deep-link route IDs centralized while preserving
 *   existing hash-based compatibility.
 */
import { registerRouteManifest } from '@/routes/routeManifest.js';

// Change Rationale: Vite now treats the repository root `index.html` as the only runtime shell,
// eliminating duplicate shell templates and ensuring route hydration always targets one canonical surface.
import '../core/ui/appShell.js';


registerRouteManifest();
