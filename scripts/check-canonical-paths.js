'use strict';

/**
 * @file Prevents legacy source-root references in docs/tooling files.
 *
 * Change Rationale: The repository now uses `src/` as the canonical runtime source
 * root. Legacy source-root references in docs/tooling can mislead contributors,
 * break path-based automation, and regress migration consistency. This check fails fast
 * when those legacy references reappear in CI.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const LEGACY_PATH_STRING = ['app', 'src', 'main', 'js'].join('/');
const LEGACY_PATH_PATTERN = new RegExp(LEGACY_PATH_STRING.replace(/\//g, '\\/'), 'g');

const SCAN_TARGETS = [
  path.join(REPO_ROOT, 'docs'),
  path.join(REPO_ROOT, 'scripts'),
  path.join(REPO_ROOT, 'package.json'),
  path.join(REPO_ROOT, 'tailwind.config.js'),
];

const IGNORED_FILES = new Set(['scripts/check-canonical-paths.js']);

/**
 * Recursively gathers files under a directory.
 *
 * @param {string} root Directory root.
 * @returns {string[]} Absolute file paths.
 */
function collectFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const stat = fs.statSync(root);
  if (stat.isFile()) {
    return [root];
  }

  const files = [];
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
      if (entry.isFile()) {
        files.push(entryPath);
      }
    });
  }
  return files;
}

/**
 * Converts absolute path to slash-normalized repo-relative path.
 *
 * @param {string} absolutePath Absolute filesystem path.
 * @returns {string} Repo-relative display path.
 */
function toRelativePath(absolutePath) {
  return path.relative(REPO_ROOT, absolutePath).split(path.sep).join('/');
}

const violations = [];
SCAN_TARGETS.flatMap(collectFiles).forEach((filePath) => {
  const relativeFilePath = toRelativePath(filePath);
  if (IGNORED_FILES.has(relativeFilePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (LEGACY_PATH_PATTERN.test(line)) {
      violations.push(`${relativeFilePath}:${index + 1} -> ${line.trim()}`);
    }
    LEGACY_PATH_PATTERN.lastIndex = 0;
  });
});

if (violations.length) {
  console.error(`Canonical path check failed. Found legacy ${LEGACY_PATH_STRING} references:\n`);
  violations.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Canonical path check passed.');
