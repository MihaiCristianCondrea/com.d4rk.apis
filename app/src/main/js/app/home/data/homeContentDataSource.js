/**
 * @file Home feature data source for workspace and GitHub tool card configuration.
 */
import { Workspaces, getWorkspaceAnchor } from '../../../core/domain/workspaces/registry.js';

/*
 * Change Rationale:
 * - Workspace tiles previously relied on ad-hoc IDs and hrefs that drifted from the canonical API slugs.
 * - Wiring the cards to the centralized workspace registry aligns UI routes, folder names, and API paths.
 * - This reduces mapping glue and keeps navigation predictable for the Material 3 home grid.
 * - Documentation references now point to `HomeRoute.js` to reflect the canonical feature structure
 *   after removing compatibility barrels.
 * - Renaming this file clarifies that it is a data source module (static content),
 *   matching the feature-first data/domain/ui doctrine.
 */

/**
 * Configuration object for a workspace card shown on the home page.
 *
 * These entries drive the "API workspace" section and are rendered by
 * `HomeRoute.js` into clickable tiles that route into specific builders.
 *
 * @typedef {Object} WorkspaceCardConfig
 * @property {string} id Stable identifier for the workspace (used for analytics or DOM hooks).
 * @property {string} href Hash or URL that navigates to the workspace route.
 * @property {string} icon Material symbol name used as the workspace icon.
 * @property {string} kicker Short label above the title (e.g. "API workspace").
 * @property {string} title Display name of the workspace.
 * @property {string} description One-line description of what the workspace manages.
 * @property {string[]} [features] Optional bullet list of key capabilities for this workspace.
 */

/**
 * Workspace cards rendered on the home page.
 *
 * Each entry defines the content for a single "API workspace" tile. The
 * cards are consumed by `initHomePage` / `renderWorkspaceGrid` in
 * `HomeRoute.js`, which builds the actual DOM using this configuration.
 *
 * @type {WorkspaceCardConfig[]}
 */
export const workspaceCards = [
  {
    id: Workspaces.app_toolkit.id,
    href: getWorkspaceAnchor(Workspaces.app_toolkit),
    icon: 'build',
    kicker: 'API workspace',
    title: Workspaces.app_toolkit.label,
    description:
        'Curate tool listings, screenshots, and metadata that power the App Toolkit catalog in both debug and release channels.',
    features: [
      'Generate app collections with drag-to-add entries',
      'Bulk import existing JSON for review',
      'Export formatted payloads instantly',
    ],
  },
  {
    id: Workspaces.faq.id,
    href: getWorkspaceAnchor(Workspaces.faq),
    icon: 'help_center',
    kicker: 'API workspace',
    title: Workspaces.faq.label,
    description:
        'Coordinate policy answers for websites and Android apps with Google icon suggestions and featured callouts.',
    features: [
      'Manage question IDs, categories, and featured flags',
      'Author rich HTML answers with home-page summaries',
      'Autocomplete Material Symbols straight from Google',
    ],
  },
  {
    id: Workspaces.english_with_lidia.id,
    href: getWorkspaceAnchor(Workspaces.english_with_lidia),
    icon: 'lightbulb',
    kicker: 'API workspace',
    title: Workspaces.english_with_lidia.label,
    description:
        'Design home feeds and lesson flows with multimedia content, audio tracks, and ads aligned with the published documentation.',
    features: [
      'Switch between Home and Lesson API builders',
      'Attach audio, images, and copy in context',
      'Preview generated JSON before exporting',
    ],
  },
  {
    id: Workspaces.android_studio_tutorials.id,
    href: getWorkspaceAnchor(Workspaces.android_studio_tutorials),
    icon: 'school',
    kicker: 'API workspace',
    title: Workspaces.android_studio_tutorials.label,
    description:
        'Assemble Compose-first lesson journeys with code samples, banners, ads, and metadata tailored for the tutorials app.',
    features: [
      'Define home feed cards with smart defaults',
      'Craft lesson narratives block-by-block',
      'Document deep links and tags consistently',
    ],
  },
];

/**
 * Configuration object for a GitHub tool card shown on the home page.
 *
 * Change Rationale: Home content docs now reference the canonical `HomeRoute.js`
 * module after removing compatibility barrels, keeping documentation aligned with
 * the feature structure.
 *
 * These entries drive the "GitHub tools" section and are rendered by
 * `HomeRoute.js` into feature cards that navigate into the GitHub tools
 * surfaces (Repo Mapper, Release Stats, Git Patch).
 *
 * @typedef {Object} GithubToolConfig
 * @property {string} id Stable identifier for the tool (used for analytics or DOM hooks).
 * @property {string} href Hash or URL that navigates to the tool route.
 * @property {string} icon Material symbol name used as the tool icon.
 * @property {string} title Display name of the tool.
 * @property {string} description One-line description of what the tool does.
 * @property {boolean} [wide] Optional flag to render the card in a wider layout.
 */

/**
 * GitHub tools configuration rendered on the home page.
 *
 * Each entry defines one GitHub-focused utility surfaced in the UI. The
 * cards are consumed by `renderGithubToolsGrid` in `HomeRoute.js`.
 *
 * @type {GithubToolConfig[]}
 */
export const githubTools = [
  {
    id: 'repo-mapper',
    href: '#repo-mapper',
    icon: 'terminal',
    title: 'Repo Mapper',
    description:
        'Generate ASCII directory trees from any public repository. Perfect for documentation and LLM context.',
  },
  {
    id: 'release-stats',
    href: '#release-stats',
    icon: 'bar_chart',
    title: 'Release Stats',
    description:
        'Visualize download counts, analyze asset performance, and track version history in real-time.',
  },
  {
    id: 'git-patch',
    href: '#git-patch',
    icon: 'difference',
    title: 'Git Patch',
    description:
        'Extract raw .patch files from commit URLs. Easily apply changes from one repo to another or perform code reviews.',
    wide: true,
  },
];
