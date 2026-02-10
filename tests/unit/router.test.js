/**
 * Router and app shell tests.
 */
// Change Rationale: Replace the legacy skipped suite with focused tests that guard
// shell behaviors (app bar scroll elevation) and navigation selection state.

const mockDomUtils = {
  getDynamicElement: jest.fn(),
  updateCopyrightYear: jest.fn(),
  showPageLoadingOverlay: jest.fn(),
  hidePageLoadingOverlay: jest.fn(),
  rafThrottle: (fn) => fn,
};

jest.mock('../../src/core/ui/utils/domUtils.js', () => mockDomUtils);

jest.mock('../../src/core/ui/components/navigation/themeControlsOrchestrator.js', () => ({
  initThemeControlsFromDom: jest.fn(),
}));

jest.mock('../../src/core/ui/components/navigation/navigationDrawerBindings.js', () => ({
  initNavigationDrawer: jest.fn(() => ({ close: jest.fn() })),
}));

// Change Rationale: Mock the navigation view import so appShell can load under Jest
// without requiring the raw Vite HTML loader in the test environment.
jest.mock(
  '../../src/core/ui/components/navigation/AppNavigationView.html?raw',
  () => '<div data-app-navigation></div>',
  { virtual: true }
);

jest.mock('../../src/core/ui/router/index.js', () => ({
  initRouter: jest.fn(),
  loadPageContent: jest.fn(),
  normalizePageId: jest.fn((id) => id),
}));

jest.mock('../../src/core/ui/router/routes.js', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../src/core/ui/globals.js', () => ({
  registerGlobalUtilities: jest.fn(),
  registerCompatibilityGlobals: jest.fn(),
}));

const { updateActiveNavLink } = require('../../src/core/ui/router/navigationState.js');

function setupAppShellDom() {
  document.body.innerHTML = `
    <header id="topAppBar" class="app-top-app-bar">
      <nav>
        <button id="menuButton" type="button">Menu</button>
        <h5 id="appBarHeadline">API Console</h5>
      </nav>
    </header>
    <main id="pageContentArea" data-drawer-inert-target>
      <div id="mainContentPage" class="page-section active"></div>
    </main>
  `;
}

// Change Rationale: The shell must elevate the top app bar on scroll to match the
// stock Material behavior without custom styling.
test('app shell toggles app bar elevation on scroll', () => {
  setupAppShellDom();
  mockDomUtils.getDynamicElement.mockImplementation((id) => document.getElementById(id));

  Object.defineProperty(window, 'scrollY', {
    value: 0,
    writable: true,
    configurable: true,
  });

  jest.resetModules();
  require('../../src/core/ui/appShell.js');

  document.dispatchEvent(new Event('DOMContentLoaded'));

  const appBar = document.getElementById('topAppBar');
  expect(appBar.classList.contains('fill')).toBe(true);
  expect(appBar.classList.contains('elevate')).toBe(false);

  window.scrollY = 10;
  window.dispatchEvent(new Event('scroll'));

  expect(appBar.classList.contains('elevate')).toBe(true);
});


// Change Rationale: Route lifecycle now resolves from registered feature modules,
// so app shell must not pass legacy global fallback handlers to the router runtime.
test('app shell initializes router without global lifecycle fallbacks', () => {
  setupAppShellDom();
  mockDomUtils.getDynamicElement.mockImplementation((id) => document.getElementById(id));

  jest.resetModules();
  require('../../src/core/ui/appShell.js');

  document.dispatchEvent(new Event('DOMContentLoaded'));

  const { initRouter } = require('../../src/core/ui/router/index.js');
  const { registerCompatibilityGlobals } = require('../../src/core/ui/globals.js');

  expect(initRouter).toHaveBeenCalled();
  const options = initRouter.mock.calls[0][3];
  expect(options.onHomeLoad).toBeUndefined();
  expect(options.pageHandlers).toBeUndefined();

  expect(registerCompatibilityGlobals).toHaveBeenCalled();
  const globalsConfig = registerCompatibilityGlobals.mock.calls[0][0];
  expect(globalsConfig.initHomePage).toBeUndefined();
  expect(globalsConfig.initAppToolkitWorkspace).toBeUndefined();
  expect(globalsConfig.initEnglishWorkspace).toBeUndefined();
  expect(globalsConfig.initAndroidTutorialsWorkspace).toBeUndefined();
});

// Change Rationale: Guard the active navigation state so only one drawer item
// is selected at a time with the expected ARIA attributes.
test('updateActiveNavLink marks the current route as selected', () => {
  document.body.innerHTML = `
    <dialog id="navDrawer">
      <a class="nav-link" data-nav-link href="#home">Home</a>
      <a class="nav-link" data-nav-link href="#faq-api">FAQ</a>
      <a class="nav-link" data-nav-link href="#app-toolkit-api">App Toolkit</a>
    </dialog>
  `;

  updateActiveNavLink('#faq-api');

  const links = Array.from(document.querySelectorAll('.nav-link'));
  const activeLinks = links.filter((link) => link.classList.contains('active'));

  expect(activeLinks).toHaveLength(1);
  expect(activeLinks[0].getAttribute('href')).toBe('#faq-api');
  expect(activeLinks[0].getAttribute('aria-current')).toBe('page');
  expect(activeLinks[0].getAttribute('aria-selected')).toBe('true');
});
