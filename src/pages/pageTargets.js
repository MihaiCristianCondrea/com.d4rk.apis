/**
 * @file SPA page target references used by route ownership tooling.
 */

/*
 * Change Rationale:
 * - Route targets were previously implied by feature module internals, making
 *   page ownership hard to audit during migration.
 * - This map provides a web SPA-facing page catalog while legacy feature
 *   modules continue to supply runtime templates.
 */

/**
 * Canonical page targets keyed by stable route id.
 *
 * @type {Readonly<Record<string, {screen: string, feature: string}>>}
 */
export const PAGE_TARGETS = Object.freeze({
  home: { screen: 'src/pages/home/ui/home.page.html', feature: 'home' },
  'app-toolkit-api': { screen: 'src/pages/workspaces/app-toolkit/ui/app-toolkit.page.html', feature: 'app-toolkit' },
  'faq-api': { screen: 'src/pages/workspaces/faq/ui/faq.page.html', feature: 'faq' },
  'english-with-lidia-api': {
    screen: 'src/pages/workspaces/english-with-lidia/ui/english-with-lidia.page.html',
    feature: 'english-with-lidia',
  },
  'android-studio-tutorials-api': {
    screen: 'src/pages/workspaces/android-studio-tutorials/ui/android-studio-tutorials.page.html',
    feature: 'android-studio-tutorials',
  },
  favorites: { screen: 'src/pages/github-tools/ui/github-favorites.page.html', feature: 'github-favorites' },
  'repo-mapper': { screen: 'src/pages/github-tools/ui/repo-mapper.page.html', feature: 'repo-mapper' },
  'release-stats': { screen: 'src/pages/github-tools/ui/release-stats.page.html', feature: 'release-stats' },
  'git-patch': { screen: 'src/pages/github-tools/ui/git-patch.page.html', feature: 'git-patch' },
});
