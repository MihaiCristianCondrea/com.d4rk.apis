/**
 * @file Compatibility barrel for the Repo Mapper entrypoint.
 *
 * Change Rationale: Repo Mapper now lives under `app/github-tools/ui/routes` in the flattened
 * Android-style layout. This shim preserves legacy imports without altering runtime behavior.
 */
export * from '../../../../github-tools/ui/routes/RepoMapperRoute.js';
