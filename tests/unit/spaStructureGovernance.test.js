/**
 * @file Governance checks for canonical SPA folder ownership.
 */

const fs = require('fs');
const path = require('path');

/**
 * Converts absolute path into repo-relative path.
 *
 * @param {string} absolutePath Absolute path.
 * @param {string} repoRoot Repository root.
 * @returns {string} Repo-relative slash-normalized path.
 */
function toRepoPath(absolutePath, repoRoot) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

describe('SPA structure governance', () => {
  test('canonical SPA folders and route manifest exist', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const required = [
      'public',
      'src/app',
      'src/features',
      'src/pages',
      'src/widgets',
      'src/entities',
      'src/shared',
      'src/routes',
      'src/routes/routeManifest.js',
      'src/pages/pageTargets.js',
    ];

    const missing = required.filter((relativePath) => {
      const absolutePath = path.join(repoRoot, ...relativePath.split('/'));
      return !fs.existsSync(absolutePath);
    });

    expect(missing).toEqual([]);
  });

  test('bootstrap delegates route ownership to route manifest', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const bootstrapPath = path.join(repoRoot, 'src', 'app', 'bootstrap.js');
    const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');

    expect(bootstrap).toMatch(/from ['\"]@\/app\/route-runtime\/register-route-runtime\.js['\"]/);
    expect(bootstrap).toMatch(/registerAppRouteRuntime\(\)/);

    const adHocRouteImports = bootstrap.match(/import\s+['"].*\/ui\/.*Route\.js['"];?/g) || [];
    if (adHocRouteImports.length) {
      const formatted = adHocRouteImports.map((entry) => entry.trim()).join('\n');
      throw new Error(`bootstrap.js contains ad-hoc route imports:\n${formatted}`);
    }
  });

  test('route manifest preserves public hash route IDs', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const manifestPath = path.join(repoRoot, 'src', 'routes', 'routeManifest.js');
    const content = fs.readFileSync(manifestPath, 'utf8');

    const requiredIds = [
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

    const missing = requiredIds.filter((routeId) => !new RegExp(`id:\\s*['\"]${routeId}['\"]`).test(content));

    if (missing.length) {
      throw new Error(
        `${toRepoPath(manifestPath, repoRoot)} is missing required route IDs: ${missing.join(', ')}`,
      );
    }
  });
});
