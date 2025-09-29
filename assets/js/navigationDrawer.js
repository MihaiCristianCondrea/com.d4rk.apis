let menuButton, navDrawer, closeDrawerButton, drawerOverlay,
    aboutToggle, aboutContent, androidAppsToggle, androidAppsContent,
    inertTargets = [];

const STANDARD_DRAWER_MEDIA_QUERY = '(min-width: 840px)';
let standardLayoutMatcher = null;
let isStandardDrawerLayout = false;

/**
 * Initializes the navigation drawer functionality.
 * Must be called after DOM is ready.
 */
function initNavigationDrawer() {
    menuButton = getDynamicElement('menuButton');
    navDrawer = getDynamicElement('navDrawer');
    closeDrawerButton = getDynamicElement('closeDrawerButton');
    drawerOverlay = getDynamicElement('drawerOverlay');
    aboutToggle = getDynamicElement('aboutToggle');
    aboutContent = getDynamicElement('aboutContent');
    androidAppsToggle = getDynamicElement('androidAppsToggle');
    androidAppsContent = getDynamicElement('androidAppsContent');

    inertTargets = Array.from(document.querySelectorAll('[data-drawer-inert-target]'));

    if (menuButton) {
        menuButton.addEventListener('click', openDrawer);
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-controls', 'navDrawer');
    }
    if (closeDrawerButton) {
        closeDrawerButton.addEventListener('click', closeDrawer);
        closeDrawerButton.setAttribute('aria-controls', 'navDrawer');
    }
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

    if (navDrawer) {
        navDrawer.addEventListener('navigation-drawer-changed', (event) => {
            const opened = event && event.detail && typeof event.detail.opened === 'boolean'
                ? event.detail.opened
                : navDrawer.opened;
            syncDrawerState(opened);
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && navDrawer && navDrawer.opened && !isStandardDrawerLayout) {
            closeDrawer();
        }
    });

    _initToggleSection(aboutToggle, aboutContent);
    _initToggleSection(androidAppsToggle, androidAppsContent);

    setupResponsiveDrawerLayout();
    syncDrawerState(Boolean(navDrawer && navDrawer.opened));
}

/**
 * Opens the navigation drawer.
 */
function openDrawer() {
    if (!navDrawer || isStandardDrawerLayout) return;

    navDrawer.opened = true;
    syncDrawerState(true);
    focusFirstNavItem();
}

/**
 * Closes the navigation drawer.
 */
function closeDrawer() {
    if (!navDrawer || isStandardDrawerLayout) return;

    navDrawer.opened = false;
    syncDrawerState(false);
    if (menuButton) menuButton.focus();
}

/**
 * Initializes a toggleable section within the drawer.
 * @private
 * @param {HTMLElement} toggleButton - The button that triggers the toggle.
 * @param {HTMLElement} contentElement - The content element to show/hide.
 */
function _initToggleSection(toggleButton, contentElement) {
    if (!toggleButton || !contentElement) return;

    toggleButton.addEventListener('click', () => {
        const isExpanded = contentElement.classList.contains('open');

        if (contentElement.id === 'aboutContent' && androidAppsContent && androidAppsContent.classList.contains('open')) {
            androidAppsContent.classList.remove('open');
            if (androidAppsToggle) {
                androidAppsToggle.setAttribute('aria-expanded', 'false');
                androidAppsToggle.classList.remove('expanded');
            }
            androidAppsContent.setAttribute('aria-hidden', 'true');
        } else if (contentElement.id === 'androidAppsContent' && aboutContent && aboutContent.classList.contains('open')) {
            aboutContent.classList.remove('open');
            if (aboutToggle) {
                aboutToggle.setAttribute('aria-expanded', 'false');
                aboutToggle.classList.remove('expanded');
            }
            aboutContent.setAttribute('aria-hidden', 'true');
        }

        contentElement.classList.toggle('open', !isExpanded);
        toggleButton.classList.toggle('expanded', !isExpanded);
        toggleButton.setAttribute('aria-expanded', String(!isExpanded));
        contentElement.setAttribute('aria-hidden', String(isExpanded));
    });
}

