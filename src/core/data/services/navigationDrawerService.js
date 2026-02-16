// Change Rationale: Drawer state/behavior remains in core/data, while all DOM lookup
// responsibilities moved to core/ui orchestrators.
// Change Rationale: Compact drawer interactions now follow BeerCSS nav-left behavior,
// using one canonical source (`.active`) for open state instead of dialog APIs.
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
 * @property {HTMLElement | null} [drawerBackdrop=null] Drawer backdrop reference.
 * @property {HTMLElement | null} [closeDrawerButton=null] Close button reference.
 * @property {string} [closeOnNavSelectMediaQuery='(max-width: 959px)']
 *   Media query that must match before clicking a nav item auto-closes the drawer.
 * @property {HTMLElement | null} [aboutToggle=null] About toggle reference.
 * @property {HTMLElement | null} [aboutContent=null] About content reference.
 * @property {HTMLElement | null} [androidToggle=null] API workspaces toggle reference.
 * @property {HTMLElement | null} [androidContent=null] API workspaces content reference.
 * @property {HTMLElement | null} [githubToggle=null] GitHub toggle reference.
 * @property {HTMLElement | null} [githubContent=null] GitHub content reference.
 * @property {HTMLElement[]} [navLinks=[]] Navigation links inside drawer.
 * @property {HTMLElement | null} [firstNavItem=null] First focusable nav item.
 * @property {Document | null} [documentRef=document] Document adapter.
 * @property {HTMLElement | null} [bodyElement=document.body] Body element adapter.
 */

/**
 * Manages the application navigation drawer, including:
 * - Open/close interactions for the main drawer.
 * - Focus management when the drawer is active.
 * - Independent expansion of logical sections inside the drawer.
 */
export class NavigationDrawerController {
  constructor({
    menuButton = null,
    navDrawer = null,
    drawerBackdrop = null,
    closeDrawerButton = null,
    // Change Rationale: Align the drawer breakpoint with the shared navigation
    // rail cutoff so compact drawer behavior matches CSS and BeerCSS helpers.
    closeOnNavSelectMediaQuery = '(max-width: 959px)',
    aboutToggle = null,
    aboutContent = null,
    androidToggle = null,
    androidContent = null,
    githubToggle = null,
    githubContent = null,
    navLinks = [],
    firstNavItem = null,
    documentRef = typeof document !== 'undefined' ? document : null,
    bodyElement = typeof document !== 'undefined' ? document.body : null,
  } = {}) {
    this.menuButton = menuButton;
    this.navDrawer = navDrawer;
    this.drawerBackdrop = drawerBackdrop;
    this.closeDrawerButton = closeDrawerButton;
    this.closeOnNavSelectMediaQuery = closeOnNavSelectMediaQuery;
    this.aboutToggle = aboutToggle;
    this.aboutContent = aboutContent;
    this.androidToggle = androidToggle;
    this.androidContent = androidContent;
    this.githubToggle = githubToggle;
    this.githubContent = githubContent;
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
    this.handleCompactLayoutChange = this.handleCompactLayoutChange.bind(this);
    this.compactLayoutMediaQueryList = null;
  }

  init() {
    if (!this.navDrawer) {
      return;
    }

    // Change Rationale: Some runtimes/hydration paths can preserve stale drawer
    // classes/ARIA across navigations, so startup always normalizes to a closed
    // drawer state on both compact and desktop layouts.
    this.resetDrawerToClosedState();

    this.wireButtons();
    this.wireNavLinkCloseBehavior();
    this.initCompactLayoutWatcher();
    this.reconcileLayoutState();
    this.syncDrawerStateFromDom();
  }

  /**
   * Watches compact-layout media query changes to keep drawer state in sync.
   *
   * @returns {void}
   */
  initCompactLayoutWatcher() {
    // Change Rationale: Viewport breakpoint changes can leave stale drawer/body
    // classes behind, so state is reconciled whenever the media query changes.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    this.compactLayoutMediaQueryList = window.matchMedia(this.closeOnNavSelectMediaQuery);
    if (typeof this.compactLayoutMediaQueryList.addEventListener === 'function') {
      this.compactLayoutMediaQueryList.addEventListener('change', this.handleCompactLayoutChange);
      return;
    }

    if (typeof this.compactLayoutMediaQueryList.addListener === 'function') {
      this.compactLayoutMediaQueryList.addListener(this.handleCompactLayoutChange);
    }
  }

