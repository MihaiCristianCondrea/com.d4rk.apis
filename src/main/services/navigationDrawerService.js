import { getDynamicElement, rafThrottle } from '@/domain/utils';

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
      return;
    }
    const firstNavItem = this.navDrawer.querySelector('md-list-item[href]');
    if (firstNavItem && typeof firstNavItem.focus === 'function') {
      firstNavItem.focus();
      return;
    }
    this.closeDrawerButton?.focus?.();
  }

  syncDrawerState(isOpened) {
    if (!this.navDrawer) {
      return;
    }

    const isDrawerOpen = Boolean(isOpened);
    this.updateNavDrawerAriaModal();
    this.updateModalAccessibilityState(isDrawerOpen);

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
    this.navDrawer.setAttribute('aria-modal', 'true');
  }

  updateModalAccessibilityState(isDrawerOpen) {
    const inert = Boolean(isDrawerOpen);
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
