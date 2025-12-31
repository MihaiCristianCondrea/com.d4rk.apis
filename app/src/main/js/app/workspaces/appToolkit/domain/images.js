/**
 * @file Compatibility barrel for App Toolkit image utilities.
 *
 * Change Rationale: Image helpers moved to `app/workspaces/app-toolkit/domain` in the flattened
 * layout; this shim preserves existing import contracts.
 */
export * from '../../app-toolkit/domain/images.js';
