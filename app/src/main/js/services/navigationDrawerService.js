import { getDynamicElement, rafThrottle } from '../core/utils/utils.js';

export class NavigationDrawerController {
  constructor({
    menuButtonId = 'menuButton',
    navDrawerId = 'navDrawer',
    closeDrawerId = 'closeDrawerButton',
    overlayId = 'drawerOverlay',
    aboutToggleId = 'aboutToggle',
    aboutContentId = 'aboutContent',
    androidToggleId = 'apiWorkspacesToggle',
    androidContentId = 'apiWorkspacesContent',
    githubToggleId = 'githubToolsToggle',
    githubContentId = 'githubToolsContent',
  } = {}) {
    this.menuButton = getDynamicElement(menuButtonId);
    this.navDrawer = getDynamicElement(navDrawerId);
    this.closeDrawerButton = getDynamicElement(closeDrawerId);
    this.drawerOverlay = getDynamicElement(overlayId);
    this.aboutToggle = getDynamicElement(aboutToggleId);
    this.aboutContent = getDynamicElement(aboutContentId);
    this.androidToggle =
      getDynamicElement(androidToggleId) ||
      getDynamicElement('androidAppsToggle');
    this.androidContent =
      getDynamicElement(androidContentId) ||
      getDynamicElement('androidAppsContent');
    this.githubToggle = getDynamicElement(githubToggleId);
    this.githubContent = getDynamicElement(githubContentId);
    this.inertTargets = Array.from(
      typeof document !== 'undefined'
        ? document.querySelectorAll('[data-drawer-inert-target]')
        : [],
    );

    this.syncDrawerState = this.syncDrawerState.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
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
    this.initToggleSection(this.githubToggle, this.githubContent);
  }

  open() {
    if (!this.navDrawer) {
      return;
    }
    this.navDrawer.opened = true;
    this.syncDrawerState(true);
    this.focusFirstNavItem();
  }

  close() {
    if (!this.navDrawer) {
      return;
    }
    this.navDrawer.opened = false;
    this.syncDrawerState(false);
    this.menuButton?.focus?.();
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.navDrawer?.opened) {
      this.close();
    }
  }

  initToggleSection(toggleButton, contentElement) {
    if (!toggleButton || !contentElement) {
      return;
    }

    const allSections = [
      { toggle: this.aboutToggle, content: this.aboutContent },
      { toggle: this.androidToggle, content: this.androidContent },
      { toggle: this.githubToggle, content: this.githubContent },
    ];

    toggleButton.addEventListener('click', () => {
      const wasExpanded = contentElement.classList.contains('open');

      allSections.forEach(({ toggle, content }) => {
        if (content) {
          this.collapseSection(toggle, content);
        }
      });

      if (!wasExpanded) {
        contentElement.classList.add('open');
        toggleButton.classList.add('expanded');
        toggleButton.setAttribute('aria-expanded', 'true');
        contentElement.setAttribute('aria-hidden', 'false');
      }
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
      return false;
    }
    const firstNavItem = this.navDrawer.querySelector('md-list-item[href]');
    if (firstNavItem && typeof firstNavItem.focus === 'function') {
      firstNavItem.focus();
      return true;
    }
    if (this.closeDrawerButton?.focus) {
      this.closeDrawerButton.focus();
      return true;
    }
    return false;
  }

  redirectFocusAwayFromInertAreas() {
    if (!this.inertTargets.length || typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (!activeElement) {
      return;
    }

    const isInsideInert = this.inertTargets.some(
      (element) => element && element.contains(activeElement),
    );
    if (isInsideInert) {
      const moved = this.focusFirstNavItem();
      if (!moved && typeof this.navDrawer?.focus === 'function') {
        this.navDrawer.focus();
      }
    }
  }

  syncDrawerState(isOpened) {
    const hasDrawer = Boolean(this.navDrawer);
    const isDrawerOpen = Boolean(isOpened && hasDrawer);

    // Always clean up global scroll locking even if the drawer element is missing
    // (e.g., during fast navigations) so pages never stay stuck with overflow hidden.
    this.drawerOverlay?.classList.toggle('open', isDrawerOpen);
    this.drawerOverlay?.setAttribute('aria-hidden', isDrawerOpen ? 'false' : 'true');
    document.body.classList.toggle('drawer-is-open', isDrawerOpen);
    this.menuButton?.setAttribute('aria-expanded', isDrawerOpen ? 'true' : 'false');

    this.updateModalAccessibilityState(isDrawerOpen);

    if (!hasDrawer) {
      return;
    }

    this.updateNavDrawerAriaModal();
  }

  updateNavDrawerAriaModal() {
    if (!this.navDrawer) {
      return;
    }
    this.navDrawer.setAttribute('aria-modal', 'true');
  }

  updateModalAccessibilityState(isDrawerOpen) {
    const inert = Boolean(isDrawerOpen);
    if (inert) {
      this.redirectFocusAwayFromInertAreas();
    }
    this.drawerOverlay?.setAttribute('aria-hidden', inert ? 'false' : 'true');

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
