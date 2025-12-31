/**
 * Change Rationale: Routes now consume assets and feature initializers from the relocated
 * config and domain layers to keep the router inside `core/ui` while preserving the
 * existing route table and metadata.
 */
import { resolveAssetUrl } from '../../data/config/appConfig.js';
import { initFavoritesPage, initGitPatch, initReleaseStats, initRepoMapper } from '@/app/github-tools/domain/githubTools.js';

function layoutPath(filename) {
    return resolveAssetUrl(`layout/${filename}`);
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

    const sanitized = {
        id: normalizedId,
        path: typeof config.path === 'string' && config.path.trim() ? config.path.trim() : null,
        title: typeof config.title === 'string' && config.title.trim() ? config.title.trim() : DEFAULT_ROUTE_TITLE,
        onLoad: typeof config.onLoad === 'function' ? config.onLoad : null
    };

    sanitized.metadata = sanitizeMetadata(config.metadata, sanitized);

    return sanitized;
}

function registerRoute(config) {
    const sanitized = sanitizeRouteConfig(config);
    const isUpdate = Object.prototype.hasOwnProperty.call(PAGE_ROUTES, sanitized.id);
    PAGE_ROUTES[sanitized.id] = sanitized;
    if (isUpdate) {
        console.warn(`RouterRoutes: Route "${sanitized.id}" was overwritten.`);
    }
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
        path: layoutPath('workspaces/app-toolkit/app-toolkit.html'),
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
    {
        id: 'faq-api',
        path: layoutPath('workspaces/faq/faq.html'),
        title: 'FAQ API',
        metadata: {
            description: 'Publish structured FAQ answers with featured snippets and Material icon suggestions for web and Android surfaces.',
            keywords: [
                'FAQ API builder',
                'Material Symbols autocomplete',
                'support answers JSON'
            ],
            canonicalSlug: 'faq-api',
            openGraph: {
                title: 'FAQ API workspace',
                description: 'Publish structured FAQ answers with featured snippets and Material icon suggestions for web and Android surfaces.',
                type: 'website'
            },
            twitter: {
                title: 'FAQ API workspace',
                description: 'Publish structured FAQ answers with featured snippets and Material icon suggestions for web and Android surfaces.'
            }
        }
    },
    {
        id: 'english-with-lidia-api',
        path: layoutPath('workspaces/english-with-lidia/english-with-lidia.html'),
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
        path: layoutPath('workspaces/android-studio-tutorials/android-studio-tutorials.html'),
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
        id: 'github-favorites',
        path: layoutPath('github-tools/github-favorites.html'),
        title: 'Favorites',
        onLoad: initFavoritesPage,
        metadata: {
            description: 'Quick access to repositories saved from Repo Mapper and Release Stats.',
            keywords: ['favorites', 'GitHub tools'],
            canonicalSlug: 'github-favorites',
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
    {
        id: 'repo-mapper',
        path: layoutPath('github-tools/repo-mapper.html'),
        title: 'Repo Mapper',
        onLoad: initRepoMapper,
        metadata: {
            description: 'Generate ASCII directory trees from any public repository. Perfect for documentation and LLM context.',
            keywords: ['Repo Mapper', 'GitHub', 'ASCII', 'directory tree'],
            canonicalSlug: 'repo-mapper',
            openGraph: {
                title: 'Repo Mapper',
                description: 'Generate ASCII directory trees from any public repository. Perfect for documentation and LLM context.',
                type: 'website'
            },
            twitter: {
                title: 'Repo Mapper',
                description: 'Generate ASCII directory trees from any public repository. Perfect for documentation and LLM context.'
            }
        }
    },
    {
        id: 'release-stats',
        path: layoutPath('github-tools/release-stats.html'),
        title: 'Release Stats',
        onLoad: initReleaseStats,
        metadata: {
            description: 'Visualize download counts, analyze asset performance, and track version history in real-time.',
            keywords: ['Release Stats', 'GitHub', 'downloads', 'statistics'],
            canonicalSlug: 'release-stats',
            openGraph: {
                title: 'Release Stats',
                description: 'Visualize download counts, analyze asset performance, and track version history in real-time.',
                type: 'website'
            },
            twitter: {
                title: 'Release Stats',
                description: 'Visualize download counts, analyze asset performance, and track version history in real-time.'
            }
        }
    },
    {
        id: 'git-patch',
        path: layoutPath('github-tools/git-patch.html'),
        title: 'Git Patch',
        onLoad: initGitPatch,
        metadata: {
            description: 'Extract raw .patch files from commit URLs. Easily apply changes from one repo to another or perform code reviews.',
            keywords: ['Git Patch', 'GitHub', 'patch', 'commit'],
            canonicalSlug: 'git-patch',
            openGraph: {
                title: 'Git Patch',
                description: 'Extract raw .patch files from commit URLs. Easily apply changes from one repo to another or perform code reviews.',
                type: 'website'
            },
            twitter: {
                title: 'Git Patch',
                description: 'Extract raw .patch files from commit URLs. Easily apply changes from one repo to another or perform code reviews.'
            }
        }
    }
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
