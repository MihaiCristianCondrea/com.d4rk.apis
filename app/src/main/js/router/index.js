/**
 * @file Legacy router facade pointing to the canonical core router implementation.
 *
 * Change Rationale: The codebase previously duplicated router folders. Keeping `core/router`
 * authoritative while re-exporting here prevents breaking historical imports during the
 * feature-first reorganization.
 */
export * from '../core/router/index.js';
export { default } from '../core/router/index.js';
