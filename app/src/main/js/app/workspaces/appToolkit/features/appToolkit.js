/**
 * @file Compatibility barrel for the App Toolkit workspace entrypoint.
 *
 * Change Rationale: The App Toolkit feature moved to `features/workspaces/app-toolkit` for the
 * feature-first layout; this shim maintains stable imports for existing routes and tests.
 */
export * from '../../../../features/workspaces/app-toolkit/features/appToolkit.js';
