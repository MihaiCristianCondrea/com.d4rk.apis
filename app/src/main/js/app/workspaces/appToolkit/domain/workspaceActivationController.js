/**
 * @file Compatibility barrel for the App Toolkit workspace activation controller.
 *
 * Change Rationale: The controller now lives in `features/workspaces/app-toolkit` to align with the
 * feature-first structure while keeping historical imports functioning.
 */
export * from '../../../../features/workspaces/app-toolkit/domain/workspaceActivationController.js';
