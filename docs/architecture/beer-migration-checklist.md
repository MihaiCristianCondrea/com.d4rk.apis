# BeerCSS Migration Checklist

<!-- Change Rationale: Adds a single progress tracker for moving feature UIs off md-* tags
     so contributors can complete migration incrementally while preserving Android-style
     feature ownership and Material 3 consistency through BeerCSS components. -->

## Completion states

- ✅ Complete
- 🟡 In progress
- ⬜ Not started

## Feature matrix

| Area | Feature | Scope | State | Notes |
| --- | --- | --- | --- | --- |
| Workspaces | app-toolkit | `src/app/workspaces/app-toolkit/ui/app-toolkit.page.html` | ✅ | Replaced md-* controls with BeerCSS/native semantic controls. |
| Workspaces | faq | `src/app/workspaces/faq/ui/faq.page.html` | ✅ | Replaced md-* cards/buttons/icons with BeerCSS card/button patterns. |
| Workspaces | shared views | `src/app/workspaces/shared/ui/views/workspace-insight-card.view.html` | ✅ | Removed utility-class mixing in favor of semantic insight-card modifiers. |
| GitHub tools | repomapper | `src/app/githubtools/repomapper/ui/views/repo-mapper-form.view.html` | ✅ | Migrated text fields, toggles, checkbox, and segmented controls. |
| GitHub tools | releasestats | `src/app/githubtools/releasestats/ui/views/release-stats-form.view.html` | ✅ | Migrated token and favorite controls to BeerCSS classes. |
| GitHub tools | gitpatch | `src/app/githubtools/gitpatch/ui/views/git-patch-form.view.html` | ✅ | Migrated token and favorite controls to BeerCSS classes. |

## Validation checklist

- [x] No `md-*` tags in feature screens (`src/app/**/ui/*Screen.html`).
- [x] No `md-*` tags in targeted GitHub tool feature views (`src/app/githubtools/**/ui/views/*.html`).
- [x] No mixed utility class chains (`grid gap-2 inline-flex items-center`) in feature HTML.
- [x] UI governance unit tests assert the no-`md-*` rule for feature screens.
- [x] Architecture docs explicitly define BeerCSS-only interactive component policy.
