'use strict';

/**
 * @file Verifies SPA folder contract, naming patterns, and route ownership.
 *
 * Change Rationale:
 * - Canonical SPA migration now depends on Feature-Sliced layers including
 *   `widgets`, `entities`, and `shared`.
 * - This guard ensures required layers exist, kebab-case naming patterns are
 *   respected, route/page/view/component filename conventions are enforced,
 *   and `src/app` stays limited to bootstrap/providers/shell/route runtime glue.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REQUIRED_DIRS = [
  'public',
  'src/app',
  'src/pages',
  'src/widgets',
  'src/features',
  'src/entities',
  'src/shared',
  'src/routes',
];

const BOOTSTRAP_FILE = path.join(ROOT, 'src', 'app', 'bootstrap.js');
const ROUTE_MANIFEST_FILE = path.join(ROOT, 'src', 'app', 'routes', 'route-manifest.js');
const APP_DIR = path.join(ROOT, 'src', 'app');

const REQUIRED_ROUTE_IDS = [
  'home',
  'app-toolkit-api',
  'faq-api',
  'english-with-lidia-api',
  'android-studio-tutorials-api',
  'favorites',
  'repo-mapper',
  'release-stats',
  'git-patch',
];

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_APP_TOP_LEVEL = new Set(['bootstrap.js', 'config.js', 'providers', 'shell', 'route-runtime', 'routes']);

/** @param {string} value */
function formatPath(value) {
  return value.split(path.sep).join('/');
}

/** @param {string} absolute */
function listDirectories(absolute) {
  const dirs = [];
  const stack = [absolute];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry.isDirectory()) {
        return;
      }
      const full = path.join(current, entry.name);
      dirs.push(full);
      stack.push(full);
    });
  }
  return dirs;
}

/** @param {string} absolute */
function listFiles(absolute) {
  const files = [];
  const stack = [absolute];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        return;
      }
      if (entry.isFile()) {
        files.push(full);
      }
    });
  }
  return files;
}

const violations = [];

REQUIRED_DIRS.forEach((relativePath) => {
  const absolutePath = path.join(ROOT, ...relativePath.split('/'));
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    violations.push(`Missing required SPA directory: ${relativePath}`);
  }
});

if (fs.existsSync(APP_DIR)) {
  const appEntries = fs.readdirSync(APP_DIR);
  appEntries.forEach((entry) => {
    if (!ALLOWED_APP_TOP_LEVEL.has(entry)) {
      violations.push(`src/app must only contain bootstrap/entrypoint + providers + shell + route runtime glue (unexpected: src/app/${entry})`);
    }
  });
}

['src/pages', 'src/widgets', 'src/features', 'src/entities', 'src/shared'].forEach((scopePath) => {
  const absoluteScope = path.join(ROOT, ...scopePath.split('/'));
  if (!fs.existsSync(absoluteScope)) {
    return;
  }

  listDirectories(absoluteScope).forEach((absoluteDir) => {
    const name = path.basename(absoluteDir);
    if (!KEBAB_CASE.test(name)) {
      const relativeDir = formatPath(path.relative(ROOT, absoluteDir));
      violations.push(`Directory names must be kebab-case: ${relativeDir}`);
    }
  });
});

['src/pages', 'src/widgets', 'src/features', 'src/entities', 'src/shared'].forEach((scopePath) => {
  const absoluteScope = path.join(ROOT, ...scopePath.split('/'));
  if (!fs.existsSync(absoluteScope)) {
    return;
  }

  listFiles(absoluteScope).forEach((absoluteFile) => {
    const relativeFile = formatPath(path.relative(ROOT, absoluteFile));
    const fileName = path.basename(absoluteFile);
    const directory = path.dirname(relativeFile);

    if (fileName.endsWith('Screen.html')) {
      violations.push(`Route screens must use *.page.html suffix: ${relativeFile}`);
    }

    if (fileName.endsWith('View.html')) {
      violations.push(`Shared partials must use *.view.html suffix: ${relativeFile}`);
    }

    if (directory.includes('/ui/components') && fileName.endsWith('.js') && !fileName.endsWith('.ce.js')) {
      violations.push(`Component modules must use *.ce.js suffix: ${relativeFile}`);
    }
  });
});

if (!fs.existsSync(BOOTSTRAP_FILE)) {
  violations.push('Missing src/app/bootstrap.js');
} else {
  const bootstrapContent = fs.readFileSync(BOOTSTRAP_FILE, 'utf8');

  if (!/registerAppRouteRuntime\(\)/m.test(bootstrapContent)) {
    violations.push('bootstrap.js must call registerAppRouteRuntime()');
  }

  const adHocRouteImportMatches = bootstrapContent.match(/import\s+['"].*\/(routes|ui)\/.*(Route|route)\.[cm]?js['"];?/g) || [];
  if (adHocRouteImportMatches.length) {
    violations.push(`bootstrap.js must not contain ad-hoc route module imports (${adHocRouteImportMatches.length} found)`);
  }
}

if (!fs.existsSync(ROUTE_MANIFEST_FILE)) {
  violations.push(`Missing route manifest: ${formatPath(path.relative(ROOT, ROUTE_MANIFEST_FILE))}`);
} else {
  const manifestContent = fs.readFileSync(ROUTE_MANIFEST_FILE, 'utf8');

  REQUIRED_ROUTE_IDS.forEach((routeId) => {
    if (!new RegExp(`id:\\s*['\"]${routeId}['\"]`).test(manifestContent)) {
      violations.push(`Route manifest missing required route id: ${routeId}`);
    }
  });
}

if (violations.length) {
  console.error('SPA structure verification failed:\n');
  violations.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('SPA structure verification passed.');
