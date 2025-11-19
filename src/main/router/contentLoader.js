import { RouterRoutes } from './routes.js';

const DEFAULT_PAGE_TITLE = 'API Console';

function createErrorHtml(message) {
    return `<div class="page-section active"><p class="error-message text-red-500">${message}</p></div>`;
}

function createNotFoundHtml(pageId) {
    return `<div class="page-section active"><p>Page not found: ${pageId}</p></div>`;
}

async function fetchPageMarkup(pageId, options = {}) {
    const routesApi = RouterRoutes;
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

export const RouterContentLoader = {
fetchPageMarkup,
DEFAULT_PAGE_TITLE
};

export default RouterContentLoader;
export { fetchPageMarkup, DEFAULT_PAGE_TITLE };
