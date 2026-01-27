// Change Rationale: Release Stats now resolves its init hook from `app/githubtools/core/domain`
// to keep the flattened layout consistent without altering behavior.
import { initReleaseStats } from '@/app/githubtools/core/domain/githubTools.js';

/**
 * @file Feature-first entrypoint for the Release Stats tool.
 *
 * Change Rationale: Located under `app/githubtools/core/ui` to align router imports with the flattened
 * layout while keeping the init surface unchanged for Material-driven pages.
 */
// Export the init function for direct calls if needed by the router
export { initReleaseStats };
