// codex/add-tests-for-router.js-with-jsdom (resolved)

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');

const routerScript = fs.readFileSync(path.resolve(__dirname, '../assets/js/router.js'), 'utf8');

const DEFAULT_HTML = `
<!DOCTYPE html>
<html>
  <body>
    <div id="navDrawer">
      <md-list-item id="nav-home" href="#home"></md-list-item>
      <button id="nestedToggle" aria-controls="nestedRoutes"></button>
      <div class="nested-list" id="nestedRoutes">
        <md-list-item id="nav-projects" href="#projects"></md-list-item>
      </div>
      <md-list-item id="nav-blog" href="#blog"></md-list-item>
    </div>
    <div id="pageContent"></div>
    <h1 id="appBarHeadline"></h1>
  </body>
</html>
`;

function createRouterWindow(html = DEFAULT_HTML) {
  const dom = new JSDOM(html, { url: 'https://example.com/#home', runScripts: 'dangerously' });
  const { window } = dom;
  window.scrollTo = jest.fn();
  const context = dom.getInternalVMContext();
  vm.runInContext(
    `${routerScript}
window.callCallback = callCallback;
window.normalizePageId = normalizePageId;
window.initRouter = initRouter;
window.loadPageContent = loadPageContent;
window.updateActiveNavLink = updateActiveNavLink;
window.__getRouterRuntime = () => routerRuntime;`,
    context
  );
  vm.runInContext(
    'window.__applyTimerMocks = () => { setTimeout = globalThis.setTimeout; clearTimeout = globalThis.clearTimeout; };',
    context
  );
  vm.runInContext(
    'window.__wrapSetTimeout = handler => { const original = setTimeout; setTimeout = function(cb, delay, ...args) { handler(delay); return original.call(this, cb, delay, ...args); }; window.setTimeout = setTimeout; };',
    context
  );
  return window;
}

describe('router helpers', () => {
  test('callCallback handles falsy callbacks and errors gracefully', () => {
    const window = createRouterWindow();
    const { callCallback } = window;

    expect(callCallback(null, 'noop')).toBe(false);

    const callback = jest.fn();
    expect(callCallback(callback, 'callback', 'arg1', 'arg2')).toBe(true);
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');

    const error = new Error('boom');
    const failing = jest.fn(() => { throw error; });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(callCallback(failing, 'failing callback', 'id')).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('Router: Error running failing callback:', error);

    errorSpy.mockRestore();
  });

  test('normalizePageId standardizes inputs', () => {
    const window = createRouterWindow();
    const { normalizePageId } = window;

    expect(normalizePageId('#about')).toBe('about');
    expect(normalizePageId('index.html')).toBe('home');
    expect(normalizePageId('')).toBe('home');
    expect(normalizePageId(null)).toBe('home');
    expect(normalizePageId('blog')).toBe('blog');
  });

  test('initRouter normalizes runtime options and page handlers', () => {
    const window = createRouterWindow();
    const { document, initRouter } = window;

    const showOverlay = jest.fn();
    const hideOverlay = jest.fn();
    const closeDrawer = jest.fn();
    const onHomeLoad = jest.fn();
    const projectsHandler = jest.fn();

    initRouter(
      document.getElementById('pageContent'),
      document.getElementById('appBarHeadline'),
      '<div>Home</div>',
      {
        showOverlay,
        hideOverlay: 'not a function',
        closeDrawer,
        onHomeLoad,
        pageHandlers: {
          '#projects': projectsHandler,
          invalid: 'nope'
        }
      }
    );

    const runtime = window.__getRouterRuntime();
    expect(runtime.showOverlay).toBe(showOverlay);
    expect(typeof runtime.hideOverlay).toBe('function');
    expect(runtime.hideOverlay).not.toBe('not a function');
    expect(runtime.closeDrawer).toBe(closeDrawer);
    expect(runtime.onHomeLoad).toBe(onHomeLoad);
    expect(runtime.pageHandlers.projects).toBe(projectsHandler);
    expect(Object.keys(runtime.pageHandlers)).toEqual(['projects']);
  });
});

