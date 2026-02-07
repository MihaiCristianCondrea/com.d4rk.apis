/**
 * Change Rationale:
 * - These modules previously imported the legacy `core/ui/router` path directly.
 * - The normalized structure defines `src/router/index.js` as the stable router entrypoint.
 * - Routing behavior is unchanged; the import path now matches the new ownership boundary.
 * - This keeps navigation wiring aligned with the app-shell-first Material 3 navigation model.
 */
/** Page module for git-patch. */
import { loadPageContent } from '../../router/index.js';
export async function mount() { return loadPageContent('#git-patch'); }
export function unmount() {}
