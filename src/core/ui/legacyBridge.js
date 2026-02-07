/**
 * @module core/ui/legacyBridge
 * @description Registers legacy API Builder utilities on the global scope so legacy templates remain functional after the feature-first refactor.
 * Change Rationale: The API Builder utilities live under `core/domain/`, but this bridge pointed at a non-existent `core/ui/domain` path, breaking Vite resolution during production builds. Pointing to the canonical domain location restores bundling without changing runtime behavior and keeps legacy consumers aligned with the Material Design 3 surface hierarchy.
 */
import { registerApiBuilderUtilsGlobal } from '../domain/apiBuilder/index.js';

/**
 * Binds legacy API Builder helpers onto the global object for compatibility.
 * @returns {void}
 */
export function initializeLegacyBridge() {
  registerApiBuilderUtilsGlobal();
}

initializeLegacyBridge();
