/**
 * Change Rationale:
 * - Imports now target `core/ui` and `core/data` to mirror Android-style layers:
 *   UI utilities under `ui/utils`, shared constants under `domain`, and services under `data`.
 * - This keeps the app shell free of feature-specific code while maintaining identical runtime wiring.
 */
import {
    getDynamicElement,
    updateCopyrightYear,
    showPageLoadingOverlay,
    hidePageLoadingOverlay,
    rafThrottle,
} from './utils/domUtils.js';
import { PROFILE_AVATAR_FALLBACK_SRC } from '../domain/constants.js';
import { initThemeControls } from '@/core/data/services/themeService.js';
import { initNavigationDrawer } from '@/core/data/services/navigationDrawerService.js';
import { initRouter, loadPageContent, normalizePageId } from './router/index.js';
import RouterRoutes from './router/routes.js';
import { registerGlobalUtilities, registerCompatibilityGlobals } from './globals.js';
import { initNavigationState } from './components/navigationState.js';

let pageContentAreaEl, mainContentPageOriginalEl, appBarHeadlineEl, topAppBarEl;
let navigationController = null;

let routeLinkHandlerRegistered = false;

/**
 * Loads a page through the router, optionally updating browser history.
 *
 * @param {string} pageId Hash-based route identifier.
 * @param {boolean} [pushHistory] Whether to push a new history entry.
 * @returns {Promise<void>}
 */
async function handlePageLoad(pageId, pushHistory) {
    try {
        if (typeof pushHistory === 'undefined') {
            await loadPageContent(pageId);
        } else {
            await loadPageContent(pageId, pushHistory);
        }
    } catch (error) {
        console.error('App.js: Failed to load page content.', error);
    }
}

registerGlobalUtilities();
registerCompatibilityGlobals({
    getDynamicElement,
    initRouter,
    initTheme: initThemeControls,
    initNavigationDrawer: (...args) => {
        navigationController = initNavigationDrawer(...args);
        return navigationController;
    },
    loadPageContent,
    normalizePageId,
    RouterRoutes,
    setCopyrightYear: updateCopyrightYear,
    showPageLoadingOverlay,
    hidePageLoadingOverlay,
    closeDrawer: () => navigationController?.close(),
});

document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    pageContentAreaEl = getDynamicElement('pageContentArea');
    mainContentPageOriginalEl = getDynamicElement('mainContentPage');
    appBarHeadlineEl = getDynamicElement('appBarHeadline');
    topAppBarEl = getDynamicElement('topAppBar');

    initProfileAvatarFallback();


    // --- Initialize Modules ---
    updateCopyrightYear();
    initThemeControls();
    navigationController = initNavigationDrawer();
    // Change Rationale: Keep navigation highlight states unified across drawer and rail
    // by syncing active link styles from a single shared helper.
    initNavigationState();

    if (typeof SiteAnimations !== 'undefined' && SiteAnimations && typeof SiteAnimations.init === 'function') {
        try {
            SiteAnimations.init();
        } catch (error) {
            console.error('App.js: Failed to initialize animations.', error);
        }
    }

    let initialHomeHTMLString = "<p>Error: Home content missing.</p>";
    if (mainContentPageOriginalEl) {
        initialHomeHTMLString = mainContentPageOriginalEl.outerHTML;
    } else {
        console.error("App.js: Initial home content (#mainContentPage) not found!");
    }
    const routerOptions = buildRouterOptions();
    initRouter(pageContentAreaEl, appBarHeadlineEl, initialHomeHTMLString, routerOptions);

    // --- Setup Event Listeners for SPA Navigation ---
    setupRouteLinkInterception();


    // --- Handle Initial Page Load & Browser History ---
    const initialPageIdFromHash = window.location.hash || '#home';
    void handlePageLoad(initialPageIdFromHash, false);

    window.addEventListener('popstate', (event) => {
        let pageId = '#home';
        if (event.state && event.state.page) {
            pageId = event.state.page;
        } else if (window.location.hash) {
            pageId = window.location.hash;
        }
        void handlePageLoad(pageId, false);
    });

    decoratePanels();
    initLazyMediaObserver();
    const throttledPanelResize = rafThrottle(() => decoratePanels());
    window.addEventListener('resize', throttledPanelResize);

    // --- App Bar Scroll Behavior ---
    if (topAppBarEl) {
        // Change Rationale: BeerCSS expects the app bar to use the `fill` surface class
        // with an elevated state on scroll; toggling the framework class keeps the
        // header aligned with stock behavior without custom styling.
        applyAppBarScrollState(topAppBarEl);
        window.addEventListener('scroll', () => applyAppBarScrollState(topAppBarEl));
    }
});

/**
 * Applies the app bar surface classes based on the current scroll position.
 *
 * @param {HTMLElement} appBarEl - The top app bar element.
 * @returns {void}
 */
function applyAppBarScrollState(appBarEl) {
    const isScrolled = window.scrollY > 0;
    appBarEl.classList.add('fill');
    appBarEl.classList.toggle('elevate', isScrolled);
}

/**
 * Builds the router options payload, wiring global page handlers when present.
 *
 * @returns {{ showOverlay: Function, hideOverlay: Function, closeDrawer: Function, onHomeLoad?: Function, pageHandlers?: Record<string, Function> }}
 *   Router configuration including optional page handlers.
 */
