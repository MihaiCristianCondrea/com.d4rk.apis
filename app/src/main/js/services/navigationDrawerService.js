import { getDynamicElement, rafThrottle } from '../core/utils/utils.js';

/**
 * Manages the application navigation drawer, including accessibility state,
 * open/close interactions, and expandable drawer sections.
 */
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

    this.initToggleSection(this.aboutToggle, this.aboutContent, {
      defaultExpanded: false,
    });
    this.initToggleSection(this.androidToggle, this.androidContent, {
      defaultExpanded: true,
    });
    this.initToggleSection(this.githubToggle, this.githubContent, {
      defaultExpanded: true,
    });
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

  /**
   * Wires an expandable section inside the drawer so it can open and close
   * independently without collapsing other sections.
   *
   * @param {HTMLElement|null} toggleButton - The trigger element that toggles
   *   the section.
   * @param {HTMLElement|null} contentElement - The collapsible content node.
   * @param {{defaultExpanded?: boolean}} [options] - Optional configuration.
   */
  initToggleSection(toggleButton, contentElement, { defaultExpanded = false } = {}) {
    if (!toggleButton || !contentElement) {
      return;
    }

    const applyExpansion = (expanded) =>
      this.setSectionState(toggleButton, contentElement, Boolean(expanded));

    applyExpansion(defaultExpanded);

    toggleButton.addEventListener('click', () => {
      const nextExpanded = !contentElement.classList.contains('open');
      applyExpansion(nextExpanded);
    });
  }

  /**
   * Applies the expanded or collapsed state to a drawer section and maintains
   * the related accessibility attributes.
   *
   * @param {HTMLElement} toggleButton - The section toggle control.
   * @param {HTMLElement} contentElement - The collapsible content element.
   * @param {boolean} expanded - Whether the section should be open.
   */
  setSectionState(toggleButton, contentElement, expanded) {
    if (!toggleButton || !contentElement) {
      return;
    }

    contentElement.classList.toggle('open', expanded);
    toggleButton.classList.toggle('expanded', expanded);
    toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    contentElement.setAttribute('aria-hidden', expanded ? 'false' : 'true');
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
