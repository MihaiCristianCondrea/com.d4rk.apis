import {
  fetchCommitPatch,
  fetchReleaseStats,
  fetchRepositoryTree,
} from '@/services/githubService';
import {
  generateAsciiTree,
  generatePathList,
  parseGithubCommitUrl,
  parseGithubUrl,
} from '@/domain/utils';

const STORAGE_KEY = 'repomapper_favorites';

const state = {
  favorites: [],
  mapper: {
    format: 'ascii',
    rawPaths: [],
    parsedRepo: null,
  },
  releases: {
    data: null,
    selectedIndex: 0,
    parsedRepo: null,
  },
  patch: {
    content: '',
    filename: '',
    parsedRepo: null,
  },
};

const copyResetTimers = new WeakMap();
const storageTargets =
  typeof window !== 'undefined'
    ? [window.localStorage, window.sessionStorage].filter(Boolean)
    : [];
let memoryFavorites = [];

function resolveInputElement(target) {
  if (!target) return null;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target;
  }
  return target.shadowRoot?.querySelector('input') || null;
}

function setFieldError(target, message = '') {
  const inputEl = resolveInputElement(target);
  if (!inputEl && !target) return;

  const hasError = Boolean(message);
  if (target && 'error' in target) {
    target.error = hasError;
    if ('errorText' in target) {
      target.errorText = message || '';
    }
  }

  if (inputEl) {
    const fieldWrapper = inputEl.closest('.gh-floating-field');
    const errorEl = document.getElementById(`${inputEl.id}-error`);
    inputEl.classList.toggle('has-error', hasError);
    inputEl.setAttribute('aria-invalid', hasError ? 'true' : 'false');

    if (fieldWrapper) {
      fieldWrapper.classList.toggle('error', hasError);
    }
    if (errorEl) {
      errorEl.textContent = message || errorEl.textContent || '';
      errorEl.toggleAttribute('hidden', !hasError);
    }

    const describedBy = new Set(
      (inputEl.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(Boolean),
    );
    const helperId = `${inputEl.id}-helper`;
    const errorId = `${inputEl.id}-error`;
    if (document.getElementById(helperId)) describedBy.add(helperId);
    if (document.getElementById(errorId)) describedBy.add(errorId);
    if (describedBy.size) {
      inputEl.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
    }

    if (!hasError) {
      inputEl.removeAttribute('aria-invalid');
    }
  }
}

function sanitizeFavorites(entries) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();

  return entries.reduce((list, item) => {
    if (!item || typeof item.owner !== 'string' || typeof item.repo !== 'string') {
      return list;
    }

    const owner = item.owner.trim();
    const repo = item.repo.trim();
    if (!owner || !repo) return list;

    const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
    if (seen.has(key)) return list;

    list.push({ owner, repo, timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now() });
    seen.add(key);
    return list;
  }, []);
}

function readCookieFavorites() {
  if (typeof document === 'undefined') return null;
  try {
    const cookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${STORAGE_KEY}=`));
    if (!cookie) return null;
    const value = decodeURIComponent(cookie.split('=')[1] || '');
    return JSON.parse(value);
  } catch (error) {
    clearStoredFavorites();
    return null;
  }
}

function writeCookieFavorites(favorites) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(
      JSON.stringify(favorites),
    )}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch (error) {
    // ignore cookie failures
  }
}

function clearStoredFavorites() {
  storageTargets.forEach((store) => {
    try {
      store.removeItem(STORAGE_KEY);
    } catch (error) {
      // ignore storage failures
    }
  });

  if (typeof document !== 'undefined') {
    document.cookie = `${STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}

function readStoredFavorites() {
  for (const store of storageTargets) {
    try {
      const stored = store.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = sanitizeFavorites(JSON.parse(stored));
        if (parsed.length) {
          return parsed;
        }
        store.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      try {
        store.removeItem(STORAGE_KEY);
      } catch (cleanupError) {
        // ignore cleanup failures
      }
    }
  }
  const cookieRaw = readCookieFavorites();
  const cookie = sanitizeFavorites(cookieRaw);
  if (cookie.length) {
    return cookie;
  }
  if (cookieRaw) {
    clearStoredFavorites();
  }
  return memoryFavorites;
}

function loadFavorites() {
  try {
    const parsed = sanitizeFavorites(readStoredFavorites());
    state.favorites = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    clearStoredFavorites();
    state.favorites = [];
  }

  memoryFavorites = [...state.favorites];
  return [...state.favorites];
}

function saveFavorites(next) {
  const sanitized = sanitizeFavorites(next);
  state.favorites = [...sanitized];
  memoryFavorites = [...state.favorites];
  storageTargets.forEach((store) => {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(state.favorites));
    } catch (error) {
      // ignore storage failures
    }
  });
  writeCookieFavorites(state.favorites);
  hydrateDatalists();
  renderFavoritesGrid();
  renderQuickFavorites();
}