function buildRouterOptions() {
  const options = {
    showOverlay: () => showPageLoadingOverlay(),
    hideOverlay: () => hidePageLoadingOverlay(),
    closeDrawer: () => navigationController?.close(),
  };

  const pageHandlers = {};
  const globalScope = typeof window !== 'undefined' ? window : globalThis;

  if (typeof globalScope.initHomePage === 'function') {
    options.onHomeLoad = globalScope.initHomePage;
  }

    if (typeof globalScope.initAppToolkitWorkspace === 'function') {
        pageHandlers['app-toolkit-api'] = globalScope.initAppToolkitWorkspace;
    }

    // Change Rationale: FAQ workspace initialization now registers through the feature route module,
    // so the app shell no longer needs a workspace-specific fallback hook.

    if (typeof globalScope.initEnglishWorkspace === 'function') {
        pageHandlers['english-with-lidia-api'] = globalScope.initEnglishWorkspace;
    }

    if (typeof globalScope.initAndroidTutorialsWorkspace === 'function') {
        pageHandlers['android-studio-tutorials-api'] = globalScope.initAndroidTutorialsWorkspace;
    }

    if (typeof globalScope.initPagerControls === 'function') {
        pageHandlers['english-with-lidia-api'] = chainHandlers(
            pageHandlers['english-with-lidia-api'],
            () => globalScope.initPagerControls('englishPager'),
        );
        pageHandlers['android-studio-tutorials-api'] = chainHandlers(
            pageHandlers['android-studio-tutorials-api'],
            () => globalScope.initPagerControls('androidPager'),
        );
    }

    if (Object.keys(pageHandlers).length > 0) {
        options.pageHandlers = pageHandlers;
    }

    return options;
}

/**
 * Chains two route handler callbacks, ensuring both run sequentially.
 *
 * @param {Function | null | undefined} existingHandler First handler to invoke.
 * @param {Function} nextHandler Handler to execute after the first.
 * @returns {Function} Combined handler.
 */
function chainHandlers(existingHandler, nextHandler) {
    if (typeof existingHandler !== 'function') {
        return nextHandler;
    }
    return () => {
        try {
            existingHandler();
        } finally {
            nextHandler();
        }
    };
}

/**
 * Intercepts anchor clicks that target registered routes and delegates to the SPA router.
 *
 * @returns {void}
 */
function setupRouteLinkInterception() {
    if (routeLinkHandlerRegistered) {
        return;
    }

    const routesApi = RouterRoutes;
    const hasRoute = routesApi
        ? (typeof routesApi.hasRoute === 'function'
            ? routesApi.hasRoute.bind(routesApi)
            : (routeId) => {
                if (typeof routesApi.getRoute === 'function') {
                    return !!routesApi.getRoute(routeId);
                }
                const routeMap = routesApi.PAGE_ROUTES;
                return !!(routeMap && routeMap[routeId]);
            })
        : null;

    if (!hasRoute) {
        console.warn('App.js: RouterRoutes API unavailable. Route link interception skipped.');
        return;
    }

    document.addEventListener('click', (event) => {
        const eventTarget = event.target;
        if (!eventTarget || typeof eventTarget.closest !== 'function') {
            return;
        }

        const interactiveElement = eventTarget.closest('[href^="#"]');
        if (!interactiveElement) {
            return;
        }

        if (interactiveElement.getAttribute('target') === '_blank') {
            return;
        }

        const rawHref = interactiveElement.getAttribute('href');
        if (!rawHref) {
            return;
        }

        const normalizedId = normalizePageId(rawHref);
        if (!normalizedId || !hasRoute(normalizedId)) {
            return;
        }

        event.preventDefault();
        void handlePageLoad(normalizedId);
    }, true);

    routeLinkHandlerRegistered = true;
}

/**
 * Ensures the profile avatar displays a fallback image when the primary source fails.
 *
 * @returns {void}
 */
function initProfileAvatarFallback() {
    const profileAvatar = document.querySelector('.profile-avatar');
    if (!profileAvatar) {
        return;
    }

    const applyFallback = () => {
        profileAvatar.classList.add('profile-avatar-fallback');
        if (profileAvatar.src !== PROFILE_AVATAR_FALLBACK_SRC) {
            profileAvatar.src = PROFILE_AVATAR_FALLBACK_SRC;
        }
    };

    profileAvatar.addEventListener('error', applyFallback, { once: true });

    if (profileAvatar.complete && profileAvatar.naturalWidth === 0) {
        applyFallback();
    }
}

/**
 * Applies active styling to layered panels based on their scroll position in the viewport.
 *
 * @returns {void}
 */
function decoratePanels() {
    if (typeof document === 'undefined') {
        return;
    }
    const isCompact = window.innerWidth < 960;
    document.querySelectorAll('.app-shell-panel').forEach((panel) => {
        if (!panel) {
            return;
        }
        panel.dataset.compact = String(isCompact);
    });
}

/**
 * Initializes a lazy-loading observer for elements tagged with `[data-lazy-src]`.
 *
 * @returns {void}
 */
function initLazyMediaObserver() {
    if (typeof document === 'undefined') {
        return;
    }
    const lazyImages = Array.from(document.querySelectorAll('img[loading="lazy"]'));
    if (!lazyImages.length) {
        return;
    }

    if (typeof IntersectionObserver === 'undefined') {
        lazyImages.forEach((img) => {
            img.dataset.observed = 'true';
            if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }
        });
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const target = entry.target;
                if (!entry.isIntersecting || !target) {
                    return;
                }
                target.dataset.observed = 'true';
                if (target.dataset.src && !target.src) {
                    target.src = target.dataset.src;
                }
                observer.unobserve(target);
            });
        },
        {
            rootMargin: '200px 0px 200px 0px',
            threshold: 0.15,
        },
    );

    lazyImages.forEach((img) => observer.observe(img));
}
