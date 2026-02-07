/**
 * Change Rationale: Routes now consume assets and feature initializers from the relocated
 * config and domain layers to keep the router inside `core/ui` while preserving the
 * existing route table and metadata.
 */
import { resolveAssetUrl } from '../../data/config/appConfig.js';
// Change Rationale: GitHub tooling now lives under the `app/githubtools/common` domain path,
// so router imports must use the canonical location to avoid Vite resolution errors.
import { initFavoritesPage } from '@/app/githubtools/common/domain/githubTools.js';

// Change Rationale: Feature screens resolve from `/screens/*`, which mirrors `src/app/*`
// in both dev middleware and production compatibility copies. Keeping this path stable
// preserves existing router ownership while ensuring screen fetches resolve correctly.
function screenPath(filename) {
    return resolveAssetUrl(`screens/${filename}`);
}

const DEFAULT_ROUTE_TITLE = 'API Console';
const DEFAULT_METADATA_DESCRIPTION = 'Explore Mihai-Cristian Condrea\'s Android developer portfolio featuring Jetpack Compose apps, Material Design systems, and open-source tools.';
const DEFAULT_METADATA_KEYWORDS = [
    'Mihai Cristian Condrea',
    'Android developer portfolio',
    'Jetpack Compose',
    'Kotlin apps',
    'Material Design UI'
];
const DEFAULT_SOCIAL_IMAGE = 'https://mihaicristiancondrea.github.io/profile/assets/images/profile/cv_profile_pic.png';
const DEFAULT_SOCIAL_IMAGE_ALT = 'Portrait of Android developer Mihai-Cristian Condrea';
const DEFAULT_OPEN_GRAPH_TYPE = 'website';
const DEFAULT_TWITTER_CARD = 'summary_large_image';
const DEFAULT_TWITTER_HANDLE = '@MihaiCrstian';
const PAGE_ROUTES = Object.create(null);

function normalizeRouteId(routeId) {
    if (typeof routeId !== 'string') {
        return '';
    }
    const trimmed = routeId.trim();
    if (!trimmed) {
        return '';
    }
    return trimmed.startsWith('#') ? trimmed.substring(1) : trimmed;
}

function sanitizeKeywords(value) {
    if (Array.isArray(value)) {
        return value
            .map(keyword => (typeof keyword === 'string' ? keyword.trim() : ''))
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map(keyword => keyword.trim())
            .filter(Boolean);
    }

    return [];
}

function sanitizeCanonicalSlug(value, routeId) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || trimmed === '/' || trimmed === '#') {
            return routeId === 'home' ? '' : routeId;
        }

        if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
        }

        const normalized = trimmed.replace(/^[/#]+/, '').replace(/[/#]+$/, '');
        return normalized || (routeId === 'home' ? '' : routeId);
    }

    return routeId === 'home' ? '' : routeId;
}

function sanitizeOpenGraph(openGraphConfig, route, description) {
    const config = openGraphConfig && typeof openGraphConfig === 'object' ? openGraphConfig : {};

    const title = typeof config.title === 'string' && config.title.trim()
        ? config.title.trim()
        : (route.title || DEFAULT_ROUTE_TITLE);

    const ogDescription = typeof config.description === 'string' && config.description.trim()
        ? config.description.trim()
        : description;

    const type = typeof config.type === 'string' && config.type.trim()
        ? config.type.trim()
        : DEFAULT_OPEN_GRAPH_TYPE;

    const image = typeof config.image === 'string' && config.image.trim()
        ? config.image.trim()
        : DEFAULT_SOCIAL_IMAGE;

    const imageAlt = typeof config.imageAlt === 'string' && config.imageAlt.trim()
        ? config.imageAlt.trim()
        : DEFAULT_SOCIAL_IMAGE_ALT;

    const siteName = typeof config.siteName === 'string' && config.siteName.trim()
        ? config.siteName.trim()
        : DEFAULT_ROUTE_TITLE;

    return {
        title,
        description: ogDescription,
        type,
        image,
        imageAlt,
        siteName
    };
}

function sanitizeTwitter(twitterConfig, openGraph, description) {
    const config = twitterConfig && typeof twitterConfig === 'object' ? twitterConfig : {};

    const card = typeof config.card === 'string' && config.card.trim()
        ? config.card.trim()
        : DEFAULT_TWITTER_CARD;

    const title = typeof config.title === 'string' && config.title.trim()
        ? config.title.trim()
        : openGraph.title;

    const twitterDescription = typeof config.description === 'string' && config.description.trim()
        ? config.description.trim()
        : description;

    const image = typeof config.image === 'string' && config.image.trim()
        ? config.image.trim()
        : openGraph.image;

    const site = typeof config.site === 'string' && config.site.trim()
        ? config.site.trim()
        : DEFAULT_TWITTER_HANDLE;

    const creator = typeof config.creator === 'string' && config.creator.trim()
        ? config.creator.trim()
        : DEFAULT_TWITTER_HANDLE;

    return {
        card,
        title,
        description: twitterDescription,
        image,
        site,
        creator
    };
}

