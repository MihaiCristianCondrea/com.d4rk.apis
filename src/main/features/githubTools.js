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
    icon.classList.add('rotating');
    label.textContent = busyLabel;
  } else {
    button.disabled = false;
    icon.textContent = iconName;
    icon.classList.remove('rotating');
    label.textContent = idleLabel;
  }
}

function renderFavoritesGrid() {
  const grid = document.getElementById('favorites-grid');
  const emptyState = document.getElementById('favorites-empty');
  if (!grid || !emptyState) return;

  const favorites = loadFavorites();
  grid.innerHTML = '';

  if (!favorites.length) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  favorites.forEach((fav) => {
    const card = document.createElement('article');
    card.className = 'gh-fav-card';
    card.innerHTML = `
      <div class="gh-fav-header">
        <div class="gh-fav-meta">
          <div class="gh-fav-owner">
            <span class="material-symbols-outlined">folder_open</span>
            <span>${fav.owner}</span>
          </div>
          <h3 title="${fav.repo}">${fav.repo}</h3>
        </div>
        <button type="button" class="gh-fav-toggle">
          <span class="material-symbols-outlined">star</span>
        </button>
      </div>
      <div class="gh-fav-actions">
        <button type="button" class="gh-fav-action map" data-url="https://github.com/${fav.owner}/${fav.repo}">
          <span class="material-symbols-outlined">terminal</span>
          <span>Map</span>
        </button>
        <button type="button" class="gh-fav-action stats" data-url="https://github.com/${fav.owner}/${fav.repo}">
          <span class="material-symbols-outlined">bar_chart</span>
          <span>Stats</span>
        </button>
      </div>
    `;

    const toggleBtn = card.querySelector('.gh-fav-toggle');
    toggleBtn?.addEventListener('click', () => {
      toggleFavorite(fav.owner, fav.repo);
      renderFavoritesGrid();
    });

    card.querySelector('.gh-fav-action.map')?.addEventListener('click', () => {
      const mapperInput = document.getElementById('mapper-url');
      if (mapperInput) {
        mapperInput.value = `https://github.com/${fav.owner}/${fav.repo}`;
        mapperInput.dispatchEvent(new Event('input'));
        window.location.hash = '#repo-mapper';
      }
    });

    card.querySelector('.gh-fav-action.stats')?.addEventListener('click', () => {
      const releaseInput = document.getElementById('releases-url');
      if (releaseInput) {
        releaseInput.value = `https://github.com/${fav.owner}/${fav.repo}`;
        releaseInput.dispatchEvent(new Event('input'));
        window.location.hash = '#release-stats';
      }
    });

    grid.appendChild(card);
  });
}

function toggleToken(buttonId, containerId) {
  const button = document.getElementById(buttonId);
  const container = document.getElementById(containerId);
  if (!button || !container) return;

  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  container.hidden = expanded;
  const label = button.querySelector('.token-toggle-label');
  if (label) label.textContent = expanded ? 'Token Settings' : 'Hide Settings';
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

export function initRepoMapper() {
  const form = document.getElementById('mapper-form');
  if (!form) return;

  loadFavorites();
  hydrateDatalists();
  renderFavoritesGrid();

  const urlInput = document.getElementById('mapper-url');
  const tokenInput = document.getElementById('mapper-token');
  const tokenToggle = document.getElementById('mapper-token-toggle');
  const resultEl = document.getElementById('mapper-result');
  const codeEl = document.getElementById('mapper-code');
  const foldersEl = document.getElementById('mapper-stats-folders');
  const filesEl = document.getElementById('mapper-stats-files');
  const copyBtn = document.getElementById('mapper-copy-btn');
  const asciiBtn = document.getElementById('btn-format-ascii');
  const pathsBtn = document.getElementById('btn-format-paths');
  const submitBtn = document.getElementById('mapper-submit');

  initMapperFavorites('mapper-url', 'mapper-fav-btn');

  tokenToggle?.addEventListener('click', () =>
    toggleToken('mapper-token-toggle', 'mapper-token-container'),
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

  copyBtn?.addEventListener('click', () =>
    copyWithFeedback('mapper-copy-btn', codeEl?.textContent || ''),
  );

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

  const urlInput = document.getElementById('releases-url');
  const tokenInput = document.getElementById('releases-token');
  const tokenToggle = document.getElementById('releases-token-toggle');
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

  tokenToggle?.addEventListener('click', () =>
    toggleToken('releases-token-toggle', 'releases-token-container'),
  );

  const renderAssets = (assets) => {
    if (!assetsEl) return;
    if (!assets.length) {
      assetsEl.innerHTML = '<div class="gh-meta">No assets.</div>';
      return;
    }
    const maxAsset = Math.max(...assets.map((a) => a.downloads));
    assetsEl.innerHTML = assets
      .map(
        (asset) => `
          <div class="gh-asset">
            <div class="gh-row">
              <span class="gh-asset-name">${asset.name}</span>
              <span class="gh-meta">${asset.downloads.toLocaleString()}</span>
            </div>
            <div class="gh-asset-bar"><span style="width: ${maxAsset > 0 ? (asset.downloads / maxAsset) * 100 : 0}%"></span></div>
          </div>
        `,
      )
      .join('');
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
          <button type="button" class="gh-release-button ${isActive ? 'active' : ''}" data-index="${idx}">
            <div class="gh-row">
              <span class="${isActive ? 'gh-strong' : 'gh-meta'}">${release.name}</span>
              <span class="gh-meta">${release.totalDownloads.toLocaleString()}</span>
            </div>
            <div class="gh-release-bar"><span style="width:${percent}%;"></span></div>
          </button>`;
      })
      .join('');

    listEl.querySelectorAll('button[data-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.releases.selectedIndex = Number(btn.dataset.index);
        renderReleaseDetails();
      });
    });
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
    renderReleaseList();
  };

  const renderOverview = () => {
    if (!state.releases.data) return;
    const { totalDownloads, releases } = state.releases.data;
    if (totalDownloadsEl) totalDownloadsEl.textContent = totalDownloads.toLocaleString();
    if (relCountEl) relCountEl.textContent = `${releases.length} Found`;
    renderReleaseDetails();
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

  const urlInput = document.getElementById('patch-url');
  const tokenInput = document.getElementById('patch-token');
  const tokenToggle = document.getElementById('patch-token-toggle');
  const resultEl = document.getElementById('patch-result');
  const codeEl = document.getElementById('patch-code');
  const copyBtn = document.getElementById('patch-copy-btn');
  const downloadBtn = document.getElementById('patch-download-btn');
  const submitBtn = document.getElementById('patch-submit');

  initPatchFavorites('patch-url', 'patch-fav-btn');

  tokenToggle?.addEventListener('click', () =>
    toggleToken('patch-token-toggle', 'patch-token-container'),
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
