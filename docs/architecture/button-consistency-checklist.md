# Button Consistency Checklist

<!-- Change Rationale: This checklist keeps button styling and layout behavior centralized so feature/page PRs cannot accidentally diverge from the shared Material 3 + BeerCSS button contract. -->

Use this checklist for every feature/page PR that touches templates, button styles, or form field factory output.

## Mandatory PR checks

- [ ] Uses shared `app-button*` contract classes for all button variants.
- [ ] Contains no page-local button height, radius, or outline overrides.
- [ ] Outlined buttons consistently use the same `border + round + token` pattern defined in shared styles.
- [ ] Icon+label alignment uses the shared icon utility class only.

## File-locator guidance

When validating or fixing button behavior, start in these locations:

- Shared styles: `src/styles/components/native/`
- Feature layout-only styles: `src/styles/features/**`
- Factory output: `src/shared/lib/forms/fields.js`

## Static verification before merge

Run these checks before merge to detect drift from the shared contract.

### Contract class usage checks

```bash
rg -n "app-button" src/pages src/features src/widgets src/shared
rg -n "app-button--" src/pages src/features src/widgets src/shared
```

### Prohibited local button override checks

```bash
rg -n "(button|\.app-button)[^{]*\{[^}]*\b(height|min-height|max-height|border-radius|outline|border)\b" src/styles/features src/pages --glob "*.css"
rg -n "--md-.*button|md-.*button" src
```

### Outlined pattern consistency checks

```bash
rg -n "app-button[^\n]*outlined|app-button--outlined" src
rg -n "\bborder\b|\bround\b|--[a-z0-9-]*outline|--[a-z0-9-]*border" src/styles/components/native src/styles/features --glob "*.css"
```

### Icon utility alignment checks

```bash
rg -n "icon" src/pages src/features src/widgets --glob "*.html"
rg -n "app-button[^\n]*icon|icon[^\n]*app-button" src/pages src/features src/widgets --glob "*.html"
```

## Reviewer closeout checklist

- [ ] Shared/native button contract remains the single source of truth.
- [ ] Feature-level CSS remains layout-only and does not redefine button primitives.
- [ ] Form factory output remains aligned with shared `app-button*` classes.
- [ ] Architecture docs remain synchronized with implementation.
