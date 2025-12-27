/**
 * @file Compatibility barrel for the Android Studio Tutorials workspace entrypoint.
 *
 * Change Rationale: The workspace shifted to `features/workspaces/android-studio-tutorials` as part
 * of the feature-first layout; this shim preserves prior import paths.
 */
export * from '../../../../features/workspaces/android-studio-tutorials/features/androidStudioTutorials.js';