function isFavorite(owner, repo) {
  return state.favorites.some(
    (fav) =>
      fav.owner.toLowerCase() === owner.toLowerCase() &&
      fav.repo.toLowerCase() === repo.toLowerCase(),
  );
}

function toggleFavorite(owner, repo) {
  const ownerName = typeof owner === 'string' ? owner.trim() : '';
  const repoName = typeof repo === 'string' ? repo.trim() : '';
  if (!ownerName || !repoName) return;

  const next = loadFavorites();
  const existingIndex = next.findIndex(
    (fav) =>
      fav.owner.toLowerCase() === ownerName.toLowerCase() &&
      fav.repo.toLowerCase() === repoName.toLowerCase(),
  );

  if (existingIndex >= 0) {
    next.splice(existingIndex, 1);
  } else {
    next.unshift({ owner: ownerName, repo: repoName, timestamp: Date.now() });
  }

  saveFavorites(next);
}

function hydrateDatalist(listId, suffix = '') {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = '';
  loadFavorites().forEach((fav) => {
    const option = document.createElement('option');
    option.value = `https://github.com/${fav.owner}/${fav.repo}${suffix}`;
    list.appendChild(option);
  });
}

function attachDatalistToField(fieldId, listId) {
  const field = document.getElementById(fieldId);
  const input = resolveInputElement(field);
  if (!input) return;

  if (listId) {
    input.setAttribute('list', listId);
  } else {
    input.removeAttribute('list');
  }
}

function hydrateDatalists() {
  hydrateDatalist('mapper-datalist');
  hydrateDatalist('releases-datalist');
  hydrateDatalist('patch-datalist', '/commit/');

  attachDatalistToField('mapper-url', 'mapper-datalist');
  attachDatalistToField('releases-url', 'releases-datalist');
  attachDatalistToField('patch-url', 'patch-datalist');
}

function setFavoriteButtonState(button, parsedRepo) {
  if (!button) return;
  const icon = button.querySelector('.material-symbols-outlined');
  const label = button.querySelector('.favorite-label');

  if (!parsedRepo) {
    button.hidden = true;
    button.disabled = true;
    return;
  }

  button.hidden = false;
  button.disabled = false;

  const active = isFavorite(parsedRepo.owner, parsedRepo.repo);
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');

  if (icon) {
    icon.textContent = active ? 'star' : 'star_border';
    icon.classList.toggle('filled-icon', active);
  }
  if (label) {
    label.textContent = active ? 'Favorited' : 'Favorite';
  }
}

async function copyWithFeedback(buttonId, text) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const original = button.dataset.defaultContent || button.innerHTML;
  button.dataset.defaultContent = original;

  const existingTimer = copyResetTimers.get(button);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  try {
    await navigator.clipboard.writeText(text || '');
  } catch (error) {
    console.error('GitHubTools: failed to write to clipboard', error);
    return;
  }
  button.innerHTML =
    '<span class="material-symbols-outlined">check_circle</span><span>Copied</span>';
  const resetTimer = setTimeout(() => {
    button.innerHTML = button.dataset.defaultContent || original;
    copyResetTimers.delete(button);
  }, 1800);
  copyResetTimers.set(button, resetTimer);
}

function showError(elementId, message, inputIds = []) {
  const container = document.getElementById(elementId);
  if (!container) return;
  container.removeAttribute('hidden');
  const text = container.querySelector('[data-error-text]');
  if (text) text.textContent = message;

  inputIds.forEach((id) => setFieldError(document.getElementById(id), message));
}

