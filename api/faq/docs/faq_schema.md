# FAQ API v1 schema (unified catalog)

## Folder layout

```
api/faq/v1/
  debug/
    catalog.json            # product list with question source pointers
    en/
      questions/
        general/*.json      # shared FAQ modules (e.g., ads_monetization.json)
        products/*.json     # app-specific FAQ modules
```

The new v1 workspace loads the **catalog** first, then fetches each question module listed under `questionSources`.
The earlier `entries.json` aggregation format is considered **legacy** and kept only for reference during migration.

## `questions/*.json` (question modules)

Each module is a simple array of FAQ objects:

```jsonc
[
  {
    "id": "faq-privacy",
    "categories": ["general", "privacy_data"],
    "icon": "shield_person",
    "question": "Do you collect personal data?",
    "answer": "<p>…</p>",
    "featured": true,
    "tags": ["privacy", "data"]
  }
]
```

Field notes:

* **id** — stable identifier used for deduplication across modules.
* **categories** — optional array used for grouping (e.g., `general`, `ads_monetization`).
* **icon** — Material Symbols name shown in the web workspace and app surfaces.
* **question** — HTML-friendly question/title string.
* **answer** — full HTML-formatted response.
* **featured** — boolean hint for surfacing highlighted answers.
* **tags** — optional array of search keywords.

Clients merge multiple modules (general + product-specific) according to the catalog and then render the unified list.
