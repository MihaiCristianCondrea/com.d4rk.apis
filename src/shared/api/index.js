/**
 * @file Shared API/service public exports.
 */

/* Change Rationale: Centralize stable shared adapters behind a single public API
 * so migration away from legacy `src/core` and `src/services` paths can happen incrementally. */

export * from './clipboard-service.js';
export * from './download-service.js';
export * from './file-picker-service.js';
export * from './file-service.js';
export * from './github-service.js';
export * from './theme-service.js';
export * from './json-preview-service.js';
export * from './json-worker-client.js';
export * from './http-client.js';
export * from './clipboard.js';
export * from './theme.js';
