# Vite SPA Migration Mapping

## A) Inventory & route/page mapping

- Existing route ids preserved: `home`, `faq-api`, `app-toolkit-api`, `english-with-lidia-api`, `android-studio-tutorials-api`, `git-patch`, `repo-mapper`, `release-stats`.
- Legacy static-served assets identified: `manifest.json`, `robots.txt`, `sitemap.xml`, `mipmap/*`, `drawable/*`, `api/**`, and worker scripts under `workers/*`.
- Source modules migrated to `src/**` (router, feature UI, domain/data services, and styles).

## OLD PATH -> NEW PATH

| Old path | New path |
| --- | --- |
| `app/src/main/js/**` | `src/**` |
| `app/src/main/styles/**` | `src/styles/**` |
| `app/src/main/js/main.js` | `src/app/bootstrap.js` |
| `app/src/main/js/core/ui/shell/AppShell.html` | `index.html` |
| `app/src/assets/data/material-symbols.json` | `public/data/material-symbols.json` |
| `app/src/main/res/mipmap/**` | `public/mipmap/**` |
| `app/src/main/res/drawable/**` | `public/drawable/**` |
| `manifest.json` | `public/manifest.json` |
| `robots.txt` | `public/robots.txt` |
| `sitemap.xml` | `public/sitemap.xml` |

## Architecture check

- `data/domain/ui` split remains intact under `src/app/**` and `src/core/**`.
- Router ownership remains centralized in `src/core/ui/router/**` and is hydrated by feature `src/app/**/ui/*Route.js` registrations imported through `src/app/bootstrap.js`.
- Material 3 alignment remains unchanged (Material Web + BeerCSS usage preserved in shell and bootstrap).
- Documentation consistency updated with this migration mapping document.


## Shell/bootstrap runtime flow

- Canonical runtime shell: `index.html`.
- Vite entry module: `src/main.js` (imported by `index.html`).
- Bootstrap module: `src/app/bootstrap.js` (registers feature routes, then imports `src/core/ui/appShell.js`).
- Router runtime: `src/core/ui/router/**` as the only navigation owner.

- Theme palette authority remains fixed in `src/styles/variables.css` (BeerCSS tokens map to brand tokens there).
