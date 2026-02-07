'use strict';

/**
 * @file Architecture enforcement checks for feature-first structure.
 *
 * Change Rationale: Add an explicit structure gate to prevent regressions in the
 * Screen + Views migration and keep feature routing aligned with the app layout.
 */

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..', 'src', 'app');
const RES_LAYOUT_ROOT = path.join(__dirname, '..', 'src', 'app', 'shell');
const STYLES_FEATURES_ROOT = path.join(__dirname, '..', 'src', 'styles', 'features');
const TESTS_ROOT = path.join(__dirname, '..', 'tests');

const ALLOWED_READMES = new Set();
const ALLOWED_LAYOUT_HTML = new Set(['src/app/shell/app-shell.html']);

/**
 * Recursively collects filesystem entries that match a predicate.
 *
 * @param {string} root Root directory to traverse.
 * @param {(entryPath: string, dirent: fs.Dirent) => boolean} predicate Matcher for entries.
 * @returns {string[]} List of entry paths that match the predicate.
 */
function collectEntries(root, predicate) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const results = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      }
      if (predicate(entryPath, entry)) {
        results.push(entryPath);
      }
    });
  }
  return results;
}

/**
 * Formats a filesystem path to use POSIX separators for display.
 *
 * @param {string} value Path to format.
 * @returns {string} Normalized display path.
 */
function formatPath(value) {
  return value.split(path.sep).join('/');
}

/**
 * Validates that all route modules live under a UI folder.
 *
 * @returns {string[]} Error messages for invalid route placement.
 */
function validateRouteLocations() {
  const routeFiles = collectEntries(APP_ROOT, (entryPath, dirent) =>
    dirent.isFile() && entryPath.endsWith('Route.js')
  );
  return routeFiles
    .filter((routePath) => {
      const parentDir = path.basename(path.dirname(routePath));
      return parentDir !== 'ui';
    })
    .map((routePath) =>
      `Route module must live under ui/: ${formatPath(path.relative(process.cwd(), routePath))}`
    );
}

/**
 * Validates that no README placeholders exist under app feature folders.
 *
 * @returns {string[]} Error messages for README violations.
 */
function validateReadmePresence() {
  const readmes = collectEntries(APP_ROOT, (entryPath, dirent) =>
    dirent.isFile() && entryPath.endsWith('README.md')
  );
  return readmes
    .filter((readmePath) => !ALLOWED_READMES.has(formatPath(readmePath)))
    .map((readmePath) =>
      `README.md files are not allowed in app/ features: ${formatPath(path.relative(process.cwd(), readmePath))}`
    );
}

/**
 * Validates that res/layout contains only whitelisted HTML files.
 *
 * @returns {string[]} Error messages for layout HTML violations.
 */
function validateLayoutHtml() {
  const htmlFiles = collectEntries(RES_LAYOUT_ROOT, (entryPath, dirent) =>
    dirent.isFile() && entryPath.endsWith('.html')
  );
  return htmlFiles
    .filter((htmlPath) => {
      const relativePath = formatPath(path.relative(process.cwd(), htmlPath));
      return !ALLOWED_LAYOUT_HTML.has(relativePath);
    })
    .map((htmlPath) =>
      `Feature HTML is not allowed under res/layout: ${formatPath(path.relative(process.cwd(), htmlPath))}`
    );
}

/**
 * Validates that no legacy github-tools directories exist.
 *
 * @returns {string[]} Error messages for legacy directory violations.
 */
function validateGithubToolsNaming() {
  const legacyDirs = collectEntries(STYLES_FEATURES_ROOT, (entryPath, dirent) =>
    dirent.isDirectory() && entryPath.endsWith(`${path.sep}github-tools`)
  );
  return legacyDirs.map((dirPath) =>
    `Legacy github-tools directory detected: ${formatPath(path.relative(process.cwd(), dirPath))}`
  );
}

/**
 * Validates that tests are organized under tests/unit and tests/integration.
 *
 * Change Rationale: Tests previously lived in a root-level __tests__ folder, which made
 * the architecture harder to scan and diverged from the target layout. This check keeps
 * the suite grouped by test intent while preserving a Material 3-friendly workflow where
 * integration-level UI behavior is easy to locate and review.
 *
 * @returns {string[]} Error messages for test layout violations.
 */
