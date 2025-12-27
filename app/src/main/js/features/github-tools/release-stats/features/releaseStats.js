import { initReleaseStats } from '@/core/features/githubTools.js';

/**
 * @file Feature-first entrypoint for the Release Stats tool.
 *
 * Change Rationale: Moved into `features/github-tools` to align router imports with the new layout
 * while keeping the init surface unchanged for Material-driven pages.
 */
// Export the init function for direct calls if needed by the router
export { initReleaseStats };
