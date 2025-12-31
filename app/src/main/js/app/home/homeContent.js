/**
 * @file Backwards-compatible barrel for the Home content configuration.
 *
 * Change Rationale: Home content now lives in `app/home/data` after the flattened Android-style
 * layout update. This shim preserves legacy import paths for minimal churn.
 */
export * from './data/homeContent.js';
