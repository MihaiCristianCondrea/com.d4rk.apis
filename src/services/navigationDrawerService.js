import { getDynamicElement, rafThrottle } from '../domain/utils.js';

const STANDARD_DRAWER_MEDIA_QUERY = '(min-width: 840px)';

export class NavigationDrawerController {
  constructor({
    menuButtonId = 'menuButton',
    navDrawerId = 'navDrawer',
    closeDrawerId = 'closeDrawerButton',
    overlayId = 'drawerOverlay',
    aboutToggleId = 'aboutToggle',
    aboutContentId = 'aboutContent',
    androidToggleId = 'androidAppsToggle',
    androidContentId = 'androidAppsContent',
  } = {}) {
    this.menuButton = getDynamicElement(menuButtonId);
    this.navDrawer = getDynamicElement(navDrawerId);
    this.closeDrawerButton = getDynamicElement(closeDrawerId);
    this.drawerOverlay = getDynamicElement(overlayId);
    this.aboutToggle = getDynamicElement(aboutToggleId);
    this.aboutContent = getDynamicElement(aboutContentId);
    this.androidToggle = getDynamicElement(androidToggleId);
    this.androidContent = getDynamicElement(androidContentId);
    this.inertTargets = Array.from(
      typeof document !== 'undefined'
        ? document.querySelectorAll('[data-drawer-inert-target]')
        : [],
    );

    this.isStandardDrawerLayout = false;
    this.standardLayoutMatcher = null;
    this.syncDrawerState = this.syncDrawerState.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.updateDrawerLayout = this.updateDrawerLayout.bind(this);
    this.focusFirstNavItem = this.focusFirstNavItem.bind(this);
    this.handleDrawerChanged = rafThrottle((event) => {
      const opened =
        event?.detail?.opened ?? this.navDrawer?.opened ?? false;
      this.syncDrawerState(opened);
    });
  }

  init() {
    if (!this.navDrawer) {
      return;
    }

    this.wireButtons();
    this.setupResponsiveDrawerLayout();
    this.syncDrawerState(Boolean(this.navDrawer.opened));
  }

  wireButtons() {
    if (this.menuButton) {
      this.menuButton.addEventListener('click', () => this.open());
      this.menuButton.setAttribute('aria-expanded', 'false');
      this.menuButton.setAttribute('aria-controls', 'navDrawer');
    }

    if (this.closeDrawerButton) {
      this.closeDrawerButton.addEventListener('click', () => this.close());
      this.closeDrawerButton.setAttribute('aria-controls', 'navDrawer');
    }

    this.drawerOverlay?.addEventListener('click', () => this.close());

    this.navDrawer.addEventListener(
      'navigation-drawer-changed',
      this.handleDrawerChanged,
    );

    document.addEventListener('keydown', this.handleKeydown);

    this.initToggleSection(this.aboutToggle, this.aboutContent);
    this.initToggleSection(this.androidToggle, this.androidContent);
  }

  open() {
    if (!this.navDrawer || this.isStandardDrawerLayout) {
      return;
    }
    this.navDrawer.opened = true;
    this.syncDrawerState(true);
    this.focusFirstNavItem();
  }

