/**
 * @file App-level crash reporting provider.
 *
 * Change Rationale:
 * - Crash reporting initialization previously lived in `bootstrap.js` alongside
 *   unrelated startup concerns.
 * - Moving it into a dedicated provider keeps `src/app` focused on composition
 *   and provider wiring while preserving runtime behavior.
 */

import { installFirebaseCrashHandlers, initializeFirebaseMonitoring } from '@/core/data/services/firebaseCrashReporter.js';

/**
 * Wires crash handlers and starts async monitoring initialization.
 *
 * @returns {void}
 */
export function installCrashReportingProvider() {
  installFirebaseCrashHandlers();
  void initializeFirebaseMonitoring();
}