describe('loadPageContent behavior', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('loads a page successfully and updates navigation', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const window = createRouterWindow();
    const { document, initRouter, loadPageContent } = window;
    window.setTimeout = setTimeout;
    window.clearTimeout = clearTimeout;
    window.__applyTimerMocks();
    jest.spyOn(window.Date, 'now').mockReturnValue(0);

    const pageContentArea = document.getElementById('pageContent');
    const appBarHeadline = document.getElementById('appBarHeadline');
    const navHome = document.getElementById('nav-home');
    const navProjects = document.getElementById('nav-projects');
    const toggleButton = document.getElementById('nestedToggle');
    toggleButton.click = jest.fn();

    navHome.classList.add('nav-item-active');
    navHome.setAttribute('active', '');
    navHome.active = true;
    navProjects.active = false;

    const showOverlay = jest.fn();
    const hideOverlay = jest.fn();
    const closeDrawer = jest.fn();
    const onHomeLoad = jest.fn();
    const projectsHandler = jest.fn();
    const readyHook = jest.fn();

    window.RouterRoutes = {
      getRoute: jest.fn().mockReturnValue({ id: 'projects', title: 'Projects' })
    };

    const fetchPageMarkup = jest.fn().mockResolvedValue({
      status: 'success',
      title: 'Projects',
      html: '<div class="page-section active">Projects</div>',
      onReady: readyHook
    });

    window.RouterContentLoader = {
      fetchPageMarkup,
      DEFAULT_PAGE_TITLE: "Mihai's Profile"
    };

    const updateTitle = jest.fn();
    const pushState = jest.fn();
    window.RouterHistory = {
      updateTitle,
      pushState
    };

    const fadeOut = jest.fn().mockResolvedValue();
    const fadeIn = jest.fn().mockResolvedValue();
    window.RouterAnimation = { fadeOut, fadeIn };

    initRouter(pageContentArea, appBarHeadline, '<div>Home</div>', {
      showOverlay,
      hideOverlay,
      closeDrawer,
      onHomeLoad,
      pageHandlers: {
        projects: projectsHandler
      }
    });

    const loadPromise = loadPageContent('#projects');

    expect(showOverlay).toHaveBeenCalledTimes(1);
    expect(closeDrawer).toHaveBeenCalledTimes(1);
    expect(hideOverlay).not.toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    await jest.advanceTimersByTimeAsync(599);
    expect(hideOverlay).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    await loadPromise;

    expect(hideOverlay).toHaveBeenCalledTimes(1);
    expect(fetchPageMarkup).toHaveBeenCalledWith('projects', { initialHomeHTML: '<div>Home</div>' });
    expect(fadeOut).toHaveBeenCalledWith(pageContentArea);
    expect(updateTitle).toHaveBeenCalledWith(appBarHeadline, 'Projects');
    expect(pushState).toHaveBeenCalledWith('projects', 'Projects', 'projects', true);

    expect(projectsHandler).toHaveBeenCalledWith('projects');
    expect(onHomeLoad).not.toHaveBeenCalled();
    expect(readyHook).not.toHaveBeenCalled();

    expect(pageContentArea.innerHTML).toContain('Projects');
    expect(navHome.classList.contains('nav-item-active')).toBe(false);
    expect(navHome.hasAttribute('active')).toBe(false);
    expect(navHome.active).toBe(false);

    expect(navProjects.classList.contains('nav-item-active')).toBe(true);
    expect(navProjects.getAttribute('aria-current')).toBe('page');
    expect(navProjects.getAttribute('aria-selected')).toBe('true');
    expect(navProjects.active).toBe(true);
    expect(toggleButton.click).toHaveBeenCalledTimes(1);

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(fadeIn).toHaveBeenCalledWith(pageContentArea);
  });

  test('handles unknown routes with not-found messaging', async () => {
    const window = createRouterWindow();
    const { document, initRouter, loadPageContent } = window;

    const pageContentArea = document.getElementById('pageContent');
    const appBarHeadline = document.getElementById('appBarHeadline');

    const showOverlay = jest.fn();
    const hideOverlay = jest.fn();
    const closeDrawer = jest.fn();

    window.RouterRoutes = {
      getRoute: jest.fn().mockReturnValue(null)
    };
    window.RouterContentLoader = {
      fetchPageMarkup: jest.fn()
    };
    const updateTitle = jest.fn();
    window.RouterHistory = { updateTitle };
    window.RouterAnimation = {
      fadeOut: jest.fn(),
      fadeIn: jest.fn()
    };

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    initRouter(pageContentArea, appBarHeadline, '<div>Home</div>', {
      showOverlay,
      hideOverlay,
      closeDrawer
    });

    await loadPageContent('missing-page');

    expect(showOverlay).toHaveBeenCalledTimes(1);
    expect(closeDrawer).toHaveBeenCalledTimes(1);
    expect(window.RouterContentLoader.fetchPageMarkup).not.toHaveBeenCalled();

    expect(pageContentArea.innerHTML).toContain('Page not found: missing-page');
    expect(updateTitle).toHaveBeenCalledWith(appBarHeadline, 'Not Found');
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(hideOverlay).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('Router: Unknown page:', 'missing-page');

    warnSpy.mockRestore();
  });

  test('surfaces loader errors and updates fallback UI', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const window = createRouterWindow();
    const { document, initRouter, loadPageContent } = window;
    window.setTimeout = setTimeout;
    window.clearTimeout = clearTimeout;
    window.__applyTimerMocks();
    jest.spyOn(window.Date, 'now').mockReturnValue(0);

    const pageContentArea = document.getElementById('pageContent');
    const appBarHeadline = document.getElementById('appBarHeadline');
    const navBlog = document.getElementById('nav-blog');
    navBlog.active = false;

    const showOverlay = jest.fn();
    const hideOverlay = jest.fn();
    const closeDrawer = jest.fn();

    window.RouterRoutes = {
      getRoute: jest.fn().mockReturnValue({ id: 'blog', title: 'Blog' })
    };

    const loaderError = new Error('Network issue');
    const fetchPageMarkup = jest.fn().mockRejectedValue(loaderError);
    window.RouterContentLoader = {
      fetchPageMarkup,
      DEFAULT_PAGE_TITLE: 'Profile'
    };

    const updateTitle = jest.fn();
    const pushState = jest.fn();
    window.RouterHistory = { updateTitle, pushState };

    const fadeOut = jest.fn().mockResolvedValue();
    const fadeIn = jest.fn().mockResolvedValue();
    window.RouterAnimation = { fadeOut, fadeIn };

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    initRouter(pageContentArea, appBarHeadline, '<div>Home</div>', {
      showOverlay,
      hideOverlay,
      closeDrawer
    });

    const loadPromise = loadPageContent('blog');

    expect(showOverlay).toHaveBeenCalledTimes(1);
    expect(closeDrawer).toHaveBeenCalledTimes(1);
    expect(hideOverlay).not.toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    await jest.advanceTimersByTimeAsync(600);
    await loadPromise;

    expect(fetchPageMarkup).toHaveBeenCalledWith('blog', { initialHomeHTML: '<div>Home</div>' });
    expect(fadeOut).toHaveBeenCalledWith(pageContentArea);
    expect(pageContentArea.innerHTML).toContain('Failed to load page. Network issue');
    expect(updateTitle).toHaveBeenCalledWith(appBarHeadline, 'Error');
    expect(pushState).toHaveBeenCalledWith('blog', 'Error', 'blog', true);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    expect(navBlog.classList.contains('nav-item-active')).toBe(true);
    expect(navBlog.getAttribute('aria-current')).toBe('page');
    expect(navBlog.getAttribute('aria-selected')).toBe('true');
    expect(navBlog.active).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('Error loading Error:', loaderError);
    expect(hideOverlay).toHaveBeenCalledTimes(1);
    expect(fadeIn).toHaveBeenCalledWith(pageContentArea);

    errorSpy.mockRestore();
  });
});