function validateTestLayout() {
  const legacyTestsRoot = path.join(__dirname, '..', '__tests__');
  const errors = [];
  if (fs.existsSync(legacyTestsRoot)) {
    errors.push('Legacy __tests__/ directory detected; move tests under tests/unit or tests/integration.');
  }

  const requiredDirs = [
    path.join(TESTS_ROOT, 'unit'),
    path.join(TESTS_ROOT, 'integration'),
  ];

  requiredDirs.forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      errors.push(`Missing required test folder: ${formatPath(path.relative(process.cwd(), dirPath))}`);
    }
  });

  return errors;
}


/**
 * Validates each module under src/pages has page.js, page.html, and page.css.
 *
 * Change Rationale: A previous normalization pass left concerns that some page modules
 * could drift into partial templates. Enforcing the triad keeps module parity and
 * preserves predictable route-to-screen composition.
 *
 * @returns {string[]} Error messages for missing required page module files.
 */
function validatePageModuleFiles() {
  const pagesRoot = path.join(__dirname, '..', 'src', 'pages');
  if (!fs.existsSync(pagesRoot)) {
    return [];
  }

  const requiredFiles = ['page.js', 'page.html', 'page.css'];
  const entries = fs.readdirSync(pagesRoot, { withFileTypes: true });
  const moduleDirs = entries.filter((entry) => entry.isDirectory());

  return moduleDirs.flatMap((entry) => {
    const modulePath = path.join(pagesRoot, entry.name);
    return requiredFiles
      .filter((fileName) => !fs.existsSync(path.join(modulePath, fileName)))
      .map((missingFile) =>
        `Page module missing ${missingFile}: ${formatPath(path.relative(process.cwd(), modulePath))}`
      );
  });
}


/**
 * Validates that every route module has a corresponding page module triad.
 *
 * Change Rationale: Review feedback highlighted concerns that `page.html` and `page.css`
 * could be missing from route-backed modules. Mapping routes to `src/pages/<slug>/`
 * guarantees each routed feature resolves a full page bundle.
 *
 * @returns {string[]} Error messages for missing route-backed page module files.
 */
function validateRouteBackedPageModules() {
  const routesRoot = path.join(__dirname, '..', 'src', 'routes');
  const pagesRoot = path.join(__dirname, '..', 'src', 'pages');
  if (!fs.existsSync(routesRoot) || !fs.existsSync(pagesRoot)) {
    return [];
  }

  const routeEntries = fs.readdirSync(routesRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.route.js'));

  const requiredFiles = ['page.js', 'page.html', 'page.css'];
  return routeEntries.flatMap((routeEntry) => {
    const moduleName = routeEntry.name.replace(/\.route\.js$/, '');
    const modulePath = path.join(pagesRoot, moduleName);
    if (!fs.existsSync(modulePath) || !fs.statSync(modulePath).isDirectory()) {
      return [`Missing page module directory for route ${routeEntry.name}: ${formatPath(path.relative(process.cwd(), modulePath))}`];
    }

    return requiredFiles
      .filter((fileName) => !fs.existsSync(path.join(modulePath, fileName)))
      .map((missingFile) =>
        `Route-backed page module missing ${missingFile}: ${formatPath(path.relative(process.cwd(), modulePath))}`
      );
  });
}

/**
 * Runs all structure checks and returns the aggregated error list.
 *
 * @returns {string[]} Error messages from all checks.
 */
function runChecks() {
  return [
    ...validateRouteLocations(),
    ...validateReadmePresence(),
    ...validateLayoutHtml(),
    ...validateGithubToolsNaming(),
    ...validateTestLayout(),
    ...validatePageModuleFiles(),
    ...validateRouteBackedPageModules(),
  ];
}

const errors = runChecks();
if (errors.length) {
  console.error('Structure check failed:\n');
  errors.forEach((error) => {
    console.error(`- ${error}`);
  });
  process.exit(1);
}

console.log('Structure check passed.');
