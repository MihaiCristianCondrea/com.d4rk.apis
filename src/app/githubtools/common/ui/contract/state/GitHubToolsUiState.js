/**
 * @file Shared immutable UI state defaults for GitHub tools pages.
 */

/** @returns {{isLoading:boolean,errorMessage:string,hasResult:boolean}} */
function createGitHubToolsUiState() {
  return Object.freeze({
    isLoading: false,
    errorMessage: '',
    hasResult: false,
  });
}

export { createGitHubToolsUiState };
