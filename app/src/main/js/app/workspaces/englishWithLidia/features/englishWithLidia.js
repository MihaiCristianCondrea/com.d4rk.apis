/**
 * @file Compatibility barrel for the English with Lidia workspace entrypoint.
 *
 * Change Rationale: The workspace now resides in `app/workspaces/english-with-lidia/ui` after the
 * flattened layout; this shim keeps existing imports stable.
 */
export * from '../english-with-lidia/ui/EnglishWithLidiaRoute.js';
