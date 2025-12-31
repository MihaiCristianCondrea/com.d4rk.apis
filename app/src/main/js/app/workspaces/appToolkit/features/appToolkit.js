/**
 * @file Compatibility barrel for the App Toolkit workspace entrypoint.
 *
 * Change Rationale: The App Toolkit feature now resides in `app/workspaces/app-toolkit/ui` after
 * the flattened Android-style reorganization; this shim maintains stable imports for existing routes
 * and tests.
 */
export * from '../app-toolkit/ui/AppToolkitRoute.js';
