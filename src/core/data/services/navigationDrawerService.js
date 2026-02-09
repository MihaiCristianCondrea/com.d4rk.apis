// Change Rationale: Drawer state/behavior remains in core/data, while all DOM lookup
// responsibilities moved to core/ui orchestrators.
// Change Rationale: Drawer logic now uses a single canonical state source (`dialog.open`)
// and mirrors that state into BeerCSS helper classes/ARIA. This removes conflicting
// state toggles across `open`, custom classes, and overlay activation.
import {
  createDrawerState,
  openDrawerState,
  closeDrawerState,
  setSectionExpandedState,
} from '@/core/domain/navigation/navigationDrawerState.js';

/**
 * @typedef {Object} NavigationDrawerOptions
 * @property {HTMLElement | null} [menuButton=null] Open button reference.
 * @property {HTMLElement | null} [navDrawer=null] Drawer root reference.
 * @property {HTMLElement | null} [closeDrawerButton=null] Close button reference.
 * @property {HTMLElement | null} [drawerOverlay=null] Overlay reference.
 * @property {string} [closeOnNavSelectMediaQuery='(max-width: 960px)']
 *   Media query that must match before clicking a nav item auto-closes the drawer.
 * @property {HTMLElement | null} [aboutToggle=null] About toggle reference.
 * @property {HTMLElement | null} [aboutContent=null] About content reference.
 * @property {HTMLElement | null} [androidToggle=null] API workspaces toggle reference.
 * @property {HTMLElement | null} [androidContent=null] API workspaces content reference.
 * @property {HTMLElement | null} [githubToggle=null] GitHub toggle reference.
 * @property {HTMLElement | null} [githubContent=null] GitHub content reference.
 * @property {HTMLElement[]} [inertTargets=[]] Inert target refs.
 * @property {HTMLElement[]} [navLinks=[]] Navigation links inside drawer.
 * @property {HTMLElement | null} [firstNavItem=null] First focusable nav item.
 * @property {Document | null} [documentRef=document] Document adapter.
 * @property {HTMLElement | null} [bodyElement=document.body] Body element adapter.
 */

/**
 * Manages the application navigation drawer, including:
 * - Open/close interactions for the main drawer.
 * - Focus management and inert state when the drawer is active.
 * - Independent expansion of logical sections inside the drawer.
 */
export class NavigationDrawerController {
  constructor({
    menuButton = null,
    navDrawer = null,
    closeDrawerButton = null,
    drawerOverlay = null,
    // Change Rationale: Align the drawer breakpoint with the shared navigation
    // rail cutoff so modal behavior stays consistent across CSS and JS.
    closeOnNavSelectMediaQuery = '(max-width: 960px)',
    aboutToggle = null,
    aboutContent = null,
    androidToggle = null,
    androidContent = null,
    githubToggle = null,
    githubContent = null,
    inertTargets = [],
    navLinks = [],
    firstNavItem = null,
    documentRef = typeof document !== 'undefined' ? document : null,
    bodyElement = typeof document !== 'undefined' ? document.body : null,
  } = {}) {
    this.menuButton = menuButton;
    this.navDrawer = navDrawer;
    this.closeDrawerButton = closeDrawerButton;
    this.drawerOverlay = drawerOverlay;
    this.closeOnNavSelectMediaQuery = closeOnNavSelectMediaQuery;
    this.aboutToggle = aboutToggle;
    this.aboutContent = aboutContent;
    this.androidToggle = androidToggle;
    this.androidContent = androidContent;
    this.githubToggle = githubToggle;
    this.githubContent = githubContent;
    this.inertTargets = Array.isArray(inertTargets) ? inertTargets : [];
    this.navLinks = Array.isArray(navLinks) ? navLinks : [];
    this.firstNavItem = firstNavItem;
    this.documentRef = documentRef;
    this.bodyElement = bodyElement;
    this.state = createDrawerState();

    this.syncDrawerState = this.syncDrawerState.bind(this);
    this.syncDrawerStateFromDom = this.syncDrawerStateFromDom.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.focusFirstNavItem = this.focusFirstNavItem.bind(this);
    this.handleNavItemSelection = this.handleNavItemSelection.bind(this);
  }

  init() {
    if (!this.navDrawer) {
      return;
    }

    this.wireButtons();
    this.wireNavLinkCloseBehavior();
    this.syncDrawerStateFromDom();
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
    this.documentRef?.addEventListener('keydown', this.handleKeydown);
    // Change Rationale: Canonical drawer state is now the dialog `open` attribute,
    // so native dialog close/cancel events must refresh mirrored CSS + aria state.
    this.navDrawer?.addEventListener('close', this.syncDrawerStateFromDom);
    this.navDrawer?.addEventListener('cancel', this.syncDrawerStateFromDom);

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

  wireNavLinkCloseBehavior() {
    if (!this.navDrawer) {
      return;
    }

    this.navLinks.forEach((link) => {
      link.addEventListener('click', this.handleNavItemSelection);
    });
  }

  handleNavItemSelection() {
    if (!this.shouldCloseOnNavSelection()) {
      return;
    }
    this.close();
  }

  open() {
    if (!this.navDrawer) {
      return;
    }

    if (this.isDialogDrawer() && !this.navDrawer.open) {
      if (typeof this.navDrawer.showModal === 'function') {
        this.navDrawer.showModal();
      } else {
        this.navDrawer.setAttribute('open', '');
      }
    } else if (!this.isDialogDrawer()) {
      this.navDrawer.classList.add('open');
    }

    this.syncDrawerStateFromDom({ focusAfterOpen: true });
  }

  close() {
    if (!this.navDrawer) {
      return;
    }

    if (this.isDialogDrawer() && this.navDrawer.open) {
      if (typeof this.navDrawer.close === 'function') {
        this.navDrawer.close();
      } else {
        this.navDrawer.removeAttribute('open');
      }
    } else if (!this.isDialogDrawer()) {
      this.navDrawer.classList.remove('open');
    }

    this.syncDrawerStateFromDom({ focusMenuAfterClose: true });
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.state.isOpen) {
      this.close();
    }
  }

