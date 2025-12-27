/**
 * @file Compatibility barrel for App Toolkit image utilities.
 *
 * Change Rationale: Image helpers moved to `features/workspaces/app-toolkit` to match the
 * feature-first layout; this shim preserves existing import contracts.
 */
export * from '../../../../features/workspaces/app-toolkit/domain/images.js';