function hideError(elementId, inputIds = []) {
  const container = document.getElementById(elementId);
  if (!container) return;
  container.setAttribute('hidden', 'hidden');
  inputIds.forEach((id) => setFieldError(document.getElementById(id), ''));
}

function setButtonLoading(button, isLoading, idleLabel, busyLabel, iconName) {
  if (!button) return;
  const icon = button.querySelector('.material-symbols-outlined');
  const label = button.querySelector('span:last-child');
  if (!icon || !label) return;

  if (isLoading) {
    button.disabled = true;
    icon.textContent = 'progress_activity';
    icon.classList.add('gh-rolling');
    label.textContent = busyLabel;
  } else {
    button.disabled = false;
    icon.textContent = iconName;
    icon.classList.remove('gh-rolling');
    label.textContent = idleLabel;
  }
}

function bindCollapsibleToggle(buttonId, wrapperId, labels = {}) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;

  const details = wrapper.closest('details');
  const button = document.getElementById(buttonId) || details?.querySelector('summary');
  if (!button) return;

  const icon = button.querySelector('.material-symbols-outlined');
  const label =
    button.querySelector('.favorite-label') || button.querySelector('span:last-child');

  const openLabel = labels.openLabel || 'Hide token';
  const closedLabel = labels.closedLabel || 'Token settings';
  const { openIcon = 'expand_less', closedIcon = 'settings' } = labels;

  if (details) {
    const syncState = () => {
      const isOpen = Boolean(details.open);
      wrapper.classList.toggle('is-open', isOpen);
      details.classList.toggle('is-open', isOpen);
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (label) label.textContent = isOpen ? openLabel : closedLabel;
      if (icon) icon.textContent = isOpen ? openIcon : closedIcon;
    };
    details.addEventListener('toggle', syncState);
    syncState();
    return;
  }

  const isOpen = () => !wrapper.hasAttribute('hidden');

  const setOpen = (value) => {
    const currentHeight = wrapper.scrollHeight;
    wrapper.style.overflow = 'hidden';

    if (value) {
      wrapper.removeAttribute('hidden');
      const targetHeight = wrapper.scrollHeight;
      wrapper.style.height = '0px';
      requestAnimationFrame(() => {
        wrapper.style.height = `${targetHeight}px`;
      });
    } else {
      wrapper.style.height = `${currentHeight}px`;
      requestAnimationFrame(() => {
        wrapper.style.height = '0px';
      });
      setTimeout(() => {
        wrapper.setAttribute('hidden', 'hidden');
        wrapper.style.height = '';
      }, 220);
    }

    wrapper.classList.toggle('is-open', value);
    button.classList.toggle('is-open', value);
    button.setAttribute('aria-expanded', value ? 'true' : 'false');
    if (label) label.textContent = value ? openLabel : closedLabel;
    if (icon) icon.textContent = value ? openIcon : closedIcon;
    if (value) {
      const focusable = wrapper.querySelector('input, button, select, textarea');
      focusable?.focus({ preventScroll: true });
      setTimeout(() => {
        wrapper.style.height = 'auto';
      }, 220);
    }
  };

  button.addEventListener('click', () => {
    setOpen(!isOpen());
  });

  setOpen(isOpen());
}

