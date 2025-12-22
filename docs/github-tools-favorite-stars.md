## GitHub tools favorite star pattern

This pattern makes trailing favorite stars consistent across GitHub tool forms.

### Markup

- Place the star as a trailing icon inside the relevant `<md-outlined-text-field>`.
- Use the standard structure:
  - `<md-icon-button id="<tool>-fav-btn" slot="trailing-icon" aria-pressed="false" aria-label="Favorite repository" toggle hidden>`
  - `<md-icon slot="icon">star</md-icon>`
- Keep the button hidden by default; visibility is controlled by `setupFavoriteButton`.

### Wiring

- During initialization, pass the button/input pair into `initGhToolsPage` via the `favoriteControls` array:
  ```js
  initGhToolsPage({
    favoriteControls: [{ buttonId: 'releases-fav-btn', inputId: 'releases-url' }],
  });
  ```
- Each entry calls `setupFavoriteButton(buttonId, inputId)`, which:
  - Validates the input slug with `normalizeRepoSlug`.
  - Shows the star only when the slug is valid.
  - Syncs `favorited` class, `selected`, `aria-pressed`, and the filled/outlined star glyph using `fontVariationSettings`.
  - Updates labels/titles for accessibility and toggles favorites without a reload.

### State & UX

- When unfavorited, the icon uses the outlined star glyph; when favorited, it fills in and adds the `favorited` class.
- Button state mirrors Material behavior via `selected` and `aria-pressed`.
- The control remains hidden until a valid slug is present, matching Repo Mapper’s spacing and focus affordances.

### Manual verification

- Enter an invalid slug → the star stays hidden.
- Enter a valid slug → the star appears.
- Toggle the star → it fills/unfills, updates `favorited` styling, and the selection state persists across route changes.
