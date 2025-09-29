const fs = require('fs');
const path = require('path');

describe('navigationDrawer integration', () => {
  const scriptPath = path.resolve(__dirname, '../assets/js/navigationDrawer.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  const scriptForTest = `${scriptContent}
window.__setStandardDrawerLayout = (value) => { isStandardDrawerLayout = Boolean(value); };
window.__getStandardDrawerLayout = () => isStandardDrawerLayout;
`;

  const createDrawerMarkup = () => {
    document.body.innerHTML = `
      <header data-drawer-inert-target id="header">
        <button id="menuButton" type="button">Menu</button>
      </header>
      <div id="drawerOverlay" aria-hidden="true"></div>
      <md-navigation-drawer id="navDrawer" aria-modal="true">
        <button id="closeDrawerButton" type="button">Close</button>
        <nav>
          <md-list>
            <md-list-item href="#home" id="homeLink">Home</md-list-item>
          </md-list>
        </nav>
        <section>
          <button id="aboutToggle" type="button" aria-controls="aboutContent" aria-expanded="false">About</button>
          <div id="aboutContent" aria-hidden="true">About section</div>
        </section>
        <section>
          <button id="androidAppsToggle" type="button" aria-controls="androidAppsContent" aria-expanded="false">Apps</button>
          <div id="androidAppsContent" aria-hidden="true">Apps section</div>
        </section>
      </md-navigation-drawer>
      <main data-drawer-inert-target id="mainContent">Main content</main>
      <footer data-drawer-inert-target id="footerContent">Footer content</footer>
    `;

    const navDrawerElement = document.getElementById('navDrawer');
    let openedState = false;
    Object.defineProperty(navDrawerElement, 'opened', {
      configurable: true,
      get() {
        return openedState;
      },
      set(value) {
        openedState = Boolean(value);
      },
    });

    const firstNavItem = navDrawerElement.querySelector('md-list-item[href]');
    firstNavItem.focus = jest.fn();

    const closeDrawerButton = document.getElementById('closeDrawerButton');
    closeDrawerButton.focus = jest.fn();
  };

  beforeAll(() => {
    window.getDynamicElement = (id) => document.getElementById(id);
    window.eval(scriptForTest);
  });

  beforeEach(() => {
    document.body.className = '';
    delete document.body.dataset.drawerMode;

    createDrawerMarkup();
    window.__setStandardDrawerLayout(false);
    window.initNavigationDrawer();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('opens and closes the drawer while managing focus, overlay, and inert targets', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const overlay = document.getElementById('drawerOverlay');
    const navDrawerElement = document.getElementById('navDrawer');
    const inertElements = Array.from(document.querySelectorAll('[data-drawer-inert-target]'));
    const firstNavItem = navDrawerElement.querySelector('md-list-item[href]');

    const navItemFocusSpy = firstNavItem.focus;
    const menuFocusSpy = jest.spyOn(menuButtonElement, 'focus');

    menuButtonElement.click();

    expect(navDrawerElement.opened).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('true');
    expect(overlay.classList.contains('open')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('false');
    expect(navItemFocusSpy).toHaveBeenCalledTimes(1);
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(true);
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });

    overlay.click();

    expect(navDrawerElement.opened).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    expect(menuFocusSpy).toHaveBeenCalledTimes(1);
    expect(overlay.classList.contains('open')).toBe(false);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(false);
      expect(element.hasAttribute('aria-hidden')).toBe(false);
    });

    menuButtonElement.click();
    expect(navDrawerElement.opened).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(navDrawerElement.opened).toBe(false);
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    expect(menuFocusSpy).toHaveBeenCalledTimes(2);
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(false);
      expect(element.hasAttribute('aria-hidden')).toBe(false);
    });
  });

  test('toggle sections are mutually exclusive and maintain ARIA state', () => {
    const aboutToggleElement = document.getElementById('aboutToggle');
    const aboutContentElement = document.getElementById('aboutContent');
    const androidToggleElement = document.getElementById('androidAppsToggle');
    const androidContentElement = document.getElementById('androidAppsContent');

    aboutToggleElement.click();

    expect(aboutToggleElement.classList.contains('expanded')).toBe(true);
    expect(aboutToggleElement.getAttribute('aria-expanded')).toBe('true');
    expect(aboutContentElement.classList.contains('open')).toBe(true);
    expect(aboutContentElement.getAttribute('aria-hidden')).toBe('false');

    androidToggleElement.click();

    expect(aboutToggleElement.classList.contains('expanded')).toBe(false);
    expect(aboutToggleElement.getAttribute('aria-expanded')).toBe('false');
    expect(aboutContentElement.classList.contains('open')).toBe(false);
    expect(aboutContentElement.getAttribute('aria-hidden')).toBe('true');

    expect(androidToggleElement.classList.contains('expanded')).toBe(true);
    expect(androidToggleElement.getAttribute('aria-expanded')).toBe('true');
    expect(androidContentElement.classList.contains('open')).toBe(true);
    expect(androidContentElement.getAttribute('aria-hidden')).toBe('false');

    androidToggleElement.click();

    expect(androidToggleElement.classList.contains('expanded')).toBe(false);
    expect(androidToggleElement.getAttribute('aria-expanded')).toBe('false');
    expect(androidContentElement.classList.contains('open')).toBe(false);
    expect(androidContentElement.getAttribute('aria-hidden')).toBe('true');
  });

  test('manages inert targets and aria-modal when switching layout modes', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const inertElements = Array.from(document.querySelectorAll('[data-drawer-inert-target]'));

    expect(navDrawerElement.getAttribute('aria-modal')).toBe('true');
    expect(navDrawerElement.ariaModal).toBe('true');

    menuButtonElement.click();
    expect(navDrawerElement.opened).toBe(true);
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(true);
    });

    window.__setStandardDrawerLayout(true);
    window.syncDrawerState(true);

    expect(navDrawerElement.getAttribute('aria-modal')).toBe('false');
    expect(navDrawerElement.ariaModal).toBe('false');
    expect(document.body.classList.contains('drawer-is-open')).toBe(false);
    expect(overlay.classList.contains('open')).toBe(false);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('false');
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(false);
      expect(element.hasAttribute('aria-hidden')).toBe(false);
    });

    window.__setStandardDrawerLayout(false);
    window.syncDrawerState(true);

    expect(navDrawerElement.getAttribute('aria-modal')).toBe('true');
    expect(navDrawerElement.ariaModal).toBe('true');
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(overlay.classList.contains('open')).toBe(true);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('true');
    inertElements.forEach((element) => {
      expect(element.hasAttribute('inert')).toBe(true);
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
