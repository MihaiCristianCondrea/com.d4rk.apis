const APP_PATH = '../app/src/main/js/app/app.js';

const mockUtils = {
  getDynamicElement: jest.fn(),
  updateCopyrightYear: jest.fn(),
  showPageLoadingOverlay: jest.fn(),
  hidePageLoadingOverlay: jest.fn(),
  rafThrottle: (fn) => fn,
};
jest.mock('../app/src/main/js/domain/utils.js', () => {
  const actual = jest.requireActual('../app/src/main/js/domain/utils.js');
  return {
    __esModule: true,
    ...actual,
    getDynamicElement: mockUtils.getDynamicElement,
    updateCopyrightYear: mockUtils.updateCopyrightYear,
    showPageLoadingOverlay: mockUtils.showPageLoadingOverlay,
    hidePageLoadingOverlay: mockUtils.hidePageLoadingOverlay,
    rafThrottle: mockUtils.rafThrottle,
  };
});

const themeMocks = {};
jest.mock('../app/src/main/js/services/themeService.js', () => {
  themeMocks.initThemeControls = jest.fn();
  themeMocks.applyTheme = jest.fn();
  return {
    __esModule: true,
    initThemeControls: (...args) => themeMocks.initThemeControls(...args),
    applyTheme: (...args) => themeMocks.applyTheme(...args),
  };
});

const mockNavigation = {
  initNavigationDrawer: jest.fn(),
  NavigationDrawerController: jest.fn(),
  controller: null,
};
jest.mock('../app/src/main/js/services/navigationDrawerService.js', () => ({
  __esModule: true,
  initNavigationDrawer: (...args) => mockNavigation.initNavigationDrawer(...args),
  NavigationDrawerController: mockNavigation.NavigationDrawerController,
}));

const mockRouter = {
  initRouter: jest.fn(),
  loadPageContent: jest.fn(),
  normalizePageId: jest.fn((value) => value),
  updateActiveNavLink: jest.fn(),
};
jest.mock('../app/src/main/js/router/index.js', () => ({
  __esModule: true,
  default: mockRouter,
  initRouter: (...args) => mockRouter.initRouter(...args),
  loadPageContent: (...args) => mockRouter.loadPageContent(...args),
  normalizePageId: (...args) => mockRouter.normalizePageId(...args),
  updateActiveNavLink: (...args) => mockRouter.updateActiveNavLink(...args),
}));

const mockRoutesApi = {
  hasRoute: jest.fn(() => true),
  getRoute: jest.fn(),
  PAGE_ROUTES: {},
};
jest.mock('../app/src/main/js/router/routes.js', () => ({
  __esModule: true,
  default: mockRoutesApi,
}));

