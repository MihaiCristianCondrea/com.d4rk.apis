/**
 * @file UI governance lint tests for screen markup.
 */

/*
 * Change Rationale:
 * - The old policy blocked any `md-*` usage, which directly conflicted with the project's
 *   Material 3-first architecture.
 * - Governance now validates the intended quality signals: approved Material components,
 *   semantic status regions, focusable control labeling, and predictable screen scaffolding.
 * - This keeps the checks aligned with UX outcomes instead of enforcing blanket prohibitions.
 */

const fs = require('fs');
const path = require('path');

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

function toRepoRelativePath(absolutePath, repoRoot) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

describe('UI governance', () => {
  test('Screen.html files follow Material 3 governance signals', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const screensRoot = path.join(repoRoot, 'app', 'src', 'main', 'js', 'app');
    const screenFiles = collectScreenHtmlFiles(screensRoot);

    const allowedMaterialTags = new Set([
      'md-dialog',
      'md-filled-button',
      'md-filled-card',
      'md-filled-tonal-button',
      'md-icon',
      'md-icon-button',
      'md-menu',
      'md-menu-item',
      'md-outlined-button',
      'md-outlined-select',
      'md-outlined-text-field',
      'md-select-option',
      'md-side-sheet',
      'md-step',
      'md-steppers',
      'md-text-button'
    ]);

    const violations = [];

    screenFiles.forEach((filePath) => {
      const relativePath = toRepoRelativePath(filePath, repoRoot);
      const contents = fs.readFileSync(filePath, 'utf8');
      const mdTags = (contents.match(/<md-[a-z0-9-]+/gi) || []).map((tag) => tag.replace('<', '').toLowerCase());
      const unknownTags = Array.from(new Set(mdTags.filter((tag) => !allowedMaterialTags.has(tag))));

      if (unknownTags.length) {
        violations.push(`${relativePath} -> unsupported Material tags: ${unknownTags.join(', ')}`);
      }

      if (/class\s*=\s*['"][^'"]*mdc-/i.test(contents) || /<paper-[a-z0-9-]+/i.test(contents)) {
        violations.push(`${relativePath} -> contains legacy MDC/Paper patterns`);
      }

      const hasPageSection = /class\s*=\s*['"][^'"]*page-section/i.test(contents);
      if (!hasPageSection) {
        violations.push(`${relativePath} -> missing page-section wrapper for predictable screen structure`);
      }

      const filledCount = (contents.match(/<md-filled-button\b/gi) || []).length;
      const secondaryCount = (contents.match(/<md-(outlined|text|filled-tonal)-button\b/gi) || []).length;
      if (filledCount > 0 && secondaryCount === 0) {
        violations.push(`${relativePath} -> missing secondary/tertiary button variants (button hierarchy)`);
      }

      const interactiveWithoutLabel = [];
      const interactiveMatches = contents.match(/<md-icon-button[^>]*>/gi) || [];
      interactiveMatches.forEach((tag) => {
        const hasAriaLabel = /aria-label\s*=\s*['"][^'"]+['"]/i.test(tag);
        const hasId = /\sid\s*=\s*['"][^'"]+['"]/i.test(tag);
        if (!hasAriaLabel && !hasId) interactiveWithoutLabel.push(tag.split(/\s+/)[0]);
      });
      if (interactiveWithoutLabel.length) {
        violations.push(`${relativePath} -> icon buttons missing id/aria-label`);
      }

      if (relativePath.includes('/workspaces/')) {
        const statusRegions = (contents.match(/role=['"]status['"]/gi) || []).length;
        if (statusRegions === 0) {
          violations.push(`${relativePath} -> workspace screen missing role="status" feedback region`);
        }
      }
    });

    if (violations.length) {
      throw new Error(`UI governance violations:\n${violations.join('\n')}`);
    }
  });
});
