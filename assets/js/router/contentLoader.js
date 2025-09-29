(function (global) {
    const DEFAULT_PAGE_TITLE = "Mihai's Profile";

    function createErrorHtml(message) {
        return `<div class="page-section active"><p class="error-message text-red-500">${message}</p></div>`;
    }

    function createNotFoundHtml(pageId) {
        return `<div class="page-section active"><p>Page not found: ${pageId}</p></div>`;
    }

    async function fetchPageMarkup(pageId, options = {}) {
        const routesApi = global.RouterRoutes;
        const getRoute = routesApi && typeof routesApi.getRoute === 'function'
            ? routesApi.getRoute.bind(routesApi)
            : null;

        const routeConfig = getRoute ? getRoute(pageId) : null;

        if (!routeConfig) {
            return {
                status: 'not-found',
                title: 'Not Found',
                html: createNotFoundHtml(pageId)
            };
        }

        const pageTitle = routeConfig.title || DEFAULT_PAGE_TITLE;
        const onReadyHook = routeConfig.onLoad || null;

        if (!routeConfig.path) {
            if (routeConfig.id !== 'home') {
                console.warn(`RouterContentLoader: Route "${routeConfig.id}" does not define a path. Using empty content placeholder.`);
            }

            return {
                status: 'success',
                title: pageTitle,
                html: routeConfig.id === 'home' ? (options.initialHomeHTML || '') : '',
                onReady: onReadyHook,
                sourceTitle: pageTitle
            };
        }

        try {
            const response = await fetch(routeConfig.path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${routeConfig.path}`);
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

    global.RouterContentLoader = {
        fetchPageMarkup,
        DEFAULT_PAGE_TITLE
    };
})(typeof window !== 'undefined' ? window : globalThis);
