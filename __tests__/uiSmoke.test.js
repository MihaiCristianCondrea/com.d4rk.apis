/**
 * @file UI smoke tests for core navigation surfaces.
 */

/*
 * Change Rationale:
 * - Validate that the canonical navigation view declares the correct surfaces
 *   (rail on m/l, drawer on s) without duplicating routing logic in screens.
 */

const fs = require('fs');
const path = require('path');

/**
 * Loads an HTML file and parses it into a document.
 *
 * @param {string} filePath Absolute path to the HTML file.
 * @returns {Document} Parsed HTML document.
 */
function loadHtmlDocument(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

describe('UI smoke', () => {
  test('navigation surfaces follow rail vs drawer breakpoint rules', () => {
    const repoRoot = path.join(__dirname, '..');
    const navViewPath = path.join(
      repoRoot,
      'app',
      'src',
      'main',
      'js',
      'core',
      'ui',
      'components',
      'navigation',
      'AppNavigationView.html'
    );
    const doc = loadHtmlDocument(navViewPath);

    const navRail = doc.getElementById('navRail');
    const navDrawer = doc.getElementById('navDrawer');
    const drawerOverlay = doc.getElementById('drawerOverlay');

    expect(navRail).not.toBeNull();
    expect(navRail.classList.contains('m')).toBe(true);
    expect(navRail.classList.contains('l')).toBe(true);
    expect(navRail.classList.contains('s')).toBe(false);

    expect(navDrawer).not.toBeNull();
    expect(navDrawer.classList.contains('s')).toBe(true);

    expect(drawerOverlay).not.toBeNull();
    expect(drawerOverlay.classList.contains('s')).toBe(true);
  });

  test('home shell mounts navigation outside the main content container', () => {
    const repoRoot = path.join(__dirname, '..');
    const homeScreenPath = path.join(
      repoRoot,
      'app',
      'src',
      'main',
      'js',
      'app',
      'home',
      'ui',
      'HomeScreen.html'
    );
    const doc = loadHtmlDocument(homeScreenPath);

    const navMount = doc.getElementById('appNavigationMount');
    const mainContent = doc.getElementById('pageContentArea');

    expect(navMount).not.toBeNull();
    expect(mainContent).not.toBeNull();
    expect(mainContent.contains(navMount)).toBe(false);
  });
});
