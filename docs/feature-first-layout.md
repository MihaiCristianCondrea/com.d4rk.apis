# Feature-first web layout

> Change Rationale: The web app now uses a feature-first directory structure to keep feature modules focused, align workspace slugs with their APIs, and make router imports consistent without breaking legacy paths.

## Canonical structure
- Core infrastructure stays in `app/src/main/js/core/` (router, styles, services, shared UI).
- User-facing modules live in `app/src/main/js/features/` with kebab-case folders per feature (for example, `features/home`, `features/github-tools`, `features/workspaces/app-toolkit`).
- Workspace folders match API slugs (for example, `features/workspaces/faq` instead of `faqs`).

## Import conventions
- Prefer importing from `@/features/...` for feature code. Compatibility barrels remain under `app/src/main/js/app/...` to keep historic imports working during the transition.
- Router imports should target `core/router/`. A thin facade exists at `app/src/main/js/router/` solely for backwards compatibility.

## Migration tips
- When adding a new feature, create a folder under `features/` with optional `domain/`, `services/`, and `ui/` subfolders to mirror Android-style feature packages.
- Keep shared components in `core/ui/` or `features/.../ui/` and export entrypoints through a small `features/<name>/index.js` where helpful.
- Update docs under `api/<app>/docs/` whenever API payloads or asset locations shift.
