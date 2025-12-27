# English with Lidia API overview

> Change Rationale: Added the required docs placeholder to align with the repository documentation policy and to record the current payload layout after relocating audio assets into the API tree.

## Schema summary
- **Home feed**: `api/english_with_lidia/v1/{debug|release}/ro/home/api_get_lessons.json` exposes a `data` array of lesson cards. Entries include `lesson_id`, `lesson_type`, optional `lesson_title`, thumbnail URLs, and `lesson_deep_link_path` values.
- **Lesson details**: Lesson payloads live under `v1/{debug|release}/ro/lessons/` and store a `data` object with `content_blocks` arrays. Blocks carry `content_title`, `content_description`, optional `content_image_url`, and `content_audio_url` fields for multimedia lessons.
- **Assets**: Audio files are stored in `api/english_with_lidia/assets/` and referenced by full GitHub raw URLs in lesson payloads.

## TODO
- Document all block types (ads, banners, content) with field-level requirements and validation rules.
- Add an English locale example and note any differences across build channels.
