/**
 * @file Backwards-compatible barrel for the Home feature entrypoint.
 *
 * Change Rationale: Home now resides under `app/home/ui` in the flattened Android-style layout.
 * This shim preserves historic imports while the router targets the canonical route module.
 */
export * from './ui/HomeRoute.js';
