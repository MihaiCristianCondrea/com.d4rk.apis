# Agent guide for `com.d4rk.apis`

## Project overview
- This repository hosts the public API payloads and supporting site for multiple D4rK Android apps.
- Authoritative JSON APIs live under `api/<app_slug>/v<version>/<build>/en/`.
  - `<build>` is either `debug` or `release` depending on the channel.
  - Keep `debug` and `release` payloads in sync unless a difference is intentional and documented.
- The folders `App Toolkit`, `Android Studio Tutorials`, and `English with Lidia` at the repository root are archived exports. Treat them as read-only snapshots—make changes in the canonical `api/` tree instead.
- Front-end pages, scripts, and workers for the documentation site live in `pages/`, `assets/`, and `src/` using vanilla JavaScript and Material Web components.
- Additional context for the App Toolkit experience is collected in `docs/app-toolkit-ux-improvements.md`.

## Environment & setup
1. Use Node.js 18+ (the project is tested with LTS releases).
2. Install dependencies with `npm install`.
3. Run Jest tests with `npm test`.
4. Build Tailwind CSS assets with `npm run build:css` when you touch `assets/css/tailwind.input.css` or adjust Tailwind tokens.
5. `npm run deploy` runs the CSS build and verifies the sitemap/robots files—execute it before shipping production changes.

## Development guidelines
- JavaScript modules follow an ES module structure with semicolons and four-space indentation. Prefer single quotes for strings unless JSON interoperability requires double quotes.
- Utility code lives in `src/domain` and `src/services`; update or add Jest specs in `__tests__/` alongside behavior changes.
- Keep API JSON formatted with two-space indentation, sorted keys when reasonable, and arrays on single lines for short lists (match nearby files). Validate JSON with an external linter or by running `npm test` after changes.
- When you add or rename API payloads, update any GitHub automation paths in `assets/js/apis/appToolkit.js` and mirror documentation in `api/<app_slug>/docs/` if applicable.
- Reference assets by HTTPS URLs and avoid embedding data URIs; mobile clients consume these payloads directly.
- For localized content, create a sibling locale directory (e.g., `es/`) and ensure routing in consuming apps is documented before merging.

## Testing & verification
- New or changed behavior must be covered by Jest tests when practical. Use `npm test -- <pattern>` to scope runs while iterating.
- Sanity-check JSON payloads by loading them through the site preview (`pages/apis/*.html`) to confirm Material components still render as expected.
- Before requesting review, run `npm test` and the relevant build commands (`npm run build:css`, `npm run deploy` for release changes) and fix any failures.

## Pull request expectations
- Title format: `[com.d4rk.apis] <concise summary>`.
- Summaries should mention the affected API or site section (e.g., "Update Android Studio Tutorials release lessons").
- Include the commands you executed (tests, builds) in the PR body.
- Document notable API contract changes in the affected app's `docs/` folder so downstream consumers can track revisions.
