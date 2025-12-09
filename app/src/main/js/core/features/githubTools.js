import { copyToClipboard } from '../../services/clipboardService.js';
import { downloadJson, downloadText } from '../../services/downloadService.js';
import {
  fetchCommitPatch,
  fetchReleaseStats,
  fetchRepositoryTree,
} from '../../services/githubService.js';

const FAVORITES_KEY = 'github_tool_favorites';
const PREFILL_KEY = 'github_tool_prefill';

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

function parseCommitInput(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`;

  try {
    const url = new URL(normalized);
    const parts = url.pathname.split('/').filter(Boolean);
    const commitIndex = parts.findIndex((part) => part === 'commit');
    if (commitIndex >= 2 && parts[commitIndex + 1]) {
      return {
        owner: parts[commitIndex - 2],
        repo: parts[commitIndex - 1],
        commitSha: parts[commitIndex + 1],
      };
    }
  } catch (error) {
    /* noop */
  }

  const fallback = trimmed.replace(/^https?:\/\/github.com\//i, '').split('@');
  const slug = normalizeRepoSlug(fallback[0]);
  const sha = fallback[1];
  if (slug && sha) {
    const [owner, repo] = slug.split('/');
    return { owner, repo, commitSha: sha };
  }

  return null;
}

function consumePrefill(tool) {
  try {
    const stored = sessionStorage.getItem(PREFILL_KEY);
    if (!stored) return '';
    const parsed = JSON.parse(stored);
    if (parsed?.tool === tool && parsed?.slug) {
      sessionStorage.removeItem(PREFILL_KEY);
      return parsed.slug;
    }
  } catch (error) {
    /* noop */
  }
  return '';
}

function savePrefill(tool, slug) {
  if (!tool || !slug) return;
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ tool, slug }));
  } catch (error) {
    console.warn('GitHubTools: Unable to persist prefill state.', error);
  }
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

function buildRepoTreeModel(tree = []) {
  const root = { name: '', type: 'tree', children: new Map() };
  const folderSet = new Set();
  let fileCount = 0;

  const sortedEntries = [...tree].sort((a, b) => a.path.localeCompare(b.path));

  sortedEntries.forEach((entry) => {
    if (!entry?.path) return;

    const parts = entry.path.split('/').filter(Boolean);
    if (!parts.length) return;
    const isDirectory = entry.type === 'tree';

    for (let i = 0; i < parts.length - (isDirectory ? 0 : 1); i += 1) {
      folderSet.add(parts.slice(0, i + 1).join('/'));
    }
    if (isDirectory) {
      folderSet.add(entry.path);
    } else {
      fileCount += 1;
    }

    let cursor = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      const nodeType = isLeaf && !isDirectory ? 'file' : 'tree';
      if (!cursor.children.has(part)) {
        cursor.children.set(part, { name: part, type: nodeType, children: new Map() });
      }
      cursor = cursor.children.get(part);
    });
  });

  return { root, fileCount, folderCount: folderSet.size };
}

function sortTreeChildren(node) {
  return [...node.children.values()].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'tree' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

function renderAsciiTree(treeModel) {
  const traverse = (node, prefix = '') => {
    const children = sortTreeChildren(node);
    return children.flatMap((child, index) => {
      const isLast = index === children.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      const line = `${prefix}${connector}${child.name}`;
      if (child.children.size === 0) {
        return [line];
      }
      return [line, ...traverse(child, nextPrefix)];
    });
  };

  return traverse(treeModel.root).join('\n');
}

function renderPathList(tree = []) {
  return tree
    .filter((entry) => entry?.path)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((entry) => entry.path)
    .join('\n');
}

function formatReleaseSummary(data) {
  return {
    repository: `${data.owner}/${data.repo}`,
    totalDownloads: data.totalDownloads,
    releases: data.releases.map((release) => ({
      name: release.name,
      tag: release.tagName,
      publishedAt: release.publishedAt,
      downloads: release.totalDownloads,
      assets: release.assets.map((asset) => ({
        name: asset.name,
        downloads: asset.downloads,
        browserDownloadUrl: asset.browserDownloadUrl,
      })),
    })),
  };
}

function formatReleaseCsv(data) {
  const rows = [
    ['Release', 'Tag', 'Published', 'Total Downloads', 'Asset', 'Asset Downloads'],
  ];

  data.releases.forEach((release) => {
    if (!release.assets.length) {
      rows.push([
        release.name,
        release.tagName,
        release.publishedAt,
        release.totalDownloads,
        '—',
        0,
      ]);
      return;
    }

    release.assets.forEach((asset) => {
      rows.push([
        release.name,
        release.tagName,
        release.publishedAt,
        release.totalDownloads,
        asset.name,
        asset.downloads,
      ]);
    });
  });

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? '';
          const safe = String(value).replace(/"/g, '""');
          return `"${safe}"`;
        })
        .join(','),
    )
    .join('\n');
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
      <div class="gh-favorite-meta">
        <div class="gh-favorite-icon" aria-hidden="true">
          <span class="material-symbols-outlined">hub</span>
        </div>
        <div>
          <p class="gh-subtext">Saved repository</p>
          <h3>${slug}</h3>
          <p class="gh-muted">Launch Repo Mapper or Release Stats with one tap.</p>
        </div>
        <button class="gh-icon-button ghost" type="button" data-remove-favorite aria-label="Unfavorite ${slug}">
          <span class="material-symbols-outlined">star</span>
        </button>
      </div>
      <div class="gh-favorite-actions">
        <button class="gh-button primary" type="button" data-open-mapper>
          <span class="material-symbols-outlined">terminal</span>
          <span>Map</span>
        </button>
        <button class="gh-button secondary" type="button" data-open-stats>
          <span class="material-symbols-outlined">bar_chart</span>
          <span>Stats</span>
        </button>
        <a class="gh-ghost-button" href="https://github.com/${slug}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined">open_in_new</span>
          <span>Open</span>
        </a>
      </div>
    `;
    const removeBtn = card.querySelector('[data-remove-favorite]');
    removeBtn?.addEventListener('click', () => {
      toggleFavorite(slug);
    });

    const mapperBtn = card.querySelector('[data-open-mapper]');
    mapperBtn?.addEventListener('click', () => {
      savePrefill('mapper', slug);
      window.location.hash = '#repo-mapper';
    });

    const statsBtn = card.querySelector('[data-open-stats]');
    statsBtn?.addEventListener('click', () => {
      savePrefill('releases', slug);
      window.location.hash = '#release-stats';
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
    button.toggleAttribute('selected', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'Remove favorite' : 'Save favorite');
    button.title = active ? 'Remove favorite' : 'Save favorite';
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

function setupRepoMapperForm() {
  const form = document.getElementById('mapper-form');
  const urlField = document.getElementById('mapper-url');
  const errorEl = document.getElementById('mapper-url-error');
  const submitButton = document.getElementById('mapper-submit');

  if (!form || !urlField || !submitButton) return;

  const hideError = () => {
    if (errorEl) {
      errorEl.hidden = true;
    }
  };

  const showError = (message) => {
    if (!errorEl) return;
    errorEl.hidden = false;
    if (message) {
      errorEl.textContent = message;
    }
  };

  const validate = () => {
    const slug = normalizeRepoSlug(urlField.value);
    const isValid = !!slug;
    submitButton.disabled = !isValid;
    if (errorEl) {
      const hasText = !!urlField.value.trim();
      errorEl.hidden = isValid || !hasText;
    }
    return { slug, isValid };
  };

  urlField.addEventListener('input', () => {
    hideError();
    validate();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { slug, isValid } = validate();
    if (!isValid) {
      showError('Invalid repository URL.');
      urlField.focus();
      return;
    }

    form.dataset.repoSlug = slug;
    form.dispatchEvent(
      new CustomEvent('repo-mapper:submit', {
        bubbles: true,
        detail: { slug },
      }),
    );
  });

  validate();
}

function setupReleaseStatsForm() {
  const form = document.getElementById('releases-form');
  const urlField = document.getElementById('releases-url');
  const errorEl = document.getElementById('releases-url-error');
  const submitButton = document.getElementById('releases-submit');

  if (!form || !urlField || !submitButton) return;

  const hideError = () => {
    if (errorEl) errorEl.hidden = true;
  };

  const showError = (message) => {
    if (!errorEl) return;
    errorEl.hidden = false;
    if (message) errorEl.textContent = message;
  };

  const validate = () => {
    const slug = normalizeRepoSlug(urlField.value);
    const isValid = !!slug;
    submitButton.disabled = !isValid;
    if (errorEl) {
      const hasText = !!urlField.value.trim();
      errorEl.hidden = isValid || !hasText;
    }
    return { slug, isValid };
  };

  urlField.addEventListener('input', () => {
    hideError();
    validate();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { slug, isValid } = validate();
    if (!isValid) {
      showError('Invalid repository URL.');
      urlField.focus();
      return;
    }

    form.dataset.repoSlug = slug;
    form.dispatchEvent(
      new CustomEvent('release-stats:submit', {
        bubbles: true,
        detail: { slug },
      }),
    );
  });

  validate();
}

function setupPatchForm() {
  const form = document.getElementById('patch-form');
  const urlField = document.getElementById('patch-url');
  const errorEl = document.getElementById('patch-url-error');
  const submitButton = document.getElementById('patch-submit');

  if (!form || !urlField || !submitButton) return;

  const hideError = () => {
    if (errorEl) errorEl.hidden = true;
  };

  const showError = (message) => {
    if (!errorEl) return;
    errorEl.hidden = false;
    if (message) errorEl.textContent = message;
  };

  const validate = () => {
    const parsed = parseCommitInput(urlField.value);
    const isValid = !!parsed;
    submitButton.disabled = !isValid;
    if (errorEl) {
      const hasText = !!urlField.value.trim();
      errorEl.hidden = isValid || !hasText;
    }
    return { parsed, isValid };
  };

  urlField.addEventListener('input', () => {
    hideError();
    validate();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { parsed, isValid } = validate();
    if (!isValid) {
      showError('Invalid commit URL.');
      urlField.focus();
      return;
    }

    form.dataset.commitSlug = `${parsed.owner}/${parsed.repo}@${parsed.commitSha}`;
    form.dispatchEvent(
      new CustomEvent('git-patch:submit', {
        bubbles: true,
        detail: parsed,
      }),
    );
  });

  validate();
}

function setButtonBusy(button, busy) {
  if (!button) return () => {};
  const originalLabel = button.innerHTML;
  button.disabled = true;
  if (busy) {
    button.classList.add('is-loading');
    button.innerHTML = busy;
  }
  return () => {
    button.disabled = false;
    button.classList.remove('is-loading');
    button.innerHTML = originalLabel;
  };
}

function renderError(containerId, message) {
  const wrapper = document.getElementById(containerId);
  if (!wrapper) return;
  const text = wrapper.querySelector('[data-error-text]');
  if (text && message) {
    text.textContent = message;
  }
  wrapper.hidden = false;
}

function clearError(containerId) {
  const wrapper = document.getElementById(containerId);
  if (wrapper) {
    wrapper.hidden = true;
  }
}

function formatDate(value) {
  if (!value) return 'Unknown date';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return value;
  }
}

function initGhToolsPage({
  tokenControls,
  favoriteControl,
} = {}) {
  const page = document.querySelector('.gh-tools-page');
  if (!page) return null;
  if (page.dataset.ghToolsInitialized === 'true') return page;

  if (tokenControls) {
    wireTokenControls(tokenControls);
  }

  if (favoriteControl) {
    setupFavoriteButton(favoriteControl.buttonId, favoriteControl.inputId);
  }

  hydrateInputs(page);
  page.dataset.ghToolsInitialized = 'true';
  return page;
}

function initRepoMapper() {
  const page = initGhToolsPage({
    tokenControls: {
      toggleButtonId: 'mapper-token-reveal',
      wrapperId: 'mapper-token-wrapper',
      fieldId: 'mapper-token',
      visibilityToggleId: 'mapper-token-toggle',
    },
    favoriteControl: { buttonId: 'mapper-fav-btn', inputId: 'mapper-url' },
  });
  if (!page) return;
  setupRepoMapperForm();

  const form = document.getElementById('mapper-form');
  const urlField = document.getElementById('mapper-url');
  const tokenField = document.getElementById('mapper-token');
  const codeEl = document.getElementById('mapper-code');
  const resultEl = document.getElementById('mapper-result');
  const copyBtn = document.getElementById('mapper-copy-btn');
  const fileCountEl = document.getElementById('mapper-stats-files');
  const folderCountEl = document.getElementById('mapper-stats-folders');
  const asciiBtn = document.getElementById('btn-format-ascii');
  const pathsBtn = document.getElementById('btn-format-paths');
  const submitButton = document.getElementById('mapper-submit');

  if (!form || !codeEl || !resultEl || !asciiBtn || !pathsBtn) return;

  let currentFormat = 'ascii';
  let currentTree = [];

  const updateFormatButtons = () => {
    asciiBtn.classList.toggle('active', currentFormat === 'ascii');
    pathsBtn.classList.toggle('active', currentFormat === 'paths');
  };

  const renderOutput = () => {
    if (!currentTree.length) return;
    const model = buildRepoTreeModel(currentTree);
    if (fileCountEl) fileCountEl.textContent = model.fileCount.toLocaleString();
    if (folderCountEl) folderCountEl.textContent = model.folderCount.toLocaleString();
    const output =
      currentFormat === 'paths' ? renderPathList(currentTree) : renderAsciiTree(model);
    codeEl.textContent = output;
    clearError('mapper-error');
    resultEl.hidden = false;
  };

  const handleSubmit = async (slug) => {
    clearError('mapper-error');
    resultEl.hidden = true;
    codeEl.textContent = '';

    const [owner, repo] = slug.split('/');
    const stopLoading = setButtonBusy(
      submitButton,
      '<span class="gh-rolling material-symbols-outlined">progress_activity</span> Generating…',
    );

    try {
      const { tree } = await fetchRepositoryTree({ owner, repo }, tokenField?.value?.trim());
      currentTree = tree;
      renderOutput();
    } catch (error) {
      renderError('mapper-error', error.message);
    } finally {
      stopLoading();
    }
  };

  form.addEventListener('repo-mapper:submit', (event) => {
    handleSubmit(event.detail.slug);
  });

  asciiBtn.addEventListener('click', () => {
    currentFormat = 'ascii';
    updateFormatButtons();
    renderOutput();
  });

  pathsBtn.addEventListener('click', () => {
    currentFormat = 'paths';
    updateFormatButtons();
    renderOutput();
  });

  copyBtn?.addEventListener('click', () => {
    if (codeEl.textContent) {
      copyToClipboard(codeEl.textContent);
    }
  });

  const prefillSlug = consumePrefill('mapper');
  if (prefillSlug && urlField) {
    urlField.value = prefillSlug;
    urlField.dispatchEvent(new Event('input'));
  }
}

function initReleaseStats() {
  const page = initGhToolsPage({
    tokenControls: {
      toggleButtonId: 'releases-token-reveal',
      wrapperId: 'releases-token-wrapper',
      fieldId: 'releases-token',
      visibilityToggleId: 'releases-token-toggle',
    },
    favoriteControl: { buttonId: 'releases-fav-btn', inputId: 'releases-url' },
  });
  if (!page) return;

  setupReleaseStatsForm();

  const form = document.getElementById('releases-form');
  const urlField = document.getElementById('releases-url');
  const tokenField = document.getElementById('releases-token');
  const totalDownloadsEl = document.getElementById('rel-total-downloads');
  const totalDownloadsBadge = document.getElementById('rel-total-downloads-pill');
  const releaseCountEl = document.getElementById('rel-count');
  const releaseListEl = document.getElementById('rel-list');
  const assetsListEl = document.getElementById('rel-assets-list');
  const detailNameEl = document.getElementById('rel-detail-name');
  const detailTagEl = document.getElementById('rel-detail-tag');
  const detailDateEl = document.getElementById('rel-detail-date');
  const detailDownloadsEl = document.getElementById('rel-detail-downloads');
  const copyJsonBtn = document.getElementById('rel-copy-json');
  const downloadJsonBtn = document.getElementById('rel-download-json');
  const copyCsvBtn = document.getElementById('rel-copy-csv');
  const downloadCsvBtn = document.getElementById('rel-download-csv');
  const submitButton = document.getElementById('releases-submit');
  const resultEl = document.getElementById('releases-result');

  if (!form || !releaseListEl || !assetsListEl || !resultEl) return;

  let releaseData = null;

  const renderReleaseDetail = (release) => {
    if (!release) return;
    detailNameEl.textContent = release.name || release.tagName;
    detailTagEl.textContent = release.tagName;
    detailDateEl.textContent = formatDate(release.publishedAt);
    detailDownloadsEl.textContent = release.totalDownloads.toLocaleString();

    assetsListEl.innerHTML = '';
    if (!release.assets.length) {
      assetsListEl.innerHTML = '<p class="gh-muted">No assets for this release.</p>';
      return;
    }

    release.assets.forEach((asset) => {
      const row = document.createElement('div');
      row.className = 'gh-asset-row';
      row.innerHTML = `
        <div>
          <p class="gh-asset-name">${asset.name}</p>
          <p class="gh-subtext">${asset.downloads.toLocaleString()} downloads</p>
        </div>
        <a class="gh-asset-link" href="${asset.browserDownloadUrl}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined">download</span>
          <span>Download</span>
        </a>
      `;
      assetsListEl.appendChild(row);
    });
  };

  const renderReleaseList = (selectedTag) => {
    if (!releaseData) return;
    releaseListEl.innerHTML = '';

    releaseData.releases.forEach((release) => {
      const button = document.createElement('button');
      const isActive = selectedTag ? release.tagName === selectedTag : false;
      button.className = isActive ? 'active' : '';
      button.innerHTML = `
        <div class="gh-release-bar">
          <span>${release.name || release.tagName}</span>
          <span class="gh-muted">${release.totalDownloads.toLocaleString()} downloads</span>
        </div>
      `;
      button.addEventListener('click', () => {
        releaseListEl.querySelectorAll('button').forEach((btn) =>
          btn.classList.toggle('active', btn === button),
        );
        renderReleaseDetail(release);
      });
      releaseListEl.appendChild(button);
    });

    const firstRelease = releaseData.releases[0];
    if (firstRelease) {
      renderReleaseDetail(firstRelease);
      const firstBtn = releaseListEl.querySelector('button');
      firstBtn?.classList.add('active');
    }
  };

  const renderResult = (data) => {
    releaseData = data;
    const totalText = data.totalDownloads.toLocaleString();
    if (totalDownloadsEl) totalDownloadsEl.textContent = totalText;
    if (totalDownloadsBadge) totalDownloadsBadge.textContent = totalText;
    if (releaseCountEl) {
      releaseCountEl.textContent = data.releases.length.toLocaleString();
    }
    renderReleaseList();
    clearError('releases-error');
    resultEl.hidden = false;
  };

  const handleSubmit = async (slug) => {
    resultEl.hidden = true;
    clearError('releases-error');
    const [owner, repo] = slug.split('/');
    const stopLoading = setButtonBusy(
      submitButton,
      '<span class="gh-rolling material-symbols-outlined">progress_activity</span> Analyzing…',
    );

    try {
      const data = await fetchReleaseStats(
        { owner, repo },
        tokenField?.value?.trim(),
      );
      renderResult(data);
    } catch (error) {
      renderError('releases-error', error.message);
    } finally {
      stopLoading();
    }
  };

  form.addEventListener('release-stats:submit', (event) => {
    handleSubmit(event.detail.slug);
  });

  copyJsonBtn?.addEventListener('click', () => {
    if (!releaseData) return;
    copyToClipboard(JSON.stringify(formatReleaseSummary(releaseData), null, 2));
  });

  downloadJsonBtn?.addEventListener('click', () => {
    if (!releaseData) return;
    downloadJson('release-stats.json', JSON.stringify(formatReleaseSummary(releaseData), null, 2));
  });

  copyCsvBtn?.addEventListener('click', () => {
    if (!releaseData) return;
    copyToClipboard(formatReleaseCsv(releaseData));
  });

  downloadCsvBtn?.addEventListener('click', () => {
    if (!releaseData) return;
    downloadText('release-stats.csv', formatReleaseCsv(releaseData), 'text/csv');
  });

  const prefillSlug = consumePrefill('releases');
  if (prefillSlug && urlField) {
    urlField.value = prefillSlug;
    urlField.dispatchEvent(new Event('input'));
  }
}

function initGitPatch() {
  const page = initGhToolsPage({
    tokenControls: {
      toggleButtonId: 'patch-token-reveal',
      wrapperId: 'patch-token-wrapper',
      fieldId: 'patch-token',
      visibilityToggleId: 'patch-token-toggle',
    },
    favoriteControl: { buttonId: 'patch-fav-btn', inputId: 'patch-url' },
  });
  if (!page) return;

  setupPatchForm();

  const form = document.getElementById('patch-form');
  const codeEl = document.getElementById('patch-code');
  const resultEl = document.getElementById('patch-result');
  const tokenField = document.getElementById('patch-token');
  const copyBtn = document.getElementById('patch-copy-btn');
  const downloadBtn = document.getElementById('patch-download-btn');
  const submitButton = document.getElementById('patch-submit');

  if (!form || !codeEl || !resultEl) return;

  const handleSubmit = async (detail) => {
    clearError('patch-error');
    resultEl.hidden = true;
    codeEl.textContent = '';

    const stopLoading = setButtonBusy(
      submitButton,
      '<span class="gh-rolling material-symbols-outlined">progress_activity</span> Fetching…',
    );

    try {
      const patch = await fetchCommitPatch(detail, tokenField?.value?.trim());
      codeEl.textContent = patch;
      resultEl.hidden = false;
    } catch (error) {
      renderError('patch-error', error.message);
    } finally {
      stopLoading();
    }
  };

  form.addEventListener('git-patch:submit', (event) => {
    handleSubmit(event.detail);
  });

  copyBtn?.addEventListener('click', () => {
    if (codeEl.textContent) {
      copyToClipboard(codeEl.textContent);
    }
  });

  downloadBtn?.addEventListener('click', () => {
    if (codeEl.textContent) {
      downloadText('commit.patch', codeEl.textContent, 'text/x-patch');
    }
  });
}

function initFavoritesPage() {
  renderFavoritesPage();
}

export {
  buildRepoTreeModel,
  consumePrefill,
  formatReleaseCsv,
  formatReleaseSummary,
  initFavoritesPage,
  initGitPatch,
  initReleaseStats,
  initRepoMapper,
  normalizeRepoSlug,
  parseCommitInput,
  renderAsciiTree,
  renderPathList,
  savePrefill,
};
