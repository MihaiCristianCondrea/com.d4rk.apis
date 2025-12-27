import { initRepoMapper } from '@/core/features/githubTools.js';

/**
 * @file Feature-first entrypoint for the Repo Mapper tool.
 *
 * Change Rationale: Situated under `features/github-tools` to keep feature code discoverable and
 * avoid the legacy `app/` tree while retaining the same init hook for the router.
 */
// Export the init function for direct calls if needed by the router
export { initRepoMapper };
