import { getDynamicElement } from '../domain/utils';
import { fetchRepositoryTree, fetchReleaseStats, fetchCommitPatch } from '../services/githubService';
import { generateAsciiTree, generatePathList, parseGithubUrl, parseGithubCommitUrl } from '../domain/utils.js';

const FAVORITES_KEY = 'repomapper_favorites';
let inMemoryFavorites = [];
const INTENT_KEY = 'github_tools_intent';
const favoriteSubscribers = new Set();

const ROUTE_TO_VIEW = {
    'github-favorites': 'favorites',
    'repo-mapper': 'mapper',
    'release-stats': 'releases',
    'git-patch': 'gitpatch',
    'github-tools': 'home',
};

function loadFavorites() {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        inMemoryFavorites = Array.isArray(parsed) ? parsed : [];
        return [...inMemoryFavorites];
    } catch (e) {
        return [...inMemoryFavorites];
    }
}

function saveFavorites(list) {
    inMemoryFavorites = [...list];
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    } catch (e) {
        // Fallback to in-memory storage when localStorage is unavailable
    }
    notifyFavoritesUpdate(list);
}

function isFavorite(owner, repo) {
    return loadFavorites().some((f) => f.owner.toLowerCase() === owner.toLowerCase() && f.repo.toLowerCase() === repo.toLowerCase());
}

function toggleFavorite(owner, repo) {
    const favorites = loadFavorites();
    const existsIndex = favorites.findIndex(
        (f) => f.owner.toLowerCase() === owner.toLowerCase() && f.repo.toLowerCase() === repo.toLowerCase(),
    );

    if (existsIndex >= 0) {
        favorites.splice(existsIndex, 1);
    } else {
        favorites.unshift({ owner, repo, timestamp: Date.now() });
    }

    saveFavorites(favorites);
    return favorites;
}

function subscribeToFavorites(callback) {
    if (typeof callback !== 'function') return () => {};
    favoriteSubscribers.add(callback);
    return () => favoriteSubscribers.delete(callback);
}

function notifyFavoritesUpdate(favorites = []) {
    favoriteSubscribers.forEach((callback) => {
        try {
            callback([...favorites]);
        } catch (error) {
            console.error('Failed to notify favorites subscriber', error);
        }
    });
}

function getViewFromRoute(routeId = '') {
    return ROUTE_TO_VIEW[routeId.replace('#', '')] || 'home';
}

function hydrateSuggestionList(listId, favorites, suffix = '') {
    const datalist = getDynamicElement(listId);
    if (!datalist) return;
    datalist.innerHTML = '';

    favorites.forEach((fav) => {
        const option = document.createElement('option');
        option.value = `https://github.com/${fav.owner}/${fav.repo}${suffix}`;
        datalist.appendChild(option);
    });
}

function renderQuickFavorites(chipContainer, emptyState, onSelect) {
    if (!chipContainer || !emptyState) return;
    const favorites = loadFavorites();

    chipContainer.innerHTML = '';
    if (!favorites.length) {
        emptyState.style.display = 'grid';
        return;
    }

    emptyState.style.display = 'none';
    favorites.slice(0, 8).forEach((fav) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'favorite-pill';
        button.innerHTML = `
            <span class="material-symbols-outlined">star</span>
            <span>${fav.owner}/${fav.repo}</span>
        `;
        button.addEventListener('click', () => onSelect?.(fav));
        chipContainer.appendChild(button);
    });
}

function setActiveGithubView(targetView = 'home') {
    const normalized = targetView || 'home';
    const shell = document.querySelector('.github-tools-shell');
    if (shell) {
        shell.dataset.activeView = normalized;
    }

    document.querySelectorAll('[data-view-section]').forEach((section) => {
        const isMatch = section.dataset.viewSection === normalized;
        section.toggleAttribute('hidden', !isMatch);
    });

    document.querySelectorAll('[data-view-target]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.viewTarget === normalized);
    });
}

function setupGithubViewNavigation() {
    const hashView = getViewFromRoute(window.location.hash || '');
    setActiveGithubView(hashView);

    document.querySelectorAll('[data-view-target]').forEach((button) => {
        button.addEventListener('click', () => {
            const view = button.dataset.viewTarget;
            if (!view) return;
            setActiveGithubView(view);
        });
    });

    return setActiveGithubView;
}

