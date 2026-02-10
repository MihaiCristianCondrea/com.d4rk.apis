'use strict';

/**
 * @file Enforces SPA import-direction rules for new canonical folders.
 *
 * Change Rationale: The migration introduces explicit boundaries for
 * `src/components`, `src/features`, `src/pages`, and `src/routes`.
 * This guard keeps dependencies directional and avoids recreating tightly
 * coupled Android-style module ownership.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');

const SCOPE_RULES = [
  {
    scope: 'features',
    disallow: ['@/routes/', '@/pages/'],
    message: 'Feature modules must not import routes/pages directly.',
  },
  {
    scope: 'components',
    disallow: ['@/routes/', '@/pages/', '@/features/'],
    message: 'Shared components must stay UI-generic and not import routes/pages/features.',
  },
  {
    scope: 'pages',
    disallow: ['@/routes/'],
    message: 'Page modules must not import route ownership modules.',
  },
];

/** @param {string} relativePath */
function inScope(relativePath, scope) {
  return relativePath.startsWith(`${scope}/`);
}

/** @param {string} root */
function collectJsFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
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
      } else if (entry.isFile() && /\.(js|mjs|cjs)$/.test(entry.name)) {
        files.push(entryPath);
      }
    });
  }
  return files;
}

const violations = [];
collectJsFiles(ROOT).forEach((absolutePath) => {
  const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join('/');
  const content = fs.readFileSync(absolutePath, 'utf8');

  SCOPE_RULES.forEach((rule) => {
    if (!inScope(relativePath, rule.scope)) {
      return;
    }

    rule.disallow.forEach((token) => {
      if (content.includes(token)) {
        violations.push(`${relativePath} -> ${rule.message} Found disallowed import token: ${token}`);
      }
    });
  });
});

if (violations.length) {
  console.error('SPA import-direction verification failed:\n');
  violations.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('SPA import-direction verification passed.');
