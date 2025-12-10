import RouterRoutes from './routes.js';
import RouterAnimation from './animation.js';
import RouterContentLoader from './contentLoader.js';
import RouterHistory from './history.js';
import normalizePageId from './identifiers.js';
import updateActiveNavLink from './navigationState.js';
import routerRuntime from './runtime.js';

/**
 * Minimum perceived load duration in milliseconds.
 *
 * Even if the page fetch + animation completes faster than this, the loader
 * waits so that transitions do not feel "flashy" or jarring.
 *
 * @type {number}
 */
const MINIMUM_LOAD_DURATION = 600;

/**
 * Produces a generic error HTML snippet for page load failures.
 *
 * Markup:
 * - Uses `.page-section.active` to match normal layout containers.
 * - Styles the message with `.error-message` and `text-red-500`.
 *
 * @param {string} [message]
 *   Optional error message. If omitted, a default fallback is used.
 *
 * @returns {string} HTML string representing the error state.
 */
function createGenericErrorHtml(message) {
  const finalMessage = message || 'Failed to load page. An unknown error occurred.';
  return `<div class="page-section active"><p class="error-message text-red-500">${finalMessage}</p></div>`;
}

/**
 * Produces a "not found" HTML snippet when the requested page is unknown.
 *
 * @param {string} [pageId]
 *   Page identifier used in the failed lookup.
 *
 * @returns {string} HTML string representing the not-found state.
 */
function createNotFoundHtml(pageId) {
  const safeId = pageId || 'unknown';
  return `<div class="page-section active"><p class="error-message text-red-500">Page not found: ${safeId}</p></div>`;
}

/**
 * Retrieves a route configuration object for a given page ID.
 *
 * The function supports two forms of route APIs:
 * - An object with a `getRoute(pageId)` function.
 * - An object with a `PAGE_ROUTES` map keyed by page ID.
 *
 * If neither form is available, or the page ID is not present, `null` is returned.
 *
 * @param {string} pageId Normalized page ID to resolve.
 * @param {any} [routesApi=RouterRoutes] Routes API implementation.
 *
 * @returns {Object|null} Route configuration, or `null` when not found.
 */
function getRegisteredRoute(pageId, routesApi = RouterRoutes) {
  if (!routesApi) {
    return null;
  }
  if (typeof routesApi.getRoute === 'function') {
    return routesApi.getRoute(pageId);
  }
  const routesMap = routesApi.PAGE_ROUTES;
  if (routesMap && typeof routesMap === 'object' && pageId in routesMap) {
    return routesMap[pageId];
  }
  return null;
}

/**
 * Initializes any application dialogs present in the newly loaded content.
 *
 * If a global `AppDialogs` object exists with an `init` function, this will be
 * invoked with the provided `contentArea`. Errors are logged but do not abort
 * the page load.
 *
 * @param {HTMLElement} contentArea The container whose dialogs should be initialized.
 * @returns {void}
 */
function initializeDialogs(contentArea) {
  // AppDialogs is expected to be a global, if present.
  // eslint-disable-next-line no-undef
  if (typeof AppDialogs === 'undefined' || !AppDialogs || typeof AppDialogs.init !== 'function') {
    return;
  }
  try {
    // eslint-disable-next-line no-undef
    AppDialogs.init(contentArea);
  } catch (error) {
    console.error('Router: Failed to initialize dialogs for new content:', error);
  }
}

/**
 * Runs optional page-level animations after new content is applied.
 *
 * If a global `SiteAnimations` object defines `animatePage(contentArea, pageId)`,
 * that function is invoked and its return value is wrapped in a resolved Promise.
 *
 * All errors are logged and converted to a resolved Promise so that animation
 * failures never break navigation flow.
 *
 * @param {HTMLElement} contentArea The content container element.
 * @param {string} pageId Normalized page identifier.
 * @returns {Promise<void>} Promise that resolves after the animation hook completes or fails.
 */
function runPageAnimations(contentArea, pageId) {
  // SiteAnimations is expected to be a global, if present.
  // eslint-disable-next-line no-undef
  if (typeof SiteAnimations === 'undefined' || !SiteAnimations || typeof SiteAnimations.animatePage !== 'function') {
    return Promise.resolve();
  }
  try {
    // eslint-disable-next-line no-undef
    return Promise.resolve(SiteAnimations.animatePage(contentArea, pageId));
  } catch (error) {
    console.error('Router: Failed to run page animations:', error);
    return Promise.resolve();
  }
}

