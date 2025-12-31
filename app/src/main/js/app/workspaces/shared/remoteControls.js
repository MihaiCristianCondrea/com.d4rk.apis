/**
 * @file Compatibility barrel for shared workspace remote controls.
 *
 * Change Rationale: Shared workspace helpers now live in `app/workspaces/shared/ui` following the
 * flattened Android-style layout. This shim keeps legacy imports intact for templates and tests.
 */
export * from './ui/remoteControls.js';
