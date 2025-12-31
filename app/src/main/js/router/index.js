/**
 * @file Legacy router facade pointing to the canonical core router implementation.
 *
 * Change Rationale: The codebase previously duplicated router folders. Keeping `core/ui/router`
 * authoritative while re-exporting here prevents breaking historical imports during the
 * feature-first reorganization.
 */
export * from '../core/ui/router/index.js';
export { default } from '../core/ui/router/index.js';
