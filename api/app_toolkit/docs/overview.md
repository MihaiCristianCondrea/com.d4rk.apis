# App Toolkit API overview

> Change Rationale: Added required documentation stub so the App Toolkit API complies with the repository-wide docs contract and clearly lists the current JSON shapes while the feature-first refactor progresses.

## Schema summary
- **Location**: `api/app_toolkit/v{1|2}/{debug|release}/en/home/api_android_apps.json` holds the catalog feed.
- **Envelope**: Objects wrap an `apps` array inside `data`.
- **App entries**: Each app exposes `name`, `packageName`, `category` (with `label` and `category_id`), `description`, `iconLogo`, and a `screenshots` array of `{ url, aspectRatio }` objects.
- **Channels**: Debug vs. release directories mirror the same schema so builder presets can swap channels without branching logic.

## TODO
- Expand coverage to list optional fields (pricing, callouts, download URLs) and document validation expectations per channel.
- Capture example payloads for v1 feeds and any historical migration considerations.