  initToggleSection(toggleButton, contentElement, { defaultExpanded = false } = {}) {
    if (!toggleButton || !contentElement) {
      return;
    }

    const parentDetails = toggleButton.closest('details');
    const applyExpansion = (expanded) => {
      this.setSectionState(toggleButton, contentElement, Boolean(expanded));
      const sectionKey = contentElement.id || toggleButton.id || 'section';
      this.state = setSectionExpandedState(this.state, sectionKey, Boolean(expanded));
      if (parentDetails) {
        parentDetails.open = Boolean(expanded);
      }
    };

    const initialExpanded = parentDetails?.open ?? defaultExpanded;
    applyExpansion(initialExpanded);

    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      const nextExpanded = !contentElement.classList.contains('open');
      applyExpansion(nextExpanded);
    });
  }

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
    if (this.firstNavItem && typeof this.firstNavItem.focus === 'function') {
      this.firstNavItem.focus();
      return true;
    }
    if (this.closeDrawerButton?.focus) {
      this.closeDrawerButton.focus();
      return true;
    }
    return false;
  }

  redirectFocusAwayFromInertAreas() {
    if (!this.inertTargets.length || !this.documentRef) {
      return;
    }

    const activeElement = this.documentRef?.activeElement;
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

  /**
   * Synchronizes visual/ARIA state from canonical drawer open state.
   *
   * @param {boolean} isOpened Whether drawer is open.
   */
  syncDrawerState(isOpened) {
    const hasDrawer = Boolean(this.navDrawer);
    const isDrawerOpen = Boolean(isOpened && hasDrawer);

    this.drawerOverlay?.classList.toggle('active', isDrawerOpen);
    this.drawerOverlay?.setAttribute('aria-hidden', isDrawerOpen ? 'false' : 'true');
    this.bodyElement?.classList.toggle('drawer-is-open', isDrawerOpen);
    this.navDrawer?.classList.toggle('open', isDrawerOpen);
    this.menuButton?.setAttribute('aria-expanded', isDrawerOpen ? 'true' : 'false');

    this.updateModalAccessibilityState(isDrawerOpen);

    if (!hasDrawer) {
      return;
    }
  }

  /**
   * Reads drawer open state from the DOM and syncs mirrored classes/aria.
   *
   * @param {{focusAfterOpen?: boolean, focusMenuAfterClose?: boolean}} [options]
   */
  syncDrawerStateFromDom({ focusAfterOpen = false, focusMenuAfterClose = false } = {}) {
    const isDrawerOpen = this.isDialogDrawer()
      ? Boolean(this.navDrawer?.open)
      : Boolean(this.navDrawer?.classList?.contains('open'));

    this.state = isDrawerOpen ? openDrawerState(this.state) : closeDrawerState(this.state);
    this.syncDrawerState(this.state.isOpen);

    if (isDrawerOpen && focusAfterOpen) {
      this.focusFirstNavItem();
    }

    if (!isDrawerOpen && focusMenuAfterClose) {
      this.menuButton?.focus?.();
    }
  }

  isDialogDrawer() {
    return typeof HTMLDialogElement !== 'undefined'
      && this.navDrawer instanceof HTMLDialogElement;
  }

  setBodyScrollbarCompensation() {
    // Change Rationale: Beer CSS drawers overlay content without shifting layout.
  }

  updateModalAccessibilityState(isDrawerOpen) {
    const inert = Boolean(isDrawerOpen);
    if (inert) {
      this.redirectFocusAwayFromInertAreas();
    }

    this.inertTargets.forEach((element) => {
      if (!element) {
        return;
      }
      element.toggleAttribute('inert', inert);
      element.setAttribute('aria-hidden', String(inert));
    });
  }

  shouldCloseOnNavSelection() {
    // Change Rationale: Keep desktop rail workflows uninterrupted while ensuring
    // modal drawer taps on compact screens always dismiss the drawer.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia(this.closeOnNavSelectMediaQuery).matches;
  }
}

/**
 * Creates a navigation drawer controller from pre-resolved references.
 *
 * @param {NavigationDrawerOptions} [options={}]
 * @returns {NavigationDrawerController}
 */
export function createNavigationDrawerController(options = {}) {
  return new NavigationDrawerController(options);
}
