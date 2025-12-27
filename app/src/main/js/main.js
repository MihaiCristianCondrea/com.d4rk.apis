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

import './app/workspaces/appToolkit/ui/index.js';
import './app/workspaces/appToolkit/features/appToolkit.js';
/*
 * Change Rationale:
 * - Align workspace module imports with canonical API slugs by renaming the FAQs workspace folder to `faq`.
 * - This prevents drift between UI modules and API identifiers while keeping Material 3 routes predictable.
 */
import './app/workspaces/faq/features/faq.js';
import './app/workspaces/englishWithLidia/features/englishWithLidia.js';
import './app/workspaces/androidStudioTutorials/features/androidStudioTutorials.js';

import './app/githubTools/repoMapper/features/repoMapper.js';
import './app/githubTools/releaseStats/features/releaseStats.js';
import './app/githubTools/gitPatch/features/gitPatch.js';
import './app/home/homePage.js';

import './core/app.js';
