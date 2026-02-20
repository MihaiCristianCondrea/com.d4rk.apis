# SPA Architecture (Canonical)

## Overview

The application is a **native web SPA** with hash/deep-link compatibility preserved for public route IDs.

- UI rendering: HTML templates + Vanilla JS ES modules.
- Design system: BeerCSS + Material 3 tokenized styling.
- Data source compatibility: all `api/**` payload paths remain unchanged.

## Canonical folder contract

The active architecture target follows Feature-Sliced layers:

- `public/` — static assets copied/served as-is.
- `src/app` — bootstrap/entrypoint, providers, shell composition, route runtime glue.
- `src/pages` — route-level slices and route-facing page composition.
- `src/widgets` — reusable composed UI blocks.
- `src/features` — user-facing behaviors and feature orchestration.
- `src/entities` — domain entities and entity-level contracts.
- `src/shared` — shared api/lib/config/styles/workers.
- `src/routes` — centralized route manifest authority.

## Naming contract

- Disk names: kebab-case for folders and files.
- Route templates: `*.page.html` and `*.page.css`.
- Widget templates: `*.widget.html` and `*.widget.css`.
- Shared partial templates: `*.view.html` and `*.view.css`.
- Component modules: `*.ce.js`.

## Route ownership

Route registration authority is centralized in:

- `src/routes/routeManifest.js`

`src/app/bootstrap.js` must consume app-level route runtime glue and must not import ad-hoc feature route modules directly.

## Import direction rules

Allowed direction is strictly downward:

`app → pages → widgets → features → entities → shared`

Constraints:

- `pages` must not import from `app`.
- `features` must not import from `widgets/pages/app`.
- `shared` must not import from higher layers.

## Automated governance

The validation pipeline enforces structure, naming, and layering via:

- `scripts/verify-spa-structure.js`
- `scripts/verify-spa-import-rules.js`
- `scripts/check-canonical-paths.js`

## Button Source of Truth

<!-- Change Rationale: A single button policy prevents drift between BeerCSS-native
     buttons and legacy Material Web overrides, reducing long-term maintenance cost. -->

- All interactive buttons must be native `<button>`/`<a>` with BeerCSS classes.
- No new `md-*button` style overrides.
- Variants must map to shared `app-button*` utilities.

### Migration Note (Search Checks)

- `md-outlined-button`
- `--md-*-button-*`
- `.builder-button` (if used for appearance, not layout)

## Quality gate

Use these checks before merge:

- Run structure/layering validation scripts under **Automated governance**.
- Apply the button review checklist: `docs/architecture/button-consistency-checklist.md`.

## Migration closeout checklist

1. `data/domain/ui` split remains coherent.
2. Route ownership remains centralized in `src/routes/routeManifest.js`.
3. Material 3 + BeerCSS alignment remains preserved.
4. Documentation stays synchronized with implementation and naming contracts.
