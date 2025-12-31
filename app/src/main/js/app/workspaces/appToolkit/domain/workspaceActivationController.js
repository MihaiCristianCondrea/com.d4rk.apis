/**
 * @file Compatibility barrel for the App Toolkit workspace activation controller.
 *
 * Change Rationale: The controller now lives in `app/workspaces/app-toolkit/domain` after the
 * flattened layout; this shim keeps historical imports functioning.
 */
export * from '../../app-toolkit/domain/workspaceActivationController.js';
