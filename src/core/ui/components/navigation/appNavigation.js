/**
 * @file Centralized navigation bootstrapper for the app shell rail + drawer.
 */
// Change Rationale: Navigation wiring now lives in a single core/ui component so
// routing, focus management, and BeerCSS surfaces stay consistent across screens
// without duplicating markup or event handlers in feature HTML.
import AppNavigationView from './AppNavigationView.html?raw';
// Change Rationale: Navigation rendering is now data-driven, so the app shell
// can hydrate both rail and drawer from a single source of truth.
import { hydrateNavigationContainers } from './navigationRenderer.js';
import { initNavigationDrawer } from '@/core/data/services/navigationDrawerService.js';
import { getDynamicElement } from '@/core/ui/utils/domUtils.js';
import RouterRoutes from '@/core/ui/router/routes.js';
import { loadPageContent, normalizePageId, updateActiveNavLink } from '@/core/ui/router/index.js';

/**
 * Injects the app navigation view into the DOM.
 *
 * @param {HTMLElement} mountEl Element that will receive the navigation markup.
 * @returns {HTMLElement|null} Root navigation element, if mounted.
 */
function mountNavigation(mountEl) {
  if (!mountEl) {
    return null;
  }

  if (mountEl.querySelector('[data-app-navigation]')) {
    return mountEl.querySelector('[data-app-navigation]');
  }

  mountEl.innerHTML = AppNavigationView;
  return mountEl.querySelector('[data-app-navigation]');
}

/**
 * Handles navigation clicks inside the navigation rail/drawer.
 *
 * @param {MouseEvent} event Click event from the navigation container.
 * @returns {void}
 */
function handleNavigationClick(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') {
    return;
  }

  const navLink = target.closest('a[data-nav-link][href^="#"]');
  if (!navLink) {
    return;
  }

  const href = navLink.getAttribute('href');
  if (!href) {
    return;
  }

  const normalizedId = normalizePageId(href);
  if (!normalizedId) {
    return;
  }

  const hasRoute = typeof RouterRoutes?.hasRoute === 'function'
    ? RouterRoutes.hasRoute.bind(RouterRoutes)
    : (routeId) => {
      if (typeof RouterRoutes?.getRoute === 'function') {
        return Boolean(RouterRoutes.getRoute(routeId));
      }
      const routeMap = RouterRoutes?.PAGE_ROUTES;
      return Boolean(routeMap && routeMap[routeId]);
    };

  if (!hasRoute(normalizedId)) {
    return;
  }

  event.preventDefault();
  void loadPageContent(normalizedId);
}

/**
 * Initializes the canonical app navigation component.
 *
 * Responsibilities:
 * - Inject the navigation rail + drawer markup into the shell.
 * - Wire BeerCSS drawer open/close behaviors.
 * - Delegate navigation clicks to the router.
 * - Sync the initial active route highlight.
 *
 * @param {Object} [options]
 * @param {string} [options.mountId='appNavigationMount'] ID of the navigation mount node.
 * @param {Object} [options.drawerOptions] Optional options forwarded to the drawer controller.
 * @returns {import('@/core/data/services/navigationDrawerService.js').NavigationDrawerController | null}
 */
export function initAppNavigation({
  mountId = 'appNavigationMount',
  drawerOptions = {},
} = {}) {
  const mountEl = getDynamicElement(mountId);
  const navRoot = mountNavigation(mountEl);
  if (!navRoot) {
    return null;
  }

  // Change Rationale: Shared navigation data now hydrates both rail and drawer
  // containers to keep labels, routes, and descriptions consistent.
  hydrateNavigationContainers(navRoot);

  // Change Rationale: Guard against duplicate event handlers if the initializer
  // is called multiple times during hot reload or legacy bootstrap flows.
  if (!navRoot.dataset.navigationWired) {
    navRoot.addEventListener('click', handleNavigationClick);
    navRoot.dataset.navigationWired = 'true';
  }

  const controller = initNavigationDrawer(drawerOptions);

  // Change Rationale: Guard against non-browser contexts (tests/build tools) so
  // the initializer can run without assuming a global window object.
  const initialHash = typeof window !== 'undefined' ? window.location.hash : '#home';
  updateActiveNavLink(initialHash || '#home');

  return controller;
}
