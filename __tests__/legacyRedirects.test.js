/**
 * @file Legacy GitHub tools redirect HTML tests.
 */
/*
 * Change Rationale: Snapshot the legacy redirect HTML template so regressions in GH Pages
 * redirect behavior (base handling, hash/query preservation) are caught automatically.
 */

const { createLegacyRedirectHtml } = require('../scripts/legacyRedirects.js');

test('createLegacyRedirectHtml matches the expected template', () => {
  expect(createLegacyRedirectHtml('githubtools-git-patch')).toMatchSnapshot();
});
