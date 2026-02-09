/**
 * @file Navigation drawer service integration tests using the canonical core utilities.
 */
/*
 * Change Rationale:
 * - This suite previously mocked app/src/main/js/domain/utils, a duplicate alias for the core utilities.
 * - Pointing tests at app/src/main/js/core/ui/utils/domUtils consolidates utility usage and prevents namespace drift between domain and core layers.
 * - The consolidation safeguards consistent drawer interactions, which supports the predictable navigation patterns expected in Material Design 3 UIs.
 */
const fs = require('fs');
const path = require('path');

const { initNavigationDrawer } = require('../../app/src/main/js/core/ui/components/navigation/navigationDrawerBindings.js');

/**
 * Builds the DOM skeleton required for exercising navigation drawer interactions.
 *
 * @returns {void}
 */
function createDrawerMarkup() {
  /* Change Rationale: The drawer markup now uses a dialog surface to match the BeerCSS
   * left-modal pattern, so the test DOM needs to mirror the updated element type.
   */
  document.body.innerHTML = `
    <header data-drawer-inert-target id="header">
      <button id="menuButton" class="button transparent circle app-nav-icon-button" type="button">Menu</button>
    </header>
    <div id="drawerOverlay" class="overlay" aria-hidden="true"></div>
    <dialog id="navDrawer" class="navigation-drawer">
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
    </dialog>
    <main data-drawer-inert-target id="mainContent">Main content</main>
    <footer data-drawer-inert-target id="footerContent">Footer content</footer>
  `;

  const navDrawerElement = document.getElementById('navDrawer');
  if (typeof HTMLDialogElement === 'undefined') {
    global.HTMLDialogElement = navDrawerElement.constructor;
  }
  navDrawerElement.open = false;
  navDrawerElement.showModal = jest.fn(() => {
    navDrawerElement.open = true;
  });
  navDrawerElement.close = jest.fn(() => {
    navDrawerElement.open = false;
  });
  const firstNavItem = navDrawerElement.querySelector('.nav-link[href]');
  firstNavItem.focus = jest.fn();

  const closeDrawerButton = document.getElementById('closeDrawerButton');
  closeDrawerButton.focus = jest.fn();
}

describe('navigationDrawerService', () => {
  beforeEach(() => {
    document.body.className = '';
    createDrawerMarkup();
    initNavigationDrawer();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('opens and closes the drawer while managing focus, overlay, and inert targets', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const overlay = document.getElementById('drawerOverlay');
    const navDrawerElement = document.getElementById('navDrawer');
    const inertElements = Array.from(document.querySelectorAll('[data-drawer-inert-target]'));
    const firstNavItem = navDrawerElement.querySelector('.nav-link[href]');

    const navItemFocusSpy = firstNavItem.focus;
    const menuFocusSpy = jest.spyOn(menuButtonElement, 'focus');

    menuButtonElement.click();

    expect(navDrawerElement.classList.contains('open')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('true');
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('false');
    expect(navItemFocusSpy).toHaveBeenCalledTimes(1);
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(true);
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });

    overlay.click();

    expect(navDrawerElement.classList.contains('open')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    expect(menuFocusSpy).toHaveBeenCalledTimes(1);
    expect(overlay.classList.contains('active')).toBe(false);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(false);
      expect(element.getAttribute('aria-hidden')).toBe('false');
    });

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('open')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(navDrawerElement.classList.contains('open')).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    expect(menuFocusSpy).toHaveBeenCalledTimes(2);
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(false);
      expect(element.getAttribute('aria-hidden')).toBe('false');
    });
  });

  // Change Rationale: Validate close button and nav selection behavior so the
  // modal drawer always dismisses after a navigation choice across viewports.
  test('closes the drawer with the close button and nav selection', () => {
    const closeButton = document.getElementById('closeDrawerButton');
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const homeLink = document.getElementById('homeLink');

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('open')).toBe(true);

    closeButton.click();
    expect(navDrawerElement.classList.contains('open')).toBe(false);

    menuButtonElement.click();
    expect(navDrawerElement.classList.contains('open')).toBe(true);

    homeLink.click();
    expect(navDrawerElement.classList.contains('open')).toBe(false);
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