  close() {
    if (!this.navDrawer || this.isStandardDrawerLayout) {
      return;
    }
    this.navDrawer.opened = false;
    this.syncDrawerState(false);
    this.menuButton?.focus?.();
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.navDrawer?.opened && !this.isStandardDrawerLayout) {
      this.close();
    }
  }

  initToggleSection(toggleButton, contentElement) {
    if (!toggleButton || !contentElement) {
      return;
    }

    toggleButton.addEventListener('click', () => {
      const isExpanded = contentElement.classList.contains('open');

      if (
        contentElement.id === 'aboutContent' &&
        this.androidContent?.classList.contains('open')
      ) {
        this.collapseSection(this.androidToggle, this.androidContent);
      } else if (
        contentElement.id === 'androidAppsContent' &&
        this.aboutContent?.classList.contains('open')
      ) {
        this.collapseSection(this.aboutToggle, this.aboutContent);
      }

      contentElement.classList.toggle('open', !isExpanded);
      toggleButton.classList.toggle('expanded', !isExpanded);
      toggleButton.setAttribute('aria-expanded', String(!isExpanded));
      contentElement.setAttribute('aria-hidden', String(isExpanded));
    });
  }

  collapseSection(toggleButton, contentElement) {
    if (!toggleButton || !contentElement) {
      return;
    }
    contentElement.classList.remove('open');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.classList.remove('expanded');
    contentElement.setAttribute('aria-hidden', 'true');
  }

  focusFirstNavItem() {
    if (!this.navDrawer) {
      return;
    }
    const firstNavItem = this.navDrawer.querySelector('md-list-item[href]');
    if (firstNavItem && typeof firstNavItem.focus === 'function') {
      firstNavItem.focus();
      return;
    }
    this.closeDrawerButton?.focus?.();
  }

  setupResponsiveDrawerLayout() {
    if (!this.navDrawer) {
      return;
    }

    const applyLayout = (matches) => {
      this.updateDrawerLayout(Boolean(matches));
    };

    if (typeof window.matchMedia === 'function') {
      this.standardLayoutMatcher = window.matchMedia(STANDARD_DRAWER_MEDIA_QUERY);
      applyLayout(this.standardLayoutMatcher.matches);
      const handler = (event) => applyLayout(event.matches);
      if (typeof this.standardLayoutMatcher.addEventListener === 'function') {
        this.standardLayoutMatcher.addEventListener('change', handler);
      } else if (typeof this.standardLayoutMatcher.addListener === 'function') {
        this.standardLayoutMatcher.addListener(handler);
      }
    } else {
      applyLayout(window.innerWidth >= 840);
      window.addEventListener('resize', () => applyLayout(window.innerWidth >= 840));
    }
  }

  updateDrawerLayout(shouldUseStandardLayout) {
    if (!this.navDrawer) {
      return;
    }

    const shouldUseStandard = Boolean(shouldUseStandardLayout);
    document.body.dataset.drawerMode = shouldUseStandard ? 'standard' : 'modal';
    document.body.classList.toggle('drawer-standard-mode', shouldUseStandard);

    // Always keep the menu controls available so the drawer can be opened
    // regardless of the current layout width. Hiding these controls caused the
    // hamburger button to disappear on larger screens, leaving no way to open
    // the navigation drawer.

    this.isStandardDrawerLayout = shouldUseStandard;
    if (shouldUseStandard && this.navDrawer && this.navDrawer.opened) {
      this.navDrawer.opened = false;
    }

    const isOpen = Boolean(this.navDrawer?.opened);
    this.syncDrawerState(isOpen);
  }

  syncDrawerState(isOpened) {
    if (!this.navDrawer) {
      return;
    }

    const isDrawerOpen = Boolean(isOpened);
    this.updateNavDrawerAriaModal();
    this.updateModalAccessibilityState(isDrawerOpen);

    if (this.isStandardDrawerLayout) {
      this.drawerOverlay?.classList.remove('open');
      this.drawerOverlay?.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('drawer-is-open');
      this.menuButton?.setAttribute('aria-expanded', 'false');
      return;
    }

    if (isDrawerOpen) {
      this.drawerOverlay?.classList.add('open');
      this.drawerOverlay?.setAttribute('aria-hidden', 'false');
      document.body.classList.add('drawer-is-open');
      this.menuButton?.setAttribute('aria-expanded', 'true');
    } else {
      this.drawerOverlay?.classList.remove('open');
      this.drawerOverlay?.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('drawer-is-open');
      this.menuButton?.setAttribute('aria-expanded', 'false');
    }
  }

  updateNavDrawerAriaModal() {
    if (!this.navDrawer) {
      return;
    }
    this.navDrawer.setAttribute('aria-modal', String(!this.isStandardDrawerLayout));
  }

  updateModalAccessibilityState(isDrawerOpen) {
    const inert = !this.isStandardDrawerLayout && isDrawerOpen;
    this.drawerOverlay?.toggleAttribute('aria-hidden', !inert);

    this.inertTargets.forEach((element) => {
      if (!element) {
        return;
      }
      element.toggleAttribute('inert', inert);
      element.setAttribute('aria-hidden', String(inert));
    });
  }
}

export function initNavigationDrawer(options = {}) {
  const controller = new NavigationDrawerController(options);
  controller.init();
  return controller;
}
