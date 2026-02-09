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
const ALLOWED_LAYOUT_HTML = new Set();

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
 * Validates that core/data modules do not import core/ui modules.
 *
 * Change Rationale: Data layer previously pulled UI helpers directly, which
 * inverted architecture boundaries. This check enforces data->domain/core-only
 * imports and keeps DOM orchestration inside core/ui.
 *
 * @returns {string[]} Error messages for invalid imports.
 */
function validateCoreDataImportBoundaries() {
  const coreDataRoot = path.join(__dirname, '..', 'src', 'core', 'data');
  const jsFiles = collectEntries(coreDataRoot, (entryPath, dirent) =>
    dirent.isFile() && entryPath.endsWith('.js')
  );

  const violations = [];
  jsFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const invalidImport = /from\s+['"][^'"]*(?:\/ui\/|@\/core\/ui\/)[^'"]*['"]/g;
    if (invalidImport.test(content)) {
      violations.push(`core/data must not import core/ui: ${formatPath(path.relative(process.cwd(), filePath))}`);
    }
  });

  return violations;
}

/**
 * Runs all structure checks and returns the aggregated error list.
 *
 * Change Rationale: Legacy `src/pages/*` and `.route.js` parity checks enforced the retired
 * compatibility scaffold. The router now converges on feature `ui/*Route.js` modules only,
 * so structure validation should focus on feature-first constraints.
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
    ...validateCoreDataImportBoundaries(),
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
