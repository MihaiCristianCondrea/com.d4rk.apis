import { fetchCommitPatch, fetchReleaseStats, fetchRepositoryTree } from '../services/githubService';
import { generateAsciiTree, generatePathList, parseGithubCommitUrl, parseGithubUrl } from '../domain/utils.js';

const FAVORITES_KEY = 'repomapper_favorites';

const state = {
  favorites: [],
  mapper: {
    rawPaths: [],
    format: 'ascii',
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
    const stored = localStorage.getItem(FAVORITES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    state.favorites = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    state.favorites = state.favorites || [];
  }
  return [...state.favorites];
}

function saveFavorites(list) {
  state.favorites = [...list];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch (error) {
    // ignore storage issues
  }
}

function toggleFavorite(owner, repo) {
  const current = loadFavorites();
  const existingIndex = current.findIndex(
    (fav) => fav.owner.toLowerCase() === owner.toLowerCase() && fav.repo.toLowerCase() === repo.toLowerCase(),
  );

  if (existingIndex >= 0) {
    current.splice(existingIndex, 1);
  } else {
    current.unshift({ owner, repo, timestamp: Date.now() });
  }

  saveFavorites(current);
  renderFavoritesGrid();
  hydrateDatalists();
  return current;
}

function setFavoriteButtonState(button, parsedRepo) {
  if (!button) return;
  const icon = button.querySelector('.material-symbols-outlined');
  const label = button.querySelector('.favorite-label');
  const isValid = Boolean(parsedRepo);
  const isFav = parsedRepo && state.favorites.some(
    (fav) => fav.owner.toLowerCase() === parsedRepo.owner.toLowerCase() && fav.repo.toLowerCase() === parsedRepo.repo.toLowerCase(),
  );

  button.hidden = !isValid;
  button.disabled = !isValid;
  button.classList.toggle('is-active', Boolean(isFav));

  if (icon) {
    icon.textContent = isFav ? 'star' : 'star_border';
  }
  if (label) {
    label.textContent = isFav ? 'Favorited' : 'Favorite';
  }
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

function toggleToken(buttonId, containerId) {
  const button = document.getElementById(buttonId);
  const container = document.getElementById(containerId);
  if (!button || !container) return;

  const labelNode = button.querySelector('.token-toggle-label');
  const isOpen = button.getAttribute('aria-expanded') === 'true';
  const nextState = !isOpen;

  button.setAttribute('aria-expanded', nextState ? 'true' : 'false');
  container.hidden = !nextState;
  if (labelNode) {
    labelNode.textContent = nextState ? 'Hide Settings' : 'Token Settings';
  }
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = 'none';
}

function setButtonLoading(button, isLoading, label, loadingLabel) {
  if (!button) return;
  if (isLoading) {
    button.setAttribute('data-original-label', label);
    button.disabled = true;
    button.innerHTML = `<span slot="icon" class="material-symbols-outlined rotating">progress_activity</span>${loadingLabel}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.getAttribute('data-original-label') || label;
  }
}

function copyWithFeedback(buttonId, text) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const original = button.innerHTML;
  navigator.clipboard.writeText(text || '');
  button.innerHTML = '<span class="material-symbols-outlined">check_circle</span>Copied';
  setTimeout(() => {
    button.innerHTML = original;
  }, 1800);
}

function renderFavoritesGrid() {
  const grid = document.getElementById('favorites-grid');
  const empty = document.getElementById('favorites-empty');
  if (!grid || !empty) return;

  const favorites = loadFavorites();
  grid.innerHTML = '';

  if (!favorites.length) {
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  favorites.forEach((fav) => {
    const card = document.createElement('div');
    card.className = 'gh-card';
    card.innerHTML = `
      <header>
        <div>
          <div class="gh-meta">
            <span class="material-symbols-outlined">folder_open</span>
            <span>${fav.owner}</span>
          </div>
          <h3 title="${fav.repo}">${fav.repo}</h3>
        </div>
        <button type="button" class="gh-pill-button" aria-label="Remove favorite">
          <span class="material-symbols-outlined">star</span>
          <span class="favorite-label">Favorited</span>
        </button>
      </header>
      <div class="gh-actions">
        <md-filled-tonal-button class="favorite-map" data-url="https://github.com/${fav.owner}/${fav.repo}">
          <span slot="icon" class="material-symbols-outlined">terminal</span>
          Map
        </md-filled-tonal-button>
        <md-filled-tonal-button class="favorite-stats" data-url="https://github.com/${fav.owner}/${fav.repo}">
          <span slot="icon" class="material-symbols-outlined">bar_chart</span>
          Stats
        </md-filled-tonal-button>
      </div>
    `;

    const removeBtn = card.querySelector('button');
    removeBtn?.addEventListener('click', () => {
      toggleFavorite(fav.owner, fav.repo);
    });

    const mapBtn = card.querySelector('.favorite-map');
    mapBtn?.addEventListener('click', () => {
      window.location.href = '#repo-mapper';
      const mapperInput = document.getElementById('mapper-url');
      if (mapperInput) {
        mapperInput.value = mapBtn.dataset.url;
        mapperInput.dispatchEvent(new Event('input'));
      }
    });

    const statsBtn = card.querySelector('.favorite-stats');
    statsBtn?.addEventListener('click', () => {
      window.location.href = '#release-stats';
      const releaseInput = document.getElementById('releases-url');
      if (releaseInput) {
        releaseInput.value = statsBtn.dataset.url;
        releaseInput.dispatchEvent(new Event('input'));
      }
    });

    grid.appendChild(card);
  });
}

function handleFavoriteToggle(buttonId, parsedRepo) {
  const button = document.getElementById(buttonId);
  if (!button || !parsedRepo) return;
  toggleFavorite(parsedRepo.owner, parsedRepo.repo);
  setFavoriteButtonState(button, parsedRepo);
}

export function initRepoMapper() {
  const form = document.getElementById('mapper-form');
  if (!form) return;

  loadFavorites();
  hydrateDatalists();

  const urlInput = document.getElementById('mapper-url');
  const tokenInput = document.getElementById('mapper-token');
  const tokenToggle = document.getElementById('mapper-token-toggle');
  const favoriteButton = document.getElementById('mapper-fav-btn');
  const errorEl = document.getElementById('mapper-error');
  const resultEl = document.getElementById('mapper-result');
  const codeEl = document.getElementById('mapper-code');
  const foldersEl = document.getElementById('mapper-stats-folders');
  const filesEl = document.getElementById('mapper-stats-files');
  const copyBtn = document.getElementById('mapper-copy-btn');
  const asciiBtn = document.getElementById('btn-format-ascii');
  const pathsBtn = document.getElementById('btn-format-paths');
  const submitBtn = document.getElementById('mapper-submit');

  const updateStateFromInput = () => {
    const parsed = parseGithubUrl(urlInput?.value || '');
    state.mapper.parsedRepo = parsed;
    setFavoriteButtonState(favoriteButton, parsed);
    return parsed;
  };

  urlInput?.addEventListener('input', updateStateFromInput);

  favoriteButton?.addEventListener('click', () => {
    const parsed = updateStateFromInput();
    if (parsed) handleFavoriteToggle('mapper-fav-btn', parsed);
  });

  tokenToggle?.addEventListener('click', () => toggleToken('mapper-token-toggle', 'mapper-token-container'));

  const setFormat = (format) => {
    state.mapper.format = format;
    asciiBtn?.classList.toggle('active', format === 'ascii');
    pathsBtn?.classList.toggle('active', format === 'paths');
    if (state.mapper.rawPaths.length) renderMapperOutput();
  };

  asciiBtn?.addEventListener('click', () => setFormat('ascii'));
  pathsBtn?.addEventListener('click', () => setFormat('paths'));

  const renderMapperOutput = () => {
    const setStats = ({ files, folders }) => {
      if (filesEl) filesEl.textContent = files;
      if (foldersEl) foldersEl.textContent = folders;
    };

    const output = state.mapper.format === 'paths'
      ? generatePathList(state.mapper.rawPaths, setStats)
      : generateAsciiTree(state.mapper.rawPaths, setStats);

    if (codeEl) codeEl.textContent = output;
    resultEl?.removeAttribute('hidden');
  };

  copyBtn?.addEventListener('click', () => copyWithFeedback('mapper-copy-btn', codeEl?.textContent || ''));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const parsed = updateStateFromInput();
    if (!parsed) {
      showError('mapper-error', 'Invalid GitHub URL');
      return;
    }

    hideError('mapper-error');
    resultEl?.setAttribute('hidden', 'hidden');

    setButtonLoading(submitBtn, true, 'Generate Map', 'Processing...');

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
      setButtonLoading(submitBtn, false, 'Generate Map');
    }
  });

  updateStateFromInput();
}

export function initReleaseStats() {
  const form = document.getElementById('releases-form');
  if (!form) return;

  loadFavorites();
  hydrateDatalists();

  const urlInput = document.getElementById('releases-url');
  const tokenInput = document.getElementById('releases-token');
  const tokenToggle = document.getElementById('releases-token-toggle');
  const favoriteButton = document.getElementById('releases-fav-btn');
  const errorEl = document.getElementById('releases-error');
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

  const updateStateFromInput = () => {
    const parsed = parseGithubUrl(urlInput?.value || '');
    state.releases.parsedRepo = parsed;
    setFavoriteButtonState(favoriteButton, parsed);
    return parsed;
  };

  urlInput?.addEventListener('input', updateStateFromInput);

  favoriteButton?.addEventListener('click', () => {
    const parsed = updateStateFromInput();
    if (parsed) handleFavoriteToggle('releases-fav-btn', parsed);
  });

  tokenToggle?.addEventListener('click', () => toggleToken('releases-token-toggle', 'releases-token-container'));

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
            <div class="gh-row" style="justify-content: space-between; align-items: center; gap: 0.5rem;">
              <span style="font-weight: 600;">${asset.name}</span>
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
            <div class="gh-row" style="justify-content: space-between; align-items: center;">
              <span style="font-weight: 600;" class="${isActive ? '' : 'gh-meta'}">${release.name}</span>
              <span class="gh-meta" style="color: ${isActive ? 'inherit' : 'var(--app-secondary-text-color)'}">${release.totalDownloads.toLocaleString()}</span>
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

    detailNameEl.textContent = active.name;
    detailTagEl.textContent = active.tagName;
    detailDateEl.textContent = new Date(active.publishedAt).toLocaleDateString();
    detailDownloadsEl.textContent = active.totalDownloads.toLocaleString();

    renderAssets(active.assets);
    renderReleaseList();
  };

  const renderOverview = () => {
    if (!state.releases.data) return;
    const { totalDownloads, releases } = state.releases.data;
    totalDownloadsEl.textContent = totalDownloads.toLocaleString();
    relCountEl.textContent = `${releases.length} Found`;
    renderReleaseDetails();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const parsed = updateStateFromInput();
    if (!parsed) {
      showError('releases-error', 'Invalid GitHub URL');
      return;
    }

    hideError('releases-error');
    resultEl?.setAttribute('hidden', 'hidden');
    setButtonLoading(submitBtn, true, 'Analyze', 'Processing...');

    try {
      const data = await fetchReleaseStats(parsed, tokenInput?.value || '');
      state.releases.data = data;
      state.releases.selectedIndex = 0;
      renderOverview();
      resultEl?.removeAttribute('hidden');
    } catch (error) {
      showError('releases-error', error.message || 'Failed to fetch releases.');
    } finally {
      setButtonLoading(submitBtn, false, 'Analyze');
    }
  });

  updateStateFromInput();
}

export function initGitPatch() {
  const form = document.getElementById('patch-form');
  if (!form) return;

  loadFavorites();
  hydrateDatalists();

  const urlInput = document.getElementById('patch-url');
  const tokenInput = document.getElementById('patch-token');
  const tokenToggle = document.getElementById('patch-token-toggle');
  const favoriteButton = document.getElementById('patch-fav-btn');
  const errorEl = document.getElementById('patch-error');
  const resultEl = document.getElementById('patch-result');
  const codeEl = document.getElementById('patch-code');
  const copyBtn = document.getElementById('patch-copy-btn');
  const downloadBtn = document.getElementById('patch-download-btn');
  const submitBtn = document.getElementById('patch-submit');

  const updateStateFromInput = () => {
    const parsed = parseGithubCommitUrl(urlInput?.value || '');
    state.patch.parsedRepo = parsed;
    setFavoriteButtonState(favoriteButton, parsed);
    return parsed;
  };

  urlInput?.addEventListener('input', updateStateFromInput);

  favoriteButton?.addEventListener('click', () => {
    const parsed = updateStateFromInput();
    if (parsed) handleFavoriteToggle('patch-fav-btn', parsed);
  });

  tokenToggle?.addEventListener('click', () => toggleToken('patch-token-toggle', 'patch-token-container'));

  copyBtn?.addEventListener('click', () => copyWithFeedback('patch-copy-btn', state.patch.content));

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
    const parsed = updateStateFromInput();
    if (!parsed) {
      showError('patch-error', 'Invalid Commit URL');
      return;
    }

    hideError('patch-error');
    resultEl?.setAttribute('hidden', 'hidden');
    setButtonLoading(submitBtn, true, 'Get Patch', 'Fetching...');

    try {
      const patch = await fetchCommitPatch(parsed, tokenInput?.value || '');
      state.patch.content = patch;
      state.patch.filename = `${parsed.repo}-${parsed.commitSha.slice(0, 7)}.patch`;
      if (codeEl) codeEl.textContent = patch;
      resultEl?.removeAttribute('hidden');
    } catch (error) {
      showError('patch-error', error.message || 'Failed to fetch patch.');
    } finally {
      setButtonLoading(submitBtn, false, 'Get Patch');
    }
  });

  updateStateFromInput();
}

export function initGithubFavorites() {
  loadFavorites();
  hydrateDatalists();
  renderFavoritesGrid();
}
