const mockRoutes = {
  hasRoute: jest.fn(() => true),
  getRoute: jest.fn(),
  PAGE_ROUTES: {},
};

jest.mock('../src/router/routes.js', () => ({
  __esModule: true,
  default: mockRoutes,
}));

const mockAnimation = {
  fadeIn: jest.fn(() => Promise.resolve()),
  fadeOut: jest.fn(() => Promise.resolve()),
};

jest.mock('../src/router/animation.js', () => ({
  __esModule: true,
  default: mockAnimation,
  RouterAnimation: mockAnimation,
  fadeIn: (...args) => mockAnimation.fadeIn(...args),
  fadeOut: (...args) => mockAnimation.fadeOut(...args),
}));

const mockHistory = {
  updateTitle: jest.fn(),
  pushState: jest.fn(),
  DOCUMENT_TITLE_SUFFIX: ' - API Console',
};

jest.mock('../src/router/history.js', () => ({
  __esModule: true,
  default: mockHistory,
  RouterHistory: mockHistory,
  DOCUMENT_TITLE_SUFFIX: mockHistory.DOCUMENT_TITLE_SUFFIX,
  updateTitle: (...args) => mockHistory.updateTitle(...args),
  pushState: (...args) => mockHistory.pushState(...args),
}));

const mockContentLoader = {
  fetchPageMarkup: jest.fn(),
  DEFAULT_PAGE_TITLE: 'API Console',
};

jest.mock('../src/router/contentLoader.js', () => ({
  __esModule: true,
  default: mockContentLoader,
  RouterContentLoader: mockContentLoader,
  fetchPageMarkup: (...args) => mockContentLoader.fetchPageMarkup(...args),
  DEFAULT_PAGE_TITLE: mockContentLoader.DEFAULT_PAGE_TITLE,
}));

let routerModule;
let initRouter;
let loadPageContent;
let normalizePageId;
let updateActiveNavLink;

function setupDom() {
  document.body.innerHTML = `
    <div id="navDrawer">
      <md-list-item id="nav-home" href="#home"></md-list-item>
      <md-list-item id="nav-about" href="#about"></md-list-item>
      <div class="nested-list" id="nestedRoutes">
        <md-list-item id="nav-projects" href="#projects"></md-list-item>
      </div>
    </div>
    <main id="pageContent"></main>
    <h1 id="appBarHeadline"></h1>
  `;
}

beforeEach(() => {
  jest.resetModules();
  mockRoutes.hasRoute.mockReset().mockReturnValue(true);
  mockRoutes.getRoute.mockReset();
  mockRoutes.PAGE_ROUTES = {};
  mockAnimation.fadeIn.mockReset().mockImplementation(() => Promise.resolve());
  mockAnimation.fadeOut.mockReset().mockImplementation(() => Promise.resolve());
  mockHistory.updateTitle.mockReset();
  mockHistory.pushState.mockReset();
  mockContentLoader.fetchPageMarkup.mockReset();

  routerModule = require('../src/router/index.js');
  ({ initRouter, loadPageContent, normalizePageId, updateActiveNavLink } = routerModule);

  setupDom();
  window.scrollTo = jest.fn();
});

describe('router module', () => {
  test('normalizePageId standardizes route identifiers', () => {
    expect(normalizePageId('#about')).toBe('about');
    expect(normalizePageId('index.html')).toBe('home');
    expect(normalizePageId('')).toBe('home');
    expect(normalizePageId(null)).toBe('home');
    expect(normalizePageId('projects')).toBe('projects');
  });

  test('initRouter wires runtime callbacks and loads home content', async () => {
    const pageContent = document.getElementById('pageContent');
    const appBarHeadline = document.getElementById('appBarHeadline');

    const showOverlay = jest.fn();
    const hideOverlay = jest.fn();
    const closeDrawer = jest.fn();
    const onHomeLoad = jest.fn();
    const projectsHandler = jest.fn();

    mockRoutes.getRoute.mockImplementation((id) => {
      if (id === 'home') {
        return { id: 'home', title: 'Home', path: null };
      }
      if (id === 'projects') {
        return { id: 'projects', title: 'Projects', path: '/projects.html' };
      }
      return null;
    });

    mockContentLoader.fetchPageMarkup
      .mockResolvedValueOnce({
        status: 'success',
        title: 'Home',
        html: '<div>Home</div>',
        sourceTitle: 'Home',
      })
      .mockResolvedValueOnce({
        status: 'success',
        title: 'Projects',
        html: '<div>Projects</div>',
        sourceTitle: 'Projects',
        onReady: projectsHandler,
      });

    initRouter(
      pageContent,
      appBarHeadline,
      '<div>Initial Home</div>',
      {
        showOverlay,
        hideOverlay,
        closeDrawer,
        onHomeLoad,
        pageHandlers: { projects: projectsHandler },
      },
    );

    await loadPageContent('#home');

    expect(showOverlay).toHaveBeenCalled();
    expect(closeDrawer).toHaveBeenCalled();
    expect(hideOverlay).toHaveBeenCalled();
    expect(mockContentLoader.fetchPageMarkup).toHaveBeenCalledWith('home', expect.any(Object));
    expect(pageContent.innerHTML).toContain('Home');
    expect(mockHistory.updateTitle).toHaveBeenCalledWith(appBarHeadline, 'Home');
    expect(onHomeLoad).toHaveBeenCalledWith('home');

    await loadPageContent('#projects');

    expect(mockContentLoader.fetchPageMarkup).toHaveBeenCalledWith('projects', expect.any(Object));
    expect(pageContent.innerHTML).toContain('Projects');
    expect(projectsHandler).toHaveBeenCalledWith('projects');
    const pushStateCalls = mockHistory.pushState.mock.calls;
    expect(pushStateCalls[pushStateCalls.length - 1]).toEqual(['projects', 'Projects', 'projects', true]);
    expect(hideOverlay).toHaveBeenCalledTimes(2);
  });

  test('updateActiveNavLink toggles nav item state and expands nested parents', () => {
    const navDrawer = document.getElementById('navDrawer');
    const nestedToggle = document.createElement('button');
    nestedToggle.setAttribute('aria-controls', 'nestedRoutes');
    nestedToggle.classList.add('nav-toggle');
    navDrawer.appendChild(nestedToggle);

    updateActiveNavLink('projects');

    const activeItems = navDrawer.querySelectorAll('.nav-item-active');
    expect(activeItems).toHaveLength(1);
    expect(activeItems[0].id).toBe('nav-projects');
    expect(activeItems[0].getAttribute('aria-current')).toBe('page');
  });
});
