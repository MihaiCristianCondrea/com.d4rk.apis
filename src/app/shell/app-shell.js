/**
 * Returns the canonical runtime shell path for the Vite SPA.
 *
 * Change Rationale:
 * - The project previously exposed `/src/app/shell/app-shell.html`, which duplicated `index.html`.
 * - Vite resolves runtime HTML from the repository root `index.html`, so duplicate shell paths could drift.
 * - Returning the canonical entry path keeps shell ownership explicit and aligned with one Material 3 surface.
 *
 * @returns {string} Canonical shell path.
 */
export function getShellTemplatePath() {
  return '/index.html';
}