function renderFavoritesGrid() {
  const grid = document.getElementById('favorites-grid');
  const emptyState = document.getElementById('favorites-empty');
  if (!grid || !emptyState) return;

  const favorites = loadFavorites();
  grid.innerHTML = '';

  if (!favorites.length) {
    emptyState.removeAttribute('hidden');
    grid.setAttribute('hidden', 'hidden');
    return;
  }

  emptyState.setAttribute('hidden', 'hidden');
  grid.removeAttribute('hidden');

  favorites.forEach((fav) => {
    const card = document.createElement('article');
    card.className = 'gh-favorite-card';
    card.innerHTML = `
      <div class="gh-favorite-meta">
        <div class="gh-stack" style="gap:0.25rem;">
          <div class="gh-badge-row">
            <span class="gh-badge">
              <span class="material-symbols-outlined">folder_open</span>
              <span>${fav.owner}</span>
            </span>
          </div>
          <h3 class="gh-bold" title="${fav.repo}">${fav.repo}</h3>
        </div>
        <button type="button" class="gh-pill-button" aria-label="Remove favorite">
          <span class="material-symbols-outlined filled-icon">star</span>
        </button>
      </div>
      <div class="gh-favorite-actions">
        <button type="button" class="gh-button secondary" data-map>
          <span class="material-symbols-outlined">terminal</span>
          <span>Repo Mapper</span>
        </button>
        <button type="button" class="gh-button secondary" data-stats>
          <span class="material-symbols-outlined">bar_chart</span>
          <span>Release Stats</span>
        </button>
      </div>
    `;

    card.querySelector('[aria-label="Remove favorite"]')?.addEventListener('click', () =>
      toggleFavorite(fav.owner, fav.repo),
    );

    const navigate =
      (typeof window !== 'undefined' && window.appNavigation?.navigate) ||
      ((href) => {
        if (href) {
          window.location.href = href;
        }
      });

    card.querySelector('[data-map]')?.addEventListener('click', () => {
      navigate(`/github/repo-mapper?repo=${fav.owner}/${fav.repo}`);
    });

    card.querySelector('[data-stats]')?.addEventListener('click', () => {
      navigate(`/github/release-stats?repo=${fav.owner}/${fav.repo}`);
    });

    grid.appendChild(card);
  });
}

function renderQuickFavorites() {
  const targets = [
    { id: 'mapper-quick-favs', view: 'mapper' },
    { id: 'releases-quick-favs', view: 'releases' },
    { id: 'patch-quick-favs', view: 'patch' },
  ];

  targets.forEach(({ id, view }) => {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';

    if (!state.favorites.length) {
      container.classList.add('gh-muted');
      container.textContent = 'Add favorites from tools to jump back quickly.';
      return;
    }

    container.classList.remove('gh-muted');

    state.favorites.slice(0, 4).forEach((fav) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'gh-favorite-chip';
      chip.innerHTML = `
        <span class="material-symbols-outlined filled-icon">star</span>
        <span>${fav.repo}</span>
      `;
      chip.addEventListener('click', () => {
        const url =
          view === 'patch'
            ? `https://github.com/${fav.owner}/${fav.repo}/commit/`
            : `https://github.com/${fav.owner}/${fav.repo}`;
        const targetInput = document.getElementById(`${view}-url`);
        if (targetInput) {
          targetInput.value = url;
          if (view === 'mapper') handleMapperFavoriteInput();
          if (view === 'releases') handleReleaseFavoriteInput();
          if (view === 'patch') handlePatchFavoriteInput();
        }
      });
      container.appendChild(chip);
    });
  });
}

function toggleTokenVisibility(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  const inputEl = resolveInputElement(input);
  if (!toggle || !inputEl) return;

  const isCheckbox = toggle instanceof HTMLInputElement && toggle.type === 'checkbox';
  const showing = isCheckbox ? toggle.checked : inputEl.getAttribute('type') === 'text';
  inputEl.setAttribute('type', showing ? 'text' : 'password');

  const icon = isCheckbox ? null : toggle.querySelector('.material-symbols-outlined');
  const label = isCheckbox
    ? toggle.closest('label')?.querySelector('[data-token-visibility-label]')
    : toggle.querySelector('span:last-child');
  const visibilityWrapper = toggle.closest('.gh-token-visibility');

  if (icon) icon.textContent = showing ? 'visibility_off' : 'visibility';
  if (label) label.textContent = showing ? 'Hide token' : 'Show token';
  if (visibilityWrapper) {
    visibilityWrapper.classList.toggle('is-visible', showing);
  }
}

function initMapperFavorites(urlInputId, favoriteButtonId) {
  const urlInput = document.getElementById(urlInputId);
  const favButton = document.getElementById(favoriteButtonId);
  if (!urlInput || !favButton) return;

  const update = () => {
    const parsed = parseGithubUrl(urlInput.value || '');
    state.mapper.parsedRepo = parsed;
    setFavoriteButtonState(favButton, parsed);
  };

  urlInput.addEventListener('input', update);
  favButton.addEventListener('click', () => {
    const parsed = parseGithubUrl(urlInput.value || '');
    state.mapper.parsedRepo = parsed;
    if (!parsed) {
      setFavoriteButtonState(favButton, parsed);
      return;
    }
    toggleFavorite(parsed.owner, parsed.repo);
    setFavoriteButtonState(favButton, parsed);
  });

  update();
}

