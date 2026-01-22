// Change Rationale: Repo Mapper now sources its init hook from the flattened `app/github-tools/domain`
// module to keep routing aligned with the Android-style layout without altering behavior.
import { initRepoMapper } from '@/app/github-tools/domain/githubTools.js';

/**
 * @file Feature-first entrypoint for the Repo Mapper tool.
 *
 * Change Rationale: Situated under `app/github-tools/ui` to keep feature code discoverable in the
 * flattened layout while retaining the same init hook for the router.
 */
// Export the init function for direct calls if needed by the router
export { initRepoMapper };
