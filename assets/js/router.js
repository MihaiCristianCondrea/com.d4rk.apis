let pageContentArea, appBarHeadline;
let initialHomepageHTML = '';
const MINIMUM_LOAD_DURATION = 600;

const NOOP = () => {};

const routerRuntime = {
    showOverlay: NOOP,
    hideOverlay: NOOP,
    closeDrawer: NOOP,
    onHomeLoad: null,
    pageHandlers: Object.create(null)
};

function updateMetadataForPage(routeConfig, pageTitle, normalizedPageId, loadStatus) {
    if (typeof SiteMetadata === 'undefined' || !SiteMetadata || typeof SiteMetadata.updateForRoute !== 'function') {
        return;
    }

    try {
        SiteMetadata.updateForRoute(routeConfig, {
            pageId: normalizedPageId,
            pageTitle,
            loadStatus
        });
    } catch (error) {
        console.error('Router: Failed to update metadata:', error);
    }
}

function callCallback(callback, description, ...args) {
    if (typeof callback !== 'function') {
        return false;
    }
    try {
        callback(...args);
        return true;
    } catch (error) {
        console.error(`Router: Error running ${description}:`, error);
        return true;
    }
}

/**
 * Initializes the router with necessary DOM elements.
 * Must be called after DOM is ready.
 * @param {HTMLElement} contentAreaEl - The main content area element.
 * @param {HTMLElement} appBarHeadlineEl - The app bar headline element.
 * @param {string} homeHTML - The initial HTML string for the home page.
 * @param {object} [options={}] - Router configuration callbacks.
 * @param {Function} [options.showOverlay] - Callback to show the loading overlay.
 * @param {Function} [options.hideOverlay] - Callback to hide the loading overlay.
 * @param {Function} [options.closeDrawer] - Callback to close the navigation drawer.
 * @param {Function} [options.onHomeLoad] - Callback to run after the home page loads.
 * @param {Record<string, Function>} [options.pageHandlers] - Callbacks keyed by page ID.
 */
function initRouter(contentAreaEl, appBarHeadlineEl, homeHTML, options = {}) {
    pageContentArea = contentAreaEl;
    appBarHeadline = appBarHeadlineEl;
    initialHomepageHTML = homeHTML;

    const normalizedOptions = options && typeof options === 'object' ? options : {};

    routerRuntime.showOverlay = typeof normalizedOptions.showOverlay === 'function'
        ? normalizedOptions.showOverlay
        : NOOP;
    routerRuntime.hideOverlay = typeof normalizedOptions.hideOverlay === 'function'
        ? normalizedOptions.hideOverlay
        : NOOP;
    routerRuntime.closeDrawer = typeof normalizedOptions.closeDrawer === 'function'
        ? normalizedOptions.closeDrawer
        : NOOP;
    routerRuntime.onHomeLoad = typeof normalizedOptions.onHomeLoad === 'function'
        ? normalizedOptions.onHomeLoad
        : null;

    routerRuntime.pageHandlers = Object.create(null);
    if (normalizedOptions.pageHandlers && typeof normalizedOptions.pageHandlers === 'object') {
        Object.entries(normalizedOptions.pageHandlers).forEach(([pageId, handler]) => {
            if (typeof handler !== 'function') {
                return;
            }
            const normalizedId = typeof pageId === 'string' ? normalizePageId(pageId) : '';
            if (!normalizedId) {
                return;
            }
            routerRuntime.pageHandlers[normalizedId] = handler;
        });
    }
}

function normalizePageId(pageId) {
    if (typeof pageId !== 'string') {
        return 'home';
    }
    let normalizedId = pageId;
    if (normalizedId.startsWith('#')) {
        normalizedId = normalizedId.substring(1);
    }
    if (normalizedId === '' || normalizedId === 'index.html') {
        normalizedId = 'home';
    }
    return normalizedId;
}

function createGenericErrorHtml(message) {
    const finalMessage = message || 'Failed to load page. An unknown error occurred.';
    return `<div class="page-section active"><p class="error-message text-red-500">${finalMessage}</p></div>`;
}

