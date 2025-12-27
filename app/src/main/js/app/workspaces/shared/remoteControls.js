/**
 * @file Compatibility barrel for shared workspace remote controls.
 *
 * Change Rationale: Shared workspace helpers moved to `features/workspaces/shared` to support the
 * feature-first structure. This shim keeps legacy imports intact for templates and tests.
 */
export * from '../../../features/workspaces/shared/remoteControls.js';
