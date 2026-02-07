/**
 * @file Router identifier normalization tests.
 */
/*
 * Change Rationale: Added coverage for legacy GitHub tool layout URLs to ensure the
 * Screen-based route mapping continues to prevent 404s during migration.
 */
const { normalizePageId } = require('../../app/src/main/js/core/ui/router/identifiers.js');

describe('normalizePageId', () => {
  test('maps legacy GitHub tool layout URLs to route IDs', () => {
    expect(normalizePageId('/layout/githubtools/git-patch.html')).toBe('git-patch');
    expect(normalizePageId('/layout/githubtools/repo-mapper.html')).toBe('repo-mapper');
    expect(normalizePageId('/layout/githubtools/release-stats.html')).toBe('release-stats');
  });

  test('maps legacy GitHub tool layout URLs with hash prefixes', () => {
    expect(normalizePageId('#/layout/githubtools/git-patch.html')).toBe('git-patch');
    expect(normalizePageId('#/layout/githubtools/repo-mapper.html')).toBe('repo-mapper');
  });

  test('normalizes legacy GitHub tool layout variants', () => {
    expect(normalizePageId('/LAYOUT/GITHUBTOOLS/GIT-PATCH.HTML')).toBe('git-patch');
    expect(normalizePageId('/layout//githubtools//repo-mapper.html')).toBe('repo-mapper');
    expect(normalizePageId('/layout/githubtools/release-stats.html/')).toBe('release-stats');
    expect(normalizePageId('/layout/githubtools/git-patch.html?utm=1')).toBe('git-patch');
    expect(normalizePageId('/layout/githubtools/repo-mapper.html#section')).toBe('repo-mapper');
  });

  test('ignores unrelated layout URLs', () => {
    expect(normalizePageId('/layout/faq.html')).toBe('/layout/faq.html');
  });
});
