# Project Doctrine

This document captures the guiding principles for how we build and maintain the project. The intent is to keep the experience stock, accessible, and aligned with Material guidance while preserving the feature-first architecture.

## Product & Visual Principles

- Look stock, not custom. Use default component shapes, spacing, and typography.
- Follow Material behavior over visuals: scroll states, scrims, focus, keyboard.
- Use light/dark themes only. No per-component color tuning.
- Keep default ripple/wave effects.
- Respect keyboard navigation and focus visibility.
- No visual change without checking behavior, accessibility, and layout consistency.

## UI Framework Governance

<!-- Change Rationale: Establish a single UI source of truth and document how legacy
     web components are allowed so future changes stay consistent and lintable. -->

### UI source of truth

- **BeerCSS is the system of record** for layout, surfaces, navigation, buttons, fields,
  dialogs, and lists.
- Material Design tokens (`--md-sys-*`) define color and typography.
- Google web components are allowed only when BeerCSS lacks the component **or** replacing
  would be risky within the current scope.

### Legacy component inventory (Google Web Components)

| Tag | Screen/View | Reason |
| --- | --- | --- |
| `md-filled-card`, `md-text-button`, `md-filled-tonal-button`, `md-outlined-button`, `md-icon` | `app/workspaces/faq/ui/faq.page.html` | Grandfathered: large workflow surface; replacement is risky without dedicated migration time. |
| `md-outlined-text-field`, `md-icon-button`, `md-icon`, `md-filled-tonal-button`, `md-checkbox` | `app/githubtools/**/ui/views/*FormView.html` | Allowed: BeerCSS lacks equivalent form + token reveal controls; views serve as wrappers. |
| `md-segmented-button-set`, `md-outlined-segmented-button` | `app/githubtools/repomapper/ui/views/repo-mapper-form.view.html` | Allowed: segmented control not available in BeerCSS; view is the wrapper. |
| `md-dialog`, `md-steppers`, `md-step`, `md-side-sheet`, `md-menu`, `md-menu-item`, `md-outlined-text-field`, `md-outlined-select`, `md-select-option`, `md-filled-card`, `md-icon-button`, `md-filled-button`, `md-filled-tonal-button`, `md-outlined-button`, `md-text-button`, `md-icon` | `src/app/workspaces/app-toolkit/ui/app-toolkit.page.html` | Allowed: complex multi-step workflow; replacement is risky without dedicated migration time. |
| `md-icon-button`, `md-outlined-text-field` | `src/app/workspaces/app-toolkit/ui/views/screenshot-field.view.html` | Allowed: input/preview controls lack BeerCSS equivalents; layout is shared. |
| `md-outlined-text-field`, `md-outlined-select`, `md-select-option`, `md-filled-button`, `md-filled-tonal-button`, `md-outlined-button`, `md-text-button`, `md-icon` | `src/app/workspaces/shared/ui/views/builder-remote.view.html` | Allowed: shared remote builder controls rely on MWC until a BeerCSS replacement lands. |

### Wrapper rule (linted)

- Screens **must not** instantiate Google web components directly.
- Allowed components must live inside a wrapper view (`core/ui/components` or `ui/views`).
- No per-screen CSS overrides to “make it match” BeerCSS.
- A Jest lint test enforces the rule with an explicit allowlist for grandfathered screens.

## Navigation Drawer

- The navigation drawer is a left modal dialog.
- Drawer uses a neutral scrim, not blur, by default.
- Drawer closes on scrim click, close button, Esc, and on item selection on small screens.
- Drawer shows one clear selected item using framework classes only.
- Drawer sections use small headers and list items with title + subtitle.

## Navigation Rail

- The navigation rail is the primary navigation surface on medium/large breakpoints.
- On small breakpoints, the rail is hidden and the modal drawer is used instead.
- The active route is highlighted consistently in both drawer and rail links.

## Top App Bar

- Top app bar is not permanently transparent.
- Top app bar fills/elevates when content scrolls under it.
- Top app bar is sticky and always above content.

## Layout & Lists

- Spacing comes from the framework, not manual margins.
- Use semantic layout elements: header, nav, main, ul.list.
- One main content area per page.
- List rows use title + subtitle layout with proper containers.

## Button + Card Roles

<!-- Change Rationale: Codify the primary/secondary button and card role rules so
     UI updates stay consistent without per-screen styling decisions. -->

- Cancel/secondary actions use **outlined** buttons.
- Confirm/primary actions use **filled** buttons.
- Actionable cards use **outlined** surfaces with a CTA.
- Informational cards use **filled** surfaces without action affordances.

## BeerCSS Defaults (Do Not Override)

- Use dialog and dialog.left for modals and drawers.
- Theme is controlled by body class (light/dark).
- Typography uses headings and small for secondary text.
- Line height and font sizes stay default.
- Spacing uses built-in helpers like padding, space, no-space.
- List items use ul.list with li.wave.round.
- Icons use i elements; text is wrapped in span or div.max.
- Buttons use provided classes: transparent, link, border, circle.
- No custom button padding or radius.
- Overlay uses the built-in overlay element as scrim.
- App bar uses header + nav with the fill class for surfaced state.
- Avoid overriding position and z-index unless fixing a real bug.
- Avoid custom CSS unless it is pure glue for behavior or layout.

## Architecture

- Architecture stays feature-first with domain, data, ui separation.
- Router ownership remains clear and centralized.
- Material 3 alignment is required for all surfaces and interactions.
- Documentation stays consistent with the API data sources in `api/`.

## Legacy URL Compatibility Policy

- Canonical GitHub tools naming uses `githubtools` for folders and `kebab-case` route IDs (e.g., `git-patch`).
- Legacy `github-tools` URLs may exist only in compatibility normalization and redirect stubs.
- Remove legacy shims once internal links no longer emit `/layout/githubtools/*` and a release cycle has preserved redirects without new legacy traffic.
