(function (global) {
    const DEFAULT_TITLE = "Mihai's Profile";
    const DEFAULT_DESCRIPTION = "Explore Mihai-Cristian Condrea's Android developer portfolio featuring Jetpack Compose apps, Material Design systems, and open-source tools.";
    const DEFAULT_KEYWORDS = [
        'Mihai Cristian Condrea',
        'Android developer portfolio',
        'Jetpack Compose',
        'Kotlin apps',
        'Material Design UI'
    ];
    const SITE_BASE_URL = 'https://mihaicristiancondrea.github.io/profile/';
    const DEFAULT_IMAGE = 'https://mihaicristiancondrea.github.io/profile/assets/images/profile/cv_profile_pic.png';
    const DEFAULT_IMAGE_ALT = 'Portrait of Android developer Mihai-Cristian Condrea';
    const DEFAULT_OG_TYPE = 'website';
    const DEFAULT_TWITTER_CARD = 'summary_large_image';
    const DEFAULT_TWITTER_HANDLE = '@MihaiCrstian';

    function isDomAvailable() {
        return typeof document !== 'undefined' && !!document.head;
    }

    function ensureMetaByName(name) {
        if (!isDomAvailable()) {
            return null;
        }
        let element = document.head.querySelector(`meta[name="${name}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute('name', name);
            document.head.appendChild(element);
        }
        return element;
    }

    function ensureMetaByProperty(property) {
        if (!isDomAvailable()) {
            return null;
        }
        let element = document.head.querySelector(`meta[property="${property}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute('property', property);
            document.head.appendChild(element);
        }
        return element;
    }

    function ensureCanonicalLink() {
        if (!isDomAvailable()) {
            return null;
        }
        let element = document.head.querySelector('link[rel="canonical"]');
        if (!element) {
            element = document.createElement('link');
            element.setAttribute('rel', 'canonical');
            document.head.appendChild(element);
        }
        return element;
    }

    function updateMetaTag(element, content) {
        if (!element) {
            return;
        }
        const value = typeof content === 'string' ? content : '';
        element.setAttribute('content', value);
    }

    function toKeywordString(keywords) {
        if (Array.isArray(keywords) && keywords.length) {
            return keywords.join(', ');
        }
        if (typeof keywords === 'string' && keywords.trim()) {
            return keywords.trim();
        }
        return DEFAULT_KEYWORDS.join(', ');
    }

    function sanitizeSlug(slug) {
        if (typeof slug !== 'string') {
            return '';
        }
        const trimmed = slug.trim();
        if (!trimmed || trimmed === '/' || trimmed === '#') {
            return '';
        }
        if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
        }
        return trimmed.replace(/^[/#]+/, '').replace(/[/#]+$/, '');
    }

    function buildCanonicalUrl(slug) {
        const sanitized = sanitizeSlug(slug);
        if (!sanitized) {
            return SITE_BASE_URL;
        }
        if (/^https?:\/\//i.test(sanitized)) {
            return sanitized;
        }
        return `${SITE_BASE_URL}#${sanitized}`;
    }

    function cloneMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return null;
        }
        return {
            description: metadata.description,
            keywords: Array.isArray(metadata.keywords) ? [...metadata.keywords] : metadata.keywords,
            canonicalSlug: metadata.canonicalSlug,
            openGraph: metadata.openGraph && typeof metadata.openGraph === 'object' ? { ...metadata.openGraph } : null,
            twitter: metadata.twitter && typeof metadata.twitter === 'object' ? { ...metadata.twitter } : null
        };
    }

    function updateForRoute(routeConfig, options = {}) {
        if (!isDomAvailable()) {
            return null;
        }

        const clonedMetadata = cloneMetadata(routeConfig && routeConfig.metadata);
        const fallbackId = options.pageId || (routeConfig && routeConfig.id) || '';
        const fallbackTitle = options.pageTitle || (routeConfig && routeConfig.title) || DEFAULT_TITLE;

        const description = clonedMetadata && clonedMetadata.description
            ? clonedMetadata.description
            : DEFAULT_DESCRIPTION;

        const keywords = toKeywordString(clonedMetadata && clonedMetadata.keywords);

        const canonicalInput = clonedMetadata && Object.prototype.hasOwnProperty.call(clonedMetadata, 'canonicalSlug')
            ? clonedMetadata.canonicalSlug
            : (fallbackId && fallbackId !== 'home' ? fallbackId : '');
        const canonicalUrl = buildCanonicalUrl(canonicalInput);

        const openGraph = clonedMetadata && clonedMetadata.openGraph ? clonedMetadata.openGraph : {};
        const ogTitle = typeof openGraph.title === 'string' && openGraph.title.trim()
            ? openGraph.title
            : fallbackTitle;
        const ogDescription = typeof openGraph.description === 'string' && openGraph.description.trim()
            ? openGraph.description
            : description;
        const ogType = typeof openGraph.type === 'string' && openGraph.type.trim()
            ? openGraph.type
            : DEFAULT_OG_TYPE;
        const ogImage = typeof openGraph.image === 'string' && openGraph.image.trim()
            ? openGraph.image
            : DEFAULT_IMAGE;
        const ogImageAlt = typeof openGraph.imageAlt === 'string' && openGraph.imageAlt.trim()
            ? openGraph.imageAlt
            : DEFAULT_IMAGE_ALT;
        const ogSiteName = typeof openGraph.siteName === 'string' && openGraph.siteName.trim()
            ? openGraph.siteName
            : DEFAULT_TITLE;

        const twitter = clonedMetadata && clonedMetadata.twitter ? clonedMetadata.twitter : {};
        const twitterCard = typeof twitter.card === 'string' && twitter.card.trim()
            ? twitter.card
            : DEFAULT_TWITTER_CARD;
        const twitterTitle = typeof twitter.title === 'string' && twitter.title.trim()
            ? twitter.title
            : ogTitle;
        const twitterDescription = typeof twitter.description === 'string' && twitter.description.trim()
            ? twitter.description
            : description;
        const twitterImage = typeof twitter.image === 'string' && twitter.image.trim()
            ? twitter.image
            : ogImage;
        const twitterSite = typeof twitter.site === 'string' && twitter.site.trim()
            ? twitter.site
            : DEFAULT_TWITTER_HANDLE;
        const twitterCreator = typeof twitter.creator === 'string' && twitter.creator.trim()
            ? twitter.creator
            : DEFAULT_TWITTER_HANDLE;

        updateMetaTag(ensureMetaByName('description'), description);
        updateMetaTag(ensureMetaByName('keywords'), keywords);
        updateMetaTag(ensureMetaByProperty('og:title'), ogTitle);
        updateMetaTag(ensureMetaByProperty('og:description'), ogDescription);
        updateMetaTag(ensureMetaByProperty('og:type'), ogType);
        updateMetaTag(ensureMetaByProperty('og:url'), canonicalUrl);
        updateMetaTag(ensureMetaByProperty('og:image'), ogImage);
        updateMetaTag(ensureMetaByProperty('og:image:alt'), ogImageAlt);
        updateMetaTag(ensureMetaByProperty('og:site_name'), ogSiteName);

        updateMetaTag(ensureMetaByName('twitter:card'), twitterCard);
        updateMetaTag(ensureMetaByName('twitter:title'), twitterTitle);
        updateMetaTag(ensureMetaByName('twitter:description'), twitterDescription);
        updateMetaTag(ensureMetaByName('twitter:image'), twitterImage);
        updateMetaTag(ensureMetaByName('twitter:site'), twitterSite);
        updateMetaTag(ensureMetaByName('twitter:creator'), twitterCreator);

        const canonicalLink = ensureCanonicalLink();
        if (canonicalLink) {
            canonicalLink.setAttribute('href', canonicalUrl);
        }

        return {
            canonicalUrl,
            description,
            keywords,
            ogTitle,
            twitterTitle
        };
    }

    global.SiteMetadata = {
        updateForRoute,
        buildCanonicalUrl
    };
})(typeof window !== 'undefined' ? window : globalThis);
