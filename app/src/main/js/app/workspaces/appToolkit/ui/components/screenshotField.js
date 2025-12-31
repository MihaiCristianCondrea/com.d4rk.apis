/**
 * @file Compatibility barrel for the App Toolkit screenshot field component.
 *
 * Change Rationale: The component now lives in `app/workspaces/app-toolkit/ui/components` after the
 * flattened layout; this shim preserves external import stability.
 */
export * from '../../app-toolkit/ui/components/screenshotField.js';
