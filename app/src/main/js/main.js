import './core/styles/tailwind.css';
import './core/styles/variables.css';
import './core/styles/base.css';
import './core/styles/components.css';
import './core/styles/pages.css';
import './core/styles/fonts.css';
import './core/styles/layered-panels.css';
import './core/styles/viewport-optimizations.css';
import './core/config.js';

import resumeStylesAsset from './core/styles/resume.css?url';
import resumePrintStylesAsset from './core/styles/print.css?url';

import * as jsondiffpatchCore from 'jsondiffpatch';
import * as jsondiffpatchHtmlFormatter from 'jsondiffpatch/formatters/html';
import * as jsondiffpatchAnnotatedFormatter from 'jsondiffpatch/formatters/annotated';
import * as jsondiffpatchConsoleFormatter from 'jsondiffpatch/formatters/console';
import { installFirebaseCrashHandlers, initializeFirebaseMonitoring } from '@/services/firebaseCrashReporter.js';

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

import './core/legacyBridge.js';

/*
 * Change Rationale:
 * - Consolidate feature entrypoints under the new feature-first directory to avoid a monolithic `app/` tree.
 * - Keep legacy import paths working via compatibility barrels while the router targets the canonical feature modules.
 * - This aligns with Material Design 3’s modular guidance by keeping each surface isolated yet discoverable.
 */
import './features/workspaces/app-toolkit/ui/index.js';
import './features/workspaces/app-toolkit/features/appToolkit.js';
import './features/workspaces/faq/features/faq.js';
import './features/workspaces/english-with-lidia/features/englishWithLidia.js';
import './features/workspaces/android-studio-tutorials/features/androidStudioTutorials.js';

import './features/github-tools/repo-mapper/features/repoMapper.js';
import './features/github-tools/release-stats/features/releaseStats.js';
import './features/github-tools/git-patch/features/gitPatch.js';
import './features/home/homePage.js';

import './core/app.js';
