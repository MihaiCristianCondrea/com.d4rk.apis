/**
 * @file Navigation active-state tests for the canonical rail + drawer links.
 */
/*
 * Change Rationale: Verify the router-owned active state highlights both rail and
 * drawer links so navigation stays synchronized across breakpoints.
 */
const { initNavigationDrawer } = require('../../src/core/ui/components/navigation/navigationDrawerBindings.js');
const { updateActiveNavLink } = require('../../src/core/ui/router/navigationState.js');

/**
 * Seeds the DOM with navigation rail + drawer links for active state testing.
 *
 * @returns {void}
 */
function seedNavigationMarkup() {
  document.body.innerHTML = `
    <button id="menuButton" type="button">Menu</button>
    <nav id="navRail">
      <ul class="list">
        <li class="wave round nav-item" data-nav-item><a href="#home" data-nav-link class="nav-link">Home</a></li>
        <li class="wave round nav-item" data-nav-item><a href="#repo-mapper" data-nav-link class="nav-link">Repo Mapper</a></li>
      </ul>
    </nav>
    <nav id="navDrawer" class="navigation-drawer left s" aria-hidden="true">
      <button id="closeDrawerButton" type="button">Close</button>
      <ul class="list">
        <li class="wave round nav-item" data-nav-item><a href="#home" data-nav-link class="nav-link">Home</a></li>
        <li class="wave round nav-item" data-nav-item><a href="#repo-mapper" data-nav-link class="nav-link">Repo Mapper</a></li>
      </ul>
    </nav>
  `;
}

function mockMatchMedia(matches) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches,
      media: '(max-width: 959px)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('navigation active state', () => {
  beforeEach(() => {
    seedNavigationMarkup();
    mockMatchMedia(true);
    initNavigationDrawer();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('highlights matching nav links across rail and drawer', () => {
    updateActiveNavLink('repo-mapper');

    const activeRows = Array.from(document.querySelectorAll('[data-nav-item].active'));
    expect(activeRows).toHaveLength(2);

    activeRows.forEach((row) => {
      expect(row.classList.contains('primary-container')).toBe(true);
      expect(row.classList.contains('round')).toBe(true);
    });

    const activeLinks = Array.from(document.querySelectorAll('[data-nav-link][aria-current="page"]'));
    expect(activeLinks).toHaveLength(2);
  });

  test('selected nav rows keep rounded BeerCSS shape', () => {
    updateActiveNavLink('home');

    const selectedRows = Array.from(document.querySelectorAll('[data-nav-item].active'));
    expect(selectedRows).toHaveLength(2);
    selectedRows.forEach((row) => {
      expect(row.classList.contains('round')).toBe(true);
    });
  });

  test('nav item selection closes drawer on compact viewports while preserving active state sync', () => {
    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const repoMapperLink = Array.from(navDrawerElement.querySelectorAll('.nav-link')).find((link) => link.getAttribute('href') === '#repo-mapper');

    menuButtonElement.click();
    repoMapperLink.click();
    updateActiveNavLink('repo-mapper');

    expect(navDrawerElement.classList.contains('active')).toBe(false);
    const activeRows = Array.from(document.querySelectorAll('[data-nav-item].active'));
    expect(activeRows).toHaveLength(2);
  });

  test('desktop rail layouts keep menu trigger functional for drawer access', () => {
    seedNavigationMarkup();
    mockMatchMedia(false);
    initNavigationDrawer();

    const menuButtonElement = document.getElementById('menuButton');
    const navDrawerElement = document.getElementById('navDrawer');
    const homeLink = navDrawerElement.querySelector('.nav-link[href="#home"]');

    menuButtonElement.click();
    homeLink.click();

    expect(navDrawerElement.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('drawer-is-open')).toBe(true);
    expect(menuButtonElement.getAttribute('aria-expanded')).toBe('true');
  });
});
