/** @file Event contracts emitted by App Toolkit controllers. */

/** @type {Readonly<Record<string, string>>} */
export const APP_TOOLKIT_EVENT = Object.freeze({
  WORKSPACE_READY: 'WORKSPACE_READY',
  FETCH_STATE_CHANGED: 'FETCH_STATE_CHANGED',
  GITHUB_STEP_CHANGED: 'GITHUB_STEP_CHANGED',
  DASHBOARD_UPDATED: 'DASHBOARD_UPDATED'
});