function getRegisteredRoute(pageId) {
    if (typeof RouterRoutes === 'undefined' || !RouterRoutes) {
        return null;
    }
    if (typeof RouterRoutes.getRoute === 'function') {
        return RouterRoutes.getRoute(pageId);
    }
    const routesMap = RouterRoutes.PAGE_ROUTES;
    if (routesMap && typeof routesMap === 'object' && pageId in routesMap) {
        return routesMap[pageId];
    }
    return null;
}

function createNotFoundHtml(pageId) {
    const safeId = pageId || 'unknown';
    return `<div class="page-section active"><p class="error-message text-red-500">Page not found: ${safeId}</p></div>`;
}

function runInjectedPageHandlers(pageId) {
    let handled = false;

    if (pageId === 'home' && typeof routerRuntime.onHomeLoad === 'function') {
        handled = callCallback(routerRuntime.onHomeLoad, 'home page load callback', pageId) || handled;
    }

    const handler = routerRuntime.pageHandlers[pageId];
    if (typeof handler === 'function') {
        handled = callCallback(handler, `page handler for ${pageId}`, pageId) || handled;
    }

    return handled;
}

/**
 * Loads content for a given pageId into the main content area.
 * @param {string} pageId - The ID of the page to load (e.g., 'home', 'privacy-policy').
 * @param {boolean} [updateHistory=true] - Whether to update browser history.
 */
async function loadPageContent(pageId, updateHistory = true) {
    const loadStart = Date.now();
    callCallback(routerRuntime.showOverlay, 'showOverlay callback');
    callCallback(routerRuntime.closeDrawer, 'closeDrawer callback');

    if (!pageContentArea) {
        console.error("Router: pageContentArea element not set. Call initRouter first.");
        callCallback(routerRuntime.hideOverlay, 'hideOverlay callback');
        return;
    }

    const normalizedPageId = normalizePageId(pageId);
    const newUrlFragment = normalizedPageId;

    const animationHelper = typeof RouterAnimation !== 'undefined' ? RouterAnimation : null;
    const contentLoader = typeof RouterContentLoader !== 'undefined' ? RouterContentLoader : null;
    const historyHelper = typeof RouterHistory !== 'undefined' ? RouterHistory : null;

    const routeConfig = getRegisteredRoute(normalizedPageId);

    let minHeightApplied = false;
    const releaseMinHeight = () => {
        if (!minHeightApplied || !pageContentArea || !pageContentArea.style) {
            return;
        }
        pageContentArea.style.minHeight = '';
        minHeightApplied = false;
    };

    let pageAnimationPromise = Promise.resolve();

    try {
        if (typeof RouterRoutes !== 'undefined' && RouterRoutes && !routeConfig) {
            console.warn('Router: Unknown page:', normalizedPageId);
            pageContentArea.innerHTML = createNotFoundHtml(normalizedPageId);

            const notFoundTitle = 'Not Found';
            updateMetadataForPage(null, notFoundTitle, normalizedPageId, 'not-found');
            if (historyHelper && typeof historyHelper.updateTitle === 'function') {
                historyHelper.updateTitle(appBarHeadline, notFoundTitle);
            } else {
                if (appBarHeadline) appBarHeadline.textContent = notFoundTitle;
                document.title = `${notFoundTitle} - Mihai's Profile`;
            }

            return;
        }

        if (animationHelper && typeof animationHelper.fadeOut === 'function') {
            await animationHelper.fadeOut(pageContentArea);
        } else if (pageContentArea.style) {
            pageContentArea.style.opacity = 0;
        }

        if (typeof pageContentArea.getBoundingClientRect === 'function' && pageContentArea.style) {
            const rect = pageContentArea.getBoundingClientRect();
            if (rect && Number.isFinite(rect.height) && rect.height > 0) {
                pageContentArea.style.minHeight = `${Math.round(rect.height)}px`;
                minHeightApplied = true;
            }
        }

        let loadResult;
        if (contentLoader && typeof contentLoader.fetchPageMarkup === 'function') {
            try {
                loadResult = await contentLoader.fetchPageMarkup(normalizedPageId, {
                    initialHomeHTML: initialHomepageHTML
                });
            } catch (error) {
                loadResult = {
                    status: 'error',
                    title: 'Error',
                    html: createGenericErrorHtml(`Failed to load page. ${error.message}`),
                    error
                };
            }
        } else {
            loadResult = {
                status: 'error',
                title: 'Error',
                html: createGenericErrorHtml('Failed to load page. Router content loader is unavailable.')
            };
        }

        if (loadResult.status === 'not-found') {
            console.warn('Router: Unknown page:', normalizedPageId);
        }

        if (loadResult.status === 'error' && loadResult.error) {
            const contextTitle = loadResult.sourceTitle || loadResult.title || normalizedPageId;
            console.error(`Error loading ${contextTitle}:`, loadResult.error);
        }

        pageContentArea.innerHTML = typeof loadResult.html === 'string' ? loadResult.html : createGenericErrorHtml();

        const handledByInjectedHandlers = runInjectedPageHandlers(normalizedPageId);
        if (!handledByInjectedHandlers && typeof loadResult.onReady === 'function') {
            callCallback(loadResult.onReady, 'page ready hook', normalizedPageId);
        }

        if (typeof SiteAnimations !== 'undefined' && SiteAnimations && typeof SiteAnimations.animatePage === 'function') {
            try {
                pageAnimationPromise = Promise.resolve(SiteAnimations.animatePage(pageContentArea, normalizedPageId));
            } catch (error) {
                console.error('Router: Failed to run page animations:', error);
                pageAnimationPromise = Promise.resolve();
            }
        }
        pageAnimationPromise.catch((error) => {
            if (error) {
                console.error('Router: Page animation failed:', error);
            }
        });

        const pageTitle = loadResult.title || (routeConfig && routeConfig.title) || (contentLoader && contentLoader.DEFAULT_PAGE_TITLE) || "Mihai's Profile";

        updateMetadataForPage(routeConfig, pageTitle, normalizedPageId, loadResult.status);

        if (historyHelper && typeof historyHelper.updateTitle === 'function') {
            historyHelper.updateTitle(appBarHeadline, pageTitle);
        } else {
            if (appBarHeadline) appBarHeadline.textContent = pageTitle;
            document.title = `${pageTitle} - Mihai's Profile`;
        }

        if (historyHelper && typeof historyHelper.pushState === 'function') {
            historyHelper.pushState(normalizedPageId, pageTitle, newUrlFragment, updateHistory);
        } else if (updateHistory && window.history && typeof window.history.pushState === 'function') {
            window.history.pushState({ page: normalizedPageId }, pageTitle, `#${newUrlFragment}`);
        }

        window.scrollTo(0, 0);
        updateActiveNavLink(newUrlFragment);

        let fadeInResult = null;
        if (animationHelper && typeof animationHelper.fadeIn === 'function') {
            fadeInResult = animationHelper.fadeIn(pageContentArea);
        } else if (pageContentArea.style) {
            pageContentArea.style.opacity = 1;
        }
        await Promise.resolve(fadeInResult);
        releaseMinHeight();

        const elapsed = Date.now() - loadStart;
        await new Promise(r => setTimeout(r, Math.max(0, MINIMUM_LOAD_DURATION - elapsed)));
    } finally {
        releaseMinHeight();
        callCallback(routerRuntime.hideOverlay, 'hideOverlay callback');
    }
}

