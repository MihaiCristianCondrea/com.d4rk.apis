import RouterRoutes from './routes.js';
import RouterAnimation from './animation.js';
import RouterContentLoader from './contentLoader.js';
import RouterHistory from './history.js';
import normalizePageId from './identifiers.js';
import updateActiveNavLink from './navigationState.js';
import routerRuntime from './runtime.js';
import PageLoader from './pageLoader.js';

/**
 * Internal PageLoader instance.
 *
 * The loader orchestrates:
 * - route resolution
 * - content loading via RouterContentLoader
 * - navigation history updates
 * - UI transitions via RouterAnimation
 * - DOM mounting via routerRuntime
 *
 * Consumers do not interact with this instance directly; instead they call
 * the exported Router API.
 */
const pageLoader = new PageLoader(routerRuntime, {
  routes: RouterRoutes,
  animation: RouterAnimation,
  contentLoader: RouterContentLoader,
  history: RouterHistory,
});

/**
 * Initializes the router by providing references to the primary DOM targets
 * used for content rendering.
 *
 * This must be called before attempting to navigate or load any pages.
 *
 * @param {HTMLElement} contentAreaEl
 *   The container where page HTML will be injected.
 *
 * @param {HTMLElement} appBarHeadlineEl
 *   Element where the active route title will be displayed.
 *
 * @param {string} homeHTML
 *   Pre-rendered markup for the home page. Used when loading the "home" route
 *   without fetching an external file.
 *
 * @param {Object} [options]
 *   Optional runtime configuration to forward to `routerRuntime.applyOptions()`.
 *
 * @returns {void}
 */
function initRouter(contentAreaEl, appBarHeadlineEl, homeHTML, options = {}) {
  routerRuntime.registerContentTargets(contentAreaEl, appBarHeadlineEl, homeHTML);
  routerRuntime.applyOptions(options);
}

/**
 * Loads a page by ID, optionally adding an entry to browser history.
 *
 * The returned Promise resolves once:
 * - the route is resolved,
 * - markup is fetched (or pre-rendered html is used),
 * - animations are applied, and
 * - the new page content is mounted into the DOM.
 *
 * Errors are surfaced via the PageLoader logic, which returns error markup
 * rather than throwing.
 *
 * @param {string} pageId Normalized or raw page identifier.
 * @param {boolean} [updateHistory=true] Whether to push a new history entry.
 *
 * @returns {Promise<void>}
 *   Resolves when the page transition and content injection complete.
 */
function loadPageContent(pageId, updateHistory = true) {
  return pageLoader.load(pageId, updateHistory);
}

/**
 * Public router API surface.
 *
 * Exposed to app code and tests.
 */
const Router = {
  /**
   * Initialize global router state and register DOM injection targets.
   */
  initRouter,

  /**
   * Load content for a specific page ID.
   */
  loadPageContent,

  /**
   * Normalize hash or path-based IDs into canonical route IDs.
   */
  normalizePageId,

  /**
   * Highlight the active navigation item based on the current route.
   */
  updateActiveNavLink,
};

export default Router;
export { Router, initRouter, loadPageContent, normalizePageId, updateActiveNavLink };
