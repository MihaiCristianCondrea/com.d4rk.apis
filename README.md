# D4rK API + Web SPA Console

This repository contains:

1. The canonical JSON API payloads used by D4rK applications (`api/**`).
2. The web SPA console used to view/edit/manage API data (`src/**`, `public/**`).

## Canonical data source

All production and debug data lives under:

- `api/<app_slug>/v<version>/<build_type>/<language>/<category>/<file>.json`

Examples:

- `api/app_toolkit/v1/release/en/home/api_android_apps.json`
- `api/faq/v1/debug/en/questions/general/general.json`

## SPA architecture (current)

The app is organized as a native, framework-agnostic SPA:

- `public/` shell/static assets
- `src/assets` static app assets
- `src/components` shared reusable BeerCSS UI
- `src/features` business modules
- `src/pages` route target composition
- `src/routes` centralized route manifest/registration
- `src/services` service adapters
- `src/utils` common helpers

Legacy feature code remains in `src/app/**` during migration, but route ownership is centralized via `src/routes/routeManifest.js`.

## Compatibility guarantees

- Existing `api/**` paths are preserved.
- Existing hash/deep-link route IDs are preserved (e.g. `home`, `faq-api`, `app-toolkit-api`, `repo-mapper`, `release-stats`, `git-patch`).

## Development

```bash
npm test
npm run dev
```

## Documentation

- Architecture: `docs/architecture/app-architecture.md`
- API docs: `api/<app_slug>/docs/`

## License

GPL-3.0-or-later (see `LICENSE`).
