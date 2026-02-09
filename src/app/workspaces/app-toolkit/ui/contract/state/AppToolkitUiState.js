/** @file Shared UI state model for App Toolkit route composition. */

/**
 * Creates the route-level UI state.
 * @returns {{fetchState: 'idle'|'loading'|'success'|'error', githubStepIndex: number, sortKey: string}}
 */
export function createAppToolkitUiState() {
  return {
    fetchState: 'idle',
    githubStepIndex: 0,
    sortKey: 'name'
  };
}
