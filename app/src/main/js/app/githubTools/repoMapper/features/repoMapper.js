/**
 * @file Compatibility barrel for the Repo Mapper entrypoint.
 *
 * Change Rationale: Repo Mapper now resides in `features/github-tools/repo-mapper` as part of the
 * feature-first structure. Keeping this shim avoids breaking existing deep imports.
 */
export * from '../../../../features/github-tools/repo-mapper/features/repoMapper.js';
