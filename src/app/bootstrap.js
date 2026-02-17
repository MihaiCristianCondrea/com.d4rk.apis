/**
 * @file SPA bootstrap entrypoint.
 *
 * Change Rationale:
 * - `src/app` now retains only composition concerns: providers, shell wiring,
 *   and app-level route runtime glue.
 * - Feature/page logic was migrated to canonical FSD layers and is loaded via
 *   the centralized route manifest runtime.
 */

import '../core/data/config/appConfig.js';
import '../core/ui/components/dialogs/dialogs.js';
import '../core/ui/components/animations/animations.js';
import '../core/ui/legacyBridge.js';
import '../core/ui/appShell.js';

import * as jsondiffpatchCore from 'jsondiffpatch';
import * as jsondiffpatchHtmlFormatter from 'jsondiffpatch/formatters/html';
import * as jsondiffpatchAnnotatedFormatter from 'jsondiffpatch/formatters/annotated';
import * as jsondiffpatchConsoleFormatter from 'jsondiffpatch/formatters/console';

import { installCrashReportingProvider } from '@/app/providers/crash-reporting-provider.js';
import { installThemeProvider } from '@/app/providers/theme-provider.js';
import { registerAppRouteRuntime } from '@/app/routes/runtime/register-route-runtime.js';

/**
 * Exposes jsondiffpatch helpers required by workspace tools.
 *
 * @returns {void}
 */
function installJsonDiffpatchGlobal() {
  if (typeof window === 'undefined' || window.jsondiffpatch) {
    return;
  }

  window.jsondiffpatch = {
    ...jsondiffpatchCore,
    formatters: {
      html: jsondiffpatchHtmlFormatter,
      annotated: jsondiffpatchAnnotatedFormatter,
      console: jsondiffpatchConsoleFormatter,
    },
  };
}

installThemeProvider();
installCrashReportingProvider();
installJsonDiffpatchGlobal();
registerAppRouteRuntime();
