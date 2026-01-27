# App Architecture Guide

<!-- Change Rationale: The unused Help feature code has been removed and replaced with a single
     architecture guide so contributors have a clear, canonical reference for how the web app
     should be structured, aligned with the Android-style layout and Material 3 principles. -->

## Scope

This guide defines the **expected structure** and **naming conventions** for the API Console
web application. It exists to keep the codebase aligned with the Android-style architecture
adopted across the repository.

## Core principles

- **Android-style layering:** every feature is split into `data/`, `domain/`, and `ui/`.
- **Routing boundaries:** UI routes live under feature `ui/` and are invoked through the
  core router to keep navigation centralized.
- **Material 3 first:** navigation, app bars, and layout spacing should follow the Material 3
  system (BeerCSS + Material Web Components are the primary UI tools).
- **Docs and data:** API JSON lives under `api/` and must remain the single source of truth.

## Directory conventions

### App-level folders

- `app/src/main/js/core/`
  - Shared app shell, router, utilities, and service integrations.
  - Keep feature code **out** of core.
- `app/src/main/js/app/<feature>/`
  - Each feature gets `data/`, `domain/`, and `ui/` subfolders.
  - Routes, screens, and view helpers belong in `ui/`.
- `app/src/main/res/layout/<feature>/`
  - HTML layout templates grouped by feature.
- `app/src/main/styles/`
  - `base/` for typography and page-level styling.
  - `components/` for shared UI primitives.
  - `features/` for feature-specific CSS.

### File naming

- **Routes:** `FeatureRoute.js` (PascalCase) inside `ui/`.
- **Screens/partials:** `feature-name.html` in `res/layout/<feature>/`.
- **Data modules:** descriptive camelCase (`homeContent.js`, `images.js`).

## Workflow expectations

1. **Create/modify UI in `ui/`:** expose entrypoints through the router.
2. **Keep domain logic pure:** avoid DOM access in `domain/` modules.
3. **Use `data/` for IO:** API calls, storage, and external service wiring.
4. **Update docs:** when editing API JSON or schemas, verify `api/<app>/docs/`.

## Architecture check (required)

At the **end of every task**, confirm:

- No files were added outside the Android-style `data/domain/ui` layout.
- The router still owns navigation flow.
- UI changes respect Material 3 patterns and BeerCSS helpers.
- Any API JSON changes have matching documentation.

If any item fails, resolve it before merging.
