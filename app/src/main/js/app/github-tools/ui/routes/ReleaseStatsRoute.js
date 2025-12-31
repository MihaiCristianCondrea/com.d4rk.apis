// Change Rationale: Release Stats now resolves its init hook from `app/github-tools/domain` to keep
// the flattened layout consistent without altering behavior.
import { initReleaseStats } from '@/app/github-tools/domain/githubTools.js';

/**
 * @file Feature-first entrypoint for the Release Stats tool.
 *
 * Change Rationale: Located under `app/github-tools/ui` to align router imports with the flattened
 * layout while keeping the init surface unchanged for Material-driven pages.
 */
// Export the init function for direct calls if needed by the router
export { initReleaseStats };
