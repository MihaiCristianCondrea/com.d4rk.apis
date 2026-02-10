# AGENTS.md

## 1. Project Architecture & Boundary Rules
<!-- Change Rationale: The repository now enforces a canonical web SPA layout while preserving
     API and route compatibility. These instructions replace Android-centric ownership language. -->
- **Core Data Source:** The source of truth for API payloads is `api/`.
- **Archived Directories:** Root folders `Android Studio Tutorials`, `App Toolkit`, and `English with Lidia` are legacy archives. Do not edit them.
- **Protected Files:**
  - `LICENSE`: do not modify unless explicitly requested.
- **Canonical architecture doc:** `docs/architecture/app-architecture.md`.
- **Architecture check:** End every task confirming `data/domain/ui` split, route ownership, Material 3 alignment, and documentation consistency.

## 1.1 SPA Folder & Ownership Doctrine
- **Canonical SPA folders:**
  - `public/`
  - `src/assets`
  - `src/components`
  - `src/features`
  - `src/pages`
  - `src/routes`
  - `src/services`
  - `src/utils`
- **Route ownership:**
  - `src/routes/routeManifest.js` is the route-registration authority.
  - `src/app/bootstrap.js` must not contain ad-hoc `ui/*Route.js` imports.
- **Legacy feature tree:** `src/app/**` may remain during migration for compatibility.

## 1.2 Naming & Import Direction Rules
- **UI entrypoints:** `*Route.js`.
- **Screen templates:** `*Screen.html`.
- **Shared reusable UI:** place in `src/components`.
- **Business feature logic:** place in `src/features/*`.
- **Route targets/page composition:** place in `src/pages/*`.
- **Import direction rules:**
  - `src/components` cannot import `src/features`, `src/pages`, or `src/routes`.
  - `src/features` cannot import `src/pages` or `src/routes`.
  - `src/pages` cannot import `src/routes`.
  - `src/routes` may orchestrate pages/features/services.

## 2. Documentation Strategy
- Keep docs technically accurate under `api/<app_slug>/docs/`.
- If JSON schema changes, update corresponding docs in the same task.

## 3. UI/UX & Design System
- Follow Material Design 3 semantics.
- Use BeerCSS and tokenized styling.
- Keep interfaces responsive and fast.

## 4. Documentation Requirements
- Add JSDoc blocks for modified/added JS modules/functions.
- Include a Change Rationale comment for meaningful code changes.

## 5. Data Structure & JSON Guidelines
- Path: `api/<app_slug>/v<version>/<build_type>/<language>/<category>/<file>.json`
- Preserve strict JSON validity.
- Treat `release/` payload edits as high-impact.

## 6. Testing & Quality Assurance
1. Make changes.
2. Run `npm test`.
3. Verify related API docs are still accurate.
4. Finalize.