const OPTIONAL_GLOBALS = [
  'showPageLoadingOverlay',
  'hidePageLoadingOverlay',
  'closeDrawer',
  'fetchBlogPosts',
  'fetchCommittersRanking',
  'loadSongs',
  'initProjectsPage',
  'initResumePage',
  'initAppToolkitWorkspace',
  'initFaqWorkspace',
  'initEnglishWorkspace',
  'initAndroidTutorialsWorkspace',
  'initPagerControls'
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
    if (typeof window !== 'undefined') {
      delete window[key];
    }
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
    jest.clearAllMocks();
    mockNavigation.controller = { close: jest.fn() };
    mockNavigation.initNavigationDrawer.mockReset();
    mockNavigation.initNavigationDrawer.mockImplementation(() => mockNavigation.controller);
    mockRouter.initRouter.mockReset();
    mockRouter.loadPageContent.mockReset();
    mockRouter.normalizePageId.mockReset();
    mockRouter.normalizePageId.mockImplementation((value) => stubNormalizePageId(value));
    mockRoutesApi.hasRoute.mockReset();
    mockRoutesApi.getRoute.mockReset();
    mockRoutesApi.PAGE_ROUTES = {};
    mockRoutesApi.hasRoute.mockImplementation(() => true);
    mockUtils.getDynamicElement.mockReset();
    mockUtils.getDynamicElement.mockImplementation((id) => document.getElementById(id));
    mockUtils.updateCopyrightYear.mockReset();
    mockUtils.showPageLoadingOverlay.mockReset();
    mockUtils.hidePageLoadingOverlay.mockReset();
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
    `;

    const { initRouter, loadPageContent } = mockRouter;
    initRouter.mockReset();
    loadPageContent.mockReset();

    const initAppToolkitWorkspace = jest.fn();
    const initFaqWorkspace = jest.fn();
    const initEnglishWorkspace = jest.fn();
    const initAndroidTutorialsWorkspace = jest.fn();
    const initPagerControls = jest.fn();

    Object.assign(window, {
      initAppToolkitWorkspace,
      initFaqWorkspace,
      initEnglishWorkspace,
      initAndroidTutorialsWorkspace,
      initPagerControls
    });

    loadAppModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(initRouter).toHaveBeenCalledTimes(1);
    const routerOptions = initRouter.mock.calls[0][3];

    expect(routerOptions.showOverlay).toBeInstanceOf(Function);
    expect(routerOptions.hideOverlay).toBeInstanceOf(Function);
    expect(routerOptions.closeDrawer).toBeInstanceOf(Function);
    expect(routerOptions.onHomeLoad).toBeUndefined();
    expect(routerOptions.pageHandlers).toEqual(
      expect.objectContaining({
        'app-toolkit-api': expect.any(Function),
        'faq-api': expect.any(Function),
        'english-with-lidia-api': expect.any(Function),
        'android-studio-tutorials-api': expect.any(Function)
      })
    );

    routerOptions.showOverlay();
    expect(mockUtils.showPageLoadingOverlay).toHaveBeenCalledTimes(1);

    routerOptions.hideOverlay();
    expect(mockUtils.hidePageLoadingOverlay).toHaveBeenCalledTimes(1);

    routerOptions.closeDrawer();
    expect(mockNavigation.controller.close).toHaveBeenCalledTimes(1);

    routerOptions.pageHandlers['app-toolkit-api']();
    expect(initAppToolkitWorkspace).toHaveBeenCalledTimes(1);

    routerOptions.pageHandlers['faq-api']();
    expect(initFaqWorkspace).toHaveBeenCalledTimes(1);

    routerOptions.pageHandlers['english-with-lidia-api']();
    expect(initEnglishWorkspace).toHaveBeenCalledTimes(1);
    expect(initPagerControls).toHaveBeenCalledWith('englishPager');

    routerOptions.pageHandlers['android-studio-tutorials-api']();
    expect(initAndroidTutorialsWorkspace).toHaveBeenCalledTimes(1);
    expect(initPagerControls).toHaveBeenCalledWith('androidPager');
  });

  test('navigation interception delegates to loadPageContent and avoids duplicate registration', () => {
    document.body.innerHTML = `
      <main id="pageContentArea"></main>
      <section id="mainContentPage"></section>
      <h1 id="appBarHeadline"></h1>
      <header id="topAppBar"></header>
      <a id="toolkitLink" href="#app-toolkit-api"><span>App Toolkit</span></a>
      <a id="missingLink" href="#missing"><span>Missing</span></a>
      <a id="externalLink" href="#home" target="_blank">External</a>
      <md-list-item id="englishItem" href="#english-with-lidia-api"></md-list-item>
    `;

    const loadPageContent = mockRouter.loadPageContent;
    const hasRoute = jest.fn((id) =>
      ['home', 'app-toolkit-api', 'faq-api', 'english-with-lidia-api'].includes(id)
    );

    loadPageContent.mockReset();
    mockRouter.initRouter.mockReset();
    mockRoutesApi.hasRoute.mockImplementation(hasRoute);

    loadAppModule();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(loadPageContent).toHaveBeenCalledWith('#home', false);
    loadPageContent.mockClear();
    hasRoute.mockClear();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(loadPageContent).toHaveBeenCalledWith('#home', false);
    loadPageContent.mockClear();
    hasRoute.mockClear();

    const toolkitLinkSpan = document.querySelector('#toolkitLink span');
    toolkitLinkSpan.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(hasRoute).toHaveBeenCalledTimes(1);
    expect(hasRoute).toHaveBeenCalledWith('app-toolkit-api');
    expect(loadPageContent).toHaveBeenCalledTimes(1);
    expect(loadPageContent).toHaveBeenCalledWith('app-toolkit-api');

    loadPageContent.mockClear();
    hasRoute.mockClear();

    const englishItem = document.getElementById('englishItem');
    englishItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(hasRoute).toHaveBeenCalledTimes(1);
    expect(hasRoute).toHaveBeenCalledWith('english-with-lidia-api');
    expect(loadPageContent).toHaveBeenCalledTimes(1);
    expect(loadPageContent).toHaveBeenCalledWith('english-with-lidia-api');

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

    const { initRouter, loadPageContent } = mockRouter;
    initRouter.mockReset();
    loadPageContent.mockReset();
    mockRoutesApi.hasRoute.mockImplementation(() => false);

    loadAppModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(initRouter).toHaveBeenCalledTimes(1);
    const routerOptions = initRouter.mock.calls[0][3];
    expect(routerOptions).toEqual({
      showOverlay: expect.any(Function),
      hideOverlay: expect.any(Function),
      closeDrawer: expect.any(Function),
    });
  });
});
