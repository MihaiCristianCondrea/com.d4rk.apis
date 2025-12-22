## GitHub tools favorite star pattern

This pattern makes trailing favorite stars consistent across GitHub tool forms.

### Markup

- Place the star as a trailing icon inside the relevant `<md-outlined-text-field>`.
- Use the standard structure:
  - `<md-icon-button id="<tool>-fav-btn" slot="trailing-icon" aria-pressed="false" aria-label="Favorite repository" toggle>`
  - `<md-icon slot="icon">star</md-icon>`
- Keep the button visible; `setupFavoriteButton` only toggles enabled/disabled and icon fill.

### Wiring

- During initialization, pass the button/input pair into `initGhToolsPage` via the `favoriteControls` array:
  ```js
  initGhToolsPage({
    favoriteControls: [{ buttonId: 'releases-fav-btn', inputId: 'releases-url' }],
  });
  ```
- Each entry calls `setupFavoriteButton(buttonId, inputId)`, which:
  - Validates the input slug with `normalizeRepoSlug`.
  - Leaves the star in place at all times, disabling the button when the slug is invalid.
  - Syncs `favorited` class, `selected`, `aria-pressed`, and the filled/outlined star glyph using `fontVariationSettings` (`FILL 0` for outlined, `FILL 1` for filled).
  - Updates labels/titles for accessibility and toggles favorites without a reload.

### State & UX

- When unfavorited, the icon uses the outlined star glyph; when favorited, it fills in and adds the `favorited` class.
- Button state mirrors Material behavior via `selected` and `aria-pressed`, and disables when the slug is invalid instead of hiding.
- Initial load always shows an outlined star, preserving layout regardless of slug validity.

### Manual verification

- Enter an invalid slug → the star stays visible but disabled and outlined.
- Enter a valid slug → the star remains visible, enabled, and outlined until favorited.
- Toggle the star → it fills/unfills, updates `favorited` styling, and the selection state persists across route changes.
