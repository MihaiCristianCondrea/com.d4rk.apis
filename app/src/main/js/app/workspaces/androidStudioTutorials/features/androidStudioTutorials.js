/**
 * @file Compatibility barrel for the Android Studio Tutorials workspace entrypoint.
 *
 * Change Rationale: The workspace now lives in `app/workspaces/android-studio-tutorials/ui` after
 * the flattened layout; this shim preserves prior import paths.
 */
export * from '../android-studio-tutorials/ui/AndroidStudioTutorialsRoute.js';
