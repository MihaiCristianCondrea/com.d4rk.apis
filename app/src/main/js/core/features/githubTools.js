const FAVORITES_KEY = 'github_tool_favorites';

function normalizeRepoSlug(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed, trimmed.startsWith('http') ? undefined : 'https://github.com');
    const [, owner, repo] = url.pathname.split('/').filter(Boolean);
    if (owner && repo) {
      return `${owner}/${repo}`.replace(/\.git$/i, '');
    }
  } catch (error) {
    /* noop */
  }

  const parts = trimmed.replace(/^https?:\/\/github.com\//i, '').split('/').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`.replace(/\.git$/i, '');
  }

  return '';
}

function readFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('GitHubTools: Unable to parse favorites.', error);
    return [];
  }
}

function writeFavorites(items) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('GitHubTools: Unable to persist favorites.', error);
  }
}

function isFavorited(slug) {
  if (!slug) return false;
  return readFavorites().some((item) => item.slug === slug);
}

function toggleFavorite(slug) {
  if (!slug) return readFavorites();
  const favorites = readFavorites();
  const existingIndex = favorites.findIndex((item) => item.slug === slug);
  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({ slug });
  }
  writeFavorites(favorites);
  renderFavoritesPage();
  return favorites;
}

function renderFavoritesPage() {
  const grid = document.getElementById('favorites-grid');
  const empty = document.getElementById('favorites-empty');
  if (!grid || !empty) {
    return;
  }

  const favorites = readFavorites();
  grid.innerHTML = '';

  if (!favorites.length) {
    empty.hidden = false;
    grid.hidden = true;
    return;
  }

  favorites.forEach(({ slug }) => {
    const card = document.createElement('article');
    card.className = 'gh-favorite-card';
    card.innerHTML = `
      <div class="gh-favorite-icon" aria-hidden="true">
        <span class="material-symbols-outlined">hub</span>
      </div>
      <div class="gh-favorite-meta">
        <h3>${slug}</h3>
        <p>Saved from GitHub tools</p>
      </div>
      <div class="gh-favorite-actions">
        <a class="gh-ghost-button" href="https://github.com/${slug}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined">open_in_new</span>
          <span>Open</span>
        </a>
        <md-outlined-button data-remove-favorite>
          <md-icon slot="icon">delete</md-icon>
          <span>Remove</span>
        </md-outlined-button>
      </div>
    `;
    const removeBtn = card.querySelector('[data-remove-favorite]');
    removeBtn?.addEventListener('click', () => {
      toggleFavorite(slug);
    });
    grid.appendChild(card);
  });

  grid.hidden = false;
  empty.hidden = true;
}

function setupFavoriteButton(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!button || !input) return;

  const refreshState = () => {
    const slug = normalizeRepoSlug(input.value);
    const valid = !!slug;
    button.hidden = !valid;
    if (!valid) return;
    const active = isFavorited(slug);
    button.classList.toggle('favorited', active);
    button.setAttribute('aria-pressed', String(active));
    const label = button.querySelector('.favorite-label');
    if (label) {
      label.textContent = active ? 'Favorited' : 'Favorite';
    }
  };

  button.addEventListener('click', () => {
    const slug = normalizeRepoSlug(input.value);
    if (!slug) return;
    toggleFavorite(slug);
    refreshState();
  });

  input.addEventListener('input', refreshState);
  refreshState();
}

function wireTokenControls({ toggleButtonId, wrapperId, fieldId, visibilityToggleId }) {
  const toggleButton = document.getElementById(toggleButtonId);
  const wrapper = document.getElementById(wrapperId);
  const field = document.getElementById(fieldId);
  const visibilityToggle = document.getElementById(visibilityToggleId);
  const container = toggleButton ? toggleButton.closest('.gh-token-settings') : null;

  if (toggleButton && wrapper) {
    const update = (expanded) => {
      toggleButton.setAttribute('aria-expanded', String(expanded));
      wrapper.hidden = !expanded;
      if (container) {
        container.classList.toggle('is-open', expanded);
        container.toggleAttribute('open', expanded);
      }
    };
    toggleButton.addEventListener('click', () => {
      const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
      update(!isExpanded);
    });
    update(toggleButton.getAttribute('aria-expanded') === 'true');
  }

  if (visibilityToggle && field) {
    const label = visibilityToggle.querySelector('[data-token-visibility-label]');
    const setVisible = (visible) => {
      field.type = visible ? 'text' : 'password';
      if (label) {
        label.textContent = visible ? 'Hide token' : 'Show token';
      }
    };
    visibilityToggle.addEventListener('change', (event) => {
      setVisible(!!event.target.checked);
    });
    setVisible(false);
  }
}

function hydrateInputs(container) {
  if (!container) return;
  container.querySelectorAll('md-outlined-text-field').forEach((field) => {
    field.classList.add('gh-md-field');
  });
}

function initRepoMapper() {
  const page = document.querySelector('.gh-tools-page');
  if (!page) return;
  wireTokenControls({
    toggleButtonId: 'mapper-token-reveal',
    wrapperId: 'mapper-token-wrapper',
    fieldId: 'mapper-token',
    visibilityToggleId: 'mapper-token-toggle',
  });
  hydrateInputs(page);
  setupFavoriteButton('mapper-fav-btn', 'mapper-url');
}

function initReleaseStats() {
  const page = document.querySelector('.gh-tools-page');
  if (!page) return;
  wireTokenControls({
    toggleButtonId: 'releases-token-reveal',
    wrapperId: 'releases-token-wrapper',
    fieldId: 'releases-token',
    visibilityToggleId: 'releases-token-toggle',
  });
  hydrateInputs(page);
  setupFavoriteButton('releases-fav-btn', 'releases-url');
}

function initGitPatch() {
  const page = document.querySelector('.gh-tools-page');
  if (!page) return;
  wireTokenControls({
    toggleButtonId: 'patch-token-reveal',
    wrapperId: 'patch-token-wrapper',
    fieldId: 'patch-token',
    visibilityToggleId: 'patch-token-toggle',
  });
  hydrateInputs(page);
  setupFavoriteButton('patch-fav-btn', 'patch-url');
}

function initFavoritesPage() {
  renderFavoritesPage();
}

export { initFavoritesPage, initGitPatch, initReleaseStats, initRepoMapper };
