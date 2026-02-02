/**
 * @file Centralized navigation configuration shared by the rail and drawer.
 */
// Change Rationale: Navigation labels and routes are now modeled as data so both
// the rail and drawer can render from one source of truth, keeping the UI
// consistent and easier to extend when new sections are added.

/**
 * @typedef {Object} NavigationItem
 * @property {string} id Stable identifier for analytics/testing.
 * @property {string} label Primary label shown in the nav.
 * @property {string} [description] Optional supporting copy.
 * @property {string} icon Material symbol name.
 * @property {string} href Hash route for the destination.
 */

/**
 * @typedef {Object} NavigationSection
 * @property {string} id Stable identifier for the section.
 * @property {string | null} label Section label text (null for unlabeled sections).
 * @property {NavigationItem[]} items Items contained in the section.
 */

/**
 * Shared navigation sections for the app shell.
 *
 * @type {NavigationSection[]}
 */
export const NAVIGATION_SECTIONS = [
  {
    id: 'primary',
    label: null,
    items: [
      {
        id: 'home',
        label: 'Home',
        icon: 'home',
        href: '#home',
      },
    ],
  },
  {
    id: 'workspaces',
    label: 'API Workspaces',
    items: [
      {
        id: 'app-toolkit',
        label: 'App Toolkit',
        description: 'Manage Android utilities',
        icon: 'build',
        href: '#app-toolkit-api',
      },
      {
        id: 'faq',
        label: 'FAQ & Support',
        description: 'Publish policy answers',
        icon: 'help',
        href: '#faq-api',
      },
      {
        id: 'english-with-lidia',
        label: 'English with Lidia',
        description: 'Build lessons & home feeds',
        icon: 'menu_book',
        href: '#english-with-lidia-api',
      },
      {
        id: 'android-studio-tutorials',
        label: 'Android Studio Tutorials',
        description: 'Compose lesson flows',
        icon: 'school',
        href: '#android-studio-tutorials-api',
      },
    ],
  },
  {
    id: 'github-tools',
    label: 'GitHub Tools',
    items: [
      {
        id: 'favorites',
        label: 'Favorites',
        description: 'Quick access to starred repos',
        icon: 'grade',
        href: '#favorites',
      },
      {
        id: 'repo-mapper',
        label: 'Repo Mapper',
        description: 'Generate directory trees',
        icon: 'terminal',
        href: '#repo-mapper',
      },
      {
        id: 'release-stats',
        label: 'Release Stats',
        description: 'Visualize download counts',
        icon: 'bar_chart',
        href: '#release-stats',
      },
      {
        id: 'git-patch',
        label: 'Git Patch',
        description: 'Extract commit patches',
        icon: 'receipt_long',
        href: '#git-patch',
      },
    ],
  },
];