function setFavoriteButtonState(button, isActive, label = 'Favorite', isDisabled = false) {
    if (!button) return;
    button.classList.toggle('is-active', Boolean(isActive));
    button.classList.toggle('is-disabled', Boolean(isDisabled));
    button.disabled = Boolean(isDisabled);
    button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

    const icon = button.querySelector('.material-symbols-outlined');
    const labelNode = button.querySelector('.favorite-label');

    if (icon) {
        icon.textContent = isActive ? 'star' : 'star_border';
        icon.classList.toggle('is-filled', Boolean(isActive));
    }

    if (labelNode) {
        labelNode.textContent = isActive ? 'Favorited' : label;
    }
}

function updateFavoriteButtonState(button, parsedRepo, label = 'Favorite') {
    const isDisabled = !parsedRepo;
    const isFav = parsedRepo && isFavorite(parsedRepo.owner, parsedRepo.repo);
    setFavoriteButtonState(button, Boolean(isFav), label, isDisabled);
    return isFav;
}

function validateInput(url, buttons = [], parser = parseGithubUrl) {
    const parsed = parser ? parser(url.trim()) : null;
    const isValid = Boolean(parsed);
    buttons.forEach((btn) => {
        if (!btn) return;
        btn.disabled = !isValid;
        btn.setAttribute('aria-disabled', !isValid ? 'true' : 'false');
    });
    return { parsed, isValid };
}

function initTokenToggle(buttonId, sectionId, inputId) {
    const toggleButton = getDynamicElement(buttonId);
    const section = getDynamicElement(sectionId);
    const input = getDynamicElement(inputId);
    if (!toggleButton || !section) return;

    const labelNode = toggleButton.querySelector('.token-toggle-label');
    const defaultLabel = toggleButton.dataset?.label || 'Token Settings';
    const openLabel = toggleButton.dataset?.openLabel || 'Hide token field';

    let isOpen = false;
    const syncState = () => {
        section.hidden = !isOpen;
        toggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggleButton.classList.toggle('is-open', isOpen);
        if (labelNode) {
            labelNode.textContent = isOpen ? openLabel : defaultLabel;
        }
    };

    toggleButton.addEventListener('click', () => {
        isOpen = !isOpen;
        syncState();
        if (isOpen && input && typeof input.focus === 'function') {
            setTimeout(() => input.focus(), 50);
        }
    });

    syncState();
}

function setNavigationIntent(target, url) {
    localStorage.setItem(INTENT_KEY, JSON.stringify({ target, url }));
}

function consumeNavigationIntent() {
    try {
        const stored = localStorage.getItem(INTENT_KEY);
        if (!stored) return null;
        localStorage.removeItem(INTENT_KEY);
        return JSON.parse(stored);
    } catch (e) {
        return null;
    }
}