function sanitizeMetadata(metadataConfig, route) {
    const config = metadataConfig && typeof metadataConfig === 'object' ? metadataConfig : {};

    const description = typeof config.description === 'string' && config.description.trim()
        ? config.description.trim()
        : DEFAULT_METADATA_DESCRIPTION;

    const keywords = sanitizeKeywords(config.keywords);
    const canonicalSlug = sanitizeCanonicalSlug(config.canonicalSlug, route.id);
    const openGraph = sanitizeOpenGraph(config.openGraph, route, description);
    const twitter = sanitizeTwitter(config.twitter, openGraph, description);

    return {
        description,
        keywords: keywords.length ? keywords : [...DEFAULT_METADATA_KEYWORDS],
        canonicalSlug,
        openGraph,
        twitter
    };
}

function cloneMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return null;
    }

    return {
        description: metadata.description,
        keywords: Array.isArray(metadata.keywords) ? [...metadata.keywords] : [],
        canonicalSlug: metadata.canonicalSlug,
        openGraph: metadata.openGraph && typeof metadata.openGraph === 'object'
            ? { ...metadata.openGraph }
            : null,
        twitter: metadata.twitter && typeof metadata.twitter === 'object'
            ? { ...metadata.twitter }
            : null
    };
}

function cloneRoute(route) {
    if (!route || typeof route !== 'object') {
        return null;
    }

    return {
        ...route,
        metadata: cloneMetadata(route.metadata)
    };
}

function sanitizeRouteConfig(config) {
    if (!config || typeof config !== 'object') {
        throw new TypeError('RouterRoutes: Route configuration must be an object.');
    }

    const normalizedId = normalizeRouteId(config.id);
    if (!normalizedId) {
        throw new Error('RouterRoutes: Route configuration requires a non-empty "id".');
    }

    // Change Rationale: Support inline HTML so feature Route modules can register composed
    // Screen + View markup without forcing a network fetch.
    const sanitized = {
        id: normalizedId,
        path: typeof config.path === 'string' && config.path.trim() ? config.path.trim() : null,
        inlineHtml: typeof config.inlineHtml === 'string' && config.inlineHtml.trim()
            ? config.inlineHtml
            : null,
        title: typeof config.title === 'string' && config.title.trim() ? config.title.trim() : DEFAULT_ROUTE_TITLE,
        onLoad: typeof config.onLoad === 'function' ? config.onLoad : null
    };

    sanitized.metadata = sanitizeMetadata(config.metadata, sanitized);

    return sanitized;
}

/**
 * Registers a route while keeping inline HTML registrations deterministic.
 *
 * @param {object} config - Route configuration to register.
 * @returns {object|null} The stored route clone.
 */
function registerRoute(config) {
    const sanitized = sanitizeRouteConfig(config);
    const existingRoute = PAGE_ROUTES[sanitized.id];
    const isStrictMode = typeof process !== 'undefined'
        && process.env
        && ['development', 'test'].includes(process.env.NODE_ENV);

    // Change Rationale: Inline HTML is the canonical registration for feature routes, so
    // always retain inline markup when present and avoid overwriting with path-only entries.
    // This guarantees deterministic registration regardless of import order.
    if (existingRoute) {
        // Change Rationale: Detect divergent registrations so accidental overwrites are
        // surfaced during development or test runs without disrupting production routing.
        const hasInlineMismatch = existingRoute.inlineHtml
            && sanitized.inlineHtml
            && existingRoute.inlineHtml !== sanitized.inlineHtml;
        const hasConfigMismatch = existingRoute.path !== sanitized.path
            || existingRoute.title !== sanitized.title
            || existingRoute.onLoad !== sanitized.onLoad;
        if (hasInlineMismatch || hasConfigMismatch) {
            const warning = `RouterRoutes: Route "${sanitized.id}" registration diverged from existing configuration.`;
            if (isStrictMode && hasInlineMismatch) {
                throw new Error(warning);
            }
            console.warn(warning);
        }
        if (existingRoute.inlineHtml && !sanitized.inlineHtml) {
            return cloneRoute(existingRoute);
        }

        if (!existingRoute.inlineHtml && sanitized.inlineHtml) {
            PAGE_ROUTES[sanitized.id] = sanitized;
            return cloneRoute(sanitized);
        }

        return cloneRoute(existingRoute);
    }

    PAGE_ROUTES[sanitized.id] = sanitized;
    return cloneRoute(sanitized);
}

function getRoute(routeId) {
    const normalizedId = normalizeRouteId(routeId);
    if (!normalizedId) {
        return null;
    }
    const storedRoute = PAGE_ROUTES[normalizedId];
    return cloneRoute(storedRoute);
}

function hasRoute(routeId) {
    return !!getRoute(routeId);
}

function getRoutes() {
    return Object.values(PAGE_ROUTES).map(route => cloneRoute(route));
}

