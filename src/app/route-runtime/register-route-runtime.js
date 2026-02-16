/**
 * @file App-level route runtime glue.
 *
 * Change Rationale:
 * - Bootstrap now consumes a dedicated runtime hook rather than importing
 *   route modules directly.
 * - Route authority remains centralized in `src/routes/routeManifest.js`.
 */

import { registerRouteManifest } from '@/routes/routeManifest.js';

/**
 * Registers route runtime from the centralized manifest.
 *
 * @returns {ReadonlyArray<{id:string, hash:string, category:string}>}
 */
export function registerAppRouteRuntime() {
  return registerRouteManifest();
}
