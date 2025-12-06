import {
    getDynamicElement,
    updateCopyrightYear,
    showPageLoadingOverlay,
    hidePageLoadingOverlay,
    rafThrottle,
} from './utils/utils.js';
import { PROFILE_AVATAR_FALLBACK_SRC } from './utils/constants.js';
import { initThemeControls } from '@/services/themeService';
import { initNavigationDrawer } from '@/services/navigationDrawerService';
import { initRouter, loadPageContent, normalizePageId } from './router/index.js';
import RouterRoutes from './router/routes.js';
import { registerGlobalUtilities, registerCompatibilityGlobals } from './globals.js';

let pageContentAreaEl, mainContentPageOriginalEl, appBarHeadlineEl, topAppBarEl;
let navigationController = null;

let routeLinkHandlerRegistered = false;

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
        window.addEventListener('scroll', () => {
            const isScrolled = window.scrollY > 0;
            topAppBarEl.classList.toggle('scrolled', isScrolled);
        });
    }
});

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

    if (typeof globalScope.initFaqWorkspace === 'function') {
        pageHandlers['faq-api'] = globalScope.initFaqWorkspace;
    }

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