function initReleaseFavorites(urlInputId, favoriteButtonId) {
  const urlInput = document.getElementById(urlInputId);
  const favButton = document.getElementById(favoriteButtonId);
  if (!urlInput || !favButton) return;

  const update = () => {
    const parsed = parseGithubUrl(urlInput.value || '');
    state.releases.parsedRepo = parsed;
    setFavoriteButtonState(favButton, parsed);
  };

  urlInput.addEventListener('input', update);
  favButton.addEventListener('click', () => {
    const parsed = parseGithubUrl(urlInput.value || '');
    state.releases.parsedRepo = parsed;
    if (!parsed) {
      setFavoriteButtonState(favButton, parsed);
      return;
    }
    toggleFavorite(parsed.owner, parsed.repo);
    setFavoriteButtonState(favButton, parsed);
  });

  update();
}

function initPatchFavorites(urlInputId, favoriteButtonId) {
  const urlInput = document.getElementById(urlInputId);
  const favButton = document.getElementById(favoriteButtonId);
  if (!urlInput || !favButton) return;

  const update = () => {
    const parsed = parseGithubCommitUrl(urlInput.value || '');
    state.patch.parsedRepo = parsed;
    setFavoriteButtonState(favButton, parsed);
  };

  urlInput.addEventListener('input', update);
  favButton.addEventListener('click', () => {
    const parsed = parseGithubCommitUrl(urlInput.value || '');
    state.patch.parsedRepo = parsed;
    if (!parsed) {
      setFavoriteButtonState(favButton, parsed);
      return;
    }
    toggleFavorite(parsed.owner, parsed.repo);
    setFavoriteButtonState(favButton, parsed);
  });

  update();
}

function handleMapperFavoriteInput() {
  const input = document.getElementById('mapper-url');
  const favButton = document.getElementById('mapper-fav-btn');
  if (!input || !favButton) return;
  const parsed = parseGithubUrl(input.value || '');
  state.mapper.parsedRepo = parsed;
  setFavoriteButtonState(favButton, parsed);
}

function handleReleaseFavoriteInput() {
  const input = document.getElementById('releases-url');
  const favButton = document.getElementById('releases-fav-btn');
  if (!input || !favButton) return;
  const parsed = parseGithubUrl(input.value || '');
  state.releases.parsedRepo = parsed;
  setFavoriteButtonState(favButton, parsed);
}

function handlePatchFavoriteInput() {
  const input = document.getElementById('patch-url');
  const favButton = document.getElementById('patch-fav-btn');
  if (!input || !favButton) return;
  const parsed = parseGithubCommitUrl(input.value || '');
  state.patch.parsedRepo = parsed;
  setFavoriteButtonState(favButton, parsed);
}

// Ensure favorites state is hydrated on load so toggles reflect saved entries immediately.
loadFavorites();