  /**
   * Handles viewport transitions that switch between compact drawer and desktop rail.
   *
   * @returns {void}
   */
  handleCompactLayoutChange() {
    this.reconcileLayoutState();
  }

  /**
   * Ensures compact-only drawer classes/ARIA are reset when desktop rail is active.
   *
   * @returns {void}
   */
  reconcileLayoutState() {
    if (this.isCompactLayout()) {
      return;
    }

    this.resetDrawerToClosedState();
  }

  /**
   * Normalizes drawer visuals and state to the default closed condition.
   *
   * @returns {void}
   */
  resetDrawerToClosedState() {
    this.navDrawer?.classList.remove('active');
    this.syncDrawerState(false);
    this.state = closeDrawerState(this.state);
  }

  wireButtons() {
    if (this.menuButton) {
      // Change Rationale: Restore the legacy open-only menu trigger interaction
      // so repeated taps do not close the drawer unexpectedly.
      this.menuButton.addEventListener('click', () => this.open());
      this.menuButton.setAttribute('aria-expanded', 'false');
      this.menuButton.setAttribute('aria-controls', 'navDrawer');
    }

    if (this.closeDrawerButton) {
      this.closeDrawerButton.addEventListener('click', () => this.close());
      this.closeDrawerButton.setAttribute('aria-controls', 'navDrawer');
    }

    if (this.drawerBackdrop) {
      this.drawerBackdrop.addEventListener('click', () => this.close());
      this.drawerBackdrop.setAttribute('aria-controls', 'navDrawer');
    }

    this.documentRef?.addEventListener('keydown', this.handleKeydown);

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

    this.navDrawer.classList.add('active');
    this.syncDrawerStateFromDom({ focusAfterOpen: true });
  }

  /**
   * Toggles the drawer based on the canonical nav active state.
   *
   * @returns {void}
   */
  toggle() {
    if (this.state.isOpen) {
      this.close();
      return;
    }
    this.open();
  }

  close() {
    if (!this.navDrawer) {
      return;
    }

    this.navDrawer.classList.remove('active');
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

  /**
   * Synchronizes visual/ARIA state from canonical drawer open state.
   *
   * @param {boolean} isOpened Whether drawer is open.
   */
  syncDrawerState(isOpened) {
    const hasDrawer = Boolean(this.navDrawer);
    const isDrawerOpen = Boolean(isOpened && hasDrawer);

    this.bodyElement?.classList.toggle('drawer-is-open', isDrawerOpen);
    this.menuButton?.setAttribute('aria-expanded', isDrawerOpen ? 'true' : 'false');
    this.navDrawer?.setAttribute('aria-hidden', isDrawerOpen ? 'false' : 'true');
    this.drawerBackdrop?.classList.toggle('active', isDrawerOpen);
    this.drawerBackdrop?.setAttribute('aria-hidden', isDrawerOpen ? 'false' : 'true');
  }

  /**
   * Reads drawer open state from the DOM and syncs mirrored classes/aria.
   *
   * @param {{focusAfterOpen?: boolean, focusMenuAfterClose?: boolean}} [options]
   */
  syncDrawerStateFromDom({ focusAfterOpen = false, focusMenuAfterClose = false } = {}) {
    const isDrawerOpen = Boolean(this.navDrawer?.classList?.contains('active'));

    this.state = isDrawerOpen ? openDrawerState(this.state) : closeDrawerState(this.state);
    this.syncDrawerState(this.state.isOpen);

    if (isDrawerOpen && focusAfterOpen) {
      this.focusFirstNavItem();
    }

    if (!isDrawerOpen && focusMenuAfterClose) {
      this.menuButton?.focus?.();
    }
  }

  setBodyScrollbarCompensation() {
    // Change Rationale: Beer CSS drawers overlay content without shifting layout.
  }

  shouldCloseOnNavSelection() {
    // Change Rationale: Keep desktop rail workflows uninterrupted while ensuring
    // compact drawer taps on phones/tablets dismiss the drawer.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return this.isCompactLayout();
  }

  /**
   * Determines whether the viewport is currently in compact drawer mode.
   *
   * @returns {boolean}
   */
  isCompactLayout() {
    if (this.compactLayoutMediaQueryList) {
      return this.compactLayoutMediaQueryList.matches;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    this.compactLayoutMediaQueryList = window.matchMedia(this.closeOnNavSelectMediaQuery);
    return this.compactLayoutMediaQueryList.matches;
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
