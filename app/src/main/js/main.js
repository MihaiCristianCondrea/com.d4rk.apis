// Change Rationale: Beer CSS previously loaded after the app styles, overriding
// the navigation drawer transform and leaving the drawer permanently visible.
// Importing the framework first and layering our component styles afterwards
// restores the intended off-canvas behavior while keeping the Material 3
// palette provided by beer + dynamic colors.
import 'beercss';
import 'material-dynamic-colors';
import '../styles/tailwind.css';
import '../styles/variables.css';
import '../styles/base/base.css';
import '../styles/components/components.css';
import '../styles/base/pages.css';
import '../styles/base/fonts.css';
import '../styles/components/layered-panels.css';
import '../styles/base/viewport-optimizations.css';
import './core/data/config/appConfig.js';

import resumeStylesAsset from '../styles/base/resume.css?url';
import resumePrintStylesAsset from '../styles/base/print.css?url';

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
  resume: resumeStylesAsset,
  print: resumePrintStylesAsset,
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

import './core/ui/components/dialogs/dialogs.js';
import './core/ui/components/animations/animations.js';

import './core/ui/legacyBridge.js';

/*
 * Change Rationale:
 * - Consolidate feature entrypoints under the new feature-first directory to avoid a monolithic `app/` tree.
 * - Keep legacy import paths working via compatibility barrels while the router targets the canonical feature modules.
 * - This aligns with Material Design 3’s modular guidance by keeping each surface isolated yet discoverable.
 */
import './app/workspaces/app-toolkit/ui/index.js';
import './app/workspaces/app-toolkit/ui/AppToolkitRoute.js';
// Change Rationale: The unused Help feature codebase has been removed, so its bootstrapping
// import is no longer required. FAQ tooling now relies solely on the workspace routes.
// Change Rationale: FAQ workspace now follows the Screen + Views contract, so its route module
// must be registered alongside other workspace feature entrypoints.
import './app/workspaces/faq/ui/FaqRoute.js';
import './app/workspaces/english-with-lidia/ui/EnglishWithLidiaRoute.js';
import './app/workspaces/android-studio-tutorials/ui/AndroidStudioTutorialsRoute.js';

// Change Rationale: GitHub tool entrypoints now resolve from the `app/githubtools` feature
// tree to match the flattened Android-style layout and avoid missing-module errors in Vite.
// Change Rationale: Repo Mapper routes live in the feature UI layer to keep routing out of domain logic.
import './app/githubtools/repomapper/ui/RepoMapperRoute.js';
import './app/githubtools/releasestats/ui/ReleaseStatsRoute.js';
import './app/githubtools/gitpatch/ui/GitPatchRoute.js';
import './app/home/ui/HomeRoute.js';

import './core/ui/appShell.js';
