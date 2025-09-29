const APP_PATH = '../assets/js/app.js';

const OPTIONAL_GLOBALS = [
  'showPageLoadingOverlay',
  'hidePageLoadingOverlay',
  'closeDrawer',
  'fetchBlogPosts',
  'fetchCommittersRanking',
  'loadSongs',
  'initProjectsPage',
  'initResumePage'
];

const CORE_GLOBALS = [
  'getDynamicElement',
  'initRouter',
  'initTheme',
  'initNavigationDrawer',
  'loadPageContent',
  'normalizePageId',
  'RouterRoutes',
  'setCopyrightYear'
];

let documentEventSpy;
let windowEventSpy;
let registeredDocumentHandlers = [];
let registeredWindowHandlers = [];

function clearGlobals() {
  [...OPTIONAL_GLOBALS, ...CORE_GLOBALS].forEach((key) => {
    delete global[key];
  });
}

function stubNormalizePageId(value) {
  if (typeof value !== 'string') {
    return 'home';
  }
  const withoutHash = value.startsWith('#') ? value.slice(1) : value;
  return withoutHash === '' ? 'home' : withoutHash;
}

function loadAppModule() {
  jest.isolateModules(() => {
    require(APP_PATH);
  });
}

function removeRegisteredHandlers() {
  registeredDocumentHandlers.forEach(({ type, listener, options }) => {
    document.removeEventListener(type, listener, options);
  });
  registeredWindowHandlers.forEach(({ type, listener, options }) => {
    window.removeEventListener(type, listener, options);
  });
  registeredDocumentHandlers = [];
  registeredWindowHandlers = [];
}

