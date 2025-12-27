import { initGitPatch } from '@/core/features/githubTools.js';

/**
 * @file Feature-first entrypoint for the Git Patch tool.
 *
 * Change Rationale: Relocated under `features/github-tools` to keep router wiring focused on the
 * canonical feature tree while preserving the public init surface.
 */
// Export the init function for direct calls if needed by the router
export { initGitPatch };