const defaultRoutes = [
    {
        id: 'home',
        // Change Rationale: Home is now loaded as a screen fragment so the app shell can
        // remain the sole Vite entrypoint and router content is fetched from /screens.
        path: screenPath('home/ui/HomeScreen.html'),
        title: 'API Console',
        metadata: {
            description: 'Design and manage the JSON APIs that power App Toolkit, FAQ, English with Lidia, and Android Studio Tutorials using a visual builder.',
            keywords: [
                'API Console',
                'Android API builder',
                'App Toolkit JSON',
                'FAQ API',
                'English with Lidia API',
                'Android Studio Tutorials API'
            ],
            canonicalSlug: '/',
            openGraph: {
                title: 'API Console',
                description: 'Visual tooling for crafting the JSON APIs behind D4rK\'s Android applications.',
                type: 'website'
            },
            twitter: {
                title: 'API Console',
                description: 'Visual tooling for crafting the JSON APIs behind D4rK\'s Android applications.'
            }
        }
    },
    {
        id: 'app-toolkit-api',
        // Change Rationale: Workspaces now load their screens from feature UI folders
        // instead of res/layout to enforce the Screen + Views migration.
        path: screenPath('workspaces/app-toolkit/ui/AppToolkitScreen.html'),
        title: 'API Workspace',
        metadata: {
            description: 'Curate App Toolkit catalog entries with visual tools for managing app metadata, screenshots, and package information.',
            keywords: [
                'App Toolkit API builder',
                'Android catalog JSON',
                'app screenshots metadata'
            ],
            canonicalSlug: 'app-toolkit-api',
            openGraph: {
                title: 'API Workspace',
                description: 'Curate App Toolkit catalog entries with visual tools for managing app metadata, screenshots, and package information.',
                type: 'website'
            },
            twitter: {
                title: 'API Workspace',
                description: 'Curate App Toolkit catalog entries with visual tools for managing app metadata, screenshots, and package information.'
            }
        }
    },
    // Change Rationale: FAQ workspace routes now register through the feature Route module so
    // they can serve Screen + Views markup without relying on res/layout fallbacks.
    {
        id: 'english-with-lidia-api',
        path: screenPath('workspaces/english-with-lidia/ui/EnglishWithLidiaScreen.html'),
        title: 'English with Lidia API',
        metadata: {
            description: 'Build lesson feeds and multimedia content blocks for the English with Lidia Android app.',
            keywords: [
                'English with Lidia API',
                'lesson JSON builder',
                'multimedia lesson editor'
            ],
            canonicalSlug: 'english-with-lidia-api',
            openGraph: {
                title: 'English with Lidia API workspace',
                description: 'Build lesson feeds and multimedia content blocks for the English with Lidia Android app.',
                type: 'website'
            },
            twitter: {
                title: 'English with Lidia API workspace',
                description: 'Build lesson feeds and multimedia content blocks for the English with Lidia Android app.'
            }
        }
    },
    {
        id: 'android-studio-tutorials-api',
        path: screenPath('workspaces/android-studio-tutorials/ui/AndroidStudioTutorialsScreen.html'),
        title: 'Android Studio Tutorials API',
        metadata: {
            description: 'Design home feed cards and Compose-ready lesson content for Android Studio Tutorials.',
            keywords: [
                'Android Studio Tutorials API',
                'Compose lesson JSON',
                'Android tutorial builder'
            ],
            canonicalSlug: 'android-studio-tutorials-api',
            openGraph: {
                title: 'Android Studio Tutorials API workspace',
                description: 'Design home feed cards and Compose-ready lesson content for Android Studio Tutorials.',
                type: 'website'
            },
            twitter: {
                title: 'Android Studio Tutorials API workspace',
                description: 'Design home feed cards and Compose-ready lesson content for Android Studio Tutorials.'
            }
        }
    },
    {
        id: 'favorites',
        path: screenPath('githubtools/favorites/ui/GitHubFavoritesScreen.html'),
        title: 'Favorites',
        onLoad: initFavoritesPage,
        metadata: {
            description: 'Quick access to repositories saved from Repo Mapper and Release Stats.',
            keywords: ['favorites', 'GitHub tools'],
            canonicalSlug: 'favorites',
            openGraph: {
                title: 'Favorites',
                description: 'Quick access to repositories saved from Repo Mapper and Release Stats.',
                type: 'website'
            },
            twitter: {
                title: 'Favorites',
                description: 'Quick access to repositories saved from Repo Mapper and Release Stats.'
            }
        }
    },
    // GitHub tool routes are now registered by their feature Route modules so they can
    // compose Screen + View markup at registration time.
];

defaultRoutes.forEach(registerRoute);

export const RouterRoutes = {
    registerRoute,
    getRoute,
    hasRoute,
    getRoutes,
    normalizeRouteId,
    PAGE_ROUTES
};

export default RouterRoutes;

export { registerRoute, getRoute, hasRoute, getRoutes, normalizeRouteId, PAGE_ROUTES };
