/**
 * Change Rationale:
 * - These modules previously imported the legacy `core/ui/router` path directly.
 * - The normalized structure defines `src/router/index.js` as the stable router entrypoint.
 * - Routing behavior is unchanged; the import path now matches the new ownership boundary.
 * - This keeps navigation wiring aligned with the app-shell-first Material 3 navigation model.
 */
/** Bridge router that delegates to the existing runtime router. */
import { loadPageContent } from './index.js';
export async function navigate(routeId) { return loadPageContent(`#${routeId}`); }
