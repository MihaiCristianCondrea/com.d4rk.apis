/** Bridge router that delegates to the existing runtime router. */
import { loadPageContent } from '../core/ui/router/index.js';
export async function navigate(routeId) { return loadPageContent(`#${routeId}`); }
