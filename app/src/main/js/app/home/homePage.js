/**
 * @file Backwards-compatible barrel for the Home feature entrypoint.
 *
 * Change Rationale: Home moved under `features/home` to align with the feature-first layout while
 * avoiding breakage for existing imports during the transition.
 */
export * from '../../features/home/homePage.js';