export function initRepoMapper() {
  const form = document.getElementById('mapper-form');
  if (!form) return;

  loadFavorites();
  hydrateDatalists();
  renderFavoritesGrid();
  renderQuickFavorites();

  const urlInput = document.getElementById('mapper-url');
  const tokenInput = document.getElementById('mapper-token');
  const resultEl = document.getElementById('mapper-result');
  const codeEl = document.getElementById('mapper-code');
  const foldersEl = document.getElementById('mapper-stats-folders');
  const filesEl = document.getElementById('mapper-stats-files');
  const copyBtn = document.getElementById('mapper-copy-btn');
  const asciiBtn = document.getElementById('btn-format-ascii');
  const pathsBtn = document.getElementById('btn-format-paths');
  const submitBtn = document.getElementById('mapper-submit');
  const favButton = document.getElementById('mapper-fav-btn');

  const resetMapperView = () => {
    state.mapper.rawPaths = [];
    state.mapper.parsedRepo = null;
    state.mapper.format = 'ascii';
    form.reset();
    if (urlInput) urlInput.value = '';
    if (tokenInput) tokenInput.value = '';
    setFieldError(urlInput, '');
    setFieldError(tokenInput, '');
    hideError('mapper-error');
    resultEl?.setAttribute('hidden', 'hidden');
    if (codeEl) codeEl.textContent = '';
    if (foldersEl) foldersEl.textContent = '0';
    if (filesEl) filesEl.textContent = '0';
    asciiBtn?.classList.add('active');
    pathsBtn?.classList.remove('active');
    setFavoriteButtonState(favButton, null);
  };

  initMapperFavorites('mapper-url', 'mapper-fav-btn');

  resetMapperView();

  bindCollapsibleToggle('mapper-token-reveal', 'mapper-token-wrapper', {
    closedLabel: 'Token settings',
    openLabel: 'Hide token',
    closedIcon: 'vpn_key',
  });

  document
    .getElementById('mapper-token-toggle')
    ?.addEventListener('change', () =>
      toggleTokenVisibility('mapper-token-toggle', 'mapper-token'),
    );

  const setFormat = (format) => {
    state.mapper.format = format;
    asciiBtn?.classList.toggle('active', format === 'ascii');
    pathsBtn?.classList.toggle('active', format === 'paths');
    if (state.mapper.rawPaths.length) renderMapperOutput();
  };

  asciiBtn?.addEventListener('click', () => setFormat('ascii'));
  pathsBtn?.addEventListener('click', () => setFormat('paths'));

  const renderMapperOutput = () => {
    const stats = ({ files, folders }) => {
      if (filesEl) filesEl.textContent = files;
      if (foldersEl) foldersEl.textContent = folders;
    };

    const output =
      state.mapper.format === 'paths'
        ? generatePathList(state.mapper.rawPaths, stats)
        : generateAsciiTree(state.mapper.rawPaths, stats);

    if (codeEl) codeEl.textContent = output;
    resultEl?.removeAttribute('hidden');
  };

  const copyAction = (targetId) => () =>
    void copyWithFeedback(targetId, codeEl?.textContent || '');
  copyBtn?.addEventListener('click', copyAction('mapper-copy-btn'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const parsed = parseGithubUrl(urlInput?.value || '');
    state.mapper.parsedRepo = parsed;
    if (!parsed) {
      showError('mapper-error', 'Invalid GitHub URL', ['mapper-url']);
      return;
    }

    hideError('mapper-error', ['mapper-url']);
    resultEl?.setAttribute('hidden', 'hidden');
    setButtonLoading(submitBtn, true, 'Generate Map', 'Processing...', 'terminal');

    try {
      const { tree, truncated } = await fetchRepositoryTree(parsed, tokenInput?.value || '');
      state.mapper.rawPaths = tree || [];
      if (truncated) {
        showError('mapper-error', 'Repo is large, output may be truncated.');
      }
      renderMapperOutput();
    } catch (error) {
      showError('mapper-error', error.message || 'Failed to fetch repository.');
    } finally {
      setButtonLoading(submitBtn, false, 'Generate Map', 'Generate Map', 'terminal');
    }
  });
}

