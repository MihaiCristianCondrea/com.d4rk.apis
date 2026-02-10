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
const { initThemeControls } = require('../../src/core/data/services/themeService.js');

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

/**
 * Recursively gathers HTML files from a directory.
 *
 * @param {string} rootDir Directory to scan.
 * @returns {string[]} Absolute HTML file paths.
 */
function collectHtmlFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return collectHtmlFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
  });
}

describe('UI smoke', () => {
  test('navigation surfaces follow rail vs drawer breakpoint rules', () => {
    const repoRoot = path.join(__dirname, '..', '..');
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

  test('feature and core UI templates avoid mixed legacy button systems', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const htmlPaths = [
      ...collectHtmlFiles(path.join(repoRoot, 'app', 'src', 'main', 'js', 'app')),
      ...collectHtmlFiles(path.join(repoRoot, 'app', 'src', 'main', 'js', 'core', 'ui')),
    ];

    const auditRows = htmlPaths.map((filePath) => {
      const html = fs.readFileSync(filePath, 'utf8');
      return {
        filePath,
        hasMaterialWebTag: /<md-[a-z0-9-]+/i.test(html),
        hasLegacyAppButton: /\bapp-button\b/.test(html),
        hasLegacyInlineButton: /\bapi-inline-button\b/.test(html),
      };
    });

    const legacyFiles = auditRows.filter((row) => row.hasLegacyAppButton || row.hasLegacyInlineButton);

    expect(legacyFiles).toEqual([]);

    const mixedSystems = auditRows.filter(
      (row) => row.hasMaterialWebTag && (row.hasLegacyAppButton || row.hasLegacyInlineButton),
    );

    expect(mixedSystems).toEqual([]);
  });

  test('app shell mounts navigation outside the main content container', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const shellPath = path.join(repoRoot, 'index.html');
    const doc = loadHtmlDocument(shellPath);

    const navMount = doc.getElementById('appNavigationMount');
    const mainContent = doc.getElementById('pageContentArea');

    expect(navMount).not.toBeNull();
    expect(mainContent).not.toBeNull();
    expect(mainContent.contains(navMount)).toBe(false);
  });

  test('app shell defines a prepaint theme hydration script', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const shellPath = path.join(repoRoot, 'index.html');
    const html = fs.readFileSync(shellPath, 'utf8');

    expect(html).toMatch(/localStorage\.getItem\(/);
    expect(html).toMatch(/document\.documentElement\.classList\.toggle\('dark'/);
  });

  test('theme controls stay synchronized for light/dark/auto and system transitions', () => {
    document.body.innerHTML = `
      <button id="lightThemeButton" data-theme="light"></button>
      <button id="darkThemeButton" data-theme="dark"></button>
      <button id="autoThemeButton" data-theme="auto"></button>
    `;

    const storage = {
      value: 'auto',
      getItem: jest.fn(() => storage.value),
      setItem: jest.fn((_k, v) => {
        storage.value = v;
      }),
    };

    let listener = null;
    const mediaQueryList = {
      matches: false,
      addEventListener: jest.fn((_event, handler) => {
        listener = handler;
      }),
    };

    initThemeControls({
      htmlElement: document.documentElement,
      buttons: Array.from(document.querySelectorAll('[data-theme]')),
      storage,
      mediaQueryList,
    });

    const lightButton = document.getElementById('lightThemeButton');
    const darkButton = document.getElementById('darkThemeButton');
    const autoButton = document.getElementById('autoThemeButton');

    expect(autoButton.classList.contains('selected')).toBe(true);
    expect(autoButton.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    darkButton.click();
    expect(storage.value).toBe('dark');
    expect(darkButton.classList.contains('selected')).toBe(true);
    expect(darkButton.getAttribute('aria-pressed')).toBe('true');
    expect(autoButton.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    lightButton.click();
    expect(storage.value).toBe('light');
    expect(lightButton.classList.contains('selected')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    autoButton.click();
    expect(storage.value).toBe('auto');
    mediaQueryList.matches = true;
    listener?.({ matches: true });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    mediaQueryList.matches = false;
    listener?.({ matches: false });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