/**
 * Updates the active state of navigation links in the drawer.
 * @param {string} currentPageId - The ID of the currently active page.
 */
function updateActiveNavLink(currentPageId) {
    const normalizedCurrentPage = normalizePageId(currentPageId);

    document.querySelectorAll('#navDrawer md-list-item[href]').forEach(item => {
        item.classList.remove('nav-item-active');
        if (item.hasAttribute('active')) {
            item.removeAttribute('active');
        }
        if (typeof item.active === 'boolean' && item.active) {
            item.active = false;
        }
        item.removeAttribute('aria-current');
        item.removeAttribute('aria-selected');

        let itemHref = item.getAttribute('href');
        if (itemHref) {
            const normalizedHref = normalizePageId(itemHref);
            if (normalizedHref === normalizedCurrentPage) {
                item.classList.add('nav-item-active');
                item.setAttribute('aria-current', 'page');
                item.setAttribute('aria-selected', 'true');
                if (typeof item.active === 'boolean') item.active = true;

                const nestedParent = item.closest('.nested-list');
                if (nestedParent && nestedParent.id) {
                    const toggleButton = document.querySelector(`[aria-controls="${nestedParent.id}"]`);
                    if (toggleButton && !toggleButton.classList.contains('expanded')) {
                        toggleButton.click();
                    }
                }
            }
        }
    });
}