export function initReleaseStats() {
  const form = document.getElementById('releases-form');
  if (!form) return;

  loadFavorites();
  hydrateDatalists();
  renderFavoritesGrid();
  renderQuickFavorites();

  const urlInput = document.getElementById('releases-url');
  const tokenInput = document.getElementById('releases-token');
  const resultEl = document.getElementById('releases-result');
  const totalDownloadsEl = document.getElementById('rel-total-downloads');
  const relCountEl = document.getElementById('rel-count');
  const listEl = document.getElementById('rel-list');
  const assetsEl = document.getElementById('rel-assets-list');
  const detailNameEl = document.getElementById('rel-detail-name');
  const detailTagEl = document.getElementById('rel-detail-tag');
  const detailDateEl = document.getElementById('rel-detail-date');
  const detailDownloadsEl = document.getElementById('rel-detail-downloads');
  const submitBtn = document.getElementById('releases-submit');

  initReleaseFavorites('releases-url', 'releases-fav-btn');

  bindCollapsibleToggle('releases-token-reveal', 'releases-token-wrapper', {
    closedLabel: 'Token settings',
    openLabel: 'Hide token',
    closedIcon: 'vpn_key',
  });

  document
    .getElementById('releases-token-toggle')
    ?.addEventListener('change', () =>
      toggleTokenVisibility('releases-token-toggle', 'releases-token'),
    );

  const renderAssets = (assets) => {
    if (!assetsEl) return;
    if (!assets.length) {
      assetsEl.innerHTML = '<p class="gh-muted">No assets.</p>';
      return;
    }
    const maxAsset = Math.max(...assets.map((asset) => asset.downloads));
    assetsEl.innerHTML = assets
      .map(
        (asset) => {
          const percent = maxAsset > 0 ? (asset.downloads / maxAsset) * 100 : 0;
          const canDownload = Boolean(asset.browserDownloadUrl);
          const assetLabel = canDownload
            ? `<a class="gh-asset-link" href="${asset.browserDownloadUrl}" target="_blank" rel="noopener">
                <span class="material-symbols-outlined" aria-hidden="true">download</span>
                <span>${asset.name}</span>
              </a>`
            : `<span class="gh-asset-link is-disabled">
                <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
                <span>${asset.name}</span>
              </span>`;

          return `
            <div class="gh-stack">
              <div class="gh-asset-row">
                ${assetLabel}
                <span class="gh-muted" aria-label="Downloads for ${asset.name}">${asset.downloads.toLocaleString()}</span>
              </div>
              <div class="gh-release-bar">
                <span style="width:${percent}%;"></span>
              </div>
            </div>
          `;
        },
      )
      .join('');
  };

  const renderReleaseDetails = () => {
    if (!state.releases.data) return;
    const { releases } = state.releases.data;
    const active = releases[state.releases.selectedIndex];
    if (!active) return;

    if (detailNameEl) detailNameEl.textContent = active.name;
    if (detailTagEl) detailTagEl.textContent = active.tagName;
    if (detailDateEl) detailDateEl.textContent = new Date(active.publishedAt).toLocaleDateString();
    if (detailDownloadsEl) detailDownloadsEl.textContent = active.totalDownloads.toLocaleString();

    renderAssets(active.assets);
  };

  const renderReleaseList = () => {
    if (!state.releases.data || !listEl) return;
    const { releases } = state.releases.data;
    const maxDownloads = Math.max(...releases.map((r) => r.totalDownloads));

    listEl.innerHTML = releases
      .map((release, idx) => {
        const isActive = idx === state.releases.selectedIndex;
        const percent = maxDownloads > 0 ? (release.totalDownloads / maxDownloads) * 100 : 0;
        return `
          <button type="button" class="${isActive ? 'active' : ''}">
            <div class="gh-row space-between">
              <span class="${isActive ? 'gh-bold' : 'gh-muted'}">${release.name}</span>
              <span class="gh-muted">${release.totalDownloads.toLocaleString()}</span>
            </div>
            <div class="gh-release-bar">
              <span style="width:${percent}%;"></span>
            </div>
          </button>`;
      })
      .join('');

    listEl.querySelectorAll('button').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        state.releases.selectedIndex = idx;
        renderReleaseDetails();
        renderReleaseList();
      });
    });
  };

  const renderOverview = () => {
    if (!state.releases.data) return;
    const { totalDownloads, releases } = state.releases.data;
    if (totalDownloadsEl) totalDownloadsEl.textContent = totalDownloads.toLocaleString();
    if (relCountEl) relCountEl.textContent = `${releases.length} Found`;
    renderReleaseDetails();
    renderReleaseList();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const parsed = parseGithubUrl(urlInput?.value || '');
    state.releases.parsedRepo = parsed;
    if (!parsed) {
      showError('releases-error', 'Invalid GitHub URL', ['releases-url']);
      return;
    }

    hideError('releases-error', ['releases-url']);
    resultEl?.setAttribute('hidden', 'hidden');
    setButtonLoading(submitBtn, true, 'Analyze', 'Processing...', 'analytics');

    try {
      state.releases.data = await fetchReleaseStats(parsed, tokenInput?.value || '');
      state.releases.selectedIndex = 0;
      renderOverview();
      resultEl?.removeAttribute('hidden');
    } catch (error) {
      showError('releases-error', error.message || 'Failed to fetch releases.');
    } finally {
      setButtonLoading(submitBtn, false, 'Analyze', 'Analyze', 'analytics');
    }
  });
}