/**
 * Resolves the effective page title from various sources.
 *
 * Priority:
 * 1. `loadResult.title`
 * 2. `routeConfig.title`
 * 3. `contentLoader.DEFAULT_PAGE_TITLE`
 * 4. Hardcoded `"API Console"` fallback
 *
 * This function is pure and never throws.
 *
 * @param {{ title?: string }} loadResult Result returned by the content loader.
 * @param {{ title?: string } | null} routeConfig Route configuration, if available.
 * @param {{ DEFAULT_PAGE_TITLE?: string }} [contentLoader=RouterContentLoader]
 *   Content loader that may define a default title.
 *
 * @returns {string} Resolved page title.
 */
function resolvePageTitle(loadResult, routeConfig, contentLoader = RouterContentLoader) {
  return (
      loadResult.title
      || (routeConfig && routeConfig.title)
      || (contentLoader && contentLoader.DEFAULT_PAGE_TITLE)
      || 'API Console'
  );
}

/**
 * Updates site-wide metadata for the current route, if supported.
 *
 * If a global `SiteMetadata` object exists and exposes `updateForRoute(route, context)`,
 * this function forwards:
 * - `routeConfig` as the first argument.
 * - A context object with:
 *   - `pageId`
 *   - `pageTitle`
 *   - `loadStatus` ("success" | "error" | "not-found")
 *
 * Errors are logged and ignored.
 *
 * @param {Object|null} routeConfig Route configuration or `null` when unavailable.
 * @param {string} pageTitle Resolved title for the route.
 * @param {string} normalizedPageId Canonical page identifier.
 * @param {'success'|'error'|'not-found'} loadStatus Load status for this navigation.
 * @returns {void}
 */
function updateMetadataForPage(routeConfig, pageTitle, normalizedPageId, loadStatus) {
  const siteMetadata =
      typeof window !== 'undefined' ? window.SiteMetadata : globalThis.SiteMetadata;
  if (!siteMetadata || typeof siteMetadata.updateForRoute !== 'function') {
    return;
  }

  try {
    siteMetadata.updateForRoute(routeConfig, {
      pageId: normalizedPageId,
      pageTitle,
      loadStatus,
    });
  } catch (error) {
    console.error('Router: Failed to update metadata:', error);
  }
}

/**
 * Shape of the context object passed around during a page load.
 *
 * @typedef {Object} PageLoadContext
 * @property {HTMLElement} contentArea Main content container.
 * @property {HTMLElement | null} appBarHeadline App bar title element (may be null).
 * @property {string} normalizedPageId Canonical page identifier.
 * @property {string} newUrlFragment Fragment to use in the URL (typically same as `normalizedPageId`).
 * @property {boolean} shouldUpdateHistory Whether this navigation should push history state.
 * @property {boolean} minHeightApplied Flag used by min-height logic.
 * @property {Object | null} routeConfig Route configuration for this page, if available.
 */

/**
 * PageLoader orchestrates route resolution, content loading, animations,
 * metadata updates, and history integration for the router.
 */
export class PageLoader {
  /**
   * Creates a new PageLoader.
   *
   * Dependencies are injectable for testing or customization, but default to
   * the shared router singletons.
   *
   * @param {typeof routerRuntime} [runtime=routerRuntime]
   *   Runtime abstraction used to access DOM targets and injected hooks.
   *
   * @param {Object} [deps={}]
   * @param {any} [deps.routes=RouterRoutes] Routes API implementation.
   * @param {any} [deps.animation=RouterAnimation] Animation API implementing fadeIn/fadeOut.
   * @param {any} [deps.contentLoader=RouterContentLoader] Content loader with `fetchPageMarkup`.
   * @param {any} [deps.history=RouterHistory] History adapter for title + pushState logic.
   */
  constructor(runtime = routerRuntime, {
    routes = RouterRoutes,
    animation = RouterAnimation,
    contentLoader = RouterContentLoader,
    history = RouterHistory,
  } = {}) {
    this.runtime = runtime;
    this.routes = routes;
    this.animation = animation;
    this.contentLoader = contentLoader;
    this.history = history;
  }

