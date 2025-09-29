// Global DOM element references needed by multiple modules or for initialization
const PROFILE_AVATAR_FALLBACK_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
let pageContentAreaEl, mainContentPageOriginalEl, appBarHeadlineEl, topAppBarEl;

let routeLinkHandlerRegistered = false;

document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    pageContentAreaEl = getDynamicElement('pageContentArea');
    mainContentPageOriginalEl = getDynamicElement('mainContentPage');
    appBarHeadlineEl = getDynamicElement('appBarHeadline');
    topAppBarEl = getDynamicElement('topAppBar');

    initProfileAvatarFallback();


    // --- Initialize Modules ---
    setCopyrightYear();
    initTheme();
    initNavigationDrawer();

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
    loadPageContent(initialPageIdFromHash, false);

    window.addEventListener('popstate', (event) => {
        let pageId = '#home';
        if (event.state && event.state.page) {
            pageId = event.state.page;
        } else if (window.location.hash) {
            pageId = window.location.hash;
        }
        loadPageContent(pageId, false);
    });

    // --- App Bar Scroll Behavior ---
    if (topAppBarEl) {
        window.addEventListener('scroll', () => {
            const isScrolled = window.scrollY > 0;
            topAppBarEl.classList.toggle('scrolled', isScrolled);
        });
    }
});

function buildRouterOptions() {
    const options = {};

    if (typeof showPageLoadingOverlay === 'function') {
        options.showOverlay = () => {
            showPageLoadingOverlay();
        };
    }

    if (typeof hidePageLoadingOverlay === 'function') {
        options.hideOverlay = () => {
            hidePageLoadingOverlay();
        };
    }

    if (typeof closeDrawer === 'function') {
        options.closeDrawer = () => {
            closeDrawer();
        };
    }

    if (typeof fetchBlogPosts === 'function' || typeof fetchCommittersRanking === 'function') {
        options.onHomeLoad = () => {
            if (typeof fetchBlogPosts === 'function') {
                const newsGrid = document.getElementById('newsGrid');
                if (newsGrid) {
                    fetchBlogPosts();
                }
            }

            if (typeof fetchCommittersRanking === 'function') {
                const rankingCardPresent = document.getElementById('committers-rank')
                    || document.getElementById('committers-status')
                    || document.querySelector('.achievement-card');
                if (rankingCardPresent) {
                    fetchCommittersRanking();
                }
            }
        };
    }

    const pageHandlers = {};

    if (typeof loadSongs === 'function') {
        pageHandlers.songs = () => {
            const songsGrid = document.getElementById('songsGrid');
            if (songsGrid) {
                loadSongs();
            }
        };
    }

    if (typeof initProjectsPage === 'function') {
        pageHandlers.projects = initProjectsPage;
    }

    if (typeof initResumePage === 'function') {
        pageHandlers.resume = initResumePage;
    }

    if (typeof initContactPage === 'function') {
        pageHandlers.contact = initContactPage;
    }

    if (Object.keys(pageHandlers).length > 0) {
        options.pageHandlers = pageHandlers;
    }

    return options;
}

function setupRouteLinkInterception() {
    if (routeLinkHandlerRegistered) {
        return;
    }

    const routesApi = typeof RouterRoutes !== 'undefined' ? RouterRoutes : null;
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

        const interactiveElement = eventTarget.closest('a[href^="#"], md-list-item[href^="#"]');
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
        loadPageContent(normalizedId);
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
