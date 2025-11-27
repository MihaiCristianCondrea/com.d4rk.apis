# FAQ API v1 schema (unified catalog)

## Folder layout

```
api/faq/v1/
  index.json                # topics, products, and language/build pointers
  release/
    en/entries.json         # canonical English FAQs
    ro/entries.json         # Romanian catalog (empty stub for now)
  debug/
    en/entries.json         # debug copy of the English catalog
```

Older per-category JSON files in `api/faq/v1/*.json` are considered **legacy** and are kept only for reference during migration.

## `index.json`

```jsonc
{
  "schemaVersion": 1,
  "defaultLanguage": "en",
  "defaultBuild": "release",
  "languages": [
    { "code": "en", "label": "English", "builds": { "release": "release/en/entries.json", "debug": "debug/en/entries.json" } },
    { "code": "ro", "label": "Română", "builds": { "release": "release/ro/entries.json" } }
  ],
  "topics": [ { "code": "general", "label": "General", "group": "General" }, ... ],
  "products": [ { "code": "global", "label": "All apps & websites" }, ... ]
}
```

* `languages[n].builds` maps build type → relative entries path.
* `topics` enumerate the allowed topic codes used by FAQ entries.
* `products` enumerate product/app/site codes used by FAQ entries.

## `entries.json`

```jsonc
{
  "schemaVersion": 1,
  "language": "en",
  "generatedAt": "2024-06-07T00:00:00Z",
  "entries": [
    {
      "id": "faq-analytics",
      "question": "Why do you use analytics and ads at all?",
      "iconSymbol": "insights",
      "topics": ["general", "privacy_data", "ads_monetization"],
      "products": ["global"],
      "featured": true,
      "weight": 100,
      "answerHtml": "<p>…</p>",
      "homeAnswerHtml": "<p>…</p>"
    }
  ]
}
```

Field notes:

* `topics` is the primary categorization axis; `products` defines where the FAQ appears.
* `weight` controls ordering (higher values sort first); omit if not needed.
* `featured` is a boolean hint for surfacing a subset on home/landing screens.
* `homeAnswerHtml` is optional short-form content for compact views.
* For backward compatibility, consumers may treat `topics` as the successor to `categories`; aliases can be added if a client still expects `categories`.

## Consumption pattern

1. Fetch `api/faq/v1/index.json` to discover available languages, topics, and products.
2. Load the appropriate `entries.json` for the build/language combination.
3. Filter client-side, e.g. `products.includes('global') || products.includes('smart_cleaner')`.
4. Sort by `weight` (descending) and apply UI-specific featured/home rendering as needed.
