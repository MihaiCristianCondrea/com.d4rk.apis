/**
 * @file Compatibility barrel for the App Toolkit screenshot field component.
 *
 * Change Rationale: The component now lives in `features/workspaces/app-toolkit` as part of the
 * feature-first reorganization; this shim preserves external import stability.
 */
export * from '../../../../../features/workspaces/app-toolkit/ui/components/screenshotField.js';