  /**
   * Resolves a route configuration for the provided page ID using the
   * injected routes API.
   *
   * @param {string} pageId Normalized route ID.
   * @returns {Object|null} Route configuration, or `null` when not found.
   */
  getRoute(pageId) {
    return getRegisteredRoute(pageId, this.routes);
  }

  /**
   * Loads a page into the content area and performs the full navigation cycle.
   *
   * Responsibilities:
   * - Shows the global loading overlay and closes the navigation drawer.
   * - Normalizes the page ID and resolves the route configuration.
   * - Handles "route not found" cases when a routes API is present.
   * - Fades out existing content (if animation is available).
   * - Applies a min-height lock to stabilize the layout during loading.
   * - Fetches markup via {@link fetchPageMarkup}.
   * - Applies the new content and initializes dialogs + route `onLoad`.
   * - Runs page-level animations via `runPageAnimations`.
   * - Resolves the page title and updates metadata + document title.
   * - Pushes or replaces history state depending on `shouldUpdateHistory`.
   * - Scrolls to top and updates the active nav link.
   * - Fades in new content (if animation is available).
   * - Enforces a minimum load duration (`MINIMUM_LOAD_DURATION`).
   * - Hides the overlay and releases min-height lock in a `finally` block.
   *
   * Errors in content loading appear as in-page error markup rather than
   * throwing, unless the runtime itself fails.
   *
   * @param {string} pageId Raw or normalized page identifier.
   * @param {boolean} [shouldUpdateHistory=true]
   *   Whether to push a new history state for this navigation.
   *
   * @returns {Promise<void>}
   */
  async load(pageId, shouldUpdateHistory = true) {
    const loadStart = Date.now();
    this.runtime.callShowOverlay();
    this.runtime.callCloseDrawer();

    const contentArea = this.runtime.getContentArea();
    if (!contentArea) {
      console.error('Router: pageContentArea element not set. Call initRouter first.');
      this.runtime.callHideOverlay();
      return;
    }

    const appBarHeadline = this.runtime.getAppBarHeadline();
    const normalizedPageId = normalizePageId(pageId);
    const newUrlFragment = normalizedPageId;
    const routeConfig = this.getRoute(normalizedPageId);

    /** @type {PageLoadContext} */
    const context = {
      contentArea,
      appBarHeadline,
      normalizedPageId,
      newUrlFragment,
      shouldUpdateHistory,
      minHeightApplied: false,
      routeConfig,
    };

    let pageAnimationPromise = Promise.resolve();

    try {
      // If a routes API exists and the route is missing, render a not-found page.
      if (typeof this.routes !== 'undefined' && this.routes && !routeConfig) {
        this.renderNotFound(context);
        return;
      }

      await this.fadeOutContent(contentArea);
      this.applyMinHeight(context);

      const loadResult = await this.fetchPageMarkup(context).catch((error) => ({
        status: 'error',
        title: 'Error',
        html: createGenericErrorHtml(`Failed to load page. ${error.message}`),
        error,
      }));

      if (loadResult.status === 'not-found') {
        console.warn('Router: Unknown page:', normalizedPageId);
      }

      if (loadResult.status === 'error' && loadResult.error) {
        const contextTitle = loadResult.sourceTitle || loadResult.title || normalizedPageId;
        console.error(`Error loading ${contextTitle}:`, loadResult.error);
      }

      this.applyContent(loadResult, context);

      pageAnimationPromise = runPageAnimations(contentArea, normalizedPageId);
      pageAnimationPromise.catch((error) => {
        if (error) {
          console.error('Router: Page animation failed:', error);
        }
      });

      const pageTitle = resolvePageTitle(loadResult, routeConfig, this.contentLoader);
      updateMetadataForPage(routeConfig, pageTitle, normalizedPageId, loadResult.status);
      this.updateTitle(appBarHeadline, pageTitle);
      this.updateHistoryState(normalizedPageId, pageTitle, newUrlFragment, shouldUpdateHistory);

      window.scrollTo({ top: 0 });
      updateActiveNavLink(newUrlFragment);

      await this.fadeInContent(contentArea);
      this.releaseMinHeight(context);

      const elapsed = Date.now() - loadStart;
      await new Promise((resolve) =>
          setTimeout(resolve, Math.max(0, MINIMUM_LOAD_DURATION - elapsed)),
      );
    } finally {
      this.releaseMinHeight(context);
      this.runtime.callHideOverlay();
    }
  }

