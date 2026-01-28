# Android-style web layout

> Change Rationale: The web app now mirrors the Android module layout by flattening feature code under `app/<feature>/{data,domain,ui}` while keeping shared infrastructure in `core/`. This preserves router behavior and legacy imports but removes the intermediate `features/` layer.

## Canonical structure
- Core infrastructure stays in `app/src/main/js/core/` (router, styles, services, shared UI).
<!-- Change Rationale: Update the example feature path to match the current githubtools folder naming. -->
- User-facing modules live in `app/src/main/js/app/<feature>/` with subfolders `data/`, `domain/`, and `ui/` (for example, `app/home`, `app/githubtools`, `app/workspaces/app-toolkit`).
- Workspace folders match API slugs (for example, `app/workspaces/faq` instead of `faqs`).

## Import conventions
- Prefer importing from `@/app/...` for feature code. Compatibility barrels remain under `app/src/main/js/app/...` to keep historic imports working during the transition.
- Router imports should target `core/ui/router/`. A thin facade exists at `app/src/main/js/router/` solely for backwards compatibility.

## Migration tips
- When adding a new feature, create a folder under `app/` with `data/`, `domain/`, and `ui/` subfolders to mirror Android-style feature packages.
- Keep shared components in `core/ui/` or `app/<feature>/ui/` and export entrypoints through a small `app/<feature>/ui/*Route.js` where helpful.
- Update docs under `api/<app>/docs/` whenever API payloads or asset locations shift.