function prefillToolInput(target, url) {
    const inputMap = {
        'repo-mapper': 'repoUrl',
        'release-stats': 'releaseUrl',
        'git-patch': 'commitUrl',
    };

    const inputId = inputMap[target];
    if (!inputId || !url) return;

    const input = getDynamicElement(inputId);
    if (input) {
        input.value = url;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function submitToolForm(target) {
    const formMap = {
        'repo-mapper': 'repoMapperForm',
        'release-stats': 'releaseStatsForm',
        'git-patch': 'gitPatchForm',
    };

    const formId = formMap[target];
    const form = formId ? getDynamicElement(formId) : null;
    if (form && typeof form.requestSubmit === 'function') {
        setTimeout(() => form.requestSubmit(), 80);
    }
}

function renderFavoritesGrid(listElement, emptyElement, onNavigate) {
    const favorites = loadFavorites();
    if (!listElement || !emptyElement) return;

    if (favorites.length === 0) {
        listElement.innerHTML = '';
        emptyElement.style.display = 'grid';
        return;
    }

    emptyElement.style.display = 'none';
    listElement.innerHTML = '';

    favorites.forEach((repo) => {
        const card = document.createElement('div');
        card.className = 'github-favorite-card';
        card.innerHTML = `
            <header>
                <div>
                    <div class="meta">
                        <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
                        <span>${repo.owner}</span>
                    </div>
                    <h3 title="${repo.repo}">${repo.repo}</h3>
                </div>
                <button type="button" class="favorite-button is-active" aria-label="Remove favorite">
                    <span class="material-symbols-outlined">star</span>
                    <span class="favorite-label">Favorited</span>
                </button>
            </header>
            <div class="actions">
                <md-filled-tonal-button class="favorite-map" data-url="https://github.com/${repo.owner}/${repo.repo}">
                    <span slot="icon" class="material-symbols-outlined">terminal</span>
                    Map
                </md-filled-tonal-button>
                <md-filled-tonal-button class="favorite-stats" data-url="https://github.com/${repo.owner}/${repo.repo}">
                    <span slot="icon" class="material-symbols-outlined">bar_chart</span>
                    Stats
                </md-filled-tonal-button>
            </div>
        `;

        const removeButton = card.querySelector('button.favorite-button');
        removeButton?.addEventListener('click', () => {
            toggleFavorite(repo.owner, repo.repo);
            renderFavoritesGrid(listElement, emptyElement, onNavigate);
        });

        const mapButton = card.querySelector('md-filled-tonal-button.favorite-map');
        mapButton?.addEventListener('click', () => onNavigate('repo-mapper', mapButton.dataset.url));

        const statsButton = card.querySelector('md-filled-tonal-button.favorite-stats');
        statsButton?.addEventListener('click', () => onNavigate('release-stats', statsButton.dataset.url));

        listElement.appendChild(card);
    });
}

function handleFavoriteToggle(button, parsedRepo, label = 'Favorite') {
    if (!button || !parsedRepo) return;
    const nextFavorites = toggleFavorite(parsedRepo.owner, parsedRepo.repo);
    const newState = isFavorite(parsedRepo.owner, parsedRepo.repo);
    setFavoriteButtonState(button, newState, label);
    return nextFavorites;
}

// Helper to show/hide elements and manage loading/error states
function updateUIState(elementId, show, content = '', isError = false) {
    const element = getDynamicElement(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
        if (content) {
            if (isError) {
                element.classList.add('error-message');
                element.classList.remove('success-message');
            } else {
                element.classList.remove('error-message');
                element.classList.add('success-message');
            }
            element.innerHTML = content;
        }
    }
}

function setLoading(buttonId, isLoading, originalText, loadingText = 'Loading...') {
    const button = getDynamicElement(buttonId);
    if (button) {
        if (isLoading) {
            button.setAttribute('data-original-text', originalText);
            button.innerHTML = `<span class="material-symbols-outlined rotating">progress_activity</span> ${loadingText}`;
            button.disabled = true;
        } else {
            button.innerHTML = button.getAttribute('data-original-text') || originalText;
            button.disabled = false;
        }
    }
}

// --- Repo Mapper ---
export function initRepoMapper() {
    const form = getDynamicElement('repoMapperForm');
    if (!form) return;

    const urlInput = getDynamicElement('repoUrl');
    const tokenInput = getDynamicElement('repoToken');
    const resultDiv = getDynamicElement('repoMapperResult');
    const outputCode = getDynamicElement('repoMapperOutput');
    const errorDiv = getDynamicElement('repoMapperError');
    const foldersSpan = getDynamicElement('repoMapperFolders');
    const filesSpan = getDynamicElement('repoMapperFiles');
    const copyButton = getDynamicElement('copyRepoMapper');
    const formatAsciiButton = getDynamicElement('formatAscii');
    const formatPathsButton = getDynamicElement('formatPaths');
    const submitButton = form.querySelector('.search-card-submit-button');
    const favoriteButton = getDynamicElement('repoFavoriteButton');

    let rawPaths = [];
    let currentFormat = 'ascii';
    let stats = { files: 0, folders: 0 };
    let parsedRepo = null;

    initTokenToggle('repoTokenToggle', 'repoTokenContainer', 'repoToken');

    const setStats = (newStats) => {
        stats = newStats;
        if (foldersSpan) foldersSpan.textContent = `${stats.folders} Folders`;
        if (filesSpan) filesSpan.textContent = `${stats.files} Files`;
    };

    const updateRepoControls = () => {
        const { parsed, isValid } = validateInput(urlInput?.value || '', [submitButton]);
        parsedRepo = parsed;
        updateFavoriteButtonState(favoriteButton, parsedRepo, 'Favorite');
        if (formatAsciiButton && formatPathsButton) {
            const disabledClass = 'is-disabled';
            [formatAsciiButton, formatPathsButton].forEach((btn) => {
                btn.classList.toggle(disabledClass, !isValid);
                btn.disabled = !isValid && btn.tagName === 'BUTTON';
            });
        }
    };

    const updateOutput = () => {
        if (rawPaths.length > 0) {
            let output = '';
            if (currentFormat === 'ascii') {
                output = generateAsciiTree(rawPaths, setStats);
            } else {
                output = generatePathList(rawPaths, setStats);
            }
            if (outputCode) outputCode.textContent = output;
            updateUIState('repoMapperResult', true);
        } else {
            updateUIState('repoMapperResult', false);
        }
    };

    updateRepoControls();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        updateUIState('repoMapperError', false);
        updateUIState('repoMapperResult', false);
        setLoading(submitButton.id, true, 'Generate Map');

        const url = urlInput.value.trim();
        const token = tokenInput.value;
        const parsed = parseGithubUrl(url);

        if (!parsed) {
            updateUIState('repoMapperError', true, 'Invalid GitHub URL. Expected format: https://github.com/owner/repo', true);
            setLoading(submitButton.id, false, 'Generate Map');
            updateRepoControls();
            return;
        }

        parsedRepo = parsed;
        updateRepoControls();

        try {
            const data = await fetchRepositoryTree(parsed, token);
            rawPaths = data.tree;
            if (data.truncated) {
                updateUIState('repoMapperError', true, 'Warning: The repository is massive. Output truncated by GitHub API.', false);
            }
            updateOutput();
        } catch (err) {
            updateUIState('repoMapperError', true, err.message, true);
        } finally {
            setLoading(submitButton.id, false, 'Generate Map');
            updateRepoControls();
        }
    });

    formatAsciiButton.addEventListener('click', () => {
        currentFormat = 'ascii';
        formatAsciiButton.classList.add('active');
        formatPathsButton.classList.remove('active');
        updateOutput();
    });

    formatPathsButton.addEventListener('click', () => {
        currentFormat = 'paths';
        formatPathsButton.classList.add('active');
        formatAsciiButton.classList.remove('active');
        updateOutput();
    });

    copyButton.addEventListener('click', () => {
        if (outputCode && outputCode.textContent) {
            navigator.clipboard.writeText(outputCode.textContent).then(() => {
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '<span class="material-symbols-outlined check_circle">check_circle</span> Copied';
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                }, 2000);
            });
        }
    });

    urlInput?.addEventListener('input', updateRepoControls);

    favoriteButton?.addEventListener('click', () => {
        if (!parsedRepo || favoriteButton.disabled) return;
        handleFavoriteToggle(favoriteButton, parsedRepo);
    });

    const intent = consumeNavigationIntent();
    if (intent?.target === 'repo-mapper' && intent.url && urlInput) {
        urlInput.value = intent.url;
        parsedRepo = parseGithubUrl(intent.url);
        updateRepoControls();
        setTimeout(() => form.requestSubmit(), 50);
    }
}

