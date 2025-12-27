/**
 * @file Compatibility barrel for the App Toolkit UI module.
 *
 * Change Rationale: UI code relocated to `features/workspaces/app-toolkit` under the feature-first
 * layout. This shim keeps legacy import statements working during the transition.
 */
export * from '../../../../features/workspaces/app-toolkit/ui/index.js';
