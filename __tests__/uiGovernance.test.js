/**
 * @file UI governance lint tests for screen markup.
 */

/*
 * Change Rationale:
 * - Enforce the policy that Screen.html files must not directly instantiate
 *   legacy Google web components.
 * - Allow explicit grandfathering where replacement risk is documented.
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively collects Screen.html files under a directory.
 *
 * @param {string} rootDir Root directory to scan.
 * @returns {string[]} Absolute file paths for Screen.html files.
 */
function collectScreenHtmlFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectScreenHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('Screen.html')) {
      files.push(fullPath);
    }
  });

  return files;
}

/**
 * Converts absolute file paths into repo-relative paths.
 *
 * @param {string} absolutePath Absolute file path.
 * @param {string} repoRoot Repository root path.
 * @returns {string} Repo-relative path using forward slashes.
 */
function toRepoRelativePath(absolutePath, repoRoot) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

describe('UI governance', () => {
  test('Screen.html files avoid direct Google web component usage', () => {
    const repoRoot = path.join(__dirname, '..');
    const screensRoot = path.join(repoRoot, 'app', 'src', 'main', 'js', 'app');
    const screenFiles = collectScreenHtmlFiles(screensRoot);

    // Change Rationale: Allow the FAQ workspace screen to keep legacy components
    // until the workflow can be migrated safely.
    const allowlist = new Map([
      ['app/src/main/js/app/workspaces/faq/ui/FaqScreen.html', 'Legacy workflow migration risk'],
    ]);

    const violations = [];

    screenFiles.forEach((filePath) => {
      const relativePath = toRepoRelativePath(filePath, repoRoot);
      const contents = fs.readFileSync(filePath, 'utf8');
      const matches = contents.match(/<md-[a-z0-9-]+/gi) || [];
      if (!matches.length) {
        return;
      }
      if (!allowlist.has(relativePath)) {
        violations.push({
          path: relativePath,
          tags: Array.from(new Set(matches.map((tag) => tag.replace('<', '')))),
        });
      }
    });

    if (violations.length) {
      const summary = violations
        .map((violation) => `${violation.path} -> ${violation.tags.join(', ')}`)
        .join('\n');
      throw new Error(`Legacy component usage found in Screen.html:\n${summary}`);
    }
  });
});
