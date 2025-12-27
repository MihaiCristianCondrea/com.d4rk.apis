/**
 * @file Compatibility barrel for the Release Stats entrypoint.
 *
 * Change Rationale: Release Stats was relocated to `features/github-tools/release-stats` to support
 * the feature-first layout. This re-export preserves legacy import paths for downstream callers.
 */
export * from '../../../../features/github-tools/release-stats/features/releaseStats.js';
