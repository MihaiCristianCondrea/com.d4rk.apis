/**
 * @file Legacy router routes facade that proxies to the canonical core routes registry.
 *
 * Change Rationale: Consolidates duplicate router folders by funneling all route imports through
 * `core/router/routes.js` while preserving compatibility with historical `router/` paths.
 */
export * from '../core/router/routes.js';
export { default } from '../core/router/routes.js';
