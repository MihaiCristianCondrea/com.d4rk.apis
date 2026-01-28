# Project Doctrine

This document captures the guiding principles for how we build and maintain the project. The intent is to keep the experience stock, accessible, and aligned with Material guidance while preserving the feature-first architecture.

## Product & Visual Principles

- Look stock, not custom. Use default component shapes, spacing, and typography.
- Follow Material behavior over visuals: scroll states, scrims, focus, keyboard.
- Use light/dark themes only. No per-component color tuning.
- Keep default ripple/wave effects.
- Respect keyboard navigation and focus visibility.
- No visual change without checking behavior, accessibility, and layout consistency.

## Navigation Drawer

- The navigation drawer is a left modal dialog.
- Drawer uses a neutral scrim, not blur, by default.
- Drawer closes on scrim click, close button, Esc, and optionally on item selection on small screens.
- Drawer shows one clear selected item using framework classes only.
- Drawer sections use small headers and list items with title + subtitle.

## Top App Bar

- Top app bar is not permanently transparent.
- Top app bar fills/elevates when content scrolls under it.
- Top app bar is sticky and always above content.

## Layout & Lists

- Spacing comes from the framework, not manual margins.
- Use semantic layout elements: header, nav, main, ul.list.
- One main content area per page.
- List rows use title + subtitle layout with proper containers.

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