  /**
   * Renders a not-found page into the content area and updates title/metadata.
   *
   * Used when:
   * - A routes API is present, and
   * - No route is registered for the normalized ID.
   *
   * @param {PageLoadContext} param0 Page load context.
   * @returns {void}
   */
  renderNotFound({ contentArea, appBarHeadline, normalizedPageId }) {
    contentArea.innerHTML = createNotFoundHtml(normalizedPageId);

    const notFoundTitle = 'Not Found';
    updateMetadataForPage(null, notFoundTitle, normalizedPageId, 'not-found');

    if (this.history && typeof this.history.updateTitle === 'function') {
      this.history.updateTitle(appBarHeadline, notFoundTitle);
    } else {
      if (appBarHeadline) {
        appBarHeadline.textContent = notFoundTitle;
      }
      if (typeof document !== 'undefined') {
        document.title = `${notFoundTitle} - API Console`;
      }
    }
  }

  /**
   * Applies loaded content into the DOM and triggers any associated hooks.
   *
   * Steps:
   * - Injects `loadResult.html` into the content area (or a generic error page
   *   if no HTML is provided).
   * - Initializes dialogs inside the new content.
   * - Invokes `routeConfig.onLoad()` if defined.
   * - Runs any injected runtime handlers for the page via
   *   `runtime.runInjectedHandlers()`.
   * - If no injected handler handled the page and `loadResult.onReady` is a
   *   function, invokes it through `runtime.invoke()`.
   *
   * @param {{ html?: string, onReady?: Function }} loadResult Result from the content loader.
   * @param {PageLoadContext} context Current page load context.
   * @returns {void}
   */
  applyContent(loadResult, context) {
    const { contentArea, normalizedPageId, routeConfig } = context;

    contentArea.innerHTML = typeof loadResult.html === 'string'
        ? loadResult.html
        : createGenericErrorHtml();

    initializeDialogs(contentArea);

    // Call the onLoad function from the routeConfig if it exists
    if (routeConfig && typeof routeConfig.onLoad === 'function') {
      try {
        routeConfig.onLoad();
      } catch (error) {
        console.error(`Router: Error calling onLoad for route "${normalizedPageId}":`, error);
      }
    }

    const handledByInjectedHandlers = this.runtime.runInjectedHandlers(normalizedPageId);
    if (!handledByInjectedHandlers && typeof loadResult.onReady === 'function') {
      this.runtime.invoke(loadResult.onReady, 'page ready hook', normalizedPageId);
    }
  }

  /**
   * Updates the visible page title in the app bar and document.
   *
   * If a history adapter is provided and exposes `updateTitle`, it is
   * responsible for both UI and document title updates. Otherwise this method
   * falls back to updating:
   * - `appBarHeadline.textContent`
   * - `document.title`
   *
   * @param {HTMLElement | null} appBarHeadline App bar headline element.
   * @param {string} pageTitle Title to display.
   * @returns {void}
   */
  updateTitle(appBarHeadline, pageTitle) {
    if (this.history && typeof this.history.updateTitle === 'function') {
      this.history.updateTitle(appBarHeadline, pageTitle);
      return;
    }

    if (appBarHeadline) {
      appBarHeadline.textContent = pageTitle;
    }
    if (typeof document !== 'undefined') {
      document.title = `${pageTitle} - API Console`;
    }
  }

  /**
   * Updates browser history state for the current navigation.
   *
   * If a history adapter is provided and exposes `pushState`, that is used.
   * Otherwise this method falls back to `window.history.pushState` when
   * available.
   *
   * @param {string} pageId Normalized page ID.
   * @param {string} pageTitle Page title used for history and document.
   * @param {string} urlFragment Fragment identifier (without `#`).
   * @param {boolean} shouldUpdateHistory Whether to push a new state.
   * @returns {void}
   */
  updateHistoryState(pageId, pageTitle, urlFragment, shouldUpdateHistory) {
    if (this.history && typeof this.history.pushState === 'function') {
      this.history.pushState(pageId, pageTitle, urlFragment, shouldUpdateHistory);
      return;
    }

    if (shouldUpdateHistory && window.history && typeof window.history.pushState === 'function') {
      window.history.pushState({ page: pageId }, pageTitle, `#${urlFragment}`);
    }
  }

