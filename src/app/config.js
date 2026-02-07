/**
 * Change Rationale:
 * - Configuration values were previously implied by scattered constants and build scripts.
 * - Centralizing shell-level constants improves route boot consistency and Vite portability.
 * - This keeps Material 3 metadata (title/description) controlled from one source.
 */
export const appConfig = {
  appName: 'API Console',
};
