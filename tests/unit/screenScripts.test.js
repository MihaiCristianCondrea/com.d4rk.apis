/**
 * @file Guards against feature screens importing the app shell entrypoint.
 *
 * Change Rationale: Feature screens must remain markup-only so they are loaded through the router
 * and not treated as Vite entrypoints that import main.js.
 */

const fs = require('fs');
const path = require('path');

const SCREENS_ROOT = path.join(__dirname, '..', '..', 'app', 'src', 'main', 'js', 'app');

/**
 * Recursively enumerates screen HTML files under the feature tree.
 *
 * @param {string} root Root directory to scan.
 * @returns {string[]} Absolute paths to Screen HTML files.
 */
function collectScreenFiles(root) {
  const results = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        return;
      }
      if (entry.isFile() && entry.name.endsWith('Screen.html')) {
        results.push(entryPath);
      }
    });
  }
  return results;
}

/**
 * Checks screen HTML files for script tags that import main.js.
 *
 * @returns {{ file: string, match: string }[]} Violations found in screen HTML files.
 */
function findMainScriptImports() {
  const screens = collectScreenFiles(SCREENS_ROOT);
  const scriptRegex = /<script[^>]*\bsrc=["']([^"']*main\.js[^"']*)["'][^>]*>/gi;
  const violations = [];

  screens.forEach((screenPath) => {
    const source = fs.readFileSync(screenPath, 'utf8');
    let match;
    while ((match = scriptRegex.exec(source)) !== null) {
      violations.push({ file: screenPath, match: match[1] });
    }
  });

  return violations;
}

test('feature screens do not import main.js', () => {
  const violations = findMainScriptImports();
  if (violations.length) {
    const details = violations
      .map((item) => `${path.relative(process.cwd(), item.file)} -> ${item.match}`)
      .join('\n');
    throw new Error(`Found main.js script imports in feature screens:\n${details}`);
  }
});
