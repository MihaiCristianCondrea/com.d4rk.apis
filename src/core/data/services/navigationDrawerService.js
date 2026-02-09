// Change Rationale: Drawer state/behavior remains in core/data, while all DOM lookup
// responsibilities moved to core/ui orchestrators.
// Change Rationale: Drawer logic has been rewritten for Beer CSS so the shell uses semantic
// HTML (<nav>, <details>, <summary>) instead of Material custom elements. The controller now
// toggles a simple `.open` class and syncs <details> expansion state instead of relying on the
// `opened` property from md-navigation-drawer. This removes the body padding shim that pushed
// content sideways when the drawer opened while preserving accessibility guards.
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
 * @property {string} [closeOnNavSelectMediaQuery='(max-width: 840px)']
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
 *
 * - Open/close interactions for the main drawer.
 * - Focus management and inert state when the drawer is active.
 * - Independent expansion of logical sections inside the drawer
 *   ("About", "API Workspaces", "GitHub Tools").
 *
 * Design rationale:
 * - The drawer is treated as a modal surface (aria-modal + inert) so that
 *   keyboard and screen reader focus stay within navigation while it is open.
 * - Sections expand independently instead of using an accordion pattern so
 *   the user can keep multiple groups visible (e.g. workspaces + GitHub tools).
 * - Body scroll locking is done via a CSS class (`drawer-is-open`) so that the
 *   visual implementation can evolve without changing this controller.
 */
export class NavigationDrawerController {
  /**
   * @param {NavigationDrawerOptions} [options={}]
   *   Optional configuration for wiring the drawer to the DOM.
   *
   * The constructor only resolves DOM references and binds handlers.
   * Call {@link init} to attach event listeners and sync the initial state.
   */
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
    // Drawer shell and global controls
    this.menuButton = menuButton;
    this.navDrawer = navDrawer;
    this.closeDrawerButton = closeDrawerButton;
    this.drawerOverlay = drawerOverlay;
    this.closeOnNavSelectMediaQuery = closeOnNavSelectMediaQuery;

    // Section: About
    this.aboutToggle = aboutToggle;
    this.aboutContent = aboutContent;

    // Section: API workspaces (with backwards-compatible IDs)
    this.androidToggle = androidToggle;
    this.androidContent = androidContent;

    // Section: GitHub tools
    this.githubToggle = githubToggle;
    this.githubContent = githubContent;

    /**
     * Elements that should be made inert while the drawer is open.
     * They opt into this behavior using the [data-drawer-inert-target] attribute.
     */
    this.inertTargets = Array.isArray(inertTargets) ? inertTargets : [];
    this.navLinks = Array.isArray(navLinks) ? navLinks : [];
    this.firstNavItem = firstNavItem;
    this.documentRef = documentRef;
    this.bodyElement = bodyElement;
    this.state = createDrawerState();