/* ===== Additional module-level tests (from other branch) ===== */

const ROUTES_PATH = '../assets/js/router/routes.js';
const CONTENT_LOADER_PATH = '../assets/js/router/contentLoader.js';

const originalGlobalFetch = global.fetch;
const originalWindowFetch = typeof window !== 'undefined' ? window.fetch : undefined;

function loadRouterModules() {
  jest.resetModules();

  delete global.RouterRoutes;
  delete global.RouterContentLoader;
  delete global.registerRoute;

  if (typeof window !== 'undefined') {
    delete window.RouterRoutes;
    delete window.RouterContentLoader;
    delete window.registerRoute;
  }

  require(ROUTES_PATH);
  require(CONTENT_LOADER_PATH);

  return {
    RouterRoutes: global.RouterRoutes,
    RouterContentLoader: global.RouterContentLoader
  };
}

afterEach(() => {
  if (originalGlobalFetch === undefined) {
    delete global.fetch;
  } else {
    global.fetch = originalGlobalFetch;
  }

  if (typeof window !== 'undefined') {
    if (originalWindowFetch === undefined) {
      delete window.fetch;
    } else {
      window.fetch = originalWindowFetch;
    }
  }

  jest.restoreAllMocks();
});

describe('RouterRoutes registry', () => {
  let RouterRoutes;

  beforeEach(() => {
    ({ RouterRoutes } = loadRouterModules());
  });

  test('registers routes and exposes helper lookups', () => {
    const onLoad = () => 'ready';
    const registered = RouterRoutes.registerRoute({
      id: '  custom-route ',
      path: ' pages/custom.html ',
      title: 'Custom Route',
      onLoad
    });

    expect(registered).toEqual(expect.objectContaining({
      id: 'custom-route',
      path: 'pages/custom.html',
      title: 'Custom Route',
      onLoad,
      metadata: expect.objectContaining({
        description: expect.any(String),
        canonicalSlug: 'custom-route',
        openGraph: expect.objectContaining({
          title: 'Custom Route',
          description: expect.any(String)
        }),
        twitter: expect.objectContaining({
          title: 'Custom Route',
          description: expect.any(String)
        })
      })
    }));

    expect(Array.isArray(registered.metadata.keywords)).toBe(true);
    expect(registered.metadata.keywords.length).toBeGreaterThan(0);

    expect(RouterRoutes.hasRoute('#custom-route')).toBe(true);

    const storedRoute = RouterRoutes.getRoute(' custom-route ');
    expect(storedRoute).toMatchObject({
      id: 'custom-route',
      path: 'pages/custom.html',
      title: 'Custom Route',
      onLoad
    });
    expect(storedRoute.metadata).toEqual(expect.objectContaining({
      canonicalSlug: 'custom-route'
    }));
    expect(Array.isArray(storedRoute.metadata.keywords)).toBe(true);
    expect(storedRoute.metadata.openGraph.title).toBe('Custom Route');

    expect(registered).not.toBe(storedRoute);
    expect(RouterRoutes.normalizeRouteId('  #custom-route ')).toBe('custom-route');

    const allRoutes = RouterRoutes.getRoutes();
    expect(allRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'custom-route',
          path: 'pages/custom.html',
          title: 'Custom Route',
          metadata: expect.any(Object)
        })
      ])
    );
  });

  test('warns when overriding a registered route', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    RouterRoutes.registerRoute({ id: 'override-me', path: 'pages/one.html', title: 'First' });
    const updated = RouterRoutes.registerRoute({ id: 'override-me', path: 'pages/two.html', title: 'Updated' });

    expect(warnSpy).toHaveBeenCalledWith('RouterRoutes: Route "override-me" was overwritten.');
    expect(RouterRoutes.getRoute('override-me').path).toBe('pages/two.html');
    expect(updated.path).toBe('pages/two.html');
  });
});

