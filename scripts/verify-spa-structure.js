'use strict';

/**
 * @file Verifies SPA folder contract and centralized route ownership.
 *
 * Change Rationale: Migration from Android-centric layout to web SPA conventions
 * requires a stable contract for canonical folders and route registration
 * ownership. This guard fails fast when bootstrap drifts back to ad-hoc route
 * imports or required SPA folders are missing.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REQUIRED_DIRS = [
  'public',
  'src/assets',
  'src/components',
  'src/features',
  'src/pages',
  'src/routes',
  'src/services',
  'src/utils',
];

const BOOTSTRAP_FILE = path.join(ROOT, 'src', 'app', 'bootstrap.js');
const ROUTE_MANIFEST_FILE = path.join(ROOT, 'src', 'routes', 'routeManifest.js');

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

/** @param {string} value */
function formatPath(value) {
  return value.split(path.sep).join('/');
}

const violations = [];

REQUIRED_DIRS.forEach((relativePath) => {
  const absolutePath = path.join(ROOT, ...relativePath.split('/'));
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    violations.push(`Missing required SPA directory: ${relativePath}`);
  }
});

if (!fs.existsSync(BOOTSTRAP_FILE)) {
  violations.push('Missing src/app/bootstrap.js');
} else {
  const bootstrapContent = fs.readFileSync(BOOTSTRAP_FILE, 'utf8');

  if (!/from ['"]@\/routes\/routeManifest\.js['"]/m.test(bootstrapContent)) {
    violations.push('bootstrap.js must import route ownership from @/routes/routeManifest.js');
  }

  if (!/registerRouteManifest\(\)/m.test(bootstrapContent)) {
    violations.push('bootstrap.js must call registerRouteManifest()');
  }

  const adHocRouteImportMatches = bootstrapContent.match(/import\s+['"].*\/ui\/.*Route\.js['"];?/g) || [];
  if (adHocRouteImportMatches.length) {
    violations.push(`bootstrap.js must not contain ad-hoc ui/*Route.js imports (${adHocRouteImportMatches.length} found)`);
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
