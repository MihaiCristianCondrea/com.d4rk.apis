/**
 * @file Backwards-compatible barrel for the Home content configuration.
 *
 * Change Rationale: The feature-first migration keeps the canonical module in `features/home` while
 * preserving legacy import paths for minimal churn.
 */
export * from '../../features/home/homeContent.js';
