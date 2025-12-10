# AGENTS.md

## 1. Project Architecture & Boundary Rules
- **Core Data Source:** The source of truth for all API data is located in the `api/` directory.
- **Archived Directories:** The root-level folders named `Android Studio Tutorials`, `App Toolkit`, and `English with Lidia` are legacy/archived. **Do not read or edit files in these root folders.** Always navigate to `api/<app_name>/v1/`.
- **Protected Files:**
  - **README.md:** This file is for marketing and human-written context only. **Do not modify the root README.md.**
  - **LICENSE:** Do not modify.
- **Android-style layout:** The repository mirrors an Android project structure (e.g., `app/src/main/js`, `app/src/main/res`). When adding assets or routes, follow this app-style organization to keep parity between web and Android paradigms.

## 2. Documentation Strategy
The agent is responsible for maintaining technical accuracy in the `api/<app_name>/docs/` directories.
- **Mandatory Docs:** Every application folder in `api/` must have a `docs/` subdirectory.
- **Auto-Generation:** If you create a new API endpoint or JSON category and the documentation is missing, you must generate a Markdown file explaining the schema (e.g., `lessons_api_documentation.md`).
- **Schema Updates:** If you modify the structure of a JSON file (e.g., adding keys to `api_get_lessons.json`), you must immediately check the corresponding file in `docs/`. If the documentation is outdated, update the relevant section to match the new JSON schema.

## 3. UI/UX & Design System
When asked to generate frontend tools, editors, or dashboards to manage this data:
- **Design Standard:** Strictly adhere to **Google Material Design 3**.
- **Tech Stack:**
  - Use **Material Web Components** for interactive elements.
  - Use **Tailwind CSS** for layout and spacing only.
  - Use **Vanilla JavaScript** (ES Modules) unless a framework is explicitly requested.
- **User Experience:** Prioritize "fun and fast" usage. Interfaces should be responsive and provide immediate visual feedback for all actions.

## 4 Documentation Requirements
All generated or modified code must be fully documented. This includes:

- Full JSDoc blocks for every function, class, or module.
- A "Change Rationale" comment whenever modifying existing code, explaining:
  - What the code previously did,
  - Why the change was necessary,
  - Why the new approach is preferable,
  - Any Material Design 3 or UX principle that influenced the decision.
- Documentation must remain coherent, concise, and reflect the project's design rules. 

## 5. Data Structure & JSON Guidelines
- **Path Structure:** `api/<app_slug>/v<version>/<build_type>/<language>/<category>/<file>.json`
- **Build Types:**
  - `debug`: Safe for experimental changes.
  - `release`: Production data. Require strict confirmation before editing.
- **Validation:** 
  - Ensure strict JSON syntax (no trailing commas).
  - When generating new JSON files, use the schema from existing sibling files as a template.

## 6. Testing & Quality Assurance
- **Data Integrity:** "Testing" primarily involves ensuring JSON validity and Schema consistency.
- **Tooling Tests:** If you write JavaScript code for the UI, you must include Jest tests in the `__tests__/` directory.
- **Workflow:**
  1. Make changes.
  2. Run `npm test`.
  3. If successful, verify `api/<app_name>/docs/` is up to date.
  4. Finalize.