// --- Release Stats ---
export function initReleaseStats() {
    const form = getDynamicElement('releaseStatsForm');
    if (!form) return;

    const urlInput = getDynamicElement('releaseUrl');
    const tokenInput = getDynamicElement('releaseToken');
    const resultDiv = getDynamicElement('releaseStatsResult');
    const errorDiv = getDynamicElement('releaseStatsError');
    const submitButton = form.querySelector('.search-card-submit-button');
    const favoriteButton = getDynamicElement('releaseFavoriteButton');
    const releaseRepoChip = getDynamicElement('releaseRepoChip');
    const releaseDownloadsChip = getDynamicElement('releaseDownloadsChip');

    const selectedReleaseName = getDynamicElement('selectedReleaseName');
    const selectedReleaseMeta = getDynamicElement('selectedReleaseMeta');
    const selectedReleaseDownloads = getDynamicElement('selectedReleaseDownloads');
    const selectedReleaseAssets = getDynamicElement('selectedReleaseAssets');
    const totalDownloads = getDynamicElement('totalDownloads');
    const totalReleases = getDynamicElement('totalReleases');
    const releaseList = getDynamicElement('releaseList');

    let currentData = null;
    let selectedReleaseIndex = 0;
    let parsedRepo = null;

    initTokenToggle('releaseTokenToggle', 'releaseTokenContainer', 'releaseToken');

    const syncReleaseSummary = () => {
        if (releaseRepoChip) {
            const text = releaseRepoChip.querySelector('.chip-text');
            if (text) {
                text.textContent = parsedRepo ? `${parsedRepo.owner}/${parsedRepo.repo}` : 'Repository';
            }
        }
        if (releaseDownloadsChip) {
            const text = releaseDownloadsChip.querySelector('.chip-text');
            if (text) {
                const downloads = currentData ? currentData.totalDownloads.toLocaleString() : '—';
                text.textContent = currentData ? `${downloads} downloads` : 'Awaiting data';
            }
        }
    };

    const updateReleaseControls = () => {
        const { parsed, isValid } = validateInput(urlInput?.value || '', [submitButton]);
        parsedRepo = parsed;
        updateFavoriteButtonState(favoriteButton, parsedRepo, 'Favorite');
        syncReleaseSummary();
    };

    const renderReleaseDetails = () => {
        if (!currentData || !currentData.releases || currentData.releases.length === 0) return;

        const activeRelease = currentData.releases[selectedReleaseIndex];
        if (!activeRelease) return;

        if (selectedReleaseName) selectedReleaseName.textContent = activeRelease.name || activeRelease.tagName;
        if (selectedReleaseMeta) {
            selectedReleaseMeta.innerHTML = `
                <span class="material-symbols-outlined">label</span>
                <span>${activeRelease.tagName}</span>
                <span>•</span>
                <span>${new Date(activeRelease.publishedAt).toLocaleDateString()}</span>
            `;
        }
        if (selectedReleaseDownloads) {
            selectedReleaseDownloads.innerHTML = `
                <span class="text-[#cac4d0] font-medium">Downloads</span>
                <span class="text-2xl font-bold text-[#e6e1e5]">${activeRelease.totalDownloads.toLocaleString()}</span>
            `;
        }

        if (selectedReleaseAssets) {
            selectedReleaseAssets.innerHTML = '';
            if (activeRelease.assets.length === 0) {
                selectedReleaseAssets.innerHTML = '<div class="text-center py-8 text-[#cac4d0] italic">No assets in this release.</div>';
            } else {
                const maxAssetDownloads = Math.max(...activeRelease.assets.map(a => a.downloads));
                activeRelease.assets.forEach(asset => {
                    const assetDiv = document.createElement('div');
                    assetDiv.className = 'group';
                    assetDiv.innerHTML = `
                        <div class="flex justify-between text-sm mb-1.5">
                            <span class="text-[#e6e1e5] font-medium truncate max-w-[70%]">${asset.name}</span>
                            <span class="text-[#cac4d0]">${asset.downloads.toLocaleString()}</span>
                        </div>
                        <div class="h-2 w-full bg-[#49454f]/40 rounded-full overflow-hidden">
                            <div 
                                class="h-full bg-[#e6e1e5] rounded-full"
                                style="width: ${maxAssetDownloads > 0 ? (asset.downloads / maxAssetDownloads) * 100 : 0}%"
                            ></div>
                        </div>
                    `;
                    selectedReleaseAssets.appendChild(assetDiv);
                });
            }
        }
    };

    const renderReleaseList = () => {
        if (!currentData || !currentData.releases || currentData.releases.length === 0) return;

        if (totalDownloads) totalDownloads.textContent = currentData.totalDownloads.toLocaleString();
        if (totalReleases) totalReleases.textContent = `${currentData.releases.length} Found`;
        syncReleaseSummary();

        if (releaseList) {
            releaseList.innerHTML = '';
            const maxReleaseDownloads = Math.max(...currentData.releases.map(r => r.totalDownloads));

            currentData.releases.forEach((release, idx) => {
                const isSelected = idx === selectedReleaseIndex;
                const button = document.createElement('button');
                button.className = `w-full text-left p-3 rounded-xl transition-all border ${
                    isSelected 
                        ? 'bg-[#e6e1e5] border-[#e6e1e5] text-[#141218]' 
                        : 'bg-transparent border-transparent hover:bg-[#2b2930] text-[#cac4d0]'
                }`;
                button.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium truncate max-w-[60%] ${isSelected ? 'text-black' : 'text-[#e6e1e5]'}">
                            ${release.name || release.tagName}
                        </span>
                        <span class="text-sm ${isSelected ? 'text-black/70' : 'text-[#cac4d0]'}">
                            ${release.totalDownloads.toLocaleString()}
                        </span>
                    </div>
                    <div class="h-1 w-full rounded-full overflow-hidden ${isSelected ? 'bg-black/10' : 'bg-[#49454f]/40'}">
                        <div 
                            class="h-full rounded-full ${isSelected ? 'bg-black' : 'bg-[#cac4d0]'}"
                            style="width: ${maxReleaseDownloads > 0 ? (release.totalDownloads / maxReleaseDownloads) * 100 : 0}%"
                        ></div>
                    </div>
                `;
                button.addEventListener('click', () => {
                    selectedReleaseIndex = idx;
                    renderReleaseList();
                    renderReleaseDetails();
                });
                releaseList.appendChild(button);
            });
        }
    };

    updateReleaseControls();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        updateUIState('releaseStatsError', false);
        updateUIState('releaseStatsResult', false);
        setLoading(submitButton.id, true, 'Analyze');

        const url = urlInput.value.trim();
        const token = tokenInput.value;
        const parsed = parseGithubUrl(url);

        if (!parsed) {
            updateUIState('releaseStatsError', true, 'Invalid GitHub URL. Format: https://github.com/owner/repo', true);
            setLoading(submitButton.id, false, 'Analyze');
            updateReleaseControls();
            return;
        }

        parsedRepo = parsed;
        updateReleaseControls();

        try {
            currentData = await fetchReleaseStats(parsed, token);
            selectedReleaseIndex = 0; // Reset to latest
            renderReleaseList();
            renderReleaseDetails();
            updateUIState('releaseStatsResult', true);
            syncReleaseSummary();
        } catch (err) {
            updateUIState('releaseStatsError', true, err.message, true);
        } finally {
            setLoading(submitButton.id, false, 'Analyze');
            updateReleaseControls();
        }
    });

    urlInput?.addEventListener('input', updateReleaseControls);

    favoriteButton?.addEventListener('click', () => {
        if (!parsedRepo || favoriteButton.disabled) return;
        handleFavoriteToggle(favoriteButton, parsedRepo);
    });

    const intent = consumeNavigationIntent();
    if (intent?.target === 'release-stats' && intent.url && urlInput) {
        urlInput.value = intent.url;
        parsedRepo = parseGithubUrl(intent.url);
        updateReleaseControls();
        setTimeout(() => form.requestSubmit(), 50);
    }
}

// --- Git Patch ---
export function initGitPatch() {
    const form = getDynamicElement('gitPatchForm');
    if (!form) return;

    const urlInput = getDynamicElement('commitUrl');
    const tokenInput = getDynamicElement('patchToken');
    const resultDiv = getDynamicElement('gitPatchResult');
    const outputCode = getDynamicElement('patchContent');
    const errorDiv = getDynamicElement('gitPatchError');
    const copyButton = getDynamicElement('copyPatch');
    const downloadButton = getDynamicElement('downloadPatch');
    const submitButton = form.querySelector('.search-card-submit-button');
    const favoriteButton = getDynamicElement('gitPatchFavoriteButton');

    initTokenToggle('gitPatchTokenToggle', 'gitPatchTokenContainer', 'patchToken');

    let parsedRepo = null;

    const updatePatchControls = () => {
        const { parsed, isValid } = validateInput(urlInput?.value || '', [submitButton], parseGithubCommitUrl);
        parsedRepo = parsed ? { owner: parsed.owner, repo: parsed.repo } : null;
        updateFavoriteButtonState(favoriteButton, parsedRepo, 'Favorite');
    };

    updatePatchControls();

    let patchContent = '';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        updateUIState('gitPatchError', false);
        updateUIState('gitPatchResult', false);
        setLoading(submitButton.id, true, 'Get Patch');

        const url = urlInput.value.trim();
        const token = tokenInput.value;
        const parsed = parseGithubCommitUrl(url);

        if (!parsed) {
            updateUIState('gitPatchError', true, 'Invalid Commit URL. Format: https://github.com/owner/repo/commit/sha', true);
            setLoading(submitButton.id, false, 'Get Patch');
            return;
        }

        parsedRepo = { owner: parsed.owner, repo: parsed.repo };
        updatePatchControls();

        try {
            patchContent = await fetchCommitPatch(parsed, token);
            if (outputCode) outputCode.textContent = patchContent;
            updateUIState('gitPatchResult', true);
        } catch (err) {
            updateUIState('gitPatchError', true, err.message, true);
        } finally {
            setLoading(submitButton.id, false, 'Get Patch');
        }
    });

    urlInput?.addEventListener('input', updatePatchControls);

    favoriteButton?.addEventListener('click', () => {
        if (!parsedRepo || favoriteButton.disabled) return;
        handleFavoriteToggle(favoriteButton, parsedRepo);
    });

    copyButton.addEventListener('click', () => {
        if (patchContent) {
            navigator.clipboard.writeText(patchContent).then(() => {
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '<span class="material-symbols-outlined check_circle">check_circle</span> Copied';
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                }, 2000);
            });
        }
    });

    downloadButton.addEventListener('click', () => {
        if (!patchContent) return;
        const blob = new Blob([patchContent], { type: 'text/plain' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        const parsed = parseGithubCommitUrl(urlInput.value);
        const filename = parsed ? `${parsed.repo}-${parsed.commitSha.substring(0, 7)}.patch` : 'git-patch.patch';
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    });
}

export function initGithubFavorites(options = {}) {
    const listEl = getDynamicElement('githubFavoritesList');
    const emptyEl = getDynamicElement('githubFavoritesEmpty');
    if (!listEl || !emptyEl) return;

    const onNavigate = typeof options.onNavigate === 'function'
        ? options.onNavigate
        : (target, url) => {
              setNavigationIntent(target, url);
              window.location.hash = `#${target}`;
          };

    renderFavoritesGrid(listEl, emptyEl, onNavigate);
}

export function initGithubTools() {
    const setView = setupGithubViewNavigation();

    const quickFavoritesContainer = getDynamicElement('homeFavoritesChips');
    const quickFavoritesEmpty = getDynamicElement('homeFavoritesEmpty');

    const refreshFavoriteDrivenUI = (favorites = loadFavorites()) => {
        renderQuickFavorites(quickFavoritesContainer, quickFavoritesEmpty, (fav) => {
            const url = `https://github.com/${fav.owner}/${fav.repo}`;
            setNavigationIntent('repo-mapper', url);
            setView('mapper');
            prefillToolInput('repo-mapper', url);
            submitToolForm('repo-mapper');
        });

        hydrateSuggestionList('repoUrlSuggestions', favorites);
        hydrateSuggestionList('releaseUrlSuggestions', favorites);
        hydrateSuggestionList('commitUrlSuggestions', favorites, '/commit/');
    };

    refreshFavoriteDrivenUI();
    subscribeToFavorites(refreshFavoriteDrivenUI);

    initRepoMapper();
    initReleaseStats();
    initGitPatch();

    initGithubFavorites({
        onNavigate: (target, url) => {
            const view = getViewFromRoute(target);
            setView(view);
            if (url) {
                setNavigationIntent(target, url);
                prefillToolInput(target, url);
                submitToolForm(target);
            }
        },
    });

    const initialView = getViewFromRoute(window.location.hash || '');
    setView(initialView);
}
