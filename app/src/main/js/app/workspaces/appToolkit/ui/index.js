/**
 * @file Compatibility barrel for the App Toolkit UI module.
 *
 * Change Rationale: UI code relocated to `app/workspaces/app-toolkit/ui` under the flattened layout.
 * This shim keeps legacy import statements working during the transition.
 */
export * from '../app-toolkit/ui/index.js';
