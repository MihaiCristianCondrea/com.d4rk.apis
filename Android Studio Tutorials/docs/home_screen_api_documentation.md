# Android Studio Tutorials Home Screen API

This API powers the **Home** screen of the **Android Studio Tutorials** app. It provides a list of items (primarily lessons and ad placeholders) that the app renders in a vertical list. Each item has a `lesson_type` that determines how it should be displayed: a **lesson** (with associated title, description, tags, images) or an **ad** (one of several banner sizes).

Below is an overview of the API’s structure, field definitions, and guidelines for adding or modifying entries.

---

## Table of Contents

1. [API Structure](#api-structure)  
2. [Lesson Items](#lesson-items)  
   - [Square Image Lessons](#square-image-lessons)  
   - [Full Banner Lessons](#full-banner-lessons)  
3. [Ad Items](#ad-items)  
   - [Available Ad Types](#available-ad-types)  
   - [Ad ID Format](#ad-id-format)  
4. [Updating and Versioning](#updating-and-versioning)  
   - [ID Management](#id-management)  
   - [Recommended Checks](#recommended-checks)  
5. [Example Usage in the App](#example-usage-in-the-app)

---

## API Structure

The API is returned as a single JSON object containing a key, `"data"`, which is an **array** of items:

```json
{
  "data": [
    // item 1
    // item 2
    // ...
  ]
}
```

Each **item** in `data` can be a **lesson** or an **ad**. The difference is determined by the `"lesson_type"` field.

---

## Lesson Items

Lessons **teach** specific Android development concepts. They generally have the following fields:

| Field               | Type               | Description                                                                                |
|---------------------|--------------------|--------------------------------------------------------------------------------------------|
| `lesson_id`         | String (numeric)  | Unique numeric ID for each lesson (e.g., `"1"`, `"15"`, `"6"`). First lesson has ID `1`, second lesson has ID `2`, etc. |
| `lesson_title`      | String            | The title of the lesson (e.g., `"Displaying Transient Messages with Snackbars"`).          |
| `lesson_description`| String            | A brief (or extended) description of what the lesson covers.                               |
| `lesson_type`       | String            | Either `"square_image"` or `"full_banner"` for lessons.                                    |
| `deep_link_path`    | String (URI)      | Deep link for navigating directly to that lesson (e.g., `"com.d4rk.androidtutorials://lesson/snack_bars"`). |
| `lesson_tags`       | List of Strings   | Keywords describing the lesson’s topic (e.g., `["Android","Kotlin","UI"]`).                |
| `square_image_url`  | String (URL)      | **Only** for `"square_image"` lessons. A direct link to the image you want to display as a square. |
| `thumbnail_image_url`| String (URL)     | **Only** for `"full_banner"` lessons. A direct link to a 16:9 banner image.                |

### Square Image Lessons

- **`lesson_type: "square_image"`**  
- Use `square_image_url` to show a **square** aspect ratio (commonly `1:1`).  

Example snippet:
```json
{
  "lesson_id": "15",
  "lesson_title": "Displaying Transient Messages with Snackbars",
  "lesson_description": "Discover how to use Snackbars...",
  "lesson_type": "square_image",
  "square_image_url": "https://i.ibb.co/YW07k43/snackbars.png",
  "lesson_tags": [ "Android", "Kotlin", "Java", "UI", "Snackbar", "Material Design" ],
  "deep_link_path": "com.d4rk.androidtutorials://lesson/snack_bars"
}
```

### Full Banner Lessons

- **`lesson_type: "full_banner"`**  
- Use `thumbnail_image_url` to show a **16:9** (or similarly wide) banner image.  

Example snippet:
```json
{
  "lesson_id": "14",
  "lesson_title": "Chips for Complex Entities in Compose",
  "lesson_description": "Learn how to use Chips in Jetpack Compose...",
  "lesson_type": "full_banner",
  "thumbnail_image_url": "https://i.ibb.co/Wpk8h3N/how-to-use-chips-in-compose.png",
  "lesson_tags": [ "Android", "Jetpack Compose", "Kotlin", "UI", "Chips", "Material Design" ],
  "deep_link_path": "com.d4rk.androidtutorials://lesson/chips_compose"
}
```

---

## Ad Items

Ad items are used to display Google AdMob banners (or similarly integrated ads) within the list. They **don’t** contain typical lesson data like title or description. Instead, they simply have:

| Field       | Type   | Description                                                                         |
|-------------|--------|-------------------------------------------------------------------------------------|
| `lesson_id` | String | **Prefixed** with something like `"ad_"` or `"ad_banner_"` to avoid numeric-only.    |
| `lesson_type`| String| Must start with `"ad_view_"`, followed by which banner size to show.                |

### Available Ad Types

- **`"ad_view_banner"`**: A smaller “common” banner (320x50 or dynamically sized).  
- **`"ad_view_banner_full"`**: A slightly larger banner.  
- **`"ad_view_banner_large"`**: Largest banner size (e.g., 320x100 / 320x90 / or other wide banners).  

In your code, you’ll typically map `lesson_type` to the correct composable (e.g., `AdBanner()`, `AdBannerFull()`, or `LargeBannerAdsComposable()`).

### Ad ID Format

- For clarity, ad IDs often **start** with `"ad_"` or `"ad_banner_"` and end with a unique integer or suffix.  
- **Example**: `"ad_banner_1"`, `"ad_banner_2"`, `"ad_05"`.  
- This prevents collisions with numeric lesson IDs (like `"1"`, `"2"`, etc.) and quickly identifies them as ads.

**Example Ad Snippet**:
```json
{
  "lesson_id": "ad_banner_2",
  "lesson_type": "ad_view_banner_large"
}
```

---

## Updating and Versioning

When you **add** new lessons or ads:

1. **Give new lessons** a numeric `lesson_id` that increments from the existing maximum.  
2. **Give new ads** an alphanumeric ID starting with `"ad_"` or `"ad_banner_"`.  
3. Make sure you **double-check** for existing IDs to avoid duplicates—**never** reuse an `lesson_id` that’s already in use (whether it’s numeric or ad-specific).

### ID Management

- **Numeric IDs** are strictly for lessons (1, 2, 3, …).  
- **Ad IDs** follow the `"ad_banner_X"` style to remain distinct.

### Recommended Checks

- **Ensure** each item has a valid `lesson_type` recognized by the client (e.g., `"square_image"`, `"full_banner"`, or `"ad_view_banner"` / `_banner_full` / `_banner_large`).  
- **If** an item is missing critical fields (e.g., `thumbnail_image_url` for a `full_banner` lesson), the app may display an error or a placeholder.  
- **When** removing items, confirm references (deep links, etc.) are updated if needed.

---

## Example Usage in the App

1. **Fetching**: The app retrieves this JSON from a remote server or local storage.  
2. **Parsing**: The app loops through `data`. Each item is read into an internal model (e.g., `UiHomeLesson`).  
3. **Rendering**:
   - If `"lesson_type"` starts with `"square_image"` or `"full_banner"`, the app uses a “Lesson” composable with text, images, and tags.  
   - If `"lesson_type"` starts with `"ad_view_"`, the app displays an ad composable (e.g., `LargeBannerAdsComposable()` for `"ad_view_banner_large"`).  
4. **Filtering Ads**: If the user has disabled ads, the client can **filter** out any item whose `lesson_type` starts with `"ad_view_"` before rendering.  
5. **Deep Linking**: If the user clicks on a lesson item, the app navigates to `deep_link_path`.

---

### Summary

- **Two main item categories**: lessons vs. ads.  
- **Lesson** items have numeric IDs, **ad** items have ID strings prefixed with `"ad_"` or `"ad_banner_"`.  
- **Square** vs. **Full** banners for lessons let the app load the correct aspect ratio images.  
- **Three** ad types (`banner`, `banner_full`, `banner_large`) let you display different ad sizes.  
- Keep an eye on **IDs**—no overlap, no duplicates. 