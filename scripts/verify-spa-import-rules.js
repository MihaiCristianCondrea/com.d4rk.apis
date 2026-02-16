'use strict';

/**
 * @file Enforces SPA Feature-Sliced import-direction rules.
 *
 * Change Rationale:
 * - Migration now uses canonical layers (`app`, `pages`, `widgets`, `features`,
 *   `entities`, `shared`) and requires strict downward imports.
 * - This check prevents layer leaks (for example, `shared` importing from
 *   `features/pages/app`) while route ownership remains centralized.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');

const LAYER_ORDER = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];

/** @param {string} relativePath */
function getLayer(relativePath) {
  const [segment] = relativePath.split('/');
  return LAYER_ORDER.includes(segment) ? segment : null;
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
  const sourceLayer = getLayer(relativePath);
  if (!sourceLayer) {
    return;
  }

  const sourceIndex = LAYER_ORDER.indexOf(sourceLayer);
  const content = fs.readFileSync(absolutePath, 'utf8');

  LAYER_ORDER.slice(0, sourceIndex).forEach((higherLayer) => {
    const token = `@/${higherLayer}/`;
    if (content.includes(token)) {
      violations.push(`${relativePath} -> ${sourceLayer} must not import higher layer "${higherLayer}" (${token}).`);
    }
  });

  if (sourceLayer === 'pages' && content.includes('@/app/')) {
    violations.push(`${relativePath} -> pages must not import app layer directly.`);
  }
});

if (violations.length) {
  console.error('SPA import-direction verification failed:\n');
  violations.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('SPA import-direction verification passed.');
