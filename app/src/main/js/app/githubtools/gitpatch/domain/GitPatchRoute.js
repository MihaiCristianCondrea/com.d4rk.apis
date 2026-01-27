// Change Rationale: Git Patch now pulls from `app/githubtools/core/domain` in the flattened layout to
// keep router wiring consistent without changing runtime behavior.
import { initGitPatch } from '@/app/githubtools/core/domain/githubTools.js';

/**
 * @file Feature-first entrypoint for the Git Patch tool.
 *
 * Change Rationale: Relocated under `app/githubtools/gitpatch` to keep router wiring focused on the
 * canonical feature tree while preserving the public init surface.
 */
// Export the init function for direct calls if needed by the router
export { initGitPatch };