describe('RouterContentLoader.fetchPageMarkup', () => {
  let RouterRoutes;
  let RouterContentLoader;

  beforeEach(() => {
    ({ RouterRoutes, RouterContentLoader } = loadRouterModules());
  });

  test('returns markup when fetch resolves successfully', async () => {
    RouterRoutes.registerRoute({ id: 'async-route', path: '/partials/async.html', title: 'Async Title' });

    const markup = '<div>Loaded!</div>';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(markup)
    });

    global.fetch = fetchMock;
    if (typeof window !== 'undefined') {
      window.fetch = fetchMock;
    }

    const result = await RouterContentLoader.fetchPageMarkup('async-route');

    expect(fetchMock).toHaveBeenCalledWith('/partials/async.html');
    expect(result).toEqual({
      status: 'success',
      title: 'Async Title',
      html: markup,
      onReady: null,
      sourceTitle: 'Async Title'
    });
  });

  test('returns error payload when fetch resolves without ok status', async () => {
    RouterRoutes.registerRoute({ id: 'broken-route', path: '/partials/broken.html', title: 'Broken Title' });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn()
    });

    global.fetch = fetchMock;
    if (typeof window !== 'undefined') {
      window.fetch = fetchMock;
    }

    const result = await RouterContentLoader.fetchPageMarkup('broken-route');

    expect(fetchMock).toHaveBeenCalledWith('/partials/broken.html');
    expect(result.status).toBe('error');
    expect(result.title).toBe('Error');
    expect(result.sourceTitle).toBe('Broken Title');
    expect(result.html).toContain('Failed to load page: Broken Title.');
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain('HTTP error! status: 500');
  });

  test('returns error payload when fetch rejects with a network error', async () => {
    RouterRoutes.registerRoute({ id: 'network-route', path: '/partials/network.html', title: 'Network Title' });

    const networkError = new Error('Network down');
    const fetchMock = jest.fn().mockRejectedValue(networkError);

    global.fetch = fetchMock;
    if (typeof window !== 'undefined') {
      window.fetch = fetchMock;
    }

    const result = await RouterContentLoader.fetchPageMarkup('network-route');

    expect(fetchMock).toHaveBeenCalledWith('/partials/network.html');
    expect(result.status).toBe('error');
    expect(result.title).toBe('Error');
    expect(result.sourceTitle).toBe('Network Title');
    expect(result.html).toContain('Failed to load page: Network Title. Network down');
    expect(result.error).toBe(networkError);
  });

  test('returns initial home markup for the home route without a path', async () => {
    const initialHomeHTML = '<section>Home</section>';
    const fetchSpy = jest.fn();

    global.fetch = fetchSpy;
    if (typeof window !== 'undefined') {
      window.fetch = fetchSpy;
    }

    const result = await RouterContentLoader.fetchPageMarkup('home', { initialHomeHTML });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('success');
    expect(result.title).toBe("Mihai's Profile");
    expect(result.html).toBe(initialHomeHTML);
    expect(typeof result.onReady).toBe('function');
    expect(result.sourceTitle).toBe("Mihai's Profile");
  });

  test('returns empty content for non-home routes without a path', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    RouterRoutes.registerRoute({ id: 'no-path-route', title: 'No Path Title' });

    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;
    if (typeof window !== 'undefined') {
      window.fetch = fetchSpy;
    }

    const result = await RouterContentLoader.fetchPageMarkup('no-path-route');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'success',
      title: 'No Path Title',
      html: '',
      onReady: null,
      sourceTitle: 'No Path Title'
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'RouterContentLoader: Route "no-path-route" does not define a path. Using empty content placeholder.'
    );
  });
});
