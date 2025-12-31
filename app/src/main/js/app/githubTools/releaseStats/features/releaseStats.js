/**
 * @file Compatibility barrel for the Release Stats entrypoint.
 *
 * Change Rationale: Release Stats now lives at `app/github-tools/ui/routes` in the flattened
 * Android-style layout. This re-export preserves legacy import paths for downstream callers.
 */
export * from '../../../../github-tools/ui/routes/ReleaseStatsRoute.js';
