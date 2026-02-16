/**
 * @file Navigation drawer service integration tests using the canonical core utilities.
 */
/*
 * Change Rationale:
 * - This suite validates the BeerCSS nav-based compact drawer (`nav.left.s`) contract.
 * - It guards against regressions where drawer state, aria-expanded, and backdrop close behavior drift.
 */
const fs = require('fs');
const path = require('path');

const { initNavigationDrawer } = require('../../src/core/ui/components/navigation/navigationDrawerBindings.js');

/**
 * Builds the DOM skeleton required for exercising navigation drawer interactions.
 *
 * @returns {void}
 */
function createDrawerMarkup() {
  document.body.innerHTML = `
    <header id="header">
      <button id="menuButton" class="button transparent circle app-nav-icon-button" type="button">Menu</button>
    </header>
    <button id="navDrawerBackdrop" class="navigation-drawer-backdrop" type="button" aria-hidden="true"></button>
    <nav id="navDrawer" class="navigation-drawer left s" aria-hidden="true">
      <button id="closeDrawerButton" class="button transparent circle app-nav-icon-button" type="button">Close</button>
      <nav>
        <ul class="list">
          <li><a href="#home" id="homeLink" class="nav-link">Home</a></li>
        </ul>
      </nav>
      <details>
        <summary id="aboutToggle" aria-controls="aboutContent" aria-expanded="false">About</summary>
        <div id="aboutContent" aria-hidden="true">About section</div>
      </details>
      <details open>
        <summary id="androidAppsToggle" aria-controls="androidAppsContent" aria-expanded="true">Apps</summary>
        <div id="androidAppsContent" class="open" aria-hidden="false">Apps section</div>
      </details>
      <div class="theme-button-container">
        <button id="lightThemeButton" data-theme="light" aria-pressed="false" class="button transparent circle app-nav-icon-button" type="button">Light</button>
        <button id="darkThemeButton" data-theme="dark" aria-pressed="false" class="button transparent circle app-nav-icon-button" type="button">Dark</button>
        <button id="autoThemeButton" data-theme="auto" aria-pressed="true" class="button transparent circle app-nav-icon-button selected" type="button">Auto</button>
      </div>
    </nav>
    <main id="mainContent">Main content</main>
    <footer id="footerContent">Footer content</footer>
  `;

  const firstNavItem = document.querySelector('#navDrawer .nav-link[href]');
  firstNavItem.focus = jest.fn();

  const closeDrawerButton = document.getElementById('closeDrawerButton');
  closeDrawerButton.focus = jest.fn();
}

/**
 * Installs a controllable `matchMedia` mock.
 *
 * @param {boolean} matches Initial match state.
 * @returns {{__setMatches: (nextMatches: boolean) => void}} Mock media query list.
 */
function mockMatchMedia(matches) {
  const listeners = new Set();
  const mediaQueryList = {
    matches,
    media: '(max-width: 959px)',
    onchange: null,
    addListener: jest.fn((listener) => listeners.add(listener)),
    removeListener: jest.fn((listener) => listeners.delete(listener)),
    addEventListener: jest.fn((eventName, listener) => {
      if (eventName === 'change') {
        listeners.add(listener);
      }
    }),
    removeEventListener: jest.fn((eventName, listener) => {
      if (eventName === 'change') {
        listeners.delete(listener);
      }
    }),
    dispatchEvent: jest.fn((event) => {
      listeners.forEach((listener) => listener(event));
      if (typeof mediaQueryList.onchange === 'function') {
        mediaQueryList.onchange(event);
      }
      return true;
    }),
    __setMatches(nextMatches) {
      this.matches = nextMatches;
      this.dispatchEvent({ matches: nextMatches, media: this.media });
    },
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => mediaQueryList),
  });

  return mediaQueryList;
}

describe('navigationDrawerService', () => {
  beforeEach(() => {
    document.body.className = '';
    createDrawerMarkup();
    mockMatchMedia(true);
    initNavigationDrawer();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('menu button opens drawer and does not close it on a second click', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const navDrawerBackdrop = document.getElementById('navDrawerBackdrop');

    menuButtonElement.click();

    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(navDrawerBackdrop.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('true');
    expect(navDrawerElement.getAttribute('aria-hidden')).toBe('false');

    menuButtonElement.click();

    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(navDrawerBackdrop.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('true');
    expect(navDrawerElement.getAttribute('aria-hidden')).toBe('false');
  });

  test('drawer is not visible/open by default', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const navDrawerBackdrop = document.getElementById('navDrawerBackdrop');

    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(navDrawerBackdrop.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    expect(navDrawerElement.getAttribute('aria-hidden')).toBe('true');
    expect(navDrawerBackdrop.getAttribute('aria-hidden')).toBe('true');
  });

  test('repeated open/close cycles keep the page interactive', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const closeButton = document.getElementById('closeDrawerButton');
    const navDrawerElement = document.getElementById('navDrawer');

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);

    closeButton.click();
    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);

    closeButton.click();
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
  });

  test('closes drawer via close button', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const closeButton = document.getElementById('closeDrawerButton');
    const navDrawerElement = document.getElementById('navDrawer');

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);

    closeButton.click();

    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
  });

  test('closes drawer via backdrop click', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const navDrawerBackdrop = document.getElementById('navDrawerBackdrop');

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);

    navDrawerBackdrop.click();

    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(navDrawerBackdrop.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
  });

  test('closes drawer via nav item click on compact viewport', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const homeLink = document.getElementById('homeLink');

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);

    homeLink.click();

    expect(navDrawerElement.classList.contains('active')).toBe(false);
  });

  test('closes drawer via Escape key', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
  });

  test('menu trigger remains visible and can open drawer on desktop viewport', () => {
    document.body.className = '';
    createDrawerMarkup();
    mockMatchMedia(false);
    initNavigationDrawer();

    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');

    menuButtonElement.click();

    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('true');
    expect(navDrawerElement.getAttribute('aria-hidden')).toBe('false');
  });

  test('switching from compact to desktop layout closes and resets drawer state', () => {
    document.body.className = '';
    createDrawerMarkup();
    const mediaQueryList = mockMatchMedia(true);
    initNavigationDrawer();

    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const navDrawerBackdrop = document.getElementById('navDrawerBackdrop');

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);

    mediaQueryList.__setMatches(false);

    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(navDrawerBackdrop.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    expect(navDrawerElement.getAttribute('aria-hidden')).toBe('true');
    expect(navDrawerBackdrop.getAttribute('aria-hidden')).toBe('true');
  });

  test('template keeps rail for m/l and drawer for s breakpoints', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const navTemplatePath = path.join(
      repoRoot,
      'app',
      'src',
      'main',
      'js',
      'core',
      'ui',
      'components',
      'navigation',
      'AppNavigationView.html',
    );
    const html = fs.readFileSync(navTemplatePath, 'utf8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const navRail = doc.getElementById('navRail');
    const navDrawer = doc.getElementById('navDrawer');

    expect(navRail.classList.contains('m')).toBe(true);
    expect(navRail.classList.contains('l')).toBe(true);
    expect(navRail.classList.contains('s')).toBe(false);
    expect(navDrawer.classList.contains('s')).toBe(true);
    expect(navDrawer.classList.contains('m')).toBe(false);
    expect(navDrawer.classList.contains('l')).toBe(false);
  });
});