function focusFirstNavItem() {
    if (!navDrawer) return;

    const firstNavItem = navDrawer.querySelector('md-list-item[href]');
    if (firstNavItem && typeof firstNavItem.focus === 'function') {
        firstNavItem.focus();
        return;
    }

    if (closeDrawerButton && typeof closeDrawerButton.focus === 'function') {
        closeDrawerButton.focus();
    }
}

function setupResponsiveDrawerLayout() {
    if (!navDrawer) return;

    const applyLayout = (matches) => {
        updateDrawerLayout(Boolean(matches));
    };

    if (typeof window.matchMedia === 'function') {
        standardLayoutMatcher = window.matchMedia(STANDARD_DRAWER_MEDIA_QUERY);
        applyLayout(standardLayoutMatcher.matches);

        const handler = (event) => applyLayout(event.matches);

        if (typeof standardLayoutMatcher.addEventListener === 'function') {
            standardLayoutMatcher.addEventListener('change', handler);
        } else if (typeof standardLayoutMatcher.addListener === 'function') {
            standardLayoutMatcher.addListener(handler);
        }
    } else {
        applyLayout(window.innerWidth >= 840);
        const resizeHandler = () => applyLayout(window.innerWidth >= 840);
        window.addEventListener('resize', resizeHandler);
    }
}

function updateDrawerLayout(shouldUseStandardLayout) {
    if (!navDrawer) return;

    const shouldUseStandard = false; // Always use modal drawer layout to mirror mobile behavior
    document.body.dataset.drawerMode = 'modal';
    document.body.classList.toggle('drawer-standard-mode', shouldUseStandard);

    if (menuButton) menuButton.toggleAttribute('hidden', shouldUseStandard);
    if (closeDrawerButton) closeDrawerButton.toggleAttribute('hidden', shouldUseStandard);

    isStandardDrawerLayout = shouldUseStandard;

    if (isStandardDrawerLayout) {
        navDrawer.opened = true;
    } else {
        navDrawer.opened = false;
    }

    syncDrawerState(Boolean(navDrawer.opened));
}

function syncDrawerState(isOpened) {
    if (!navDrawer) return;

    const isDrawerOpen = Boolean(isOpened);

    updateNavDrawerAriaModal();
    updateModalAccessibilityState(isDrawerOpen);

    if (isStandardDrawerLayout) {
        if (drawerOverlay) {
            drawerOverlay.classList.remove('open');
            drawerOverlay.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('drawer-is-open');
        if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
        return;
    }

    if (isDrawerOpen) {
        if (drawerOverlay) {
            drawerOverlay.classList.add('open');
            drawerOverlay.setAttribute('aria-hidden', 'false');
        }
        document.body.classList.add('drawer-is-open');
    } else {
        if (drawerOverlay) {
            drawerOverlay.classList.remove('open');
            drawerOverlay.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('drawer-is-open');
    }

    if (menuButton) {
        menuButton.setAttribute('aria-expanded', isDrawerOpen ? 'true' : 'false');
    }
}

function updateModalAccessibilityState(isOpened) {
    if (!Array.isArray(inertTargets) || inertTargets.length === 0) {
        return;
    }

    const shouldDisableTargets = !isStandardDrawerLayout && Boolean(isOpened);

    inertTargets.forEach((element) => {
        if (!element) {
            return;
        }

        element.toggleAttribute('inert', shouldDisableTargets);

        if (shouldDisableTargets) {
            element.setAttribute('aria-hidden', 'true');
        } else {
            element.removeAttribute('aria-hidden');
        }
    });
}

function updateNavDrawerAriaModal() {
    if (!navDrawer) return;

    const ariaModalValue = isStandardDrawerLayout ? 'false' : 'true';
    navDrawer.setAttribute('aria-modal', ariaModalValue);
    navDrawer.ariaModal = ariaModalValue;
}