  /**
   * Delegates to the content loader to fetch markup for the current page.
   *
   * When `contentLoader.fetchPageMarkup` is available, it is called with:
   * - `context.normalizedPageId`
   * - `{ initialHomeHTML: runtime.getInitialHomeHTML() }`
   *
   * If no content loader is configured, returns an error-like result with a
   * generic error HTML snippet.
   *
   * @param {PageLoadContext} context Page load context.
   * @returns {Promise<{
   *   status: 'success' | 'error' | 'not-found',
   *   title?: string,
   *   html: string,
   *   onReady?: Function,
   *   error?: Error,
   *   sourceTitle?: string
   * }>}
   */
  async fetchPageMarkup(context) {
    if (this.contentLoader && typeof this.contentLoader.fetchPageMarkup === 'function') {
      return this.contentLoader.fetchPageMarkup(context.normalizedPageId, {
        initialHomeHTML: this.runtime.getInitialHomeHTML(),
      });
    }
    return {
      status: 'error',
      title: 'Error',
      html: createGenericErrorHtml('Failed to load page. Router content loader is unavailable.'),
    };
  }

  /**
   * Fades out the current content using the configured animation adapter.
   *
   * If `this.animation.fadeOut` is available, it is awaited. Otherwise the
   * method falls back to setting `contentArea.style.opacity = 0`.
   *
   * @param {HTMLElement} contentArea Content container to fade out.
   * @returns {Promise<void>}
   */
  async fadeOutContent(contentArea) {
    if (this.animation && typeof this.animation.fadeOut === 'function') {
      await this.animation.fadeOut(contentArea);
      return;
    }
    if (contentArea && contentArea.style) {
      contentArea.style.opacity = 0;
    }
  }

  /**
   * Fades in the current content using the configured animation adapter.
   *
   * If `this.animation.fadeIn` is available, it is awaited. Otherwise the
   * method falls back to setting `contentArea.style.opacity = 1`.
   *
   * @param {HTMLElement} contentArea Content container to fade in.
   * @returns {Promise<void>}
   */
  async fadeInContent(contentArea) {
    if (this.animation && typeof this.animation.fadeIn === 'function') {
      await this.animation.fadeIn(contentArea);
      return;
    }
    if (contentArea && contentArea.style) {
      contentArea.style.opacity = 1;
    }
  }

  /**
   * Applies a temporary `min-height` lock to the content area based on its
   * current height.
   *
   * This stabilizes the layout during navigation so that:
   * - The overlay and transitions don't cause large jumps.
   * - Shorter pages do not cause flicker when replacing taller ones.
   *
   * The computed height is rounded and stored in `context.minHeightApplied`.
   *
   * @param {PageLoadContext} context Page load context (mutated in place).
   * @returns {void}
   */
  applyMinHeight(context) {
    const { contentArea } = context;
    if (!contentArea || typeof contentArea.getBoundingClientRect !== 'function' || !contentArea.style) {
      return;
    }
    const rect = contentArea.getBoundingClientRect();
    if (rect && Number.isFinite(rect.height) && rect.height > 0) {
      contentArea.style.minHeight = `${Math.round(rect.height)}px`;
      context.minHeightApplied = true;
    }
  }

  /**
   * Releases a previously applied `min-height` lock from the content area.
   *
   * Only clears the `min-height` style if `applyMinHeight` successfully set it
   * earlier in this navigation (tracked via `context.minHeightApplied`).
   *
   * @param {PageLoadContext} context Page load context (mutated in place).
   * @returns {void}
   */
  releaseMinHeight(context) {
    const { contentArea } = context;
    if (!context.minHeightApplied || !contentArea || !contentArea.style) {
      return;
    }
    contentArea.style.minHeight = '';
    context.minHeightApplied = false;
  }
}

export default PageLoader;
