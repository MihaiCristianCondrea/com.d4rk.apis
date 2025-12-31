/**
 * @file Compatibility barrel for the FAQ workspace entrypoint.
 *
 * Change Rationale: The FAQ workspace lives under `app/workspaces/faq/ui` after the flattened
 * layout. This shim retains historical import targets.
 */
export * from '../faq/ui/FaqRoute.js';
