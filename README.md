# API Repository for Android Apps

Welcome to the **API Repository for Android Apps**! This repository contains all the APIs used by the Android apps developed by D4rK. Each API is structured and documented to ensure consistency, scalability, and ease of use across various applications. Below, you'll find an overview of the included APIs and how they are organized.

---

## Table of Contents

1. [Introduction](#introduction)
2. [APIs for Android Studio Tutorials](#apis-for-android-studio-tutorials)
3. [APIs for English with Lidia](#apis-for-english-with-lidia)
4. [Repository Structure](#repository-structure)
5. [Usage Guidelines](#usage-guidelines)
6. [Contributing](#contributing)
7. [License](#license)

---

## Introduction

This repository serves as a centralized location for all API files used by the following Android apps:

1. **Android Studio Tutorials**: A comprehensive app for learning Android development, featuring lessons, ads, and examples.
2. **English with Lidia**: An educational app for learning English through interactive lessons, quizzes, and resources.

The APIs are designed to dynamically power the content displayed in these apps. This allows for seamless updates and ensures a consistent experience for users.

---

## APIs for Android Studio Tutorials

### Overview
The APIs for Android Studio Tutorials power the following functionalities:

- **Home Screen**: Displays a list of lessons and ads, categorized by type (e.g., square images, banners).
- **Lesson Content**: Provides detailed lesson data, including text, images, code examples, and ads.

### Key Features
- **Dynamic Content Rendering**: Lessons and ads are displayed based on JSON content types.
- **Deep Linking**: Lessons are identified via deep link paths.
- **Content Types**: Text, headers, images, code blocks, and multiple ad formats.

### Example Files
- **`api_get_home_screen.json`**: Contains the home screen data.
- **`api_get_snack_bars.json`**: Contains content for the lesson on Snackbars.

### Documentation
- Detailed documentation for the APIs can be found in the [`Android Studio Tutorials` section](docs/android-studio-tutorials).

---

## APIs for English with Lidia

### Overview
The APIs for English with Lidia provide data for:

- **Home Screen**: Displays a list of lessons and ads, categorized by type (e.g., full_image, banners).
- **Lesson Content**: Provides detailed lesson data, including text, images, audio, and ads.

### Key Features
- **Dynamic Content Rendering**: Lessons and ads are displayed based on JSON content types.
- **Media Support**: Integration of audio and visual resources.

### Example Files
- **`api_get_lessons_to_be_or_not_to_be.json`**: Contains the To be or not to be lesson.
- **`api_get_tell_me_about_yourself.json`**: Contains the lesson about what to tell into an interview.

### Documentation
- Comprehensive API documentation is available in the [`English with Lidia` section](docs/english-with-lidia).

---

## Repository Structure

```plaintext
Android Studio Tutorials/
├── debug/en/home/api_get_lessons.json
├── debug/en/lessons/api_get_snack_bars.json
├── release/en/home/api_get_lessons.json
├── release/en/lessons/api_get_snack_bars.json
├── docs/
│   ├── home_screen_api_documentation.md
│   └── lessons_api_documentation.md

English with Lidia/
├── debug/en/home/api_get_lessons.json
├── debug/en/lessons/api_get_tell_me_about_yourself.json
├── release/en/home/api_get_lessons.json
└── release/en/lessons/api_get_tell_me_about_yourself.json
```

The `debug/` and `release/` folders separate development APIs from production-ready ones. The `en/` folder indicates the current language, with plans for multilingual support in the future.

---

## Usage Guidelines

### For Developers
1. Clone the repository to your local machine.
2. Navigate to the folder corresponding to the app you are working on.
3. Use the API files to power the app’s content dynamically.

### For App Updates
- Update the relevant JSON files to modify app content.
- Test the updates locally to ensure correctness.

### For External Contributors
- Fork the repository and create a new branch for your changes.
- Submit a pull request with a detailed explanation of your changes.

---

## Contributing

We welcome contributions to improve the APIs or add new functionality. Please follow these steps:

1. Open an issue to discuss the proposed changes.
2. Create a branch for your changes.
3. Ensure your code is well-documented and adheres to the repository's structure.
4. Submit a pull request for review.

---

__Privacy Policy__ [here](https://sites.google.com/view/d4rk7355608/more/apps/privacy-policy).
__Terms of Service__ [here](https://sites.google.com/view/d4rk7355608/more/apps/terms-of-service).

![license](https://imgur.com/QQlcEVT.png)

---

Thank you for using and contributing to this API repository! If you have any questions, feel free to open an issue or contact D4rK.

Note: APIs for both apps share a similar structure, ensuring consistency across applications.