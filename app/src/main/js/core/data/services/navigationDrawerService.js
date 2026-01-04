// Change Rationale: Navigation drawer now pulls shared DOM helpers from the UI utility layer
// to honor the core/ui separation while keeping behavior identical.
// Change Rationale: Drawer logic has been rewritten for Beer CSS so the shell uses semantic
// HTML (<nav>, <details>, <summary>) instead of Material custom elements. The controller now
// toggles a simple `.open` class and syncs <details> expansion state instead of relying on the
// `opened` property from md-navigation-drawer. This removes the body padding shim that pushed
// content sideways when the drawer opened while preserving accessibility guards.
import { getDynamicElement } from '@/core/ui/utils/domUtils.js';

/**
 * @typedef {Object} NavigationDrawerOptions
 * @property {string} [menuButtonId='menuButton']
 *   ID of the button that opens the navigation drawer.
 * @property {string} [navDrawerId='navDrawer']
 *   ID of the drawer container element (Beer CSS drawer container).
 * @property {string} [closeDrawerId='closeDrawerButton']
 *   ID of the explicit close button inside the drawer.
 * @property {string} [overlayId='drawerOverlay']
 *   ID of the overlay element that sits behind the drawer.
 * @property {string} [aboutToggleId='aboutToggle']
 *   ID of the toggle button controlling the "About" section in the drawer.
 * @property {string} [aboutContentId='aboutContent']
 *   ID of the collapsible content node for the "About" section.
 * @property {string} [androidToggleId='apiWorkspacesToggle']
 *   ID of the toggle button controlling the "API Workspaces" section.
 *   Falls back to "androidAppsToggle" for older markup.
 * @property {string} [androidContentId='apiWorkspacesContent']
 *   ID of the collapsible content node for "API Workspaces".
 *   Falls back to "androidAppsContent" for older markup.
 * @property {string} [githubToggleId='githubToolsToggle']
 *   ID of the toggle button controlling the "GitHub Tools" section.
 * @property {string} [githubContentId='githubToolsContent']
 *   ID of the collapsible content node for the "GitHub Tools" section.
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
    // Drawer shell and global controls
    this.menuButton = getDynamicElement(menuButtonId);
    this.navDrawer = getDynamicElement(navDrawerId);
    this.closeDrawerButton = getDynamicElement(closeDrawerId);
    this.drawerOverlay = getDynamicElement(overlayId);

    // Section: About
    this.aboutToggle = getDynamicElement(aboutToggleId);
    this.aboutContent = getDynamicElement(aboutContentId);

    // Section: API workspaces (with backwards-compatible IDs)
    this.androidToggle =
        getDynamicElement(androidToggleId) ||
        getDynamicElement('androidAppsToggle');
    this.androidContent =
        getDynamicElement(androidContentId) ||
        getDynamicElement('androidAppsContent');

    // Section: GitHub tools
    this.githubToggle = getDynamicElement(githubToggleId);
    this.githubContent = getDynamicElement(githubContentId);

    /**
     * Elements that should be made inert while the drawer is open.
     * They opt into this behavior using the [data-drawer-inert-target] attribute.
     */
    this.inertTargets = Array.from(
        typeof document !== 'undefined'
            ? document.querySelectorAll('[data-drawer-inert-target]')
            : [],
    );

    // Bind instance methods so they can be used as event listeners safely.
    this.syncDrawerState = this.syncDrawerState.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.focusFirstNavItem = this.focusFirstNavItem.bind(this);
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
    this.syncDrawerState(Boolean(this.navDrawer.classList?.contains('open')));
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

    document.addEventListener('keydown', this.handleKeydown);

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
    this.navDrawer.classList.add('open');
    this.syncDrawerState(true);
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
    this.navDrawer.classList.remove('open');
    this.syncDrawerState(false);
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
    if (event.key === 'Escape' && this.navDrawer?.classList?.contains('open')) {
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
    const firstNavItem = this.navDrawer.querySelector('.nav-link[href]');
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

  /**
   * Redirects focus away from areas that become inert while the drawer is open.
   *
   * - If the active element lives inside any `[data-drawer-inert-target]`
   *   region, we move focus back into the drawer (or its close button).
   * - This prevents keyboard users from being "stuck" on an inert element.
   */
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
    this.drawerOverlay?.classList.toggle('open', isDrawerOpen);
    this.drawerOverlay?.setAttribute('aria-hidden', isDrawerOpen ? 'false' : 'true');
    document.body.classList.toggle('drawer-is-open', isDrawerOpen);
    this.navDrawer?.classList.toggle('open', isDrawerOpen);
    this.menuButton?.setAttribute('aria-expanded', isDrawerOpen ? 'true' : 'false');

    this.updateModalAccessibilityState(isDrawerOpen);

    if (!hasDrawer) {
      return;
    }
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
}

/**
 * Convenience initializer for the navigation drawer controller.
 *
 * - Creates a new {@link NavigationDrawerController}.
 * - Calls {@link NavigationDrawerController.init} immediately.
 * - Returns the controller instance so callers can hook into it
 *   for testing or custom behaviors.
 *
 * @param {NavigationDrawerOptions} [options={}]
 *   Optional configuration for element IDs.
 * @returns {NavigationDrawerController}
 *   The initialized navigation drawer controller.
 */
export function initNavigationDrawer(options = {}) {
  const controller = new NavigationDrawerController(options);
  controller.init();
  return controller;
}
