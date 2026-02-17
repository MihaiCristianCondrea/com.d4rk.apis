# D4rK API + Native Web SPA Console

This repository hosts two connected products:

1. **Canonical API payloads** for D4rK apps (`api/**`).
2. **Native SPA console** (HTML + JS + CSS + BeerCSS) used to inspect and manage payloads (`src/**`, `public/**`).

---

## Non-negotiable repository constraints

- Keep these root folders in place (legacy app mirrors, still active):
  - `Android Studio Tutorials/`
  - `App Toolkit/`
  - `English with Lidia/`
- `api/` is the source of truth for structured payloads.
- Keep `index.html` at root and `public/` as static asset directory.

---

## Canonical data path

All payloads must follow:

`api/<app_slug>/v<version>/<build_type>/<language>/<category>/<file>.json`

Examples:

- `api/app_toolkit/v1/release/en/home/api_android_apps.json`
- `api/faq/v1/debug/en/questions/general/general.json`

---

## Target SPA architecture (consistent end-state)

The modernization target is a native, feature-sliced structure:

- `src/app` — composition/bootstrap only
- `src/pages` — route-level screens
- `src/widgets` — large reusable UI blocks
- `src/features` — reusable user behaviors/use-cases
- `src/entities` — shared domain entities
- `src/shared` — base APIs/libs/ui/styles/workers

### Naming standard

- **Disk naming:** kebab-case for folders/files.
- **Code naming:** `camelCase` (functions/vars), `PascalCase` (classes).
- **Web components:** `<tag-name>.ce.js` and lowercase hyphenated custom element names.
- **UI suffixes:**
  - page: `*.page.html`, `*.page.css`
  - widget: `*.widget.html`, `*.widget.css`
  - shared view: `*.view.html`, `*.view.css`

---

## Refactor plan (architecture + naming consistency)

### Phase 1 — Governance alignment
- Align `AGENTS.md` and docs with FSD layers, naming, and route ownership.
- Preserve compatibility rules for legacy root folders and canonical API contracts.

### Phase 2 — Structural migration (incremental)
- Introduce/normalize `src/pages`, `src/widgets`, `src/features`, `src/entities`, `src/shared` slices.
- Move code incrementally with compatibility shims to avoid route/runtime regressions.
- Keep `src/routes/routeManifest.js` as route registration authority during transition.

### Phase 3 — Naming normalization
- Convert inconsistent names (camel/Pascal on disk) into kebab-case.
- Standardize UI template suffixes (`.page/.widget/.view`).
- Standardize component file names to `.ce.js`.

### Phase 4 — Behavior quality targets
- Ensure navigation drawer uses Material-like slide motion.
- Eliminate BeerCSS theme fallback leaks by enforcing token definitions.
- Validate parity between desktop and mobile drawer behavior.

### Phase 5 — Validation and closeout
- Run `npm test`.
- Re-check docs for architecture and API contract accuracy.
- Confirm end-of-task checklist: route ownership, Material 3 alignment, and documentation consistency.

---

## Development

```bash
npm install
npm run dev
npm test
```

## Documentation

- Architecture: `docs/architecture/app-architecture.md`
- API docs: `api/<app_slug>/docs/`

## License

GPL-3.0-or-later (`LICENSE`).


## Validation and governance checks

Run full validation:

```bash
npm test
```

Run architecture guards directly:

```bash
npm run verify:spa-structure
npm run verify:spa-import-rules
```

Naming governance now enforces:

- kebab-case disk names in canonical SPA layers
- `*.page.html` for route screens
- `*.view.html` for shared partials
- `*.ce.js` for component modules
