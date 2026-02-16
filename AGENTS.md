# AGENTS.md

## 0. Non-Negotiables (Repo Reality)
<!-- Change Rationale: This instruction set aligns daily work with the native SPA + FSD migration target while preserving current legacy app compatibility constraints. -->
- **Do NOT move/rename these root folders (still used by legacy apps):**
  - `Android Studio Tutorials/`
  - `App Toolkit/`
  - `English with Lidia/`
- Treat edits in the three legacy root folders as **high-impact** and modify only when explicitly requested.
- **Core data source:** `api/` is the canonical source of truth for payloads.
- **Protected file:** `LICENSE` must not be modified unless explicitly requested.
- **Canonical architecture document:** `docs/architecture/app-architecture.md`.

## 1. Canonical SPA Architecture (Native + Feature-Sliced)
- Build for a **native web SPA** using HTML + ES modules + CSS.
- `public/` remains static assets served/copied as-is.
- Keep `index.html` at repository root.
- `src/` architecture target follows Feature-Sliced layers:
  - `src/app` (composition only)
  - `src/pages`
  - `src/widgets`
  - `src/features`
  - `src/entities`
  - `src/shared`

### 1.1 Layer Import Rules (Mandatory)
- Import direction: `app → pages → widgets → features → entities → shared`.
- Modules may import from the same layer slice or lower layers only.
- Forbidden:
  - `shared` importing from higher layers.
  - `features` importing from `widgets/pages/app`.
  - `pages` importing from `app`.

### 1.2 Route Ownership
- Route registration authority: `src/routes/routeManifest.js` (current) until migration completes.
- During migration, avoid ad-hoc route imports in bootstrapping code.

## 2. Naming Standard (Repository-Wide)
- **Disk naming (folders/files):** kebab-case.
- **Code naming:**
  - `camelCase` for functions/variables.
  - `PascalCase` for classes.
- **Web components:**
  - File format: `<tag-name>.ce.js` (kebab-case).
  - Element names must be lowercase and hyphenated.

### 2.1 UI File Suffixes
- Route-level screen templates: `*.page.html`, styles `*.page.css`.
- Widget templates: `*.widget.html`, styles `*.widget.css`.
- Shared partial templates: `*.view.html`, styles `*.view.css`.

## 3. UI/UX & Design System
- Follow Material Design 3 semantics.
- Use BeerCSS with tokenized styles.
- Keep drawer behavior aligned with native Material patterns (slide motion; opacity for scrims only).
- Prevent theme-token fallback leaks by defining tokens explicitly.

## 4. Data Contract & Documentation
- API payload path standard:
  - `api/<app_slug>/v<version>/<build_type>/<language>/<category>/<file>.json`
- Keep docs accurate under `api/<app_slug>/docs/`.
- If JSON schema changes, update matching docs in the same task.

## 5. Documentation Requirements
- Add JSDoc for modified/added JS modules and functions.
- Include a concise **Change Rationale** note for meaningful behavior or architecture changes.

## 6. Testing & Quality Gate
1. Make changes.
2. Run `npm test`.
3. Verify architecture constraints and documentation consistency.
4. Finalize with a brief checklist.

## 7. End-of-Task Architecture Check (Required)
Confirm all of the following before finalizing:
- `data/domain/ui` split remains coherent.
- Route ownership is respected.
- Material 3 + BeerCSS alignment is preserved.
- Documentation reflects the current implementation.
