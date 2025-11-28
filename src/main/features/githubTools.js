import {
  fetchCommitPatch,
  fetchReleaseStats,
  fetchRepositoryTree,
} from '../services/githubService';
import {
  generateAsciiTree,
  generatePathList,
  parseGithubCommitUrl,
  parseGithubUrl,
} from '../domain/utils.js';

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

function loadFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    state.favorites = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    state.favorites = [];
  }
  return [...state.favorites];
}

function saveFavorites(next) {
  state.favorites = [...next];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favorites));
  } catch (error) {
    // ignore storage failures
  }
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
  const next = loadFavorites();
  const existingIndex = next.findIndex(
    (fav) =>
      fav.owner.toLowerCase() === owner.toLowerCase() &&
      fav.repo.toLowerCase() === repo.toLowerCase(),
  );

  if (existingIndex >= 0) {
    next.splice(existingIndex, 1);
  } else {
    next.unshift({ owner, repo, timestamp: Date.now() });
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

function hydrateDatalists() {
  hydrateDatalist('mapper-datalist');
  hydrateDatalist('releases-datalist');
  hydrateDatalist('patch-datalist', '/commit/');
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

  if (icon) {
    icon.textContent = active ? 'star' : 'star_border';
    icon.classList.toggle('filled-icon', active);
  }
  if (label) {
    label.textContent = active ? 'Favorited' : 'Favorite';
  }
}

function copyWithFeedback(buttonId, text) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const original = button.innerHTML;
  navigator.clipboard.writeText(text || '');
  button.innerHTML =
    '<span class="material-symbols-outlined">check_circle</span><span>Copied</span>';
  setTimeout(() => {
    button.innerHTML = original;
  }, 1800);
}

function showError(elementId, message) {
  const container = document.getElementById(elementId);
  if (!container) return;
  container.removeAttribute('hidden');
  const text = container.querySelector('[data-error-text]');
  if (text) text.textContent = message;
}

function hideError(elementId) {
  const container = document.getElementById(elementId);
  if (!container) return;
  container.setAttribute('hidden', 'hidden');
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
  const button = document.getElementById(buttonId);
  const wrapper = document.getElementById(wrapperId);
  if (!button || !wrapper) return;

  const icon = button.querySelector('.material-symbols-outlined');
  const label =
    button.querySelector('.favorite-label') || button.querySelector('span:last-child');

  const openLabel = labels.openLabel || 'Hide token';
  const closedLabel = labels.closedLabel || 'Token settings';
  const openIcon = labels.openIcon || 'expand_less';
  const closedIcon = labels.closedIcon || 'settings';

  const sync = () => {
    const isOpen = !wrapper.hasAttribute('hidden');
    if (label) label.textContent = isOpen ? openLabel : closedLabel;
    if (icon) icon.textContent = isOpen ? openIcon : closedIcon;
  };

  button.addEventListener('click', () => {
    if (wrapper.hasAttribute('hidden')) {
      wrapper.removeAttribute('hidden');
    } else {
      wrapper.setAttribute('hidden', 'hidden');
    }
    sync();
  });

  sync();
}

function renderFavoritesGrid() {
  const grid = document.getElementById('favorites-grid');
  const emptyState = document.getElementById('favorites-empty');
  if (!grid || !emptyState) return;

  const favorites = loadFavorites();
  grid.innerHTML = '';

  if (!favorites.length) {
    emptyState.removeAttribute('hidden');
    return;
  }

  emptyState.setAttribute('hidden', 'hidden');

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

    card.querySelector('[data-map]')?.addEventListener('click', () => {
      window.appNavigation?.navigate?.(`/github/repo-mapper?repo=${fav.owner}/${fav.repo}`);
    });

    card.querySelector('[data-stats]')?.addEventListener('click', () => {
      window.appNavigation?.navigate?.(`/github/release-stats?repo=${fav.owner}/${fav.repo}`);
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
  if (!toggle || !input) return;
  const showing = input.getAttribute('type') === 'text';
  input.setAttribute('type', showing ? 'password' : 'text');
  const icon = toggle.querySelector('.material-symbols-outlined');
  const label = toggle.querySelector('span:last-child');
  if (icon) icon.textContent = showing ? 'visibility' : 'visibility_off';
  if (label) label.textContent = showing ? 'Show token' : 'Hide token';
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
    if (!state.mapper.parsedRepo) return;
    toggleFavorite(state.mapper.parsedRepo.owner, state.mapper.parsedRepo.repo);
    setFavoriteButtonState(favButton, state.mapper.parsedRepo);
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
    if (!state.releases.parsedRepo) return;
    toggleFavorite(state.releases.parsedRepo.owner, state.releases.parsedRepo.repo);
    setFavoriteButtonState(favButton, state.releases.parsedRepo);
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
    if (!state.patch.parsedRepo) return;
    toggleFavorite(state.patch.parsedRepo.owner, state.patch.parsedRepo.repo);
    setFavoriteButtonState(favButton, state.patch.parsedRepo);
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
  const copyFooterBtn = document.getElementById('mapper-copy-btn-footer');
  const asciiBtn = document.getElementById('btn-format-ascii');
  const pathsBtn = document.getElementById('btn-format-paths');
  const submitBtn = document.getElementById('mapper-submit');

  initMapperFavorites('mapper-url', 'mapper-fav-btn');

  bindCollapsibleToggle('mapper-token-reveal', 'mapper-token-wrapper', {
    closedLabel: 'Token settings',
    openLabel: 'Hide token',
  });

  document
    .getElementById('mapper-token-toggle')
    ?.addEventListener('click', () =>
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
    copyWithFeedback(targetId, codeEl?.textContent || '');
  copyBtn?.addEventListener('click', copyAction('mapper-copy-btn'));
  copyFooterBtn?.addEventListener('click', copyAction('mapper-copy-btn-footer'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const parsed = parseGithubUrl(urlInput?.value || '');
    state.mapper.parsedRepo = parsed;
    if (!parsed) {
      showError('mapper-error', 'Invalid GitHub URL');
      return;
    }

    hideError('mapper-error');
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
  });

  document
    .getElementById('releases-token-toggle')
    ?.addEventListener('click', () =>
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
        (asset) => `
          <div class="gh-stack">
            <div class="gh-row space-between">
              <span class="gh-bold">${asset.name}</span>
              <span class="gh-muted">${asset.downloads.toLocaleString()}</span>
            </div>
            <div class="gh-release-bar">
              <span style="width:${maxAsset > 0 ? (asset.downloads / maxAsset) * 100 : 0}%;"></span>
            </div>
          </div>
        `,
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
      showError('releases-error', 'Invalid GitHub URL');
      return;
    }

    hideError('releases-error');
    resultEl?.setAttribute('hidden', 'hidden');
    setButtonLoading(submitBtn, true, 'Analyze', 'Processing...', 'analytics');

    try {
      const data = await fetchReleaseStats(parsed, tokenInput?.value || '');
      state.releases.data = data;
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
  });

  document
    .getElementById('patch-token-toggle')
    ?.addEventListener('click', () =>
      toggleTokenVisibility('patch-token-toggle', 'patch-token'),
    );

  copyBtn?.addEventListener('click', () =>
    copyWithFeedback('patch-copy-btn', state.patch.content),
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
      showError('patch-error', 'Invalid Commit URL');
      return;
    }

    hideError('patch-error');
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

export function initGithubFavorites() {
  loadFavorites();
  hydrateDatalists();
  renderFavoritesGrid();
}
