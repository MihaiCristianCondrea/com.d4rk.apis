# 📘 FAQ Catalog — Specification & Usage Guide

**Version:** v1
**Scope:** FAQ Workspace / FAQ API
**File:** `api/faq/v1/{debug|release}/en/catalog.json`

---

## 1. Purpose

The **FAQ Catalog** is the central configuration file that tells clients:

* **Which product** (app/website/tool) is being loaded.
* **Which FAQ JSON files** should be fetched for that product.
* **What categories** each FAQ source belongs to.
* **How to assemble** all FAQ entries into one final, unified list.

Instead of duplicating questions across many files, each product declares which FAQ modules it uses.
This keeps the system extensible, clean, and fully static (GitHub Pages compatible).

> **Release vs Debug**
>
> * **release** is production-facing and must always reference `.../api/faq/v1/release/...` JSON paths.
> * **debug** is for experiments and staging and should reference `.../api/faq/v1/debug/...` JSON paths.
>
> Validate paths by loading each build channel in the FAQ workspace (Catalog → Channel presets) and ensuring the previewed URLs contain the correct `/release/` or `/debug/` segment before exporting.

---

## 2. High-Level Structure

`catalog.json` contains three major things:

1. `schemaVersion` – ensures compatibility.
2. `products[]` – a list of all apps/websites/tools and the FAQ modules they use.

---

## 3. Full Schema Breakdown

### Root Fields

```json
{
  "schemaVersion": 1,
  "products": [...]
}
```

* **schemaVersion**
  Increment only when breaking changes are introduced.

* **products**
  An array of all supported products.

---

## 4. Product Object Specification

Each product in `products[]` follows this structure:

```json
{
  "name": "Human readable name",
  "productId": "Unique technical identifier",
  "key": "snake_case_short_key",
  "questionSources": [
    {
      "url": "Full URL to a FAQ JSON file",
      "category": "Human readable category name"
    }
  ]
}
```

### Field Details

#### **name**

Descriptive product name shown in the FAQ workspace.

#### **productId**

Unique identifier used by mobile apps or tools:

* Android → package name
* Website → simple identifier (`api_workspace`)
* Tools → namespaced identifier (`com.d4rk.cleaner`)

#### **key**

A short, consistent, snake_case key used internally for mapping or analytics.

Examples:

* `smart_cleaner_for_android`
* `app_toolkit_for_android`

#### **questionSources**

Each entry links a product to a specific FAQ module.

Each source includes:

| Field      | Purpose                                            |
| ---------- | -------------------------------------------------- |
| `url`      | Full absolute URL to the JSON file on GitHub Pages |
| `category` | A human-friendly name grouping the questions       |

Using full URLs avoids ambiguity, simplifies client code, and works perfectly with static hosting.

---

## 5. How Products Resolve Their FAQ List

When a product loads:

1. The catalog is fetched.
2. The product is located using:

    * `productId` for apps
    * `key` for tools/web clients
3. Each `questionSources[]` item is fetched.
4. All questions are merged into a single final list.
5. Optional:

    * Sorting
    * Grouping by category
    * Filtering by tags
    * Deduplication

All logic happens client-side.

---

## 6. File Responsibilities

### 🔹 **catalog.json**

Acts like a playlist — it only lists *which FAQ sources to load*.

### 🔹 **questions/** directory

Contains all FAQ files, split into:

```
questions/general/
questions/products/
```

* “general” → shared across multiple products
* “products” → specific to one product

Each file contains an array of structured FAQ entries.

---

## 7. Example Product Entry

```json
{
  "name": "Smart Cleaner for Android",
  "productId": "com.d4rk.cleaner",
  "key": "smart_cleaner_for_android",
  "questionSources": [
    {
      "url": "https://mihaicristiancondrea.github.io/com.d4rk.apis/api/faq/v1/release/en/questions/products/smart_cleaner_for_android.json",
      "category": "Product – Smart Cleaner"
    },
    {
      "url": "https://mihaicristiancondrea.github.io/com.d4rk.apis/api/faq/v1/release/en/questions/general/ads_monetization.json",
      "category": "Ads & Monetization"
    },
    {
      "url": "https://mihaicristiancondrea.github.io/com.d4rk.apis/api/faq/v1/release/en/questions/general/distribution_stores.json",
      "category": "Distribution & Stores"
    },
    {
      "url": "https://mihaicristiancondrea.github.io/com.d4rk.apis/api/faq/v1/release/en/questions/general/general.json",
      "category": "General"
    }
  ]
}
```

This tells the client:

“Smart Cleaner uses 4 FAQ modules. Load them all and merge the questions.”

---

## 8. Adding a New Product

To support a new app:

1. Create its FAQ file inside:

   ```
   /questions/products/your_new_app_id.json
   ```
2. Add one block to `products[]` including:

    * `name`
    * `productId`
    * `key`
    * 1+ question sources

This change is **zero-touch** for the rest of the API.

---

## 9. Adding a New General FAQ Group

1. Add the file in:

   ```
   questions/general/
   ```
2. Add links to products that should include it via `questionSources`.

---

## 10. Versioning Strategy

The catalog lives in:

```
faq/v1/debug/en/
faq/v1/release/en/
faq/v1/debug/ro/
...
```

Everything under `v1/` remains schema-compatible until next major revision.

---

## 11. Why This System Works Well

* No duplication
* Perfect for static hosting
* Modular and future-proof
* Easy for Android apps (simple JSON fetch)
* Easy for web workspace
* Human-readable
* Insanely easy to extend
