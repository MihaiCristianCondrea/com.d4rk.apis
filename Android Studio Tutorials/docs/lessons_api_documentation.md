# Lesson API Documentation

This document provides an overview of the structure, functionality, and implementation guidelines for the Lesson APIs in the **Android Studio Tutorials** app. Each lesson API corresponds to a specific lesson, as referenced by the **Home Screen API**, using the deep link path to identify and navigate to the appropriate lesson.

---

## Overview

The Lesson API contains detailed content for a single lesson, allowing dynamic rendering of various types of content, such as text, headers, images, code blocks, and ads. These APIs ensure consistency and modularity, making it easy to update or move lessons while reflecting changes seamlessly within the app.

---

## Naming Conventions

- **File Naming:**
  Each lesson API file is named using the following pattern:
  ```
  api_get_<deep_link_path>
  ```
  For example, for a lesson with the deep link path `com.d4rk.androidtutorials://lesson/snack_bars`, the file name would be:
  ```
  api_get_snack_bars.json
  ```

---

## JSON Structure

The JSON structure for a lesson API is as follows:

```json
{
  "data": [
    {
      "lesson_title": "<Title of the Lesson>",
      "lesson_content": [
        {
          "content_id": "<Unique String ID>",
          "content_type": "<Type of Content>",
          "content_text": "<HTML Formatted Text>" // Optional, based on content type
        },
        {
          "content_id": "<Unique String ID>",
          "content_type": "image",
          "content_image_url": "<URL to Image>" // Optional, based on content type
        },
        {
          "content_id": "<Unique String ID>",
          "content_type": "content_code",
          "content_code": "<Code Snippet>",
          "content_code_programming_language": "<Language>"
        },
        {
          "content_id": "<Unique String ID>",
          "content_type": "ad_banner" // For displaying ads
        }
      ]
    }
  ]
}
```

### Key Fields

- **`lesson_title`:** Short and descriptive, shown in the app's top app bar.
- **`lesson_content`:** Array containing all content items for the lesson.
  - **`content_id`:** Unique string identifier for each content item (e.g., "1", "2").
  - **`content_type`:** Determines how the content is rendered. Supported types are:
    ```kotlin
    object LessonContentTypes {
        const val TEXT = "content_text"
        const val HEADER = "header"
        const val CODE = "content_code"
        const val IMAGE = "image"
        const val AD_BANNER = "ad_banner"
        const val AD_BANNER_FULL = "ad_banner_full"
        const val AD_LARGE_BANNER = "ad_large_banner"
    }
    ```
  - **`content_text`:** HTML-formatted text for types like `content_text` or `header`.
  - **`content_image_url`:** URL for image content.
  - **`content_code`:** Code snippet for programming-related content.
  - **`content_code_programming_language`:** Language for syntax highlighting. Supported languages include Kotlin, Java, Python, XML, etc.

---

## Guidelines for Creating Lesson APIs

### 1. Title Guidelines
- **Purpose:** Ensure the title reflects the lesson content.
- **Length:** Keep it concise to fit within the top app bar.
- **Example:** For a lesson on Snackbars, use "Displaying Transient Messages with Snackbars".

### 2. Content Types
- **Text (`content_text`):** Use HTML formatting for bold, italic, lists, etc. Example:
  ```json
  {
    "content_id": "1",
    "content_type": "content_text",
    "content_text": "<p>This is a <b>bold</b> example text.</p>"
  }
  ```
- **Header (`header`):** Use for section titles. Example:
  ```json
  {
    "content_id": "3",
    "content_type": "header",
    "content_text": "Implementation Steps"
  }
  ```
- **Code (`content_code`):** Include the programming language and code snippet. Example:
  ```json
  {
    "content_id": "4",
    "content_type": "content_code",
    "content_code": "fun main() { println(\"Hello, World!\") }",
    "content_code_programming_language": "Kotlin"
  }
  ```
- **Image (`image`):** Provide a URL to the image. Example:
  ```json
  {
    "content_id": "5",
    "content_type": "image",
    "content_image_url": "https://example.com/image.png"
  }
  ```
- **Ads (`ad_banner`, `ad_banner_full`, `ad_large_banner`):** Add ad types to break up content. Example:
  ```json
  {
    "content_id": "6",
    "content_type": "ad_banner"
  }
  ```

### 3. Content Order
- Arrange content logically to ensure smooth reading flow.
- Add an `ad_banner` as the last item to display an ad at the end of each lesson.

### 4. ID Management
- Use string IDs starting from "1" for each content item.
- Ensure IDs are unique within the lesson.

---

## Best Practices

- **Consistency:** Ensure uniformity across lesson APIs to maintain a consistent app experience.
- **Accessibility:** Use alt text for images and proper contrast for text.
- **Testing:** Validate the JSON structure and test rendering in the app before deployment.
- **Updates:** When modifying lessons, reflect changes in the corresponding API file.

---

## Example Lesson API

### File Name
```
api_get_snack_bars.json
```

### JSON Example

```json
{
  "data": [
    {
      "lesson_title": "Displaying Transient Messages with Snackbars",
      "lesson_content": [
        {
          "content_id": "1",
          "content_type": "content_text",
          "content_text": "<p>Snackbars provide lightweight feedback about an operation...</p>"
        },
        {
          "content_id": "2",
          "content_type": "ad_large_banner"
        },
        {
          "content_id": "3",
          "content_type": "header",
          "content_text": "When to Use Snackbars"
        },
        {
          "content_id": "4",
          "content_type": "content_text",
          "content_text": "<p>Snackbars are ideal for:</p><ul><li>Confirmation messages...</li></ul>"
        },
        {
          "content_id": "5",
          "content_type": "image",
          "content_image_url": "https://example.com/snackbar_image.png"
        },
        {
          "content_id": "6",
          "content_type": "ad_large_banner"
        },
        {
          "content_id": "7",
          "content_type": "content_code",
          "content_code": "fun showSnackbar() { /* Implementation */ }",
          "content_code_programming_language": "Kotlin"
        },
        {
          "content_id": "8",
          "content_type": "ad_banner"
        }
      ]
    }
  ]
}
```