    // Bind instance methods so they can be used as event listeners safely.
    this.syncDrawerState = this.syncDrawerState.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.focusFirstNavItem = this.focusFirstNavItem.bind(this);
    this.handleNavItemSelection = this.handleNavItemSelection.bind(this);
  }

  /**
   * Initializes the controller:
   * - Wires up click handlers and keyboard shortcuts.
   * - Applies the initial open/closed state to the drawer.
   *
   * Safe to call multiple times; if the drawer is missing, it exits early.
   */
  init() {
    if (!this.navDrawer) {
      return;
    }

    this.wireButtons();
    this.wireNavLinkCloseBehavior();
    // Change Rationale: The drawer is now a dialog element, so its open state
    // is tracked via the `open` attribute rather than a custom class alone.
    const isDrawerOpen = this.isDialogDrawer()
      ? this.navDrawer.open
      : Boolean(this.navDrawer.classList?.contains('open'));
    this.syncDrawerState(isDrawerOpen);
  }

  /**
   * Wires all interactive elements related to the navigation drawer:
   * - Menu button (open)
   * - Close button (close)
   * - Overlay click (close)
   * - Drawer "changed" events (opened/closed)
   * - ESC key handling
   * - Expandable sections (About, API Workspaces, GitHub Tools)
   *
   * Change rationale:
   * - Sections are initialized via {@link initToggleSection} with a
   *   "defaultExpanded" flag:
   *   - About: collapsed by default
   *   - API Workspaces: expanded by default
   *   - GitHub Tools: expanded by default
   *   This matches the "always visible tooling" design for developer workflows.
   */
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

    // Independent expandable sections inside the drawer
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

  /**
   * Wires nav items so the drawer closes on selection.
   *
   * Change Rationale:
   * - The drawer behaves as a modal surface across breakpoints, so selections
   *   always dismiss it to reveal content and avoid trapping focus.
   *
   * @returns {void}
   */
  wireNavLinkCloseBehavior() {
    if (!this.navDrawer) {
      return;
    }

    this.navLinks.forEach((link) => {
      link.addEventListener('click', this.handleNavItemSelection);
    });
  }

  /**
   * Handles clicks on navigation items, closing the drawer when configured.
   *
   * @returns {void}
   */
  handleNavItemSelection() {
    // Change Rationale: Modal drawers should always collapse after navigation
    // to match Material 3 guidance and keep focus on the newly loaded page.
    if (!this.shouldCloseOnNavSelection()) {
      return;
    }
    this.close();
  }

  /**
   * Opens the navigation drawer and moves focus to the first nav item.
   *
   * - Applies the drawer's `.open` class.
   * - Syncs global state (overlay, inert, aria).
   * - Ensures keyboard focus lands on the first actionable item.
   */
  open() {
    if (!this.navDrawer) {
      return;
    }
    // Change Rationale: Use the native dialog API when available so the drawer
    // behaves like a modal surface, matching BeerCSS's left-dialog pattern.
    if (this.isDialogDrawer() && !this.navDrawer.open) {
      if (typeof this.navDrawer.showModal === 'function') {
        this.navDrawer.showModal();
      } else {
        this.navDrawer.setAttribute('open', '');
      }
    }
    this.navDrawer.classList.add('open');
    this.state = openDrawerState(this.state);
    this.syncDrawerState(this.state.isOpen);
    this.focusFirstNavItem();
  }

  /**
   * Closes the navigation drawer and returns focus to the menu button.
   *
   * - Clears the drawer `.open` class.
   * - Syncs global state and inert areas.
   * - Sends focus back to the menu button (if available) to avoid leaving
   *   focus trapped in an inert subtree.
   */
  close() {
    if (!this.navDrawer) {
      return;
    }
    // Change Rationale: Closing the dialog explicitly ensures the native backdrop
    // is dismissed alongside the custom overlay when the drawer hides.
    if (this.isDialogDrawer() && this.navDrawer.open) {
      if (typeof this.navDrawer.close === 'function') {
        this.navDrawer.close();
      } else {
        this.navDrawer.removeAttribute('open');
      }
    }
    this.navDrawer.classList.remove('open');
    this.state = closeDrawerState(this.state);
    this.syncDrawerState(this.state.isOpen);
    this.menuButton?.focus?.();
  }

  /**
   * Handles global keydown events while the page is active.
   *
   * - Pressing Escape while the drawer is open will close it.
   *
   * @param {KeyboardEvent} event - Keydown event dispatched on document.
   */
  handleKeydown(event) {
    if (event.key === 'Escape' && this.state.isOpen) {
      this.close();
    }
  }

  /**
   * Wires an expandable section inside the drawer so it can open and close
   * independently without collapsing other sections.
   *
   * Change rationale:
   * - Previously, sections behaved like an accordion (opening one would
   *   collapse the others). For this console, we want to allow:
   *   - "API Workspaces" and "GitHub Tools" to be expanded at the same time.
   *   - "About" to remain out of the way unless explicitly expanded.
   *
   * @param {HTMLElement|null} toggleButton - The trigger element that toggles
   *   the section.
   * @param {HTMLElement|null} contentElement - The collapsible content node.
   * @param {{defaultExpanded?: boolean}} [options] - Optional configuration.
   * @param {boolean} [options.defaultExpanded=false]
   *   Whether the section should start in an expanded state.
   */
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

    // Apply initial expansion state based on the configuration and any <details open> default.
    const initialExpanded = parentDetails?.open ?? defaultExpanded;
    applyExpansion(initialExpanded);

    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      const nextExpanded = !contentElement.classList.contains('open');
      applyExpansion(nextExpanded);
    });
  }

  /**
   * Applies the expanded or collapsed state to a drawer section and maintains
   * the related accessibility attributes.
   *
   * - Adds/removes CSS classes used by the navigation drawer styling.
   * - Updates ARIA attributes so screen readers know which section is open.
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

  /**
   * Attempts to move focus to the first actionable navigation list item.
   *
   * Fallback order:
   * 1. First `.nav-link[href]` inside the drawer.
   * 2. The drawer's dedicated close button.
   * 3. Returns false if neither is available.
   *
   * @returns {boolean}
   *   True if focus was moved to a nav target, false otherwise.
   */
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
   * Redirects focus away from areas that become inert while the drawer is open.
   *
   * - If the active element lives inside any `[data-drawer-inert-target]`
   *   region, we move focus back into the drawer (or its close button).
   * - This prevents keyboard users from being "stuck" on an inert element.
   */
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
   * Synchronizes the global drawer state with the DOM.
   *
   * Responsibilities:
   * - Toggle the overlay visibility and aria-hidden.
   * - Add/remove the `drawer-is-open` body class to control scroll locking.
   * - Keep the menu button's `aria-expanded` in sync.
   * - Update modal/inert accessibility for the rest of the page.
   *
   * @param {boolean} isOpened - Whether the drawer is considered open.
   */
  syncDrawerState(isOpened) {
    const hasDrawer = Boolean(this.navDrawer);
    const isDrawerOpen = Boolean(isOpened && hasDrawer);

    // Always clean up global scroll locking even if the drawer element is missing
    // (e.g., during fast navigations) so pages never stay stuck with overflow hidden.
    // Change Rationale: BeerCSS uses the `overlay` helper class for scrims, which
    // expects an `active` state to appear; align the controller with the framework.
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
   * Determines whether the navigation drawer element is a dialog.
   *
   * @returns {boolean} True when the drawer is an HTMLDialogElement.
   */
  isDialogDrawer() {
    return typeof HTMLDialogElement !== 'undefined'
      && this.navDrawer instanceof HTMLDialogElement;
  }

  /**
   * Reserves the scrollbar gutter while the drawer locks page scroll.
   *
   * Change Rationale: locking the body with `overflow: hidden` removed the
   * scrollbar and shifted content horizontally when the drawer opened. By
   * applying a compensation padding that matches the current scrollbar width,
   * the layout remains stable while still preventing background scroll,
   * aligning with Material guidance to avoid disruptive motion.
   *
   * @param {boolean} isDrawerOpen - Whether the navigation drawer is open.
   */
  setBodyScrollbarCompensation() {
    // Change Rationale: Beer CSS drawers overlay content without shifting the layout.
    // The previous scrollbar compensation padding pushed the page horizontally on open,
    // so it has been retired in favor of the framework's built-in gutters.
  }

  /**
   * Updates the inert and aria-hidden state of the rest of the page
   * while the drawer is open.
   *
   * - When the drawer is open, all `[data-drawer-inert-target]` elements:
   *   - Receive the `inert` attribute (blocked from focus/interaction).
   *   - Are marked `aria-hidden="true"` so screen readers ignore them.
   * - When the drawer closes, these attributes are removed.
   *
   * @param {boolean} isDrawerOpen - Whether the drawer is currently open.
   */
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

  /**
   * Checks whether the drawer should close after a navigation selection.
   *
   * @returns {boolean}
   */
  shouldCloseOnNavSelection() {
    // Change Rationale: The drawer is now always modal, so navigation selections
    // consistently dismiss it across viewport sizes to match MD3 expectations.
    return true;
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
