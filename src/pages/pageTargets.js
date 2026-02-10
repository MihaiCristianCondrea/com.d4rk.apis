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
  home: { screen: 'src/app/home/ui/HomeScreen.html', feature: 'home' },
  'app-toolkit-api': { screen: 'src/app/workspaces/app-toolkit/ui/AppToolkitScreen.html', feature: 'app-toolkit' },
  'faq-api': { screen: 'src/app/workspaces/faq/ui/FaqScreen.html', feature: 'faq' },
  'english-with-lidia-api': {
    screen: 'src/app/workspaces/english-with-lidia/ui/EnglishWithLidiaScreen.html',
    feature: 'english-with-lidia',
  },
  'android-studio-tutorials-api': {
    screen: 'src/app/workspaces/android-studio-tutorials/ui/AndroidStudioTutorialsScreen.html',
    feature: 'android-studio-tutorials',
  },
  favorites: { screen: 'src/app/githubtools/favorites/ui/GitHubFavoritesScreen.html', feature: 'github-favorites' },
  'repo-mapper': { screen: 'src/app/githubtools/repomapper/ui/RepoMapperScreen.html', feature: 'repo-mapper' },
  'release-stats': { screen: 'src/app/githubtools/releasestats/ui/ReleaseStatsScreen.html', feature: 'release-stats' },
  'git-patch': { screen: 'src/app/githubtools/gitpatch/ui/GitPatchScreen.html', feature: 'git-patch' },
});
