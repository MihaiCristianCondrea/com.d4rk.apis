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
- **Routing boundaries:** UI routes live under feature `ui/` as `*Route.js` modules and
  register directly with `core/ui/router/routes.js`.
- <!-- Change Rationale: Legacy `src/router`, `src/routes`, and `src/pages` compatibility
     scaffolding has been fully removed to complete router convergence. Keeping a single
     registration flow reduces duplication and aligns with Material 3's predictable navigation
     model where one source of truth controls destinations. -->
  **Router convergence status:** Sunset complete. The only supported runtime flow is:
  feature `ui/*Route.js` registration → `core/ui/router` runtime/navigation.
- <!-- Change Rationale: Feature screens were mixing BeerCSS classes, bespoke button utilities,
     and Material Web tags for core controls. Locking a single policy reduces visual drift,
     keeps control behavior predictable, and preserves Material 3 consistency through one
     component language. -->
  **Material 3 first (single UI policy):** BeerCSS is the primary component system for
  **buttons, app bars, drawers, lists, and inputs**. Avoid mixing in non-BeerCSS component
  patterns for those control families inside feature screens.
- **Docs and data:** API JSON lives under `api/` and must remain the single source of truth.

## Directory conventions

<!-- Change Rationale: Feature screens now live with feature UI and reusable views live under
     ui/views, so the directory and naming guidance is updated to reflect the Screen + View structure. -->

### App-level folders

- `app/src/main/js/core/`
  - Shared app shell, router, utilities, and service integrations.
  - Keep feature code **out** of core.
- `app/src/main/js/app/<feature>/`
  - Each feature gets `data/`, `domain/`, and `ui/` subfolders.
  - Routes, screens, and view helpers belong in `ui/`.
- `app/src/main/js/app/<feature>/ui/`
  - Feature-specific HTML screens live directly in the UI folder.
- `app/src/main/js/app/<feature>/ui/views/`
  - Reusable HTML view snippets for the feature.
- `app/src/main/styles/`
  - `base/` for typography and page-level styling.
  - `components/` for shared UI primitives.
  - `features/` for feature-specific CSS.
- `tests/`
  - `unit/` for pure domain/service/router checks.
  - `integration/` for DOM-level and route wiring smoke tests.
  - `fixtures/` for reusable raw files and deterministic inputs.

### File naming

- **Routes:** `FeatureRoute.js` (PascalCase) inside `ui/`.
- **Screens:** `FeatureScreen.html` (or similar) under `ui/`.
- **Views:** reusable HTML snippets under `ui/views/`.
- **Data modules:** descriptive camelCase (`homeContentDataSource.js`, `images.js`).


### UI governance checks (Material 3 quality signals)

<!-- Change Rationale: The governance test now verifies intended Material 3 usage instead of
     blocking all `md-*` tags, so architecture docs must mirror the same pass/fail criteria. -->

`tests/unit/uiGovernance.test.js` enforces these screen-level rules:

- Use only approved Material Web components already standardized in the app shell (`md-filled-button`,
  `md-outlined-button`, `md-text-button`, `md-filled-tonal-button`, cards, menus, dialog/sheet,
  steppers, form fields, and icons).
- Do not introduce legacy patterns (`mdc-*` CSS hooks or `paper-*` elements).
- Keep predictable screen scaffolding by preserving a `page-section` wrapper per `*Screen.html`.
- Preserve action hierarchy: screens using filled buttons must also expose secondary/tertiary
  variants (outlined/text/tonal) where appropriate.
- Ensure focusable controls are targetable (`id` or `aria-label`) for accessibility and testing.
- Workspace screens must expose at least one `role="status"` region for live validation/progress copy.

## Workflow expectations

1. **Create/modify UI in `ui/`:** expose entrypoints through the router.
2. **Keep domain logic pure:** avoid DOM access in `domain/` modules.
3. **Use `data/` for IO:** API calls, storage, and external service wiring.
4. **Update docs:** when editing API JSON or schemas, verify `api/<app>/docs/`.
5. **Do not add legacy router scaffolding:** avoid `src/router/`, `src/routes/*.route.js`,
   and `src/pages/<module>/page.*` patterns.

## Architecture check (required)

At the **end of every task**, confirm:

- No files were added outside the Android-style `data/domain/ui` layout.
- The router still owns navigation flow.
- UI changes respect Material 3 patterns and BeerCSS helpers.
- Any API JSON changes have matching documentation.

If any item fails, resolve it before merging.