export function initGitPatch() {
  const form = document.getElementById('patch-form');
  if (!form) return;

  loadFavorites();
  hydrateDatalists();
  renderFavoritesGrid();
  renderQuickFavorites();

  const urlInput = document.getElementById('patch-url');
  const tokenInput = document.getElementById('patch-token');
  const resultEl = document.getElementById('patch-result');
  const codeEl = document.getElementById('patch-code');
  const copyBtn = document.getElementById('patch-copy-btn');
  const downloadBtn = document.getElementById('patch-download-btn');
  const submitBtn = document.getElementById('patch-submit');

  initPatchFavorites('patch-url', 'patch-fav-btn');

  bindCollapsibleToggle('patch-token-reveal', 'patch-token-wrapper', {
    closedLabel: 'Token settings',
    openLabel: 'Hide token',
    closedIcon: 'vpn_key',
  });

  document
    .getElementById('patch-token-toggle')
    ?.addEventListener('change', () =>
      toggleTokenVisibility('patch-token-toggle', 'patch-token'),
    );

  copyBtn?.addEventListener('click', () =>
    void copyWithFeedback('patch-copy-btn', state.patch.content),
  );

  downloadBtn?.addEventListener('click', () => {
    if (!state.patch.content) return;
    const blob = new Blob([state.patch.content], { type: 'text/plain' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = state.patch.filename || 'git.patch';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const parsed = parseGithubCommitUrl(urlInput?.value || '');
    state.patch.parsedRepo = parsed;
    if (!parsed) {
      showError('patch-error', 'Invalid Commit URL', ['patch-url']);
      return;
    }

    hideError('patch-error', ['patch-url']);
    resultEl?.setAttribute('hidden', 'hidden');
    setButtonLoading(submitBtn, true, 'Get Patch', 'Fetching...', 'difference');

    try {
      const patch = await fetchCommitPatch(parsed, tokenInput?.value || '');
      state.patch.content = patch;
      state.patch.filename = `${parsed.repo}-${parsed.commitSha.slice(0, 7)}.patch`;
      if (codeEl) codeEl.textContent = patch;
      resultEl?.removeAttribute('hidden');
    } catch (error) {
      showError('patch-error', error.message || 'Failed to fetch patch.');
    } finally {
      setButtonLoading(submitBtn, false, 'Get Patch', 'Get Patch', 'difference');
    }
  });
}

export function initFavoritesPage() {
  loadFavorites();
  hydrateDatalists();
  renderFavoritesGrid();
  renderQuickFavorites();
}

export function initGithubFavorites() {
  initFavoritesPage();
}

export async function runMapper(url, token = '', format = 'ascii') {
  const parsed = parseGithubUrl(url || '');
  if (!parsed) {
    throw new Error('Invalid GitHub URL');
  }

  state.mapper.format = format === 'paths' ? 'paths' : 'ascii';
  const { tree, truncated } = await fetchRepositoryTree(parsed, token);
  state.mapper.rawPaths = tree || [];

  const stats = { files: 0, folders: 0 };
  const captureStats = ({ files, folders }) => {
    stats.files = files;
    stats.folders = folders;
  };

  const output =
    state.mapper.format === 'paths'
      ? generatePathList(state.mapper.rawPaths, captureStats)
      : generateAsciiTree(state.mapper.rawPaths, captureStats);

  return { output, truncated: !!truncated, stats };
}

export async function runReleaseStats(url, token = '') {
  const parsed = parseGithubUrl(url || '');
  if (!parsed) {
    throw new Error('Invalid GitHub URL');
  }

  const data = await fetchReleaseStats(parsed, token);
  state.releases.data = data;
  state.releases.parsedRepo = parsed;
  state.releases.selectedIndex = 0;
  return data;
}

export async function runPatch(url, token = '') {
  const parsed = parseGithubCommitUrl(url || '');
  if (!parsed) {
    throw new Error('Invalid Commit URL');
  }

  const content = await fetchCommitPatch(parsed, token);
  const filename = `${parsed.repo}-${parsed.commitSha.slice(0, 7)}.patch`;
  state.patch.content = content;
  state.patch.filename = filename;
  state.patch.parsedRepo = parsed;
  return { content, filename };
}
