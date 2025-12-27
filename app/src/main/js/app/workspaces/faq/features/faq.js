/**
 * @file Compatibility barrel for the FAQ workspace entrypoint.
 *
 * Change Rationale: The FAQ workspace lives under `features/workspaces/faq` after the feature-first
 * migration. This shim retains historical import targets.
 */
export * from '../../../../features/workspaces/faq/features/faq.js';