describe('app.js bootstrap integration', () => {
  beforeEach(() => {
    jest.resetModules();
    clearGlobals();
    document.body.innerHTML = '';
    window.location.hash = '#home';

    registeredDocumentHandlers = [];
    registeredWindowHandlers = [];

    const originalDocumentAddEventListener = document.addEventListener.bind(document);
    documentEventSpy = jest.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      originalDocumentAddEventListener(type, listener, options);
      registeredDocumentHandlers.push({ type, listener, options });
    });

    const originalWindowAddEventListener = window.addEventListener.bind(window);
    windowEventSpy = jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      originalWindowAddEventListener(type, listener, options);
      registeredWindowHandlers.push({ type, listener, options });
    });
  });

  afterEach(() => {
    removeRegisteredHandlers();
    if (documentEventSpy) {
      documentEventSpy.mockRestore();
    }
    if (windowEventSpy) {
      windowEventSpy.mockRestore();
    }
    clearGlobals();
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('buildRouterOptions wires available callbacks and page handlers', () => {
    document.body.innerHTML = `
      <main id="pageContentArea"></main>
      <section id="mainContentPage"><p>Welcome!</p></section>
      <h1 id="appBarHeadline"></h1>
      <header id="topAppBar"></header>
      <div id="newsGrid"></div>
      <div id="committers-rank"></div>
      <div id="songsGrid"></div>
    `;

    const initRouter = jest.fn();
    const loadPageContent = jest.fn();

    global.getDynamicElement = jest.fn((id) => document.getElementById(id));
    global.initTheme = jest.fn();
    global.initNavigationDrawer = jest.fn();
    global.setCopyrightYear = jest.fn();
    global.initRouter = initRouter;
    global.loadPageContent = loadPageContent;
    global.normalizePageId = jest.fn(stubNormalizePageId);
    global.RouterRoutes = { hasRoute: jest.fn(() => true) };

    const showPageLoadingOverlay = jest.fn();
    const hidePageLoadingOverlay = jest.fn();
    const closeDrawer = jest.fn();
    const fetchBlogPosts = jest.fn();
    const fetchCommittersRanking = jest.fn();
    const loadSongs = jest.fn();
    const initProjectsPage = jest.fn();
    const initResumePage = jest.fn();

    Object.assign(global, {
      showPageLoadingOverlay,
      hidePageLoadingOverlay,
      closeDrawer,
      fetchBlogPosts,
      fetchCommittersRanking,
      loadSongs,
      initProjectsPage,
      initResumePage
    });

    loadAppModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(initRouter).toHaveBeenCalledTimes(1);
    const routerOptions = initRouter.mock.calls[0][3];

    expect(routerOptions.showOverlay).toBeInstanceOf(Function);
    expect(routerOptions.hideOverlay).toBeInstanceOf(Function);
    expect(routerOptions.closeDrawer).toBeInstanceOf(Function);
    expect(routerOptions.onHomeLoad).toBeInstanceOf(Function);
    expect(routerOptions.pageHandlers).toEqual(expect.objectContaining({
      songs: expect.any(Function),
      projects: initProjectsPage,
      resume: initResumePage
    }));

    routerOptions.showOverlay();
    expect(showPageLoadingOverlay).toHaveBeenCalledTimes(1);

    routerOptions.hideOverlay();
    expect(hidePageLoadingOverlay).toHaveBeenCalledTimes(1);

    routerOptions.closeDrawer();
    expect(closeDrawer).toHaveBeenCalledTimes(1);

    routerOptions.onHomeLoad();
    expect(fetchBlogPosts).toHaveBeenCalledTimes(1);
    expect(fetchCommittersRanking).toHaveBeenCalledTimes(1);

    routerOptions.pageHandlers.songs();
    expect(loadSongs).toHaveBeenCalledTimes(1);
  });

  test('navigation interception delegates to loadPageContent and avoids duplicate registration', () => {
    document.body.innerHTML = `
      <main id="pageContentArea"></main>
      <section id="mainContentPage"></section>
      <h1 id="appBarHeadline"></h1>
      <header id="topAppBar"></header>
      <a id="songsLink" href="#songs"><span>Songs</span></a>
      <a id="missingLink" href="#missing"><span>Missing</span></a>
      <a id="externalLink" href="#home" target="_blank">External</a>
      <md-list-item id="projectsItem" href="#projects"></md-list-item>
    `;

    const loadPageContent = jest.fn();
    const hasRoute = jest.fn((id) => ['home', 'songs', 'projects'].includes(id));

    global.getDynamicElement = jest.fn((id) => document.getElementById(id));
    global.initTheme = jest.fn();
    global.initNavigationDrawer = jest.fn();
    global.setCopyrightYear = jest.fn();
    global.initRouter = jest.fn();
    global.loadPageContent = loadPageContent;
    global.normalizePageId = jest.fn(stubNormalizePageId);
    global.RouterRoutes = { hasRoute };

    loadAppModule();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(loadPageContent).toHaveBeenCalledWith('#home', false);
    loadPageContent.mockClear();
    hasRoute.mockClear();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(loadPageContent).toHaveBeenCalledWith('#home', false);
    loadPageContent.mockClear();
    hasRoute.mockClear();

    const songsLinkSpan = document.querySelector('#songsLink span');
    songsLinkSpan.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(hasRoute).toHaveBeenCalledTimes(1);
    expect(hasRoute).toHaveBeenCalledWith('songs');
    expect(loadPageContent).toHaveBeenCalledTimes(1);
    expect(loadPageContent).toHaveBeenCalledWith('songs');

    loadPageContent.mockClear();
    hasRoute.mockClear();

    const projectsItem = document.getElementById('projectsItem');
    projectsItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(hasRoute).toHaveBeenCalledTimes(1);
    expect(hasRoute).toHaveBeenCalledWith('projects');
    expect(loadPageContent).toHaveBeenCalledTimes(1);
    expect(loadPageContent).toHaveBeenCalledWith('projects');

    loadPageContent.mockClear();
    hasRoute.mockClear();

    const missingLinkSpan = document.querySelector('#missingLink span');
    missingLinkSpan.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(hasRoute).toHaveBeenCalledTimes(1);
    expect(hasRoute).toHaveBeenCalledWith('missing');
    expect(loadPageContent).not.toHaveBeenCalled();

    loadPageContent.mockClear();
    hasRoute.mockClear();

    const externalLink = document.getElementById('externalLink');
    externalLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(hasRoute).not.toHaveBeenCalled();
    expect(loadPageContent).not.toHaveBeenCalled();
  });

  test('buildRouterOptions omits callbacks when optional globals are unavailable', () => {
    document.body.innerHTML = `
      <main id="pageContentArea"></main>
      <section id="mainContentPage"></section>
      <h1 id="appBarHeadline"></h1>
      <header id="topAppBar"></header>
    `;

    const initRouter = jest.fn();
    const loadPageContent = jest.fn();

    global.getDynamicElement = jest.fn((id) => document.getElementById(id));
    global.initTheme = jest.fn();
    global.initNavigationDrawer = jest.fn();
    global.setCopyrightYear = jest.fn();
    global.initRouter = initRouter;
    global.loadPageContent = loadPageContent;
    global.normalizePageId = jest.fn(stubNormalizePageId);
    global.RouterRoutes = { hasRoute: jest.fn(() => false) };

    loadAppModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(initRouter).toHaveBeenCalledTimes(1);
    const routerOptions = initRouter.mock.calls[0][3];
    expect(routerOptions).toEqual({});
  });
});
