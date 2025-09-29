(function (global) {
    const DEFAULT_ROUTE_TITLE = "Mihai's Profile";
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

    function runHomeOnLoad() {
        if (
            typeof fetchBlogPosts === 'function' &&
            typeof document !== 'undefined' &&
            document.getElementById('newsGrid')
        ) {
            fetchBlogPosts();
        }
    }

    function runSongsOnLoad() {
        if (
            typeof loadSongs === 'function' &&
            typeof document !== 'undefined' &&
            document.getElementById('songsGrid')
        ) {
            loadSongs();
        }
    }

    function runProjectsOnLoad() {
        if (typeof initProjectsPage === 'function') {
            initProjectsPage();
        }
    }

    function runResumeOnLoad() {
        if (typeof initResumePage === 'function') {
            initResumePage();
        }
    }

    const defaultRoutes = [
        {
            id: 'home',
            title: DEFAULT_ROUTE_TITLE,
            onLoad: runHomeOnLoad,
            metadata: {
                description: 'Explore Mihai-Cristian Condrea\'s Android developer portfolio featuring Jetpack Compose apps, Material Design systems, and open-source tools.',
                keywords: [
                    'Mihai Cristian Condrea',
                    'Android developer portfolio',
                    'Jetpack Compose apps',
                    'Kotlin UI design',
                    'Material You projects'
                ],
                canonicalSlug: '/',
                openGraph: {
                    title: 'Mihai-Cristian Condrea | Android Developer Portfolio',
                    description: 'Explore Mihai-Cristian Condrea\'s Android developer portfolio featuring Jetpack Compose apps, Material Design systems, and open-source tools.',
                    type: 'website'
                },
                twitter: {
                    title: 'Mihai-Cristian Condrea | Android Developer Portfolio',
                    description: 'Explore Mihai-Cristian Condrea\'s Android developer portfolio featuring Jetpack Compose apps, Material Design systems, and open-source tools.'
                }
            }
        },
        {
            id: 'privacy-policy',
            path: 'pages/drawer/more/privacy-policy.html',
            title: 'Privacy Policy',
            metadata: {
                description: 'Review the website privacy policy for Mihai-Cristian Condrea\'s personal site covering analytics, local storage preferences, and data protection practices.',
                keywords: [
                    'Mihai Cristian Condrea privacy policy',
                    'website data protection',
                    'analytics disclosure',
                    'local storage preferences'
                ],
                canonicalSlug: 'privacy-policy',
                openGraph: {
                    title: 'Website Privacy Policy | Mihai-Cristian Condrea',
                    description: 'Review the website privacy policy for Mihai-Cristian Condrea\'s personal site covering analytics, local storage preferences, and data protection practices.',
                    type: 'article'
                },
                twitter: {
                    title: 'Website Privacy Policy | Mihai-Cristian Condrea',
                    description: 'Review the website privacy policy for Mihai-Cristian Condrea\'s personal site covering analytics, local storage preferences, and data protection practices.'
                }
            }
        },
        {
            id: 'songs',
            path: 'pages/drawer/songs.html',
            title: 'My Music',
            onLoad: runSongsOnLoad,
            metadata: {
                description: 'Listen to Mihai-Cristian Condrea\'s original tracks and playlists, including ambient production, electronic experiments, and featured collaborations.',
                keywords: [
                    'Mihai Cristian Condrea music',
                    'D4rK Rekords tracks',
                    'ambient electronic producer',
                    'indie Android developer musician'
                ],
                canonicalSlug: 'songs',
                openGraph: {
                    title: 'My Music | Mihai-Cristian Condrea',
                    description: 'Listen to Mihai-Cristian Condrea\'s original tracks and playlists, including ambient production, electronic experiments, and featured collaborations.',
                    type: 'music.playlist'
                },
                twitter: {
                    title: 'My Music | Mihai-Cristian Condrea',
                    description: 'Listen to Mihai-Cristian Condrea\'s original tracks and playlists, including ambient production, electronic experiments, and featured collaborations.'
                }
            }
        },
        {
            id: 'projects',
            path: 'pages/drawer/projects.html',
            title: 'Projects',
            onLoad: runProjectsOnLoad,
            metadata: {
                description: 'Discover Mihai-Cristian Condrea\'s Android and web projects featuring Jetpack Compose demos, Material You UI patterns, and open-source utilities.',
                keywords: [
                    'Jetpack Compose portfolio',
                    'Android app showcase',
                    'Material You case studies',
                    'Mihai Cristian Condrea projects'
                ],
                canonicalSlug: 'projects',
                openGraph: {
                    title: 'Projects | Mihai-Cristian Condrea',
                    description: 'Discover Mihai-Cristian Condrea\'s Android and web projects featuring Jetpack Compose demos, Material You UI patterns, and open-source utilities.',
                    type: 'website'
                },
                twitter: {
                    title: 'Projects | Mihai-Cristian Condrea',
                    description: 'Discover Mihai-Cristian Condrea\'s Android and web projects featuring Jetpack Compose demos, Material You UI patterns, and open-source utilities.'
                }
            }
        },
        {
            id: 'contact',
            path: 'pages/drawer/contact.html',
            title: 'Contact',
            metadata: {
                description: 'Contact Mihai-Cristian Condrea to discuss Android development collaborations, UI design engagements, or support for open-source apps.',
                keywords: [
                    'contact Mihai Cristian Condrea',
                    'hire Android developer Romania',
                    'Jetpack Compose collaboration',
                    'open source app support'
                ],
                canonicalSlug: 'contact',
                openGraph: {
                    title: 'Contact Mihai | Android Developer',
                    description: 'Contact Mihai-Cristian Condrea to discuss Android development collaborations, UI design engagements, or support for open-source apps.',
                    type: 'website'
                },
                twitter: {
                    title: 'Contact Mihai | Android Developer',
                    description: 'Contact Mihai-Cristian Condrea to discuss Android development collaborations, UI design engagements, or support for open-source apps.'
                }
            }
        },
        {
            id: 'about-me',
            path: 'pages/drawer/about-me.html',
            title: 'About Me',
            metadata: {
                description: 'Learn about Mihai-Cristian Condrea, a Bucharest-based Android developer crafting Jetpack Compose apps, Material Design systems, and community tutorials.',
                keywords: [
                    'Mihai Cristian Condrea biography',
                    'Bucharest Android developer',
                    'Jetpack Compose expert',
                    'Material Design UI engineer'
                ],
                canonicalSlug: 'about-me',
                openGraph: {
                    title: 'About Mihai-Cristian Condrea',
                    description: 'Learn about Mihai-Cristian Condrea, a Bucharest-based Android developer crafting Jetpack Compose apps, Material Design systems, and community tutorials.',
                    type: 'profile'
                },
                twitter: {
                    title: 'About Mihai-Cristian Condrea',
                    description: 'Learn about Mihai-Cristian Condrea, a Bucharest-based Android developer crafting Jetpack Compose apps, Material Design systems, and community tutorials.'
                }
            }
        },
        {
            id: 'ads-help-center',
            path: 'pages/drawer/more/apps/ads-help-center.html',
            title: 'Ads Help Center',
            metadata: {
                description: 'Understand how Mihai-Cristian Condrea integrates advertising across Android apps, including consent flows, personalization controls, and GDPR compliance.',
                keywords: [
                    'Mihai Cristian Condrea ads help',
                    'Android app advertising transparency',
                    'Consent mode v2 guidance',
                    'GDPR compliant mobile ads'
                ],
                canonicalSlug: 'ads-help-center',
                openGraph: {
                    title: 'Advertising Transparency | Mihai-Cristian Condrea',
                    description: 'Understand how Mihai-Cristian Condrea integrates advertising across Android apps, including consent flows, personalization controls, and GDPR compliance.',
                    type: 'article'
                },
                twitter: {
                    title: 'Advertising Transparency | Mihai-Cristian Condrea',
                    description: 'Understand how Mihai-Cristian Condrea integrates advertising across Android apps, including consent flows, personalization controls, and GDPR compliance.'
                }
            }
        },
        {
            id: 'legal-notices',
            path: 'pages/drawer/more/apps/legal-notices.html',
            title: 'Legal Notices',
            metadata: {
                description: 'Review software licenses and third-party acknowledgments for Mihai-Cristian Condrea\'s Android and web applications.',
                keywords: [
                    'Mihai Cristian Condrea legal notices',
                    'third party licenses Android apps',
                    'open source acknowledgments',
                    'software attribution list'
                ],
                canonicalSlug: 'legal-notices',
                openGraph: {
                    title: 'Legal Notices | Mihai-Cristian Condrea',
                    description: 'Review software licenses and third-party acknowledgments for Mihai-Cristian Condrea\'s Android and web applications.',
                    type: 'article'
                },
                twitter: {
                    title: 'Legal Notices | Mihai-Cristian Condrea',
                    description: 'Review software licenses and third-party acknowledgments for Mihai-Cristian Condrea\'s Android and web applications.'
                }
            }
        },
        {
            id: 'code-of-conduct',
            path: 'pages/drawer/more/code-of-conduct.html',
            title: 'Code of Conduct',
            metadata: {
                description: 'Read the community code of conduct guiding respectful collaboration across Mihai-Cristian Condrea\'s projects and communication channels.',
                keywords: [
                    'Mihai Cristian Condrea code of conduct',
                    'open source community guidelines',
                    'inclusive collaboration standards',
                    'developer communication policy'
                ],
                canonicalSlug: 'code-of-conduct',
                openGraph: {
                    title: 'Code of Conduct | Mihai-Cristian Condrea',
                    description: 'Read the community code of conduct guiding respectful collaboration across Mihai-Cristian Condrea\'s projects and communication channels.',
                    type: 'article'
                },
                twitter: {
                    title: 'Code of Conduct | Mihai-Cristian Condrea',
                    description: 'Read the community code of conduct guiding respectful collaboration across Mihai-Cristian Condrea\'s projects and communication channels.'
                }
            }
        },
        {
            id: 'privacy-policy-end-user-software',
            path: 'pages/drawer/more/apps/privacy-policy-apps.html',
            title: 'Privacy Policy – End-User Software',
            metadata: {
                description: 'Review the privacy policy for Mihai-Cristian Condrea\'s Android applications covering analytics, consent mode, advertising IDs, and crash reporting.',
                keywords: [
                    'Android app privacy policy',
                    'Mihai Cristian Condrea software privacy',
                    'Firebase analytics consent',
                    'AdMob data usage disclosure'
                ],
                canonicalSlug: 'privacy-policy-end-user-software',
                openGraph: {
                    title: 'Android App Privacy Policy | Mihai-Cristian Condrea',
                    description: 'Review the privacy policy for Mihai-Cristian Condrea\'s Android applications covering analytics, consent mode, advertising IDs, and crash reporting.',
                    type: 'article'
                },
                twitter: {
                    title: 'Android App Privacy Policy | Mihai-Cristian Condrea',
                    description: 'Review the privacy policy for Mihai-Cristian Condrea\'s Android applications covering analytics, consent mode, advertising IDs, and crash reporting.'
                }
            }
        },
        {
            id: 'terms-of-service-end-user-software',
            path: 'pages/drawer/more/apps/terms-of-service-apps.html',
            title: 'Terms of Service – End-User Software',
            metadata: {
                description: 'Understand the terms of service governing Mihai-Cristian Condrea\'s Android apps, including licensing, in-app purchases, and user responsibilities.',
                keywords: [
                    'Android app terms of service',
                    'Mihai Cristian Condrea app license',
                    'in-app purchase policy',
                    'user responsibilities mobile apps'
                ],
                canonicalSlug: 'terms-of-service-end-user-software',
                openGraph: {
                    title: 'Android App Terms of Service | Mihai-Cristian Condrea',
                    description: 'Understand the terms of service governing Mihai-Cristian Condrea\'s Android apps, including licensing, in-app purchases, and user responsibilities.',
                    type: 'article'
                },
                twitter: {
                    title: 'Android App Terms of Service | Mihai-Cristian Condrea',
                    description: 'Understand the terms of service governing Mihai-Cristian Condrea\'s Android apps, including licensing, in-app purchases, and user responsibilities.'
                }
            }
        },
        {
            id: 'resume',
            path: 'pages/resume/resume.html',
            title: "Mihai's Resume",
            onLoad: runResumeOnLoad,
            metadata: {
                description: 'Use Mihai-Cristian Condrea\'s interactive resume builder to assemble, preview, and download a polished CV template for Android developers.',
                keywords: [
                    'Android developer resume builder',
                    'Mihai Cristian Condrea CV template',
                    'Jetpack Compose resume generator',
                    'download professional resume PDF'
                ],
                canonicalSlug: 'resume',
                openGraph: {
                    title: 'Resume Builder | Mihai-Cristian Condrea',
                    description: 'Use Mihai-Cristian Condrea\'s interactive resume builder to assemble, preview, and download a polished CV template for Android developers.',
                    type: 'website'
                },
                twitter: {
                    title: 'Resume Builder | Mihai-Cristian Condrea',
                    description: 'Use Mihai-Cristian Condrea\'s interactive resume builder to assemble, preview, and download a polished CV template for Android developers.'
                }
            }
        }
    ];

    defaultRoutes.forEach(registerRoute);

    const routesApi = {
        registerRoute,
        getRoute,
        hasRoute,
        getRoutes,
        normalizeRouteId,
        PAGE_ROUTES
    };

    global.RouterRoutes = routesApi;
    if (typeof global.registerRoute === 'undefined') {
        global.registerRoute = registerRoute;
    }
})(typeof window !== 'undefined' ? window : globalThis);
