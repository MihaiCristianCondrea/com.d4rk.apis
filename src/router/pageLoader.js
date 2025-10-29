import RouterRoutes from './routes.js';
import RouterAnimation from './animation.js';
import RouterContentLoader from './contentLoader.js';
import RouterHistory from './history.js';
import normalizePageId from './identifiers.js';
import updateActiveNavLink from './navigationState.js';
import routerRuntime from './runtime.js';

const MINIMUM_LOAD_DURATION = 600;

function createGenericErrorHtml(message) {
  const finalMessage = message || 'Failed to load page. An unknown error occurred.';
  return `<div class="page-section active"><p class="error-message text-red-500">${finalMessage}</p></div>`;
}

function createNotFoundHtml(pageId) {
  const safeId = pageId || 'unknown';
  return `<div class="page-section active"><p class="error-message text-red-500">Page not found: ${safeId}</p></div>`;
}

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

function initializeDialogs(contentArea) {
  if (typeof AppDialogs === 'undefined' || !AppDialogs || typeof AppDialogs.init !== 'function') {
    return;
  }
  try {
    AppDialogs.init(contentArea);
  } catch (error) {
    console.error('Router: Failed to initialize dialogs for new content:', error);
  }
}

function runPageAnimations(contentArea, pageId) {
  if (typeof SiteAnimations === 'undefined' || !SiteAnimations || typeof SiteAnimations.animatePage !== 'function') {
    return Promise.resolve();
  }
  try {
    return Promise.resolve(SiteAnimations.animatePage(contentArea, pageId));
  } catch (error) {
    console.error('Router: Failed to run page animations:', error);
    return Promise.resolve();
  }
}

function resolvePageTitle(loadResult, routeConfig, contentLoader = RouterContentLoader) {
  return (
    loadResult.title
    || (routeConfig && routeConfig.title)
    || (contentLoader && contentLoader.DEFAULT_PAGE_TITLE)
    || 'API Console'
  );
}

function updateMetadataForPage(routeConfig, pageTitle, normalizedPageId, loadStatus) {
  const siteMetadata = typeof window !== 'undefined' ? window.SiteMetadata : globalThis.SiteMetadata;
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

export class PageLoader {
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

  getRoute(pageId) {
    return getRegisteredRoute(pageId, this.routes);
  }

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

    const context = {
      contentArea,
      appBarHeadline,
      normalizedPageId,
      newUrlFragment,
      shouldUpdateHistory,
      minHeightApplied: false,
    };

    let pageAnimationPromise = Promise.resolve();

    try {
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

      window.scrollTo(0, 0);
      updateActiveNavLink(newUrlFragment);

      await this.fadeInContent(contentArea);
      this.releaseMinHeight(context);

      const elapsed = Date.now() - loadStart;
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, MINIMUM_LOAD_DURATION - elapsed)));
    } finally {
      this.releaseMinHeight(context);
      this.runtime.callHideOverlay();
    }
  }

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

  applyContent(loadResult, context) {
    const { contentArea, normalizedPageId } = context;

    contentArea.innerHTML = typeof loadResult.html === 'string'
      ? loadResult.html
      : createGenericErrorHtml();

    initializeDialogs(contentArea);

    const handledByInjectedHandlers = this.runtime.runInjectedHandlers(normalizedPageId);
    if (!handledByInjectedHandlers && typeof loadResult.onReady === 'function') {
      this.runtime.invoke(loadResult.onReady, 'page ready hook', normalizedPageId);
    }
  }

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

  updateHistoryState(pageId, pageTitle, urlFragment, shouldUpdateHistory) {
    if (this.history && typeof this.history.pushState === 'function') {
      this.history.pushState(pageId, pageTitle, urlFragment, shouldUpdateHistory);
      return;
    }

    if (shouldUpdateHistory && window.history && typeof window.history.pushState === 'function') {
      window.history.pushState({ page: pageId }, pageTitle, `#${urlFragment}`);
    }
  }

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

  async fadeOutContent(contentArea) {
    if (this.animation && typeof this.animation.fadeOut === 'function') {
      await this.animation.fadeOut(contentArea);
      return;
    }
    if (contentArea && contentArea.style) {
      contentArea.style.opacity = 0;
    }
  }

  async fadeInContent(contentArea) {
    if (this.animation && typeof this.animation.fadeIn === 'function') {
      await this.animation.fadeIn(contentArea);
      return;
    }
    if (contentArea && contentArea.style) {
      contentArea.style.opacity = 1;
    }
  }

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
