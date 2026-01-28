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
| app/src/main/js/core/app.js | app/src/main/js/core/ui/appShell.js | core/ui |
| app/src/main/js/core/config.js | app/src/main/js/core/data/config/appConfig.js | core/data |
| app/src/main/js/core/globals.js | app/src/main/js/core/ui/globals.js | core/ui |
| app/src/main/js/core/utils/utils.js | app/src/main/js/core/ui/utils/domUtils.js | core/ui |
| app/src/main/js/core/utils/constants.js | app/src/main/js/core/domain/constants.js | core/domain |
| app/src/main/js/core/router/** | app/src/main/js/core/ui/router/** | core/ui |
| app/src/main/js/core/features/githubTools.js | app/src/main/js/app/githubtools/common/domain/githubTools.js | feature/githubtools/common/domain |
| app/src/main/js/core/legacyBridge.js | app/src/main/js/core/ui/legacyBridge.js | core/ui |
| app/src/main/js/workers/*.js | app/src/main/js/core/data/workers/*.js | core/data |
| app/src/main/js/router/** (facades) | app/src/main/js/router/** (facades -> core/ui/router) | compatibility |

| Old path | New path | Layer |
| --- | --- | --- |
| app/src/main/js/services/*.js | app/src/main/js/core/data/services/*.js | core/data |
| app/src/main/js/services/scheduler/deferredTask.js | app/src/main/js/core/domain/scheduler/deferredTask.js | core/domain |
| app/src/main/js/services/appToolkit/imageProbeService.js | app/src/main/js/app/workspaces/app-toolkit/data/services/imageProbeService.js | feature/workspaces/app-toolkit/data |
| app/src/main/js/services/githubWizardController.js | app/src/main/js/app/workspaces/shared/data/services/githubWizardController.js | feature/workspaces/shared/data |

| Old path | New path | Layer |
| --- | --- | --- |
| app/src/main/js/features/home/data/homeContent.js | app/src/main/js/app/home/data/homeContentDataSource.js | feature/home/data |
| app/src/main/js/features/home/ui/homePage.js | app/src/main/js/app/home/ui/HomeRoute.js | feature/home/ui |
| app/src/main/js/features/githubtools/repomapper/ui/repoMapper.js | app/src/main/js/app/githubtools/repomapper/ui/RepoMapperRoute.js | feature/githubtools/repomapper/ui |
| app/src/main/js/features/githubtools/releasestats/ui/releaseStats.js | app/src/main/js/app/githubtools/releasestats/ui/ReleaseStatsRoute.js | feature/githubtools/releasestats/ui |
| app/src/main/js/features/githubtools/gitpatch/ui/gitPatch.js | app/src/main/js/app/githubtools/gitpatch/ui/GitPatchRoute.js | feature/githubtools/gitpatch/ui |
| app/src/main/js/features/workspaces/app-toolkit/ui/appToolkit.js | app/src/main/js/app/workspaces/app-toolkit/ui/AppToolkitRoute.js | feature/workspaces/app-toolkit/ui |
| app/src/main/js/features/workspaces/app-toolkit/data/services/imageProbeService.js | app/src/main/js/app/workspaces/app-toolkit/data/services/imageProbeService.js | feature/workspaces/app-toolkit/data |
| app/src/main/js/features/workspaces/app-toolkit/domain/images.js | app/src/main/js/app/workspaces/app-toolkit/domain/images.js | feature/workspaces/app-toolkit/domain |
| app/src/main/js/features/workspaces/app-toolkit/domain/workspaceActivationController.js | app/src/main/js/app/workspaces/app-toolkit/domain/workspaceActivationController.js | feature/workspaces/app-toolkit/domain |
| app/src/main/js/features/workspaces/faq/ui/faq.js | app/src/main/js/app/workspaces/faq/ui/FaqRoute.js | feature/workspaces/faq/ui |
| app/src/main/js/features/workspaces/english-with-lidia/ui/englishWithLidia.js | app/src/main/js/app/workspaces/english-with-lidia/ui/EnglishWithLidiaRoute.js | feature/workspaces/english-with-lidia/ui |
| app/src/main/js/features/workspaces/android-studio-tutorials/ui/androidStudioTutorials.js | app/src/main/js/app/workspaces/android-studio-tutorials/ui/AndroidStudioTutorialsRoute.js | feature/workspaces/android-studio-tutorials/ui |
| app/src/main/js/features/workspaces/shared/data/services/githubWizardController.js | app/src/main/js/app/workspaces/shared/data/services/githubWizardController.js | feature/workspaces/shared/data |
| app/src/main/js/features/workspaces/shared/ui/remoteControls.js | app/src/main/js/app/workspaces/shared/ui/remoteControls.js | feature/workspaces/shared/ui |

## Layout (HTML)

| Old path | New path | Feature scope |
| --- | --- | --- |
| app/src/main/res/layout/index.html | app/src/main/js/app/home/ui/HomeScreen.html | home |
| app/src/main/res/layout/repo-mapper.html | app/src/main/js/app/githubtools/repomapper/ui/RepoMapperScreen.html | githubtools/repomapper |
| app/src/main/res/layout/release-stats.html | app/src/main/js/app/githubtools/releasestats/ui/ReleaseStatsScreen.html | githubtools/releasestats |
| app/src/main/res/layout/git-patch.html | app/src/main/js/app/githubtools/gitpatch/ui/GitPatchScreen.html | githubtools/gitpatch |
| app/src/main/res/layout/github-favorites.html | app/src/main/js/app/githubtools/favorites/ui/GitHubFavoritesScreen.html | githubtools/favorites |
| app/src/main/res/layout/app-toolkit.html | app/src/main/js/app/workspaces/app-toolkit/ui/AppToolkitScreen.html | workspaces/app-toolkit |
| app/src/main/res/layout/faq.html | app/src/main/js/app/workspaces/faq/ui/FaqScreen.html | workspaces/faq |
| app/src/main/res/layout/english-with-lidia.html | app/src/main/js/app/workspaces/english-with-lidia/ui/EnglishWithLidiaScreen.html | workspaces/english-with-lidia |
| app/src/main/res/layout/android-studio-tutorials.html | app/src/main/js/app/workspaces/android-studio-tutorials/ui/AndroidStudioTutorialsScreen.html | workspaces/android-studio-tutorials |
| app/src/main/res/layout/screenshot-field.html | app/src/main/js/app/workspaces/app-toolkit/ui/views/ScreenshotFieldView.html | workspaces/app-toolkit |
| app/src/main/res/layout/workspace-dashboard.html | app/src/main/js/app/workspaces/shared/ui/WorkspaceDashboardView.html | workspaces/shared |
| app/src/main/res/layout/workspace-insight-card.html | app/src/main/js/app/workspaces/shared/ui/views/WorkspaceInsightCardView.html | workspaces/shared |
| app/src/main/res/layout/builder-remote.html | app/src/main/js/app/workspaces/shared/ui/views/BuilderRemoteView.html | workspaces/shared |

## Styles

| Old path | New path | Category |
| --- | --- | --- |
| app/src/main/js/core/styles/variables.css | app/src/main/styles/variables.css | core/styles |
| app/src/main/js/core/styles/tailwind.input.css | app/src/main/styles/tailwind.input.css | core/styles |
| app/src/main/js/core/styles/tailwind.css | app/src/main/styles/tailwind.css | core/styles |
| app/src/main/js/core/styles/base.css | app/src/main/styles/base/base.css | base |
| app/src/main/js/core/styles/fonts.css | app/src/main/styles/base/fonts.css | base |
| app/src/main/js/core/styles/pages.css | app/src/main/styles/base/pages.css | base |
| app/src/main/js/core/styles/resume.css | app/src/main/styles/base/resume.css | base |
| app/src/main/js/core/styles/print.css | app/src/main/styles/base/print.css | base |
| app/src/main/js/core/styles/layered-panels.css | app/src/main/styles/components/layered-panels.css | components |
| app/src/main/js/core/styles/viewport-optimizations.css | app/src/main/styles/base/viewport-optimizations.css | base |
| app/src/main/js/core/styles/components.css | app/src/main/styles/components/components.css | components |
| app/src/main/js/core/styles/navigation.css | app/src/main/styles/components/navigation.css | components |
| app/src/main/js/core/styles/components/collection-rows.css | app/src/main/styles/components/collection-rows.css | components |
| app/src/main/js/core/styles/components/misc.css | app/src/main/styles/components/misc.css | components |
| app/src/main/js/core/styles/components/github-tools.css | app/src/main/styles/features/githubtools/githubtools.css | feature/githubtools |
| app/src/main/js/core/styles/components/api-builder.css | app/src/main/styles/features/workspaces/shared/api-builder.css | feature/workspaces |
| app/src/main/js/core/styles/components/faq-builder.css | app/src/main/styles/features/workspaces/faq/faq-builder.css | feature/workspaces/faq |
| app/src/main/js/core/styles/components/native/*.css | app/src/main/styles/components/native/*.css | components |
| app/src/main/js/core/styles/appToolkit/screenshot-field.css | app/src/main/styles/features/workspaces/app-toolkit/screenshot-field.css | feature/workspaces/app-toolkit |

## Boundary checks

- Router logic will move under `core/ui/router` with legacy facades kept only as re-exports.
- Shared services consolidate under `core/data/services`; feature-specific adapters sit under their feature’s `data/services` tree.
- No archived roots or protected files are touched; API data remains the single source of truth.
- Identified dependency hotspot: `core/app.js` pulls from router + services. Moving it into `core/ui/appShell.js` retains the same imports while clarifying that it owns shell wiring. No cycles detected because services avoid importing app shell or router.
