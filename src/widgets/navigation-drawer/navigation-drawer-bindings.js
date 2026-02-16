import { NavigationDrawerController } from '@/core/data/services/navigationDrawerService.js';
import { getDynamicElement } from '@/core/ui/utils/domUtils.js';

/**
 * Resolves navigation drawer DOM references for controller initialization.
 *
 * @param {{
 *   menuButtonId?: string,
 *   navDrawerId?: string,
 *   backdropId?: string,
 *   closeDrawerId?: string,
 *   aboutToggleId?: string,
 *   aboutContentId?: string,
 *   androidToggleId?: string,
 *   androidContentId?: string,
 *   githubToggleId?: string,
 *   githubContentId?: string,
 * }} [options]
 * @returns {import('@/core/data/services/navigationDrawerService.js').NavigationDrawerOptions}
 */
export function resolveNavigationDrawerBindings({
  menuButtonId = 'menuButton',
  navDrawerId = 'navDrawer',
  backdropId = 'navDrawerBackdrop',
  closeDrawerId = 'closeDrawerButton',
  aboutToggleId = 'aboutToggle',
  aboutContentId = 'aboutContent',
  androidToggleId = 'apiWorkspacesToggle',
  androidContentId = 'apiWorkspacesContent',
  githubToggleId = 'githubToolsToggle',
  githubContentId = 'githubToolsContent',
} = {}) {
  const navDrawer = getDynamicElement(navDrawerId);
  return {
    menuButton: getDynamicElement(menuButtonId),
    navDrawer,
    drawerBackdrop: getDynamicElement(backdropId),
    closeDrawerButton: getDynamicElement(closeDrawerId),
    aboutToggle: getDynamicElement(aboutToggleId),
    aboutContent: getDynamicElement(aboutContentId),
    androidToggle: getDynamicElement(androidToggleId) || getDynamicElement('androidAppsToggle'),
    androidContent: getDynamicElement(androidContentId) || getDynamicElement('androidAppsContent'),
    githubToggle: getDynamicElement(githubToggleId),
    githubContent: getDynamicElement(githubContentId),
    navLinks: Array.from(navDrawer?.querySelectorAll('.nav-link[href]') || []),
    firstNavItem: navDrawer?.querySelector('.nav-link[href]') || null,
    documentRef: typeof document !== 'undefined' ? document : null,
    bodyElement: typeof document !== 'undefined' ? document.body : null,
  };
}

/**
 * Initializes the navigation drawer by binding DOM refs in the UI layer.
 *
 * @param {object} [options]
 * @returns {NavigationDrawerController}
 */
export function initNavigationDrawer(options = {}) {
  const controller = new NavigationDrawerController(resolveNavigationDrawerBindings(options));
  controller.init();
  return controller;
}
