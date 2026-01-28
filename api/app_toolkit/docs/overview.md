# App Toolkit API overview

> Change Rationale: Updated the App Toolkit API overview to match the current `api_android_apps.json` payload (string categories and URL arrays) so consumers rely on accurate field shapes while the feature-first refactor progresses.

## Schema summary
- **Location**: `api/app_toolkit/v{1|2}/{debug|release}/en/home/api_android_apps.json` holds the catalog feed.
- **Envelope**: Objects wrap an `apps` array inside `data`.
- **App entries**: Each app exposes `name`, `packageName`, `category` (string slug), `description`, `iconLogo`, and a `screenshots` array of image URL strings.
- **Screenshots**: Entries preserve the Play Store-provided aspect ratio in the URL and should be treated as external assets.
- **Channels**: Debug vs. release directories mirror the same schema so builder presets can swap channels without branching logic.

## TODO
- Expand coverage to list optional fields (pricing, callouts, download URLs) and document validation expectations per channel.
- Capture example payloads for v1 feeds and any historical migration considerations.
