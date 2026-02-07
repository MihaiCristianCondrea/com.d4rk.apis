/**
 * @file Route registration idempotency tests.
 */
/*
 * Change Rationale: Mock raw HTML imports so route modules can load in Jest and then
 * assert idempotent registration behavior when those modules are imported multiple times.
 */

jest.mock(
  '../../app/src/main/js/app/githubtools/gitpatch/ui/GitPatchScreen.html?raw',
  () => '<div>Git Patch Screen</div>',
  { virtual: true }
);
jest.mock(
  '../../app/src/main/js/app/githubtools/gitpatch/ui/views/GitPatchFormView.html?raw',
  () => '<div>Git Patch Form</div>',
  { virtual: true }
);
jest.mock(
  '../../app/src/main/js/app/githubtools/releasestats/ui/ReleaseStatsScreen.html?raw',
  () => '<div>Release Stats Screen</div>',
  { virtual: true }
);
jest.mock(
  '../../app/src/main/js/app/githubtools/releasestats/ui/views/ReleaseStatsFormView.html?raw',
  () => '<div>Release Stats Form</div>',
  { virtual: true }
);
jest.mock(
  '../../app/src/main/js/app/githubtools/common/ui/views/GitHubToolHeaderView.html?raw',
  () => '<header>Header</header>',
  { virtual: true }
);
jest.mock(
  '../../app/src/main/js/app/githubtools/common/ui/views/GitHubToolCardView.html?raw',
  () => '<section>Card</section>',
  { virtual: true }
);
jest.mock(
  '../../app/src/main/js/app/githubtools/common/ui/views/GitHubEmptyStateView.html?raw',
  () => '<div>Empty</div>',
  { virtual: true }
);

test('GitPatchRoute registers once even when imported twice', () => {
  jest.resetModules();
  let result;
  jest.isolateModules(() => {
    const { RouterRoutes } = require('../../app/src/main/js/core/ui/router/routes.js');
    const { registerGitPatchRoute } = require(
      '../../app/src/main/js/app/githubtools/gitpatch/ui/GitPatchRoute.js'
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
    const { RouterRoutes } = require('../../app/src/main/js/core/ui/router/routes.js');
    const { registerReleaseStatsRoute } = require(
      '../../app/src/main/js/app/githubtools/releasestats/ui/ReleaseStatsRoute.js'
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
