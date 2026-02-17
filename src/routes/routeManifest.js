/**
 * @file Compatibility shim for legacy route manifest imports.
 *
 * Change Rationale:
 * - Route ownership migrated to `src/app/routes/route-manifest.js`.
 * - This shim preserves existing imports while migration updates land.
 */

export * from '../app/routes/route-manifest.js';
