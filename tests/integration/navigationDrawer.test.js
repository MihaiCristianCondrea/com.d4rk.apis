/**
 * @file Navigation drawer service integration tests using the canonical core utilities.
 */
/*
 * Change Rationale:
 * - This suite validates the BeerCSS nav-based compact drawer (`nav.left.s`) contract.
 * - It guards against regressions where drawer state, aria-expanded, and inert handling drift.
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
    <header data-drawer-inert-target id="header">
      <button id="menuButton" class="button transparent circle app-nav-icon-button" type="button">Menu</button>
    </header>
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
    <main data-drawer-inert-target id="mainContent">Main content</main>
    <footer data-drawer-inert-target id="footerContent">Footer content</footer>
  `;

  const firstNavItem = document.querySelector('#navDrawer .nav-link[href]');
  firstNavItem.focus = jest.fn();

  const closeDrawerButton = document.getElementById('closeDrawerButton');
  closeDrawerButton.focus = jest.fn();
}

function mockMatchMedia(matches) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches,
      media: '(max-width: 960px)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
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

  test('first menu click opens drawer and second click closes it', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');

    menuButtonElement.click();

    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('true');
    expect(navDrawerElement.getAttribute('aria-hidden')).toBe('false');

    menuButtonElement.click();

    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    expect(navDrawerElement.getAttribute('aria-hidden')).toBe('true');
  });

  test('drawer is not visible/open by default', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');

    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    expect(navDrawerElement.getAttribute('aria-hidden')).toBe('true');
  });

  test('repeated open/close cycles reset body and inert state correctly', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const closeButton = document.getElementById('closeDrawerButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const header = document.getElementById('header');
    const mainContent = document.getElementById('mainContent');
    const footerContent = document.getElementById('footerContent');

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(header.hasAttribute('inert')).toBe(true);
    expect(mainContent.hasAttribute('inert')).toBe(true);
    expect(footerContent.hasAttribute('inert')).toBe(true);

    closeButton.click();
    expect(navDrawerElement.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(header.hasAttribute('inert')).toBe(false);
    expect(mainContent.hasAttribute('inert')).toBe(false);
    expect(footerContent.hasAttribute('inert')).toBe(false);

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(header.getAttribute('aria-hidden')).toBe('true');
    expect(mainContent.getAttribute('aria-hidden')).toBe('true');
    expect(footerContent.getAttribute('aria-hidden')).toBe('true');

    closeButton.click();
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(header.getAttribute('aria-hidden')).toBe('false');
    expect(mainContent.getAttribute('aria-hidden')).toBe('false');
    expect(footerContent.getAttribute('aria-hidden')).toBe('false');
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

  test('keeps drawer open after nav selection on desktop viewport', () => {
    document.body.className = '';
    createDrawerMarkup();
    mockMatchMedia(false);
    initNavigationDrawer();

    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const homeLink = document.getElementById('homeLink');

    menuButtonElement.click();
    homeLink.click();

    expect(navDrawerElement.classList.contains('active')).toBe(true);
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

  test('navigation shell template avoids legacy app button classes', () => {
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

    expect(html.includes('app-button')).toBe(false);
    expect(html.includes('api-inline-button')).toBe(false);
  });

  test('navigation template keeps a single BeerCSS icon-button contract and pressed theme state', () => {
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

    const menuButton = document.getElementById('menuButton');
    const closeButton = doc.getElementById('closeDrawerButton');
    const themeButtons = [
      doc.getElementById('lightThemeButton'),
      doc.getElementById('darkThemeButton'),
      doc.getElementById('autoThemeButton'),
    ];

    expect(menuButton.className).toContain('app-nav-icon-button');
    expect(closeButton.className).toContain('button transparent circle app-nav-icon-button');
    themeButtons.forEach((button) => {
      expect(button.className).toContain('button transparent circle app-nav-icon-button');
    });

    expect(themeButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(themeButtons[1].getAttribute('aria-pressed')).toBe('false');
    expect(themeButtons[2].getAttribute('aria-pressed')).toBe('true');
  });

  test('toggle sections open independently with default expansions', () => {
    const aboutToggleElement = document.getElementById('aboutToggle');
    const aboutContentElement = document.getElementById('aboutContent');
    const androidToggleElement = document.getElementById('androidAppsToggle');
    const androidContentElement = document.getElementById('androidAppsContent');
    const githubToggleElement = document.getElementById('githubToolsToggle');
    const githubContentElement = document.getElementById('githubToolsContent');

    expect(androidToggleElement.getAttribute('aria-expanded')).toBe('true');
    expect(androidContentElement.classList.contains('open')).toBe(true);
    if (githubToggleElement && githubContentElement) {
      expect(githubToggleElement.getAttribute('aria-expanded')).toBe('true');
      expect(githubContentElement.classList.contains('open')).toBe(true);
    }
    expect(aboutContentElement.classList.contains('open')).toBe(false);

    aboutToggleElement.click();

    expect(aboutToggleElement.classList.contains('expanded')).toBe(true);
    expect(aboutToggleElement.getAttribute('aria-expanded')).toBe('true');
    expect(aboutContentElement.classList.contains('open')).toBe(true);
    expect(androidContentElement.classList.contains('open')).toBe(true);
    if (githubContentElement) {
      expect(githubContentElement.classList.contains('open')).toBe(true);
    }

    aboutToggleElement.click();

    expect(aboutToggleElement.classList.contains('expanded')).toBe(false);
    expect(aboutToggleElement.getAttribute('aria-expanded')).toBe('false');
    expect(aboutContentElement.classList.contains('open')).toBe(false);
    expect(androidContentElement.classList.contains('open')).toBe(true);
    if (githubContentElement) {
      expect(githubContentElement.classList.contains('open')).toBe(true);
    }
  });
});
