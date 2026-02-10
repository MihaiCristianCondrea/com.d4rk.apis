/**
 * @file UI governance lint tests for screen markup.
 */

/*
 * Change Rationale:
 * - Feature screens now follow a strict BeerCSS-only interactive component contract.
 * - Governance should fail when new `md-*` tags appear in feature-owned screens and views.
 * - This keeps component usage predictable and avoids mixed UI systems in feature HTML.
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively collects feature HTML templates that must remain free of md-* tags.
 *
 * @param {string} rootDir Root folder.
 * @returns {string[]} Absolute file paths.
 */
function collectFeatureHtmlTemplates(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFeatureHtmlTemplates(fullPath));
      return;
    }

    if (!entry.isFile() || !entry.name.endsWith('.html')) {
      return;
    }

    const normalizedPath = fullPath.split(path.sep).join('/');
    const isFeatureScreen = entry.name.endsWith('Screen.html');
    const isFeatureView = /\/ui\/views\/.+\.html$/i.test(normalizedPath);
    if (isFeatureScreen || isFeatureView) {
      files.push(fullPath);
    }
  });

  return files;
}

/**
 * Converts an absolute path to repo-relative style.
 *
 * @param {string} absolutePath Absolute path.
 * @param {string} repoRoot Repo root path.
 * @returns {string} Repo-relative path using `/` separators.
 */
function toRepoRelativePath(absolutePath, repoRoot) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

/**
 * Recursively collects full-document HTML shell templates.
 *
 * @param {string} rootDir Directory to scan.
 * @returns {string[]} Absolute paths for HTML files that include a DOCTYPE shell marker.
 */
function collectFullShellTemplates(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFullShellTemplates(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (/<!DOCTYPE\s+html>/i.test(content) && /id=["']pageContentArea["']/i.test(content)) {
        files.push(fullPath);
      }
    }
  });

  return files;
}

describe('UI governance', () => {
  test('runtime shell stays canonical to index.html only', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const fullShellTemplates = collectFullShellTemplates(repoRoot).map((templatePath) =>
      toRepoRelativePath(templatePath, repoRoot)
    );

    expect(fullShellTemplates).toEqual(['index.html']);
  });

  test('feature HTML templates enforce BeerCSS-only interactive tags', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const screensRoot = path.join(repoRoot, 'src', 'app');
    const featureHtmlFiles = collectFeatureHtmlTemplates(screensRoot);
    const violations = [];

    featureHtmlFiles.forEach((filePath) => {
      const relativePath = toRepoRelativePath(filePath, repoRoot);
      const contents = fs.readFileSync(filePath, 'utf8');
      const mdTags = Array.from(new Set((contents.match(/<md-[a-z0-9-]+/gi) || []).map((tag) => tag.replace('<', '').toLowerCase())));

      if (mdTags.length) {
        violations.push(`${relativePath} -> prohibited md-* tags found: ${mdTags.join(', ')}`);
      }

      if (/class\s*=\s*['"][^'"]*mdc-/i.test(contents) || /<paper-[a-z0-9-]+/i.test(contents)) {
        violations.push(`${relativePath} -> contains legacy MDC/Paper patterns`);
      }

      if (relativePath.endsWith('Screen.html')) {
        const hasPageSection = /class\s*=\s*['"][^'"]*page-section/i.test(contents);
        if (!hasPageSection) {
          violations.push(`${relativePath} -> missing page-section wrapper for predictable screen structure`);
        }

        /* Change Rationale: status live regions are now mandatory for every screen so
         * loading, success, and error transitions remain accessible across all features.
         * Route-level template composition is allowed via `{{...STATUS...}}` placeholders. */
        const statusRegions = (contents.match(/role=['"]status['"]/gi) || []).length;
        const hasStatusPlaceholder = /\{\{[A-Z0-9_]*STATUS[A-Z0-9_]*\}\}/i.test(contents);
        if (statusRegions === 0 && !hasStatusPlaceholder) {
          violations.push(`${relativePath} -> screen missing role="status" feedback region (or status placeholder token)`);
        }
      }
    });

    if (violations.length) {
      throw new Error(`UI governance violations:\n${violations.join('\n')}`);
    }
  });
});
