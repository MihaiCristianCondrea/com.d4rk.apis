/**
 * @file Compatibility barrel for the English with Lidia workspace entrypoint.
 *
 * Change Rationale: The workspace now resides in `features/workspaces/english-with-lidia` for the
 * feature-first layout; this shim keeps existing imports stable.
 */
export * from '../../../../features/workspaces/english-with-lidia/features/englishWithLidia.js';
