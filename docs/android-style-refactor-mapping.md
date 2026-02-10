# Android-style web refactor mapping

<!--
Change Rationale: Captures the old-to-new path plan for the flattened Android-style layout so routing
and imports remain stable while removing the intermediate `features/` layer. The mapping mirrors the
Android layering model (core {data, domain, ui} + app/<feature>/{data, domain, ui}) and keeps init
hooks intact.
-->

## JS modules

| Old path | New path | Layer |
| --- | --- | --- |
| src/core/app.js | src/core/ui/appShell.js | core/ui |
| src/core/config.js | src/core/data/config/appConfig.js | core/data |
| src/core/globals.js | src/core/ui/globals.js | core/ui |
| src/core/utils/utils.js | src/core/ui/utils/domUtils.js | core/ui |
| src/core/utils/constants.js | src/core/domain/constants.js | core/domain |
| src/core/router/** | src/core/ui/router/** | core/ui |
| src/core/features/githubTools.js | src/app/githubtools/common/domain/githubTools.js | feature/githubtools/common/domain |
| src/core/legacyBridge.js | src/core/ui/legacyBridge.js | core/ui |
| src/workers/*.js | src/core/data/workers/*.js | core/data |
| src/core/ui/router/** (facades) | src/core/ui/router/** (facades -> core/ui/router) | compatibility |

| Old path | New path | Layer |
| --- | --- | --- |
| src/services/*.js | src/core/data/services/*.js | core/data |
| src/services/scheduler/deferredTask.js | src/core/domain/scheduler/deferredTask.js | core/domain |
| src/services/appToolkit/imageProbeService.js | src/app/workspaces/app-toolkit/data/services/imageProbeService.js | feature/workspaces/app-toolkit/data |
| src/services/githubWizardController.js | src/app/workspaces/shared/data/services/githubWizardController.js | feature/workspaces/shared/data |

| Old path | New path | Layer |
| --- | --- | --- |
| src/features/home/data/homeContent.js | src/app/home/data/homeContentDataSource.js | feature/home/data |
| src/features/home/ui/homePage.js | src/app/home/ui/HomeRoute.js | feature/home/ui |
| src/features/githubtools/repomapper/ui/repoMapper.js | src/app/githubtools/repomapper/ui/RepoMapperRoute.js | feature/githubtools/repomapper/ui |
| src/features/githubtools/releasestats/ui/releaseStats.js | src/app/githubtools/releasestats/ui/ReleaseStatsRoute.js | feature/githubtools/releasestats/ui |
| src/features/githubtools/gitpatch/ui/gitPatch.js | src/app/githubtools/gitpatch/ui/GitPatchRoute.js | feature/githubtools/gitpatch/ui |
| src/features/workspaces/app-toolkit/ui/appToolkit.js | src/app/workspaces/app-toolkit/ui/AppToolkitRoute.js | feature/workspaces/app-toolkit/ui |
| src/features/workspaces/app-toolkit/data/services/imageProbeService.js | src/app/workspaces/app-toolkit/data/services/imageProbeService.js | feature/workspaces/app-toolkit/data |
| src/features/workspaces/app-toolkit/domain/images.js | src/app/workspaces/app-toolkit/domain/images.js | feature/workspaces/app-toolkit/domain |
| src/features/workspaces/app-toolkit/domain/workspaceActivationController.js | src/app/workspaces/app-toolkit/domain/workspaceActivationController.js | feature/workspaces/app-toolkit/domain |
| src/features/workspaces/faq/ui/faq.js | src/app/workspaces/faq/ui/FaqRoute.js | feature/workspaces/faq/ui |
| src/features/workspaces/english-with-lidia/ui/englishWithLidia.js | src/app/workspaces/english-with-lidia/ui/EnglishWithLidiaRoute.js | feature/workspaces/english-with-lidia/ui |
| src/features/workspaces/android-studio-tutorials/ui/androidStudioTutorials.js | src/app/workspaces/android-studio-tutorials/ui/AndroidStudioTutorialsRoute.js | feature/workspaces/android-studio-tutorials/ui |
| src/features/workspaces/shared/data/services/githubWizardController.js | src/app/workspaces/shared/data/services/githubWizardController.js | feature/workspaces/shared/data |
| src/features/workspaces/shared/ui/remoteControls.js | src/app/workspaces/shared/ui/remoteControls.js | feature/workspaces/shared/ui |

## Layout (HTML)

| Old path | New path | Feature scope |
| --- | --- | --- |
| src/app/shell/index.html | src/app/home/ui/HomeScreen.html | home |
| src/app/shell/repo-mapper.html | src/app/githubtools/repomapper/ui/RepoMapperScreen.html | githubtools/repomapper |
| src/app/shell/release-stats.html | src/app/githubtools/releasestats/ui/ReleaseStatsScreen.html | githubtools/releasestats |
| src/app/shell/git-patch.html | src/app/githubtools/gitpatch/ui/GitPatchScreen.html | githubtools/gitpatch |
| src/app/shell/github-favorites.html | src/app/githubtools/favorites/ui/GitHubFavoritesScreen.html | githubtools/favorites |
| src/app/shell/app-toolkit.html | src/app/workspaces/app-toolkit/ui/AppToolkitScreen.html | workspaces/app-toolkit |
| src/app/shell/faq.html | src/app/workspaces/faq/ui/FaqScreen.html | workspaces/faq |
| src/app/shell/english-with-lidia.html | src/app/workspaces/english-with-lidia/ui/EnglishWithLidiaScreen.html | workspaces/english-with-lidia |
| src/app/shell/android-studio-tutorials.html | src/app/workspaces/android-studio-tutorials/ui/AndroidStudioTutorialsScreen.html | workspaces/android-studio-tutorials |
| src/app/shell/screenshot-field.html | src/app/workspaces/app-toolkit/ui/views/ScreenshotFieldView.html | workspaces/app-toolkit |
| src/app/shell/workspace-dashboard.html | src/app/workspaces/shared/ui/WorkspaceDashboardView.html | workspaces/shared |
| src/app/shell/workspace-insight-card.html | src/app/workspaces/shared/ui/views/WorkspaceInsightCardView.html | workspaces/shared |
| src/app/shell/builder-remote.html | src/app/workspaces/shared/ui/views/BuilderRemoteView.html | workspaces/shared |

## Styles

| Old path | New path | Category |
| --- | --- | --- |
| src/core/styles/variables.css | src/styles/variables.css | core/styles |
| src/core/styles/tailwind.input.css | src/styles/tailwind.input.css | core/styles |
| src/core/styles/tailwind.css | src/styles/tailwind.css | core/styles |
| src/core/styles/base.css | src/styles/base/base.css | base |
| src/core/styles/fonts.css | src/styles/base/fonts.css | base |
| src/core/styles/pages.css | src/styles/base/pages.css | base |
| src/core/styles/resume.css | src/styles/base/resume.css | base |
| src/core/styles/print.css | src/styles/base/print.css | base |
| src/core/styles/layered-panels.css | src/styles/components/layered-panels.css | components |
| src/core/styles/viewport-optimizations.css | src/styles/base/viewport-optimizations.css | base |
| src/core/styles/components.css | src/styles/components/components.css | components |
| src/core/styles/navigation.css | src/styles/components/navigation.css | components |
| src/core/styles/components/collection-rows.css | src/styles/components/collection-rows.css | components |
| src/core/styles/components/misc.css | src/styles/components/misc.css | components |
| src/core/styles/components/github-tools.css | src/styles/features/githubtools/githubtools.css | feature/githubtools |
| src/core/styles/components/api-builder.css | src/styles/features/workspaces/shared/api-builder.css | feature/workspaces |
| src/core/styles/components/faq-builder.css | src/styles/features/workspaces/faq/faq-builder.css | feature/workspaces/faq |
| src/core/styles/components/native/*.css | src/styles/components/native/*.css | components |
| src/core/styles/appToolkit/screenshot-field.css | src/styles/features/workspaces/app-toolkit/screenshot-field.css | feature/workspaces/app-toolkit |

## Boundary checks

- Router logic will move under `core/ui/router` with legacy facades kept only as re-exports.
- Shared services consolidate under `core/data/services`; feature-specific adapters sit under their feature’s `data/services` tree.
- No archived roots or protected files are touched; API data remains the single source of truth.
- Identified dependency hotspot: `core/app.js` pulls from router + services. Moving it into `core/ui/appShell.js` retains the same imports while clarifying that it owns shell wiring. No cycles detected because services avoid importing app shell or router.
