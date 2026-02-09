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
  register directly with `src/core/ui/router/routes.js`.
- <!-- Change Rationale: Legacy `src/router`, `src/routes`, and `src/pages` compatibility
     scaffolding has been fully removed to complete router convergence. Keeping a single
     registration flow reduces duplication and aligns with Material 3's predictable navigation
     model where one source of truth controls destinations. -->
  **Router convergence status:** Sunset complete. The only supported runtime flow is:
  feature route-module registration under src/app/.../ui/Route files → `src/core/ui/router/**` runtime/navigation.
- <!-- Change Rationale: Feature screens were mixing BeerCSS classes, bespoke button utilities,
     and Material Web tags for core controls. Locking a single policy reduces visual drift,
     keeps control behavior predictable, and preserves Material 3 consistency through one
     component language. -->
  **Material 3 first (strict UI contract):** BeerCSS is the only interactive component family for
  **buttons, text fields, selects, drawers, cards, and top bars** inside feature screens and
  feature views. `md-*` tags are prohibited in feature-owned HTML (`src/app/**/ui/*Screen.html`
  and `src/app/**/ui/views/*.html`) to prevent mixed control systems.
- **Docs and data:** API JSON lives under `api/` and must remain the single source of truth.
- **Theme policy:** fixed Android-green brand palette from `src/styles/variables.css`; no runtime dynamic color generation.

## Directory conventions

<!-- Change Rationale: Feature screens now live with feature UI and reusable views live under
     ui/views, so the directory and naming guidance is updated to reflect the Screen + View structure. -->

### App-level folders

- `src/core/`
  - Shared app shell, router, utilities, and service integrations.
  - Keep feature code **out** of core.
- `src/app/` (feature directories live here; each feature keeps `data/`, `domain/`, and `ui/`)
  - Each feature gets `data/`, `domain/`, and `ui/` subfolders.
  - Routes, screens, and view helpers belong in `ui/`.
- `src/app/` feature `ui/` folders
  - Feature-specific HTML screens live directly in each feature UI folder.
- `src/app/` feature `ui/views/` folders
  - Reusable HTML view snippets for each feature.
- `src/styles/`
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


### UI governance checks (BeerCSS enforcement)

<!-- Change Rationale: Governance now treats md-* feature controls as a regression to enforce
     a strict BeerCSS-first contract and eliminate mixed component families in feature UI. -->

`tests/unit/uiGovernance.test.js` enforces these screen-level rules:

- Feature screens (`*Screen.html`) must not contain any `md-*` tags.
- Legacy patterns remain blocked (`mdc-*` CSS hooks or `paper-*` elements).
- Screen scaffolding keeps a `page-section` wrapper for predictable composition.
- Workspace screens must expose at least one `role="status"` region for live validation/progress copy.
- New feature markup should use semantic feature classes instead of mixed utility-class chains.

## Runtime dependency policy

<!-- Change Rationale: Runtime `index.html` previously loaded UI component registries and font/icon assets
     from third-party CDNs, which bypassed lockfile governance and introduced deployment drift.
     Moving these dependencies into npm imports keeps runtime deterministic and auditable. -->

- `index.html` must not register external UI libraries with `<script src="https://...">` tags.
- UI libraries (BeerCSS, dotLottie web component, icon packs, and font packages) must load through
  package imports in `src/main.js` / `src/app/bootstrap.js`.
- Runtime guard: `scripts/verify-runtime-dependencies.js` fails builds/tests when disallowed
  external UI library script tags are added to `index.html`.

## Shell + bootstrap flow

<!-- Change Rationale: The duplicate shell template was removed, so docs now describe the
     canonical runtime startup path that Vite executes in production and tests. -->

Runtime startup now follows this single path:

1. `index.html` provides the canonical shell markup and navigation mount target.
2. `src/main.js` is imported by Vite from `index.html`.
3. `src/app/bootstrap.js` imports feature `*Route.js` modules and initializes core shell wiring.
4. `src/core/ui/appShell.js` initializes navigation + router integration via `src/core/ui/router/**`.

## Workflow expectations

1. **Create/modify UI in `ui/`:** expose entrypoints through the router.
2. **Keep domain logic pure:** avoid DOM access in `domain/` modules.
3. **Use `data/` for IO:** API calls, storage, and external service wiring.
4. **Update docs:** when editing API JSON or schemas, verify API documentation folders under `api/`.
5. **Do not add legacy router scaffolding:** avoid legacy router/page compatibility directories (for example: src/router, src/routes, src/pages) and keep all runtime routing under `src/core/ui/router/**`.

## Architecture check (required)

At the **end of every task**, confirm:

- No files were added outside the Android-style `data/domain/ui` layout.
- The router still owns navigation flow.
- UI changes respect Material 3 patterns and BeerCSS helpers.
- Any API JSON changes have matching documentation.

If any item fails, resolve it before merging.
