/**
 * @file Route registration idempotency tests.
 */
/*
 * Change Rationale: Mock raw HTML imports so route modules can load in Jest and then
 * assert idempotent registration behavior when those modules are imported multiple times.
 */

jest.mock(
  '../../src/features/github-tools/gitpatch/ui/GitPatchScreen.html?raw',
  () => '<div>Git Patch Screen</div>',
  { virtual: true }
);
jest.mock(
  '../../src/features/github-tools/gitpatch/ui/views/GitPatchFormView.html?raw',
  () => '<div>Git Patch Form</div>',
  { virtual: true }
);
jest.mock(
  '../../src/features/github-tools/releasestats/ui/ReleaseStatsScreen.html?raw',
  () => '<div>Release Stats Screen</div>',
  { virtual: true }
);
jest.mock(
  '../../src/features/github-tools/releasestats/ui/views/ReleaseStatsFormView.html?raw',
  () => '<div>Release Stats Form</div>',
  { virtual: true }
);
jest.mock(
  '../../src/features/github-tools/common/ui/views/GitHubToolHeaderView.html?raw',
  () => '<header>Header</header>',
  { virtual: true }
);
jest.mock(
  '../../src/features/github-tools/common/ui/views/GitHubToolCardView.html?raw',
  () => '<section>Card</section>',
  { virtual: true }
);
jest.mock(
  '../../src/features/github-tools/common/ui/views/GitHubEmptyStateView.html?raw',
  () => '<div>Empty</div>',
  { virtual: true }
);

test('GitPatchRoute registers once even when imported twice', () => {
  jest.resetModules();
  let result;
  jest.isolateModules(() => {
    const { RouterRoutes } = require('../../src/core/ui/router/routes.js');
    const { registerGitPatchRoute } = require(
      '../../src/pages/github-tools/routes/git-patch-route.js'
    );
    const initialRoutes = RouterRoutes.getRoutes();

    registerGitPatchRoute();
    registerGitPatchRoute();

    const routes = RouterRoutes.getRoutes();
    const gitPatchRoutes = routes.filter((route) => route.id === 'git-patch');
    result = { routes, gitPatchRoutes, initialCount: initialRoutes.length };
  });

  expect(result.gitPatchRoutes).toHaveLength(1);
  expect(result.routes).toHaveLength(result.initialCount);
});

test('ReleaseStatsRoute registers once even when imported twice', () => {
  jest.resetModules();
  let result;
  jest.isolateModules(() => {
    const { RouterRoutes } = require('../../src/core/ui/router/routes.js');
    const { registerReleaseStatsRoute } = require(
      '../../src/pages/github-tools/routes/release-stats-route.js'
    );
    const initialRoutes = RouterRoutes.getRoutes();

    registerReleaseStatsRoute();
    registerReleaseStatsRoute();

    const routes = RouterRoutes.getRoutes();
    const releaseStatsRoutes = routes.filter((route) => route.id === 'release-stats');
    result = { routes, releaseStatsRoutes, initialCount: initialRoutes.length };
  });

  expect(result.releaseStatsRoutes).toHaveLength(1);
  expect(result.routes).toHaveLength(result.initialCount);
});

jest.mock(
  '../../src/pages/home/ui/home.page.html?raw',
  () => '<div>Home Screen</div>',
  { virtual: true }
);

jest.mock(
  '../../src/pages/home/ui/views/action-card.view.html?raw',
  () => '<template data-view="action-card"><article>Action Card</article></template>',
  { virtual: true }
);

jest.mock(
  '../../src/pages/home/ui/views/info-card.view.html?raw',
  () => '<template data-view="info-card"><article>Info Card</article></template>',
  { virtual: true }
);


test('HomeRoute registers mount lifecycle through RouterRoutes without globals', () => {
  jest.resetModules();
  let result;
  jest.isolateModules(() => {
    const { RouterRoutes } = require('../../src/core/ui/router/routes.js');
    const homeRouteModule = require('../../src/pages/home/index.js');

    homeRouteModule.registerHomeRoute();
    const homeRoute = RouterRoutes.getRoute('home');

    result = {
      hasMount: typeof homeRouteModule.mountHomeRoute === 'function',
      hasUnmount: typeof homeRouteModule.unmountHomeRoute === 'function',
      hasOnLoad: typeof homeRoute?.onLoad === 'function',
      globalInitHomePage: typeof window.initHomePage,
    };
  });

  expect(result.hasMount).toBe(true);
  expect(result.hasUnmount).toBe(true);
  expect(result.hasOnLoad).toBe(true);
  expect(result.globalInitHomePage).toBe('undefined');
});
