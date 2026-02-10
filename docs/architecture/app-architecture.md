# SPA Architecture (Canonical)

## Overview

The application is a **native web SPA** with hash/deep-link compatibility preserved for existing public route IDs.

- UI rendering: HTML templates + Vanilla JS modules.
- Design system: BeerCSS + Material 3 tokens.
- Data source compatibility: all `api/**` paths remain unchanged.

## Canonical folder contract

The migration target is a web-first structure:

- `public/` — shell/runtime static assets.
- `src/assets` — app-level static assets referenced by source modules.
- `src/components` — reusable shared UI components (BeerCSS-first, feature-agnostic).
- `src/features` — business/domain feature modules.
- `src/pages` — route target composition and page wrappers.
- `src/routes` — route manifest and route ownership.
- `src/services` — service adapters/orchestration.
- `src/utils` — framework-agnostic utilities.

Legacy module trees still exist during migration, but **new ownership rules apply**.

## Route ownership

Route registration is centralized in:

- `src/routes/routeManifest.js`

`src/app/bootstrap.js` must import route ownership from the manifest and must not ad-hoc import feature `ui/*Route.js` modules directly.

## Compatibility guarantees

- Existing hash/deep-link route IDs are preserved (e.g. `home`, `faq-api`, `app-toolkit-api`, `repo-mapper`, `release-stats`, `git-patch`).
- Existing `api/**` paths and payload locations are unchanged.
- User-visible routes remain stable even when internal module names migrate away from Android-centric labels.

## Import direction rules

- `src/components` cannot import from `src/features`, `src/pages`, or `src/routes`.
- `src/features` cannot import from `src/pages` or `src/routes`.
- `src/pages` cannot import from `src/routes`.
- `src/routes` may orchestrate pages/features/services and defines routing ownership.

## Automated guards

The CI/test pipeline enforces migration constraints via:

- `scripts/check-canonical-paths.js`
- `scripts/verify-spa-structure.js`
- `scripts/verify-spa-import-rules.js`

## Architecture check

Current checks validate that:

1. `data/domain/ui` split remains intact in active modules.
2. Route ownership is centralized under `src/routes`.
3. Material 3 + BeerCSS alignment remains unchanged.
4. Documentation reflects canonical SPA conventions.
