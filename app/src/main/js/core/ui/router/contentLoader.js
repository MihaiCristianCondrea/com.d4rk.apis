import { RouterRoutes } from './routes.js';

/**
 * Default title applied when a route does not define its own title.
 *
 * @type {string}
 */
const DEFAULT_PAGE_TITLE = 'API Console';

/**
 * Produces a simple HTML snippet for representing a load error.
 *
 * The markup:
 * - Wraps content in a `.page-section.active` container for consistent layout.
 * - Includes the provided message styled with `.error-message` and
 *   a Tailwind-like `text-red-500` class.
 *
 * @param {string} message Human-readable error message.
 * @returns {string} HTML string representing the error.
 */
function createErrorHtml(message) {
    return `<div class="page-section active"><p class="error-message text-red-500">${message}</p></div>`;
}

/**
 * Produces a simple HTML snippet for when the router fails to resolve a page.
 *
 * @param {string} pageId Identifier passed to the loader.
 * @returns {string} HTML string indicating the page was not found.
 */
function createNotFoundHtml(pageId) {
    return `<div class="page-section active"><p>Page not found: ${pageId}</p></div>`;
}

/**
 * Fetches the markup associated with a given route ID.
 *
 * This is the content-layer counterpart of the router: given a `pageId`,
 * the loader locates the route from `RouterRoutes`, fetches its HTML file
 * (when applicable), and returns a structured result that the router can
 * mount into the UI.
 *
 * ### Behavior Overview
 *
 * 1. **Route resolution**
 *    - Looks up the route via `RouterRoutes.getRoute(pageId)`.
 *    - When no route is found, returns a `"not-found"` status with a simple UI.
 *
 * 2. **Home route handling**
 *    - If the route has no `path` and the ID is `"home"`, HTML is taken from
 *      `options.initialHomeHTML` (often pre-rendered markup already in the DOM).
 *
 * 3. **Non-home routes without paths**
 *    - If no `path` exists but it is *not* the home route, an empty string is
 *      used as the content placeholder and a warning is logged.
 *
 * 4. **Fetching external markup**
 *    - Performs a `fetch()` request to the route's `path`.
 *    - On HTTP failure, returns a `"error"` result with diagnostic HTML.
 *    - On success, passes the downloaded HTML forward.
 *
 * 5. **Hooks**
 *    - If the route defines `onLoad`, it is returned as `onReady` so the router
 *      can run route-specific setup after insertion into the DOM.
 *
 * ### Returned Object
 *
 * All return shapes contain:
 * - `status`: `"success" | "error" | "not-found"`
 * - `title`: Resolved page title.
 * - `html`: Raw HTML string to be inserted.
 * - `sourceTitle`: Original route title (used for debugging or tab titles).
 * - `onReady?`: Optional hook from the route configuration.
 * - `error?`: Error instance when status is `"error"`.
 *
 * @param {string} pageId ID of the route to load.
 * @param {{ initialHomeHTML?: string }} [options]
 *   Optional loader options:
 *   - `initialHomeHTML`: Used only when loading the home route with no path.
 *
 * @returns {Promise<{
 *   status: 'success' | 'error' | 'not-found',
 *   title: string,
 *   html: string,
 *   onReady?: Function | null,
 *   error?: Error,
 *   sourceTitle: string
 * }>}
 *   Structured response containing the HTML to mount.
 */
async function fetchPageMarkup(pageId, options = {}) {
    const routesApi = RouterRoutes;

    // Safe lookup of the route getter
    const getRoute = routesApi && typeof routesApi.getRoute === 'function'
        ? routesApi.getRoute.bind(routesApi)
        : null;

    const routeConfig = getRoute ? getRoute(pageId) : null;

    // 1. Route not found
    if (!routeConfig) {
        return {
            status: 'not-found',
            title: 'Not Found',
            html: createNotFoundHtml(pageId)
        };
    }

    const pageTitle = routeConfig.title || DEFAULT_PAGE_TITLE;
    const onReadyHook = routeConfig.onLoad || null;

    // 2–3. Routes without a path
    if (!routeConfig.path) {
        if (routeConfig.id !== 'home') {
            console.warn(
                `RouterContentLoader: Route "${routeConfig.id}" does not define a path. ` +
                `Using empty content placeholder.`
            );
        }

        return {
            status: 'success',
            title: pageTitle,
            html: routeConfig.id === 'home'
                ? (options.initialHomeHTML || '')
                : '',
            onReady: onReadyHook,
            sourceTitle: pageTitle
        };
    }

    // 4. Fetch external HTML file
    try {
        const response = await fetch(routeConfig.path);

        if (!response.ok) {
            const errorMessage = `HTTP error! status: ${response.status} for ${routeConfig.path}`;
            return {
                status: 'error',
                title: 'Error',
                html: createErrorHtml(`Failed to load page: ${pageTitle}. ${errorMessage}`),
                error: new Error(errorMessage),
                sourceTitle: pageTitle
            };
        }

        const html = await response.text();

        return {
            status: 'success',
            title: pageTitle,
            html,
            onReady: onReadyHook,
            sourceTitle: pageTitle
        };

    } catch (error) {
        return {
            status: 'error',
            title: 'Error',
            html: createErrorHtml(`Failed to load page: ${pageTitle}. ${error.message}`),
            error,
            sourceTitle: pageTitle
        };
    }
}

/**
 * Exported loader namespace as consumed by routing and core UI logic.
 */
export const RouterContentLoader = {
    fetchPageMarkup,
    DEFAULT_PAGE_TITLE
};

export default RouterContentLoader;
export { fetchPageMarkup, DEFAULT_PAGE_TITLE };
