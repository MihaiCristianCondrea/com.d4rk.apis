# English with Lidia API overview

> Change Rationale: Added a `writer` field across English with Lidia lesson feeds and lesson detail payloads so clients can render author attribution consistently in both list and detail views.

## Schema summary
- **Home feed**: `api/english_with_lidia/v1/{debug|release}/ro/home/api_get_lessons.json` exposes a `data` array of lesson cards. `full_banner` entries include `lesson_id`, `lesson_type`, `lesson_title`, `writer`, thumbnail URLs, and `lesson_deep_link_path` values.
- **Lesson details**: Lesson payloads live under `v1/{debug|release}/ro/lessons/` and store a `data` array with lesson objects. Each lesson object includes `lesson_title`, `writer`, and a `lesson_content` array. Multimedia `content_player` blocks include media metadata plus `writer` for author attribution.
- **Assets**: Audio files are stored in `api/english_with_lidia/assets/` and referenced by full GitHub raw URLs in lesson payloads.

## TODO
- Document all block types (ads, banners, content) with field-level requirements and validation rules.
- Add an English locale example and note any differences across build channels.
