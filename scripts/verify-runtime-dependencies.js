'use strict';

/**
 * @file Enforces index.html runtime dependency policy for UI library scripts.
 *
 * Change Rationale:
 * - Previous revisions imported Material Web and other UI web components from external CDNs.
 * - Remote script registrations create nondeterministic builds and can silently bypass npm lockfile controls.
 * - This gate keeps UI runtime dependencies bundled through package imports in src/main.js/bootstrap.js.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const indexPath = path.join(repoRoot, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

/**
 * Disallowed external UI script URL patterns.
 *
 * @type {{label: string, regex: RegExp}[]}
 */
const disallowedExternalUiScripts = [
  { label: '@material/web from CDN', regex: /<script[^>]+src=["'][^"']*@material\/web[^"']*["'][^>]*>/i },
  { label: 'dotlottie web component from CDN', regex: /<script[^>]+src=["'][^"']*@lottiefiles\/dotlottie-wc[^"']*["'][^>]*>/i },
  { label: 'beercss from CDN', regex: /<script[^>]+src=["'][^"']*beercss[^"']*["'][^>]*>/i },
  { label: 'external UI library script host', regex: /<script[^>]+src=["']https?:\/\/(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)[^"']*["'][^>]*>/i },
];

const violations = disallowedExternalUiScripts
  .filter(({ regex }) => regex.test(indexHtml))
  .map(({ label }) => label);

if (violations.length) {
  console.error('Runtime dependency policy failed for index.html:');
  violations.forEach((violation) => {
    console.error(`- Disallowed external UI script tag detected: ${violation}`);
  });
  process.exit(1);
}

console.log('Runtime dependency policy validation passed.');
