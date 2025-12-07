(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('AppToolkit: ApiBuilderUtils is required.');
        return;
    }

    const DEFAULT_FILENAME = 'api_android_apps.json';
    const GITHUB_CHANNEL_PATHS = {
        debug: 'api/app_toolkit/v2/debug/en/home/api_android_apps.json',
        release: 'api/app_toolkit/v2/release/en/home/api_android_apps.json'
    };
    const MIN_GITHUB_TOKEN_LENGTH = 20;
    const GOOGLE_PLAY_CATEGORY_LABELS = [
        'Art & Design',
        'Auto & Vehicles',
        'Beauty',
        'Books & Reference',
        'Business',
        'Comics',
        'Communication',
        'Dating',
        'Education',
        'Entertainment',
        'Events',
        'Finance',
        'Food & Drink',
        'Health & Fitness',
        'House & Home',
        'Libraries & Demo',
        'Lifestyle',
        'Maps & Navigation',
        'Medical',
        'Music & Audio',
        'News & Magazines',
        'Parenting',
        'Personalization',
        'Photography',
        'Productivity',
        'Shopping',
        'Social',
        'Sports',
        'Tools',
        'Travel & Local',
        'Video Players & Editors',
        'Weather'
    ];
    const GOOGLE_PLAY_CATEGORIES = GOOGLE_PLAY_CATEGORY_LABELS.map((label) => ({
        id: createCategoryId(label),
        label
    }));
    const CATEGORY_BY_ID = new Map(
        GOOGLE_PLAY_CATEGORIES.map((category) => [category.id.toLowerCase(), category])
    );
    const CATEGORY_BY_LABEL = new Map(
        GOOGLE_PLAY_CATEGORIES.map((category) => [category.label.toLowerCase(), category])
    );
    const PACKAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;

    function createCategoryId(value) {
        const normalized = utils.trimString(value || '');
        if (!normalized) {
            return '';
        }
        return normalized
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function createEmptyCategory() {
        return { label: '', category_id: '' };
    }

    function formatCategoryLabel(label) {
        const normalized = utils.trimString(label || '');
        if (!normalized) {
            return '';
        }
        return normalized
            .replace(/[_-]+/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function resolveCategoryById(categoryId) {
        if (!categoryId) {
            return null;
        }
        const trimmed = utils.trimString(categoryId);
        if (!trimmed) {
            return null;
        }
        const lookup =
            CATEGORY_BY_ID.get(trimmed.toLowerCase()) ||
            CATEGORY_BY_ID.get(createCategoryId(trimmed));
        return lookup ? { label: lookup.label, category_id: lookup.id } : null;
    }

    function normalizeCategoryInput(input) {
        if (!input) {
            return createEmptyCategory();
        }
        if (typeof input === 'string') {
            const trimmed = utils.trimString(input);
            if (!trimmed) {
                return createEmptyCategory();
            }
            const resolved =
                resolveCategoryById(trimmed) ||
                resolveCategoryById(createCategoryId(trimmed));
            if (resolved) {
                return resolved;
            }
            const fallbackId = createCategoryId(trimmed) || trimmed;
            return { label: formatCategoryLabel(trimmed), category_id: fallbackId };
        }
        if (typeof input === 'object') {
            const rawLabel =
                typeof input.label === 'string' ? utils.trimString(input.label) : '';
            const rawIdCandidate =
                typeof input.category_id === 'string'
                    ? utils.trimString(input.category_id)
                    : typeof input.id === 'string'
                    ? utils.trimString(input.id)
                    : '';
            const resolved = resolveCategoryById(rawIdCandidate) || resolveCategoryById(rawLabel);
            if (resolved) {
                return resolved;
            }
            const derivedId = createCategoryId(rawIdCandidate || rawLabel);
            if (!rawLabel && !derivedId) {
                return createEmptyCategory();
            }
            const fallbackLabel = rawLabel || rawIdCandidate || derivedId;
            return {
                label: formatCategoryLabel(fallbackLabel),
                category_id: rawIdCandidate || derivedId || rawLabel
            };
        }
        return createEmptyCategory();
    }

    function initAppToolkitWorkspace() {
        const builderRoot = document.getElementById('appToolkitBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const entriesContainer = document.getElementById('appToolkitEntries');
        const builderLayout = builderRoot.querySelector('.builder-layout');
        const addButton = document.getElementById('appToolkitAddApp');
        const sortButton = document.getElementById('appToolkitSortButton');
        const sortLabel = document.getElementById('appToolkitSortLabel');
        const sortMenu = document.getElementById('appToolkitSortMenu');
        const resetButton = document.getElementById('appToolkitResetButton');
        const copyButton = document.getElementById('appToolkitCopyButton');
        const downloadButton = document.getElementById('appToolkitDownloadButton');
        const previewArea = document.getElementById('appToolkitPreview');
        const validationStatus = document.getElementById('appToolkitValidation');
        const fetchFieldset = document.getElementById('appToolkitFetchFieldset');
        const presetButtons = Array.from(
            document.querySelectorAll('[data-app-toolkit-preset]')
        );
        const githubTokenInput = document.getElementById('appToolkitGithubToken');
        const githubTokenFileInput = document.getElementById('appToolkitGithubTokenFile');
        const githubTokenFileButton = document.getElementById('appToolkitGithubTokenFileButton');
        const githubRepoInput = document.getElementById('appToolkitGithubRepo');
        const githubBranchInput = document.getElementById('appToolkitGithubBranch');
        const githubMessageInput = document.getElementById('appToolkitGithubMessage');
        const githubChannelSelect = document.getElementById('appToolkitGithubChannel');
        const githubStatus = document.getElementById('appToolkitGithubStatus');
        const githubWizardButton = document.getElementById('appToolkitGithubWizardButton');
        const githubDialog = document.getElementById('appToolkitGithubDialog');
        const githubStepper = document.getElementById('appToolkitGithubStepper');
        const githubBackButton = document.getElementById('appToolkitGithubBack');
        const githubNextButton = document.getElementById('appToolkitGithubNext');
        const trackedCountEl = document.getElementById('appToolkitTrackedCount');
        const releaseReadyCountEl = document.getElementById('appToolkitReleaseReadyCount');
        const screenshotAverageEl = document.getElementById('appToolkitScreenshotAverage');
        const reviewCountEl = document.getElementById('appToolkitReviewCount');
        const workspacePulseEl = document.getElementById('appToolkitWorkspacePulse');
        const toolbarPulseEl = document.getElementById('appToolkitToolbarPulse');
        const releaseProgressEl = document.getElementById('appToolkitReleaseProgress');
        const lastEditedEl = document.getElementById('appToolkitLastEdited');
        const filterChipSet = document.getElementById('appToolkitFilterChips');
        const diffSheet = document.getElementById('appToolkitDiffSheet');
        const diffContent = document.getElementById('appToolkitDiffContent');
        const githubCard = document.getElementById('appToolkitGithubCard');
        const githubToggle = document.getElementById('appToolkitGithubToggle');
        const githubContent = document.getElementById('appToolkitGithubContent');
        const dialogsToWire = [githubDialog];
        const FETCH_STATE_COPY = {
            idle: 'Choose a quick link to load the latest data.',
            loading: 'Fetching the latest data…',
            success: 'Data loaded successfully.',
            error: 'Unable to fetch remote JSON.'
        };
        const applyBuilderButtonStyle = (...elements) => {
            elements
                .filter(Boolean)
                .forEach((element) => element.classList.add('builder-button'));
        };

        applyBuilderButtonStyle(
            addButton,
            sortButton,
            resetButton,
            copyButton,
            downloadButton,
            githubWizardButton,
            githubBackButton,
            githubNextButton
        );
        let fetchPulseTimeout = null;

        dialogsToWire.forEach((dialog) => {
            if (!dialog || dialog.dataset.dialogCloseInit === 'true') {
                return;
            }
            const closeButtons = dialog.querySelectorAll('[dialog-action="close"]');
            closeButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    if (typeof dialog.close === 'function') {
                        dialog.close();
                    } else {
                        dialog.open = false;
                    }
                });
            });
            dialog.dataset.dialogCloseInit = 'true';
        });
        setFetchState('idle');
        const SCREENSHOT_HINT_STORAGE_KEY = 'AppToolkitScreenshotHintSeen';
        let screenshotHintSeen = false;
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                screenshotHintSeen =
                    window.localStorage.getItem(SCREENSHOT_HINT_STORAGE_KEY) === 'true';
            }
        } catch (error) {
            console.warn('AppToolkit: Unable to read screenshot hint preference.', error);
        }

        const markScreenshotHintSeen = () => {
            if (screenshotHintSeen) {
                return;
            }
            screenshotHintSeen = true;
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(SCREENSHOT_HINT_STORAGE_KEY, 'true');
                }
            } catch (error) {
                console.warn('AppToolkit: Unable to persist screenshot hint preference.', error);
            }
        };

        const state = {
            apps: [createEmptyApp()]
        };
        let currentSortKey = 'name';
        let sortMenuItems = [];
        const SORT_OPTIONS = {
            name: {
                key: 'name',
                label: 'App name (A–Z)',
                buttonLabel: 'App name (A–Z)',
                ariaLabel: 'app name, alphabetical A to Z',
                type: 'string',
                getValue: (_app, sanitized) => sanitized.name || ''
            },
            category: {
                key: 'category',
                label: 'Category (A–Z)',
                buttonLabel: 'Category (A–Z)',
                ariaLabel: 'category, alphabetical A to Z',
                type: 'string',
                getValue: (_app, sanitized) => sanitized?.category?.label || ''
            },
            screenshots: {
                key: 'screenshots',
                label: 'Screenshot count (high to low)',
                buttonLabel: 'Screenshot count (high to low)',
                ariaLabel: 'screenshot count, high to low',
                type: 'number',
                getValue: (_app, _sanitized, meta) => meta.screenshotCount || 0,
                compare: (a, b) => b.value - a.value
            }
        };
        let lastPreviewState = { success: false, payload: null };
        let lastExportEvaluation = { valid: false, reasons: [] };
        let lastTouchedAt = null;
        let relativeTimer = null;
        let remoteBaselinePayload = null;
        const activeFilters = new Set();
        let draggingScreenshot = null;
        const GITHUB_STEPS = ['authenticate', 'target', 'review'];
        let githubStepIndex = 0;
        const supportsFileSystemAccess =
            typeof window !== 'undefined' && typeof window === 'object' && 'showOpenFilePicker' in window;
        const githubTokenHandleStore = createFileHandleStore({
            dbName: 'AppToolkitGithubToken',
            storeName: 'fileHandles',
            key: 'tokenFile'
        });
        let githubTokenFileHandle = null;
        let githubTokenHandleLoaded = false;
        let githubTokenFallbackFile = null;

        function createEmptyScreenshotEntry() {
            return { url: '', aspectRatio: '9:16' };
        }

        function normalizeScreenshotEntry(value, previous = null) {
            const base = previous && typeof previous === 'object' ? previous : createEmptyScreenshotEntry();
            const next = { ...createEmptyScreenshotEntry(), aspectRatio: base.aspectRatio || '9:16' };
            if (typeof value === 'string') {
                next.url = utils.trimString(value);
            } else if (value && typeof value === 'object') {
                next.url = utils.trimString(value.url || '');
                if (value.aspectRatio != null) {
                    next.aspectRatio = utils.trimString(String(value.aspectRatio));
                }
            } else {
                next.url = '';
            }
            next.aspectRatio = utils.trimString(next.aspectRatio || '') || '9:16';
            return next;
        }

        function getScreenshotUrl(entry) {
            if (typeof entry === 'string') {
                return utils.trimString(entry);
            }
            if (entry && typeof entry === 'object') {
                return utils.trimString(entry.url || '');
            }
            return '';
        }

        function setScreenshotEntry(appIndex, screenshotIndex, value) {
            const list = state.apps[appIndex]?.screenshots;
            if (!Array.isArray(list) || screenshotIndex < 0 || screenshotIndex >= list.length) {
                return;
            }
            list[screenshotIndex] = normalizeScreenshotEntry(value, list[screenshotIndex]);
        }

        function applyScreenshotAspectRatio(appIndex, screenshotIndex, ratio) {
            const list = state.apps[appIndex]?.screenshots;
            if (!Array.isArray(list) || screenshotIndex < 0 || screenshotIndex >= list.length) {
                return;
            }
            const existing = list[screenshotIndex];
            const entry = normalizeScreenshotEntry(existing);
            entry.aspectRatio = utils.trimString(ratio || '') || '9:16';
            list[screenshotIndex] = entry;
        }

        function ensureScreenshotList(app) {
            if (!app || !Array.isArray(app.screenshots)) {
                app.screenshots = [createEmptyScreenshotEntry()];
                return;
            }
            app.screenshots = app.screenshots.map((entry) => normalizeScreenshotEntry(entry));
            if (!app.screenshots.length) {
                app.screenshots.push(createEmptyScreenshotEntry());
            }
        }

        function createEmptyApp() {
            return {
                name: '',
                packageName: '',
                category: createEmptyCategory(),
                description: '',
                iconLogo: '',
                screenshots: [createEmptyScreenshotEntry()]
            };
        }

        function ensureValidation(appIndex) {
            const app = state.apps[appIndex];
            if (!app) {
                return { icon: { status: 'idle', width: 0, height: 0, override: false }, screenshots: [] };
            }
            if (!app._validation) {
                app._validation = {
                    icon: { status: 'idle', width: 0, height: 0, override: false },
                    screenshots: []
                };
            } else {
                if (!app._validation.icon) {
                    app._validation.icon = { status: 'idle', width: 0, height: 0, override: false };
                } else {
                    app._validation.icon.override = Boolean(app._validation.icon.override);
                }
                if (!Array.isArray(app._validation.screenshots)) {
                    app._validation.screenshots = [];
                }
            }
            return app._validation;
        }

        function setScreenshotMeta(appIndex, screenshotIndex, meta) {
            const validation = ensureValidation(appIndex);
            validation.screenshots[screenshotIndex] = meta;
        }

        function removeScreenshotMeta(appIndex, screenshotIndex) {
            const validation = ensureValidation(appIndex);
            if (validation.screenshots.length > screenshotIndex) {
                validation.screenshots.splice(screenshotIndex, 1);
            }
        }

        function moveScreenshotMeta(appIndex, from, to) {
            const validation = ensureValidation(appIndex);
            const list = validation.screenshots;
            if (!Array.isArray(list) || from === to || from < 0 || from >= list.length) {
                return;
            }
            let targetIndex = to;
            if (targetIndex < 0) targetIndex = 0;
            if (targetIndex > list.length) targetIndex = list.length;
            const [moved] = list.splice(from, 1);
            if (targetIndex > from) {
                targetIndex -= 1;
            }
            list.splice(targetIndex, 0, moved);
        }

        function getScreenshotMeta(appIndex, screenshotIndex) {
            const validation = ensureValidation(appIndex);
            return validation.screenshots[screenshotIndex] || null;
        }

        function getFilledScreenshotCount(appIndex) {
            const screenshots = state.apps[appIndex]?.screenshots || [];
            return screenshots.reduce((count, value) => (getScreenshotUrl(value) ? count + 1 : count), 0);
        }

        function normalizeSortString(value) {
            return utils.trimString(typeof value === 'string' ? value : value == null ? '' : String(value));
        }

        function compareStrings(a, b) {
            const valueA = normalizeSortString(a);
            const valueB = normalizeSortString(b);
            const hasA = Boolean(valueA);
            const hasB = Boolean(valueB);
            if (hasA && hasB) {
                const diff = valueA.localeCompare(valueB, undefined, { sensitivity: 'base' });
                if (diff !== 0) {
                    return diff;
                }
            } else if (hasA) {
                return -1;
            } else if (hasB) {
                return 1;
            }
            return 0;
        }

        function defaultCompare(option, a, b) {
            if (option?.type === 'number') {
                return (a || 0) - (b || 0);
            }
            return compareStrings(a, b);
        }

        function sortAppsInPlace() {
            const option = SORT_OPTIONS[currentSortKey];
            if (!option) {
                return;
            }
            const decorated = state.apps.map((app, index) => {
                const sanitized = sanitizeAppEntry(app);
                const meta = deriveAppMeta(app, sanitized);
                const value = option.getValue(app, sanitized, meta);
                return { app, index, sanitized, meta, value };
            });
            decorated.sort((a, b) => {
                const primary = typeof option.compare === 'function'
                    ? option.compare(a, b)
                    : defaultCompare(option, a.value, b.value);
                if (primary !== 0) {
                    return primary;
                }
                const tieByName = compareStrings(a.sanitized.name, b.sanitized.name);
                if (tieByName !== 0) {
                    return tieByName;
                }
                return a.index - b.index;
            });
            state.apps.splice(
                0,
                state.apps.length,
                ...decorated.map((entry) => {
                    entry.app._meta = entry.meta;
                    return entry.app;
                })
            );
        }

        function updateSortUi() {
            const option = SORT_OPTIONS[currentSortKey];
            if (sortLabel && option) {
                sortLabel.textContent = option.buttonLabel;
            }
            if (sortButton && option) {
                sortButton.setAttribute('aria-label', `Sort apps by ${option.ariaLabel}`);
            }
            if (Array.isArray(sortMenuItems) && sortMenuItems.length) {
                sortMenuItems.forEach((item) => {
                    const isSelected = item.dataset.sortKey === currentSortKey;
                    if (isSelected) {
                        item.setAttribute('selected', '');
                        item.setAttribute('aria-checked', 'true');
                    } else {
                        item.removeAttribute('selected');
                        item.removeAttribute('aria-checked');
                    }
                });
            }
        }

        function handleSortSelection(sortKey) {
            const normalizedKey = utils.trimString(sortKey || '');
            if (!normalizedKey || !SORT_OPTIONS[normalizedKey]) {
                return;
            }
            if (currentSortKey === normalizedKey) {
                if (sortMenu) {
                    sortMenu.open = false;
                }
                if (sortButton) {
                    sortButton.setAttribute('aria-expanded', 'false');
                }
                updateSortUi();
                return;
            }
            currentSortKey = normalizedKey;
            sortAppsInPlace();
            updateSortUi();
            touchWorkspace();
            render({ skipPreview: true });
            requestPreviewUpdate();
            if (sortMenu) {
                sortMenu.open = false;
            }
            if (sortButton) {
                sortButton.setAttribute('aria-expanded', 'false');
            }
        }

        function appendScreenshots(appIndex, values) {
            const app = state.apps[appIndex];
            if (!app || !Array.isArray(app.screenshots)) {
                return [];
            }
            const additions = values
                .map((value) => normalizeScreenshotEntry(value))
                .filter((entry) => Boolean(entry.url));
            if (!additions.length) {
                return [];
            }
            const validation = ensureValidation(appIndex);
            additions.forEach((entry) => {
                app.screenshots.push(entry);
                validation.screenshots.push(null);
            });
            return additions;
        }

        async function appendScreenshotsFromFiles(appIndex, files) {
            if (!files || !files.length) {
                return [];
            }
            const urls = [];
            for (const file of files) {
                if (!file || (file.type && !file.type.startsWith('image/'))) {
                    continue;
                }
                try {
                    const dataUrl = await readFileAsDataUrl(file);
                    if (dataUrl) {
                        urls.push(dataUrl);
                    }
                } catch (error) {
                    console.warn('AppToolkit: Unable to read dropped image file.', error);
                }
            }
            return appendScreenshots(appIndex, urls);
        }

        function appendScreenshotsFromText(appIndex, text) {
            if (!text) {
                return [];
            }
            const urls = String(text)
                .split(/\s+/)
                .map((segment) => segment.trim())
                .filter(Boolean);
            return appendScreenshots(appIndex, urls);
        }

        function verifyScreenshotUrlLoads(url) {
            return new Promise((resolve, reject) => {
                const trimmed = utils.trimString(url);
                if (!trimmed) {
                    reject(new Error('Enter a screenshot URL first.'));
                    return;
                }
                const image = new Image();
                const cleanup = (timer) => {
                    image.onload = null;
                    image.onerror = null;
                    if (timer) {
                        clearTimeout(timer);
                    }
                };
                const timeout = setTimeout(() => {
                    cleanup(timeout);
                    reject(new Error('Timed out while loading screenshot. Check the URL.'));
                }, 8000);
                image.onload = () => {
                    cleanup(timeout);
                    resolve();
                };
                image.onerror = () => {
                    cleanup(timeout);
                    reject(new Error('Unable to load screenshot. Check the link or CORS.'));
                };
                image.decoding = 'async';
                image.referrerPolicy = 'no-referrer';
                image.src = trimmed;
            });
        }

        function readFileAsDataUrl(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file.'));
                reader.readAsDataURL(file);
            });
        }

        function formatAspectRatio(width, height) {
            const w = Number(width);
            const h = Number(height);
            if (!w || !h) {
                return '';
            }
            const gcd = (a, b) => {
                return b === 0 ? a : gcd(b, a % b);
            };
            const divisor = gcd(Math.round(w), Math.round(h)) || 1;
            const ratioW = Math.round(w / divisor);
            const ratioH = Math.round(h / divisor);
            return `${ratioW}:${ratioH}`;
        }

        function evaluateExportState() {
            const sanitizedEntries = getSanitizedApps({ includeMeta: true });
            const reasons = [];
            if (!sanitizedEntries.length) {
                reasons.push('Add at least one app before exporting.');
            }
            sanitizedEntries.forEach((entry) => {
                const label =
                    entry.sanitized?.name ||
                    entry.sanitized?.packageName ||
                    `App ${entry.index + 1}`;
                const packageName = entry.sanitized?.packageName || '';
                if (!packageName || !PACKAGE_NAME_PATTERN.test(packageName)) {
                    reasons.push(`${label}: package name must follow reverse-domain format.`);
                }
                const iconUrl = entry.sanitized?.iconLogo || '';
                if (!iconUrl || !/^https:\/\//i.test(iconUrl)) {
                    reasons.push(`${label}: icon must use an https:// URL.`);
                }
                const iconValidation = ensureValidation(entry.index).icon;
                if (iconValidation.status === 'error') {
                    reasons.push(`${label}: icon could not be loaded.`);
                } else if (iconValidation.status === 'warning' && !iconValidation.override) {
                    reasons.push(`${label}: icon must be at least 512×512 or override the warning.`);
                }
                if ((entry.sanitized?.screenshots?.length || 0) < 3) {
                    reasons.push(`${label}: add at least three screenshots.`);
                }
            });
            return { valid: reasons.length === 0, reasons };
        }

        function updateExportControls() {
            lastExportEvaluation = evaluateExportState();
            const { valid, reasons } = lastExportEvaluation;
            const message = reasons[0] || 'Resolve validation issues before exporting.';
            if (copyButton) {
                copyButton.disabled = !valid;
                copyButton.title = valid ? 'Copy JSON' : message;
            }
            if (downloadButton) {
                downloadButton.disabled = !valid;
                downloadButton.title = valid ? 'Download JSON' : message;
            }
            if (validationStatus) {
                const previous = validationStatus.querySelector('.export-guard');
                if (previous) {
                    previous.remove();
                }
                if (!valid && reasons.length) {
                    const guard = document.createElement('span');
                    guard.className = 'export-guard';
                    guard.textContent = reasons[0];
                    validationStatus.appendChild(guard);
                }
            }
        }

        async function updatePreview() {
            const result = await utils.renderJsonPreview({
                previewArea,
                statusElement: validationStatus,
                data: state.apps,
                buildPayload: (apps) => ({ data: { apps } }),
                autoFix: (payload) => {
                    const apps = Array.isArray(payload?.data?.apps) ? payload.data.apps : [];
                    payload.data.apps = apps
                        .map((app) => sanitizeAppEntry(app))
                        .filter((app) => Object.keys(app).length > 0);
                    return payload;
                },
                successMessage: (payload) => {
                    const count = payload?.data?.apps?.length || 0;
                    if (!count) {
                        return 'Valid JSON · No apps yet';
                    }
                    return count === 1
                        ? 'Valid JSON · 1 app entry'
                        : `Valid JSON · ${count} app entries`;
                }
            });
            lastPreviewState = result && typeof result === 'object' ? result : { success: false };
            const metrics = updateWorkspaceMetrics();
            updateToolbarPulse(metrics);
            clearGithubStatus();
            updateExportControls();
        }

        const previewUpdateTask = utils.createDeferredTask(updatePreview, {
            delay: 360,
            idle: true
        });

        function requestPreviewUpdate(options = {}) {
            const { immediate = false } = options;
            if (immediate) {
                return previewUpdateTask.flush();
            }
            previewUpdateTask.schedule();
            return undefined;
        }

        function sanitizeAppEntry(app) {
            const trimmed = (value) =>
                utils.trimString(
                    typeof value === 'string' ? value : value == null ? '' : String(value)
                );
            const output = {};
            const name = trimmed(app.name);
            if (name) output.name = name;
            const packageName = trimmed(app.packageName);
            if (packageName) output.packageName = packageName;
            const category = normalizeCategoryInput(app.category);
            if (category.category_id) {
                output.category = {
                    label: category.label || category.category_id,
                    category_id: category.category_id
                };
            }
            const description = trimmed(app.description);
            if (description) output.description = description;
            const iconLogo = trimmed(app.iconLogo);
            if (iconLogo) output.iconLogo = iconLogo;
            const validationScreenshots = Array.isArray(app?._validation?.screenshots)
                ? app._validation.screenshots
                : [];
            const screenshots = utils
                .normalizeArray(app.screenshots)
                .map((entry, index) => {
                    const normalizedEntry = normalizeScreenshotEntry(entry);
                    const url = normalizedEntry.url;
                    if (!url) {
                        return null;
                    }
                    let aspectRatio = normalizedEntry.aspectRatio || '';
                    const meta = validationScreenshots[index];
                    if (!aspectRatio && meta && meta.ratio) {
                        aspectRatio = utils.trimString(meta.ratio);
                        if (Array.isArray(app.screenshots)) {
                            app.screenshots[index] = normalizeScreenshotEntry(
                                { url, aspectRatio },
                                normalizedEntry
                            );
                        }
                    }
                    return { url, aspectRatio: aspectRatio || '' };
                })
                .filter(Boolean);
            if (screenshots.length) {
                const seen = new Set();
                const unique = [];
                screenshots.forEach(({ url, aspectRatio }) => {
                    if (seen.has(url)) {
                        return;
                    }
                    seen.add(url);
                    unique.push({ url, aspectRatio: aspectRatio || '' });
                });
                output.screenshots = unique;
            }
            return output;
        }

        function deriveAppMeta(app, sanitized) {
            const isEmpty = !sanitized || Object.keys(sanitized).length === 0;
            const screenshotCount = Array.isArray(sanitized?.screenshots)
                ? sanitized.screenshots.length
                : 0;
            const hasRequired =
                Boolean(sanitized?.name) &&
                Boolean(sanitized?.packageName) &&
                Boolean(sanitized?.iconLogo) &&
                Boolean(sanitized?.category?.category_id);
            const releaseReady = !isEmpty && hasRequired && screenshotCount >= 3;
            const cohorts = {
                pendingReleaseReady: !isEmpty && !releaseReady,
                needsScreenshots: !isEmpty && screenshotCount < 3
            };
            return {
                sanitized,
                isEmpty,
                screenshotCount,
                hasRequired,
                releaseReady,
                cohorts
            };
        }

        function getSanitizedApps({ includeMeta = false } = {}) {
            const results = [];
            state.apps.forEach((app, index) => {
                const sanitized = sanitizeAppEntry(app);
                const meta = deriveAppMeta(app, sanitized);
                state.apps[index]._meta = meta;
                if (!meta.isEmpty) {
                    results.push(
                        includeMeta
                            ? {
                                  index,
                                  ...meta
                              }
                            : sanitized
                    );
                }
            });
            return results;
        }

        function formatAverage(value) {
            if (!value) {
                return '0';
            }
            const rounded = Math.round(value * 10) / 10;
            return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
        }

        function updateWorkspaceMetrics() {
            const sanitizedMetaEntries = getSanitizedApps({ includeMeta: true });
            sanitizedMetaEntries.map((entry) => entry.sanitized);
            const total = sanitizedMetaEntries.length;
            const releaseReady = sanitizedMetaEntries.filter((entry) => entry.releaseReady).length;
            const screenshotTotal = sanitizedMetaEntries.reduce(
                (count, entry) => count + entry.screenshotCount,
                0
            );
            const averageScreenshots = total ? screenshotTotal / total : 0;
            const pending = Math.max(total - releaseReady, 0);
            const needsScreenshotsCount = sanitizedMetaEntries.filter(
                (entry) => entry.cohorts.needsScreenshots
            ).length;
            const missingRequiredCount = sanitizedMetaEntries.filter(
                (entry) => !entry.hasRequired
            ).length;

            if (trackedCountEl) {
                trackedCountEl.textContent = String(total);
            }
            if (releaseReadyCountEl) {
                releaseReadyCountEl.textContent = String(releaseReady);
            }
            if (screenshotAverageEl) {
                screenshotAverageEl.textContent = formatAverage(averageScreenshots);
            }
            if (reviewCountEl) {
                if (!total) {
                    reviewCountEl.textContent = '0 entries queued';
                } else if (pending === 0) {
                    reviewCountEl.textContent = 'All entries are release ready';
                } else {
                    reviewCountEl.textContent = `${pending} ${pending === 1 ? 'entry' : 'entries'} queued`;
                }
            }
            if (releaseProgressEl) {
                const ratio = total ? Math.min(releaseReady / total, 1) : 0;
                releaseProgressEl.style.width = `${Math.round(ratio * 100)}%`;
                releaseProgressEl.dataset.value = ratio.toFixed(2);
            }
            if (workspacePulseEl) {
                let message;
                if (!total) {
                    message = 'Review entries to unlock insights.';
                } else if (pending === 0) {
                    message = 'Everything is production ready. Ship when you are ready.';
                } else {
                    message = `${releaseReady}/${total} ready · ${pending} ${pending === 1 ? 'entry' : 'entries'} to refine.`;
                }
                workspacePulseEl.textContent = message;
            }
            updateDiffSheet();
            return { total, releaseReady, pending, needsScreenshotsCount, missingRequiredCount };
        }

        function extractStatusMessage(element) {
            if (!element) {
                return '';
            }
            const messageSpan = element.querySelector('span:last-child');
            if (messageSpan && messageSpan.textContent) {
                return messageSpan.textContent.trim();
            }
            return element.textContent ? element.textContent.trim() : '';
        }

        function updateToolbarPulse(metrics) {
            if (!toolbarPulseEl) {
                return;
            }
            const snapshot = metrics || updateWorkspaceMetrics();
            const status = validationStatus ? validationStatus.dataset.status : '';
            const statusMessage = extractStatusMessage(validationStatus);
            if (status === 'success' && statusMessage) {
                toolbarPulseEl.textContent = statusMessage;
                return;
            }
            if (status === 'error' && statusMessage) {
                toolbarPulseEl.textContent = statusMessage;
                return;
            }
            if (status === 'warning' && statusMessage) {
                toolbarPulseEl.textContent = statusMessage;
                return;
            }
            if (snapshot.total) {
                toolbarPulseEl.textContent = snapshot.pending
                    ? `${snapshot.pending} ${snapshot.pending === 1 ? 'entry needs' : 'entries need'} attention`
                    : 'Ready to publish';
            } else {
                toolbarPulseEl.textContent = 'Awaiting input';
            }
        }

        function updateDiffSheet() {
            if (!diffContent) {
                return;
            }
            const setEmptyState = (message, { openSheet = false } = {}) => {
                diffContent.innerHTML = '';
                diffContent.classList.add('diff-view--empty');
                diffContent.textContent = message;
                if (builderLayout) {
                    builderLayout.classList.remove('builder-columns--with-diff');
                }
                if (diffSheet) {
                    diffSheet.open = openSheet;
                    diffSheet.classList.add('is-empty');
                }
            };

            diffContent.classList.remove('diff-view--empty');
            diffContent.innerHTML = '';
            if (diffSheet) {
                diffSheet.classList.remove('is-empty');
                diffSheet.open = false;
            }

            if (!remoteBaselinePayload) {
                setEmptyState('Load a baseline JSON file to compare changes.', { openSheet: false });
                return;
            }

            if (!lastPreviewState.success || !lastPreviewState.payload) {
                setEmptyState('Resolve preview errors to view the diff.', { openSheet: true });
                return;
            }

            const diffLib = typeof window !== 'undefined' && window.jsondiffpatch ? window.jsondiffpatch : null;
            if (!diffLib || typeof diffLib.create !== 'function' || !diffLib.formatters?.html) {
                setEmptyState('Diff viewer unavailable. Ensure jsondiffpatch is loaded.', { openSheet: true });
                return;
            }

            const baselineApps =
                extractAppsArray(remoteBaselinePayload?.data || remoteBaselinePayload) || [];
            const currentApps =
                extractAppsArray(lastPreviewState.payload?.data || lastPreviewState.payload) || [];

            const normalizeList = (apps) =>
                apps
                    .map((app, index) => ({
                        key:
                            utils.trimString(app.packageName) ||
                            utils.trimString(app.name) ||
                            `index-${index}`,
                        data: sanitizeAppEntry(app)
                    }))
                    .filter((entry) => Object.keys(entry.data).length)
                    .sort((a, b) => a.key.localeCompare(b.key))
                    .map((entry) => entry.data);

            const baseline = normalizeList(baselineApps);
            const current = normalizeList(currentApps);

            const differ = diffLib?.create({ arrays: { detectMove: false }, textDiff: { minLength: 120 } });
            const delta = differ?.diff ? differ.diff(baseline, current) : null;

            if (!delta || (typeof delta === 'object' && !Object.keys(delta).length)) {
                setEmptyState('No differences detected since the last import.', { openSheet: true });
                return;
            }

            diffContent.classList.remove('diff-view--empty');
            if (builderLayout) {
                builderLayout.classList.add('builder-columns--with-diff');
            }
            if (diffSheet) {
                diffSheet.classList.remove('is-empty');
                diffSheet.open = true;
            }

            const body = document.createElement('div');
            body.className = 'diff-view__body';

            const baselineColumn = document.createElement('div');
            baselineColumn.className = 'diff-view__column diff-view__column--baseline';
            const baselineHeader = document.createElement('h4');
            baselineHeader.textContent = 'Baseline';
            baselineColumn.appendChild(baselineHeader);
            const cloneDelta = () => JSON.parse(JSON.stringify(delta));
            baselineColumn.insertAdjacentHTML('beforeend', diffLib.formatters.html.format(cloneDelta(), baseline));

            const currentColumn = document.createElement('div');
            currentColumn.className = 'diff-view__column diff-view__column--current';
            const currentHeader = document.createElement('h4');
            currentHeader.textContent = 'Workspace';
            currentColumn.appendChild(currentHeader);
            currentColumn.insertAdjacentHTML('beforeend', diffLib.formatters.html.format(cloneDelta(), baseline));

            body.appendChild(baselineColumn);
            body.appendChild(currentColumn);
            diffContent.appendChild(body);
        }

        function applyCardFilters() {
            if (!entriesContainer) {
                return;
            }
            const filters = Array.from(activeFilters);
            const hasFilters = filters.length > 0;
            const cards = entriesContainer.querySelectorAll('.builder-card');
            cards.forEach((card) => {
                let visible = true;
                if (hasFilters) {
                    visible = filters.every((filterKey) => card.dataset[filterKey] === 'true');
                }
                card.classList.toggle('filtered-out', !visible);
                card.hidden = !visible;
            });
            if (builderRoot) {
                builderRoot.dataset.filtered = hasFilters ? 'true' : 'false';
            }
        }

        function syncFiltersFromChipSet() {
            if (!filterChipSet) {
                return;
            }
            activeFilters.clear();
            const chips = filterChipSet.querySelectorAll('md-filter-chip');
            chips.forEach((chip) => {
                if (chip.hasAttribute('selected')) {
                    const key = chip.dataset.appToolkitFilter;
                    if (key) {
                        activeFilters.add(key);
                    }
                }
            });
            applyCardFilters();
        }

        function setGithubStep(index) {
            githubStepIndex = Math.max(0, Math.min(index, GITHUB_STEPS.length - 1));
            const stepValue = GITHUB_STEPS[githubStepIndex];
            if (githubStepper) {
                githubStepper.value = stepValue;
                githubStepper.setAttribute('value', stepValue);
            }
            const stepPanels = githubDialog?.querySelectorAll('.github-step') || [];
            stepPanels.forEach((panel) => {
                panel.hidden = panel.dataset.step !== stepValue;
            });
            if (githubBackButton) {
                githubBackButton.disabled = githubStepIndex === 0;
            }
            if (githubNextButton) {
                githubNextButton.textContent = githubStepIndex === GITHUB_STEPS.length - 1 ? 'Publish' : 'Next';
            }
        }

        function updateLastEditedDisplay() {
            if (!lastEditedEl) {
                return;
            }
            if (!lastTouchedAt) {
                lastEditedEl.textContent = 'awaiting changes';
                lastEditedEl.removeAttribute('title');
                return;
            }
            const diff = Date.now() - lastTouchedAt;
            let label = 'moments ago';
            if (diff >= 86400000) {
                const days = Math.round(diff / 86400000);
                label = `${days} day${days === 1 ? '' : 's'} ago`;
            } else if (diff >= 3600000) {
                const hours = Math.round(diff / 3600000);
                label = `${hours} hr${hours === 1 ? '' : 's'} ago`;
            } else if (diff >= 60000) {
                const minutes = Math.round(diff / 60000);
                label = `${minutes} min${minutes === 1 ? '' : 's'} ago`;
            }
            lastEditedEl.textContent = label;
            lastEditedEl.title = new Date(lastTouchedAt).toLocaleString();
        }

        function startRelativeTimer() {
            if (relativeTimer || typeof window === 'undefined') {
                return;
            }
            relativeTimer = window.setInterval(() => {
                if (!builderRoot || !document.body.contains(builderRoot)) {
                    window.clearInterval(relativeTimer);
                    relativeTimer = null;
                    return;
                }
                updateLastEditedDisplay();
            }, 45000);
        }

        function touchWorkspace() {
            lastTouchedAt = Date.now();
            updateLastEditedDisplay();
            startRelativeTimer();
        }

        function createCollapsibleAnimator(content) {
            if (!content) {
                return {
                    jumpTo: () => {},
                    animateTo: () => {}
                };
            }
            let currentAnimation = null;
            const prefersReducedMotion = () =>
                typeof window !== 'undefined' &&
                window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const cleanup = () => {
                content.style.removeProperty('height');
                content.style.removeProperty('opacity');
                content.style.removeProperty('overflow');
            };
            const jumpTo = (expanded) => {
                cleanup();
                content.hidden = !expanded;
            };
            const animateTo = (expanded) => {
                if (prefersReducedMotion()) {
                    jumpTo(expanded);
                    return;
                }
                if (currentAnimation) {
                    currentAnimation.cancel();
                }
                const wasHidden = content.hidden;
                const startHeight = expanded ? 0 : content.getBoundingClientRect().height;
                content.hidden = false;
                const endHeight = expanded ? content.scrollHeight : 0;
                content.style.overflow = 'hidden';
                content.style.height = `${startHeight}px`;
                content.style.opacity = expanded ? '0' : '1';
                currentAnimation = content.animate(
                    [
                        { height: `${startHeight}px`, opacity: expanded ? 0 : 1 },
                        { height: `${endHeight}px`, opacity: expanded ? 1 : 0 }
                    ],
                    {
                        duration: 220,
                        easing: 'cubic-bezier(0.2, 0, 0, 1)'
                    }
                );
                currentAnimation.onfinish = () => {
                    jumpTo(expanded);
                    cleanup();
                    currentAnimation = null;
                };
                currentAnimation.oncancel = () => {
                    cleanup();
                    currentAnimation = null;
                    content.hidden = wasHidden;
                };
            };
            return { jumpTo, animateTo };
        }

        function resetWorkspace({ preserveBaseline = false, message } = {}) {
            state.apps = [createEmptyApp()];
            lastPreviewState = { success: false, payload: null };
            lastExportEvaluation = { valid: false, reasons: [] };
            if (!preserveBaseline) {
                remoteBaselinePayload = null;
            }
            if (previewArea) {
                previewArea.value = '';
            }
            if (validationStatus) {
                utils.setValidationStatus(validationStatus, {
                    status: 'info',
                    message: message || 'Workspace reset. Add an app to start building.'
                });
            }
            setFetchState('idle');
            if (builderLayout) {
                builderLayout.classList.remove('builder-columns--with-diff');
            }
            updateDiffSheet();
            touchWorkspace();
            render({ skipPreview: true });
        }

        function setupCollapsibleCard(card, toggle, content, { defaultExpanded } = {}) {
            const resolvedToggle = toggle || card?.querySelector('[data-collapsible-toggle]');
            const resolvedContent = content || card?.querySelector('[data-collapsible-content]');
            const animator = createCollapsibleAnimator(resolvedContent);
            const deriveExpanded = () => {
                if (typeof defaultExpanded === 'boolean') {
                    return defaultExpanded;
                }
                return card?.dataset?.collapsed === 'false';
            };

            const applyState = (expanded, { animate = true } = {}) => {
                const isExpanded = Boolean(expanded);
                if (card) {
                    card.dataset.collapsed = isExpanded ? 'false' : 'true';
                }
                if (resolvedContent) {
                    if (animate) {
                        animator.animateTo(isExpanded);
                    } else {
                        animator.jumpTo(isExpanded);
                    }
                }
                if (resolvedToggle) {
                    resolvedToggle.setAttribute('aria-expanded', String(isExpanded));
                    if (resolvedContent?.id) {
                        resolvedToggle.setAttribute('aria-controls', resolvedContent.id);
                    }
                    const icon = resolvedToggle.querySelector('[data-collapsible-indicator]');
                    const iconGlyph = icon?.querySelector('.material-symbols-outlined') || icon;
                    if (iconGlyph) {
                        iconGlyph.textContent = isExpanded ? 'arrow_drop_up' : 'arrow_drop_down';
                    }
                    const label = resolvedToggle.querySelector('.collapsible-card__label');
                    if (label) {
                        label.textContent = isExpanded ? 'Collapse' : 'Expand';
                    }
                }
            };

            applyState(deriveExpanded(), { animate: false });

            if (resolvedToggle) {
                resolvedToggle.addEventListener('click', () => {
                    const nextExpanded = resolvedToggle.getAttribute('aria-expanded') !== 'true';
                    applyState(nextExpanded);
                });
            }
        }

        function setPreviewStatus(options) {
            utils.setValidationStatus(validationStatus, options);
            updateToolbarPulse();
        }

        setupCollapsibleCard(githubCard, githubToggle, githubContent, { defaultExpanded: false });
        if (builderRoot) {
            builderRoot.querySelectorAll('[data-collapsible-card]').forEach((card) => {
                if (card !== githubCard) {
                    setupCollapsibleCard(card);
                }
            });
        }
        updateLastEditedDisplay();
        if (githubStepper) {
            setGithubStep(0);
        }
        syncFiltersFromChipSet();

        function captureScreenshotScrollPositions() {
            const positions = new Map();
            if (!entriesContainer) {
                return positions;
            }
            entriesContainer
                .querySelectorAll('.screenshot-carousel__viewport, .screenshot-list')
                .forEach((list) => {
                    const key =
                        list.dataset.scrollKey || list.id || `app-${list.dataset.appIndex || ''}`;
                    if (!key || positions.has(key)) {
                        return;
                    }
                    positions.set(key, {
                        left: list.scrollLeft,
                        top: list.scrollTop
                    });
                });
            return positions;
        }

        function restoreScreenshotScrollPositions(positions) {
            if (!positions || !positions.size || !entriesContainer) {
                return;
            }
            const restore = () => {
                entriesContainer
                    .querySelectorAll('.screenshot-carousel__viewport, .screenshot-list')
                    .forEach((list) => {
                        const key =
                            list.dataset.scrollKey || list.id || `app-${list.dataset.appIndex || ''}`;
                        const scrollPosition = key ? positions.get(key) : null;
                        if (scrollPosition) {
                            list.scrollTo({
                                left: scrollPosition.left,
                                top: scrollPosition.top,
                                behavior: 'auto'
                            });
                        }
                    });
            };
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(restore);
            } else {
                restore();
            }
        }

        function render({ skipPreview = false } = {}) {
            if (!entriesContainer) return;
            const screenshotScrollState = captureScreenshotScrollPositions();
            utils.clearElement(entriesContainer);
            if (!state.apps.length) {
                state.apps.push(createEmptyApp());
            }
            sortAppsInPlace();
            updateSortUi();
            state.apps.forEach((app) => ensureScreenshotList(app));
            state.apps.forEach((app, index) => {
                entriesContainer.appendChild(createAppCard(app, index));
            });
            restoreScreenshotScrollPositions(screenshotScrollState);
            if (skipPreview) {
                updateWorkspaceMetrics();
                updateToolbarPulse();
                updateExportControls();
            } else {
                requestPreviewUpdate();
            }
            applyCardFilters();
        }

        function createAppCard(app, index) {
            const card = utils.createElement('div', { classNames: ['builder-card', 'app-entry-card'] });
            card.dataset.index = String(index);
            const meta = state.apps[index]._meta || deriveAppMeta(app, sanitizeAppEntry(app));
            card.dataset.pendingReleaseReady = meta.cohorts.pendingReleaseReady ? 'true' : 'false';
            card.dataset.needsScreenshots = meta.cohorts.needsScreenshots ? 'true' : 'false';

            const header = utils.createElement('div', { classNames: ['builder-card-header'] });
            header.appendChild(utils.createElement('h3', { text: `App ${index + 1}` }));
            const removeButton = utils.createInlineButton({ 
                label: 'Remove',
                icon: 'delete',
                variant: 'danger',
                title: 'Remove app entry',
                onClick: () => {
                    if (state.apps.length === 1) {
                        state.apps[0] = createEmptyApp();
                    } else {
                        state.apps.splice(index, 1);
                    }
                    touchWorkspace();
                    render();
                }
            });
            header.appendChild(removeButton);
            card.appendChild(header);

            const fields = utils.createElement('ul', {
                classNames: ['builder-card-fields', 'builder-card-list']
            });
            fields.setAttribute('role', 'list');

            const createFieldGroup = (element, { assistChips, helper } = {}) => {
                const wrapper = utils.createElement('li', {
                    classNames: ['builder-field-group', 'builder-field-group--list']
                });
                wrapper.setAttribute('role', 'listitem');
                wrapper.appendChild(element);
                if (assistChips) {
                    wrapper.appendChild(assistChips);
                }
                if (helper) {
                    wrapper.appendChild(helper);
                }
                fields.appendChild(wrapper);
            };

            const createFieldHelper = ({ id, text, media = false }) => {
                const helper = document.createElement('div');
                helper.className = media
                    ? 'builder-field-helper builder-field-helper--media'
                    : 'builder-field-helper';
                helper.dataset.state = 'info';
                helper.setAttribute('aria-live', 'polite');
                if (id) {
                    helper.id = id;
                }

                let previewContainer = null;
                let previewImage = null;
                if (media) {
                    previewContainer = document.createElement('div');
                    previewContainer.className = 'builder-field-helper-preview';
                    previewContainer.dataset.state = 'empty';
                    previewContainer.setAttribute('aria-hidden', 'true');
                    previewImage = document.createElement('img');
                    previewImage.alt = '';
                    previewImage.decoding = 'async';
                    previewImage.referrerPolicy = 'no-referrer';
                    previewImage.width = 64;
                    previewImage.height = 64;
                    previewContainer.appendChild(previewImage);
                    helper.appendChild(previewContainer);
                }

                const messageEl = document.createElement('span');
                messageEl.className = 'builder-field-helper-text';
                messageEl.textContent = text;
                helper.appendChild(messageEl);

                const setState = (state, message, { previewSrc } = {}) => {
                    helper.dataset.state = state;
                    if (typeof message === 'string') {
                        messageEl.textContent = message;
                    }
                    if (previewContainer && previewImage) {
                        if (state === 'loading') {
                            previewContainer.dataset.state = 'loading';
                            previewImage.removeAttribute('src');
                        } else if (state === 'error') {
                            previewContainer.dataset.state = 'error';
                            if (previewSrc) {
                                previewImage.src = previewSrc;
                            } else {
                                previewImage.removeAttribute('src');
                            }
                        } else if (previewSrc) {
                            previewContainer.dataset.state = 'ready';
                            previewImage.src = previewSrc;
                        } else {
                            previewContainer.dataset.state = 'empty';
                            previewImage.removeAttribute('src');
                        }
                    }
                };

                const reset = () => {
                    setState('info', text);
                };

                return { element: helper, setState, reset };
            };

            /**
             * @param {{label: string, value?: string, placeholder?: string, rows?: number, multiline?: boolean, type?: string, onInput?: (value: string) => void}} options
             */
            const buildOutlinedTextField = ({
                label,
                value = '',
                placeholder = '',
                rows = 3,
                multiline = false,
                type = 'text',
                onInput = () => {}
            }) => {
                const field = document.createElement('md-outlined-text-field');
                field.setAttribute('label', label || '');
                if (placeholder) {
                    field.setAttribute('placeholder', placeholder);
                }
                if (multiline) {
                    field.setAttribute('multiline', '');
                    field.setAttribute('rows', String(rows));
                }
                if (type !== 'text') {
                    field.setAttribute('type', type);
                }
                field.value = value || '';
                field.addEventListener('input', (event) => {
                    onInput(event.target.value);
                });
                return field;
            };

            const nameField = buildOutlinedTextField({ 
                label: 'App name',
                value: app.name,
                onInput: (value) => {
                    state.apps[index].name = value;
                    touchWorkspace();
                    requestPreviewUpdate();
                }
            });
            createFieldGroup(nameField);

            const packageHelperId = `app-package-helper-${index}`;
            const packageHelper = createFieldHelper({
                id: packageHelperId,
                text: 'Use reverse-domain package IDs (e.g., com.vendor.app).'
            });
            const validatePackageField = (value) => {
                const trimmed = utils.trimString(value);
                if (!trimmed) {
                    packageHelper.setState(
                        'info',
                        'Package name is required when exporting to release channels.'
                    );
                    packageField.error = false;
                    return;
                }
                if (!PACKAGE_NAME_PATTERN.test(trimmed)) {
                    packageHelper.setState(
                        'error',
                        'Enter a reverse-domain package name like com.vendor.app.'
                    );
                    packageField.error = true;
                    return;
                }
                packageHelper.setState('success', 'Looks good — reverse-domain pattern detected.');
                packageField.error = false;
            };

            const packageField = buildOutlinedTextField({ 
                label: 'Package name',
                value: app.packageName,
                placeholder: 'com.example.app',
                onInput: (value) => {
                    state.apps[index].packageName = value;
                    touchWorkspace();
                    requestPreviewUpdate();
                    validatePackageField(value);
                }
            });
            packageField.setAttribute('aria-describedby', packageHelperId);
            validatePackageField(app.packageName);
            createFieldGroup(packageField, { helper: packageHelper.element });

            const categorySelect = document.createElement('md-outlined-select');
            categorySelect.setAttribute('label', 'Category');
            const placeholderOption = document.createElement('md-select-option');
            placeholderOption.setAttribute('value', '');
            placeholderOption.textContent = 'Select category';
            categorySelect.appendChild(placeholderOption);
            const knownCategoryIds = new Set();
            const normalizedCategory = normalizeCategoryInput(app.category);
            const selectedCategoryId = normalizedCategory.category_id;
            GOOGLE_PLAY_CATEGORIES.forEach(({ id, label }) => {
                const option = document.createElement('md-select-option');
                option.setAttribute('value', id);
                option.textContent = label;
                if (id === selectedCategoryId) {
                    option.setAttribute('selected', '');
                }
                knownCategoryIds.add(id);
                categorySelect.appendChild(option);
            });
            if (selectedCategoryId && !knownCategoryIds.has(selectedCategoryId)) {
                const customOption = document.createElement('md-select-option');
                customOption.setAttribute('value', selectedCategoryId);
                customOption.textContent = normalizedCategory.label || selectedCategoryId;
                customOption.setAttribute('selected', '');
                categorySelect.appendChild(customOption);
            }
            categorySelect.value = selectedCategoryId || '';
            categorySelect.addEventListener('change', () => {
                const value = utils.trimString(categorySelect.value || '');
                state.apps[index].category = value
                    ? normalizeCategoryInput(value)
                    : createEmptyCategory();
                touchWorkspace();
                requestPreviewUpdate();
            });
            createFieldGroup(categorySelect);

            const descriptionField = buildOutlinedTextField({ 
                label: 'Description',
                value: app.description,
                multiline: true,
                rows: 4,
                onInput: (value) => {
                    state.apps[index].description = value;
                    touchWorkspace();
                    requestPreviewUpdate();
                }
            });
            createFieldGroup(descriptionField);

            const iconHelperId = `app-icon-helper-${index}`;
            const iconHelper = createFieldHelper({
                id: iconHelperId,
                text: 'Provide an HTTPS icon URL (512×512 recommended).',
                media: true
            });
            let iconValidationRequest = 0;
            const iconOverrideToggle = document.createElement('md-checkbox');
            iconOverrideToggle.classList.add('builder-icon-override');
            iconOverrideToggle.label = 'Override size warning';
            iconOverrideToggle.hidden = true;
            const iconValidationState = ensureValidation(index).icon;
            iconOverrideToggle.checked = Boolean(iconValidationState.override);
            iconOverrideToggle.addEventListener('change', () => {
                const validation = ensureValidation(index).icon;
                validation.override = iconOverrideToggle.checked;
                iconField.error = validation.status === 'warning' && !validation.override;
                updateExportControls();
            });
            iconHelper.element.appendChild(iconOverrideToggle);

            const validateIconField = (value) => {
                const trimmed = utils.trimString(value);
                const requestId = ++iconValidationRequest;
                const validation = ensureValidation(index).icon;
                if (!trimmed) {
                    iconHelper.setState('info', 'Provide an HTTPS icon URL (512×512 recommended).');
                    iconField.error = false;
                    validation.status = 'idle';
                    validation.width = 0;
                    validation.height = 0;
                    validation.override = false;
                    iconOverrideToggle.hidden = true;
                    iconOverrideToggle.checked = false;
                    updateExportControls();
                    return;
                }
                if (!/^https:\/\//i.test(trimmed)) {
                    iconHelper.setState('error', 'Icon URL must start with https://');
                    iconField.error = true;
                    validation.status = 'error';
                    validation.width = 0;
                    validation.height = 0;
                    validation.override = false;
                    iconOverrideToggle.hidden = true;
                    iconOverrideToggle.checked = false;
                    updateExportControls();
                    return;
                }
                iconHelper.setState('loading', 'Checking icon…');
                iconField.error = false;
                validation.status = 'loading';
                iconOverrideToggle.hidden = true;
                iconOverrideToggle.checked = Boolean(validation.override);
                const probe = new Image();
                probe.decoding = 'async';
                probe.referrerPolicy = 'no-referrer';
                probe.onload = () => {
                    if (requestId !== iconValidationRequest) {
                        return;
                    }
                    const { naturalWidth, naturalHeight } = probe;
                    if (naturalWidth >= 512 && naturalHeight >= 512) {
                        iconHelper.setState(
                            'success',
                            `Ready · ${naturalWidth}×${naturalHeight} pixels`,
                            { previewSrc: trimmed }
                        );
                        iconField.error = false;
                        validation.status = 'success';
                        validation.width = naturalWidth;
                        validation.height = naturalHeight;
                        validation.override = false;
                        iconOverrideToggle.hidden = true;
                        iconOverrideToggle.checked = false;
                    } else {
                        validation.status = 'warning';
                        validation.width = naturalWidth;
                        validation.height = naturalHeight;
                        const currentOverride = Boolean(validation.override);
                        iconOverrideToggle.hidden = false;
                        iconOverrideToggle.checked = currentOverride;
                        iconHelper.setState(
                            'warning',
                            `Icon is ${naturalWidth}×${naturalHeight}. Enable the override to proceed.`,
                            { previewSrc: trimmed }
                        );
                        iconField.error = !currentOverride;
                        validation.override = currentOverride;
                    }
                    updateExportControls();
                };
                probe.onerror = () => {
                    if (requestId !== iconValidationRequest) {
                        return;
                    }
                    iconHelper.setState('error', 'Unable to load icon preview.');
                    iconField.error = true;
                    validation.status = 'error';
                    validation.width = 0;
                    validation.height = 0;
                    validation.override = false;
                    iconOverrideToggle.hidden = true;
                    iconOverrideToggle.checked = false;
                    updateExportControls();
                };
                probe.src = trimmed;
            };

            const iconField = buildOutlinedTextField({ 
                label: 'Icon URL',
                value: app.iconLogo,
                placeholder: 'https://example.com/icon.png',
                onInput: (value) => {
                    state.apps[index].iconLogo = value;
                    touchWorkspace();
                    requestPreviewUpdate();
                    validateIconField(value);
                }
            });
            iconField.setAttribute('aria-describedby', iconHelperId);
            validateIconField(app.iconLogo);
            createFieldGroup(iconField, { helper: iconHelper.element });

            const screenshotsSection = utils.createElement('div', {
                classNames: ['builder-subsection', 'builder-screenshots']
            });
            const screenshotHeaderId = `appToolkitScreenshotsHeader-${index}`;
            const screenshotHeader = utils.createElement('div', {
                classNames: ['builder-subsection-header'],
                attrs: { id: screenshotHeaderId }
            });
            screenshotHeader.appendChild(utils.createElement('h4', { text: 'Screenshots' }));
            const screenshotCountChip = utils.createElement('span', {
                classNames: ['builder-hint-chip'],
                text: ''
            });
            screenshotCountChip.id = `${screenshotHeaderId}-count`;
            screenshotHeader.appendChild(screenshotCountChip);
            screenshotsSection.appendChild(screenshotHeader);

            const screenshotListId = `appToolkitScreenshotsList-${index}`;
            const carouselId = `appToolkitScreenshotCarousel-${index}`;
            const statusId = `${carouselId}-status`;
            const liveRegionId = `${statusId}-live`;

            const screenshotsList = document.createElement('div');
            screenshotsList.classList.add('screenshot-list');
            screenshotsList.dataset.appIndex = String(index);
            screenshotsList.id = screenshotListId;
            screenshotsList.setAttribute('role', 'list');
            screenshotsList.setAttribute('aria-describedby', statusId);
            screenshotsList.tabIndex = 0;

            const attachScreenshotItem = (screenshotItem) => {
                screenshotItem.setAttribute('role', 'listitem');
                screenshotItem.tabIndex = -1;
                screenshotItem.addEventListener('focusin', () => {
                    activeScreenshotIndex = Number(screenshotItem.dataset.screenshotIndex) || 0;
                    scheduleCarouselUpdate();
                });
                screenshotsList.appendChild(screenshotItem);
            };

            const carousel = utils.createElement('div', {
                classNames: ['screenshot-carousel'],
                attrs: {
                    id: carouselId,
                    role: 'region',
                    'aria-labelledby': screenshotHeaderId,
                    dataset: { appIndex: String(index) }
                }
            });
            const carouselViewport = utils.createElement('div', {
                classNames: ['screenshot-carousel__viewport'],
                attrs: { dataset: { scrollKey: screenshotListId } }
            });
            carouselViewport.appendChild(screenshotsList);

            const createNavButton = (direction) => {
                const isNext = direction === 'next';
                const button = utils.createElement('button', {
                    classNames: [
                        'screenshot-carousel__nav',
                        isNext ? 'screenshot-carousel__nav--next' : 'screenshot-carousel__nav--prev'
                    ],
                    attrs: {
                        type: 'button',
                        'aria-label': isNext
                            ? 'Show next screenshots'
                            : 'Show previous screenshots',
                        'aria-controls': screenshotListId
                    }
                });
                button.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${
                    isNext ? 'chevron_right' : 'chevron_left'
                }</span>`;
                return button;
            };

            const previousButton = createNavButton('previous');
            const nextButton = createNavButton('next');

            const indicatorList = utils.createElement('div', {
                classNames: ['screenshot-carousel__indicators'],
                attrs: { role: 'tablist', 'aria-label': 'Screenshot progress' }
            });

            const carouselStatus = utils.createElement('div', {
                classNames: ['screenshot-carousel__status'],
                attrs: { id: statusId },
                text: '0/0'
            });

            const liveRegion = utils.createElement('div', {
                classNames: ['sr-only'],
                attrs: { id: liveRegionId, 'aria-live': 'polite', 'aria-atomic': 'true' }
            });

            carousel.appendChild(previousButton);
            carousel.appendChild(carouselViewport);
            carousel.appendChild(nextButton);
            carousel.appendChild(indicatorList);
            carousel.appendChild(carouselStatus);
            carousel.appendChild(liveRegion);

            let hintElement = null;
            let hintHideTimer = null;
            const hideHint = () => {
                if (!hintElement) {
                    return;
                }
                if (hintElement.dataset.state === 'hidden') {
                    return;
                }
                hintElement.dataset.state = 'hidden';
                if (hintHideTimer) {
                    clearTimeout(hintHideTimer);
                    hintHideTimer = null;
                }
                markScreenshotHintSeen();
            };

            if (!screenshotHintSeen) {
                hintElement = utils.createElement('div', {
                    classNames: ['screenshot-carousel__hint'],
                    text: 'Scroll or use the arrows to see more screenshots.'
                });
                hintElement.dataset.state = 'visible';
                carousel.appendChild(hintElement);
                if (typeof window !== 'undefined') {
                    hintHideTimer = window.setTimeout(() => {
                        hideHint();
                    }, 6000);
                }
            }

            const dismissHint = () => {
                hideHint();
            };

            const getScreenshotItems = () =>
                Array.from(screenshotsList.querySelectorAll('.screenshot-item'));

            let activeScreenshotIndex = 0;
            let scheduledCarouselUpdate = null;
            let indicatorCount = 0;

            const updateCarouselState = ({ announce = false } = {}) => {
                const items = getScreenshotItems();
                const total = items.length;
                carousel.dataset.count = String(total);
                carousel.dataset.hasNav = total > 1 ? 'true' : 'false';
                if (!total) {
                    carouselStatus.textContent = '0/0';
                    carouselStatus.dataset.count = '0';
                    liveRegion.textContent = '';
                    previousButton.disabled = true;
                    nextButton.disabled = true;
                    carousel.dataset.edgeStart = 'true';
                    carousel.dataset.edgeEnd = 'true';
                    indicatorCount = 0;
                    utils.clearElement(indicatorList);
                    indicatorList.hidden = true;
                    return;
                }
                if (activeScreenshotIndex >= total) {
                    activeScreenshotIndex = total - 1;
                }
                if (activeScreenshotIndex < 0) {
                    activeScreenshotIndex = 0;
                }
                const viewportRect = carouselViewport.getBoundingClientRect();
                let bestIndex = activeScreenshotIndex;
                let bestDistance = Infinity;
                items.forEach((item, idx) => {
                    const rect = item.getBoundingClientRect();
                    const distance = Math.abs(rect.left - viewportRect.left);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestIndex = idx;
                    }
                });
                activeScreenshotIndex = bestIndex;
                items.forEach((item, idx) => {
                    const isActive = idx === activeScreenshotIndex;
                    item.classList.toggle('is-active', isActive);
                    if (isActive) {
                        item.dataset.active = 'true';
                    } else {
                        delete item.dataset.active;
                    }
                });
                const labelIndex = activeScreenshotIndex + 1;
                carouselStatus.textContent = `${labelIndex}/${total}`;
                carouselStatus.dataset.count = String(total);
                if (announce) {
                    liveRegion.textContent = `Screenshot ${labelIndex} of ${total}`;
                }
                const scrollLeft = carouselViewport.scrollLeft;
                const maxScrollLeft = Math.max(
                    0,
                    carouselViewport.scrollWidth - carouselViewport.clientWidth
                );
                const atStart = scrollLeft <= 2;
                const atEnd = scrollLeft >= maxScrollLeft - 2;
                const navDisabled = total <= 1;
                const startEdge = navDisabled ? true : atStart;
                const endEdge = navDisabled ? true : atEnd;
                carousel.dataset.edgeStart = startEdge ? 'true' : 'false';
                carousel.dataset.edgeEnd = endEdge ? 'true' : 'false';
                previousButton.disabled = startEdge;
                nextButton.disabled = endEdge;
                previousButton.hidden = total === 0;
                nextButton.hidden = total === 0;
                const disabledHint = navDisabled
                    ? 'Add more screenshots to enable navigation'
                    : '';
                previousButton.title = disabledHint || 'Show previous screenshots';
                nextButton.title = disabledHint || 'Show next screenshots';
                if (indicatorCount !== total) {
                    utils.clearElement(indicatorList);
                    for (let i = 0; i < total; i += 1) {
                        const indicator = utils.createElement('button', {
                            classNames: ['screenshot-carousel__indicator'],
                            attrs: {
                                type: 'button',
                                'aria-label': `Go to screenshot ${i + 1}`
                            }
                        });
                        indicator.addEventListener('click', () => scrollToScreenshot(i));
                        indicatorList.appendChild(indicator);
                    }
                    indicatorCount = total;
                }
                indicatorList.hidden = total <= 1;
                indicatorList.querySelectorAll('.screenshot-carousel__indicator').forEach((dot, idx) => {
                    dot.dataset.active = idx === activeScreenshotIndex ? 'true' : 'false';
                });
                if (navDisabled) {
                    liveRegion.textContent = '';
                }
            };

            const scheduleCarouselUpdate = ({ announce = false } = {}) => {
                const run = () => {
                    scheduledCarouselUpdate = null;
                    updateCarouselState({ announce });
                };
                if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
                    run();
                    return;
                }
                if (scheduledCarouselUpdate) {
                    window.cancelAnimationFrame(scheduledCarouselUpdate);
                }
                scheduledCarouselUpdate = window.requestAnimationFrame(run);
            };

            const addScreenshotsToCarousel = (sources, { announce = false } = {}) => {
                const previousLength = state.apps[index].screenshots.length;
                const additions = appendScreenshots(index, sources);
                if (!additions.length) {
                    return [];
                }
                const startIndex = previousLength;
                additions.forEach((entry, offset) => {
                    const screenshotItem = createScreenshotField(index, startIndex + offset, entry, {
                        onChange: () => updateScreenshotsState()
                    });
                    attachScreenshotItem(screenshotItem);
                });
                activeScreenshotIndex = state.apps[index].screenshots.length - 1;
                touchWorkspace();
                requestPreviewUpdate();
                updateScreenshotsState({ announce });
                return additions;
            };

            const getCarouselStep = () => {
                const items = getScreenshotItems();
                if (items.length) {
                    const firstRect = items[0].getBoundingClientRect();
                    let gap = 0;
                    if (items.length > 1) {
                        const secondRect = items[1].getBoundingClientRect();
                        gap = Math.max(0, secondRect.left - firstRect.right);
                    } else {
                        try {
                            const styles = window.getComputedStyle(screenshotsList);
                            const parsedGap = parseFloat(styles.columnGap || styles.gap || '0');
                            gap = Number.isFinite(parsedGap) ? parsedGap : 0;
                        } catch (error) {
                            gap = 0;
                        }
                    }
                    const step = firstRect.width + Math.max(0, gap);
                    if (step > 0) {
                        return step;
                    }
                }
                const viewportWidth = carouselViewport.getBoundingClientRect().width;
                return viewportWidth > 0 ? viewportWidth : 320;
            };

            const scrollCarouselBy = (direction = 1) => {
                const amount = getCarouselStep();
                if (!amount) {
                    return;
                }
                carouselViewport.scrollBy({
                    left: amount * direction,
                    behavior: 'smooth'
                });
            };

            const scrollToScreenshot = (targetIndex, { announce = true } = {}) => {
                const items = getScreenshotItems();
                if (!items.length) {
                    return;
                }
                const clamped = Math.max(0, Math.min(targetIndex, items.length - 1));
                const target = items[clamped];
                if (!target) {
                    return;
                }
                const prefersReducedMotion =
                    typeof window !== 'undefined' &&
                    window.matchMedia &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                target.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    inline: 'start',
                    block: 'nearest'
                });
                activeScreenshotIndex = clamped;
                scheduleCarouselUpdate({ announce });
            };

            const handleDragStart = (event) => {
                const item = event.target.closest('.screenshot-item[data-screenshot-index]');
                if (!item) {
                    return;
                }
                dismissHint();
                draggingScreenshot = {
                    appIndex: index,
                    from: Number(item.dataset.screenshotIndex)
                };
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.dataset.screenshotIndex);
                item.classList.add('dragging');
            };

            const isHorizontalScreenshotLayout = () => {
                const styles = window.getComputedStyle(screenshotsList);
                if (styles.display === 'grid') {
                    return styles.gridAutoFlow.includes('column');
                }
                if (styles.display === 'flex') {
                    return !styles.flexDirection.startsWith('column');
                }
                return false;
            };

            const getDropIndexFromEvent = (item, event) => {
                if (!item) {
                    return state.apps[index].screenshots.length;
                }
                const baseIndex = Number(item.dataset.screenshotIndex);
                const rect = item.getBoundingClientRect();
                const isHorizontal = isHorizontalScreenshotLayout();
                const offset = isHorizontal
                    ? event.clientX - rect.left
                    : event.clientY - rect.top;
                const dimension = isHorizontal ? rect.width : rect.height;
                if (offset > dimension / 2) {
                    return baseIndex + 1;
                }
                return baseIndex;
            };

            const updateDragOverHighlight = (dropIndex) => {
                screenshotsList
                    .querySelectorAll('.drag-over')
                    .forEach((el) => el.classList.remove('drag-over'));
                if (typeof dropIndex !== 'number') {
                    return;
                }
                const lastIndex = state.apps[index].screenshots.length - 1;
                if (lastIndex < 0) {
                    return;
                }
                const highlightIndex = Math.min(dropIndex, lastIndex);
                const highlightItem = screenshotsList.querySelector(
                    `.screenshot-item[data-screenshot-index="${highlightIndex}"]`
                );
                if (highlightItem) {
                    highlightItem.classList.add('drag-over');
                }
            };

            const handleDragEnd = (event) => {
                const item = event.target.closest('.screenshot-item[data-screenshot-index]');
                if (item) {
                    item.classList.remove('dragging');
                }
                draggingScreenshot = null;
                updateDragOverHighlight();
            };

            const handleDragOver = (event) => {
                if (!draggingScreenshot || draggingScreenshot.appIndex !== index) {
                    return;
                }
                const item = event.target.closest('.screenshot-item[data-screenshot-index]');
                event.preventDefault();
                const dropIndex = getDropIndexFromEvent(item, event);
                updateDragOverHighlight(dropIndex);
            };

            const handleDrop = (event) => {
                if (!draggingScreenshot || draggingScreenshot.appIndex !== index) {
                    return;
                }
                event.preventDefault();
                const item = event.target.closest('.screenshot-item[data-screenshot-index]');
                const targetIndex = getDropIndexFromEvent(item, event);
                moveScreenshot(index, draggingScreenshot.from, targetIndex);
                updateDragOverHighlight();
            };

            const handleScroll = () => {
                dismissHint();
                scheduleCarouselUpdate();
            };

            const handleWheel = (event) => {
                event.preventDefault();
                dismissHint();
                const normalizedDeltaX = event.deltaMode === 1 ? event.deltaX * 32 : event.deltaX;
                const normalizedDeltaY = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY;
                const delta =
                    Math.abs(normalizedDeltaX) > Math.abs(normalizedDeltaY)
                        ? normalizedDeltaX
                        : normalizedDeltaY;
                if (!delta) {
                    return;
                }
                carouselViewport.scrollBy({
                    left: delta,
                    behavior: Math.abs(delta) > 40 ? 'smooth' : 'auto'
                });
            };

            const handleKeydown = (event) => {
                if (event.defaultPrevented) {
                    return;
                }
                let handled = false;
                switch (event.key) {
                    case 'ArrowRight':
                    case 'ArrowDown':
                        scrollToScreenshot(activeScreenshotIndex + 1);
                        handled = true;
                        break;
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        scrollToScreenshot(activeScreenshotIndex - 1);
                        handled = true;
                        break;
                    case 'Home':
                        scrollToScreenshot(0);
                        handled = true;
                        break;
                    case 'End':
                        scrollToScreenshot(getScreenshotItems().length - 1);
                        handled = true;
                        break;
                    default:
                        break;
                }
                if (handled) {
                    event.preventDefault();
                    dismissHint();
                }
            };

            previousButton.addEventListener('focus', dismissHint);
            nextButton.addEventListener('focus', dismissHint);

            previousButton.addEventListener('click', () => {
                dismissHint();
                scrollCarouselBy(-1);
            });
            nextButton.addEventListener('click', () => {
                dismissHint();
                scrollCarouselBy(1);
            });

            screenshotsList.addEventListener('dragstart', handleDragStart);
            screenshotsList.addEventListener('dragend', handleDragEnd);
            screenshotsList.addEventListener('dragover', handleDragOver);
            screenshotsList.addEventListener('drop', handleDrop);
            carouselViewport.addEventListener('scroll', handleScroll, { passive: true });
            carouselViewport.addEventListener('wheel', handleWheel, { passive: false });
            carousel.addEventListener('wheel', handleWheel, { passive: false });
            screenshotsList.addEventListener('pointerdown', dismissHint);
            screenshotsList.addEventListener('touchstart', dismissHint, { passive: true });
            screenshotsList.addEventListener('mouseenter', dismissHint);
            screenshotsList.addEventListener('focus', dismissHint, true);
            screenshotsList.addEventListener('keydown', handleKeydown);

            const resizeObserver =
                typeof ResizeObserver !== 'undefined'
                    ? new ResizeObserver(() => scheduleCarouselUpdate())
                    : null;
            if (resizeObserver) {
                resizeObserver.observe(carouselViewport);
            }

            app.screenshots.forEach((entry, screenshotIndex) => {
                const screenshotItem = createScreenshotField(index, screenshotIndex, entry, {
                    onChange: () => updateScreenshotsState()
                });
                attachScreenshotItem(screenshotItem);
            });

            screenshotsSection.appendChild(carousel);

            const screenshotActions = document.createElement('div');
            screenshotActions.classList.add('screenshot-actions');
            screenshotActions.setAttribute('role', 'group');

            const urlField = document.createElement('md-outlined-text-field');
            urlField.setAttribute('label', 'Screenshot URL');
            urlField.setAttribute('placeholder', 'https://example.com/screenshot.png');
            urlField.setAttribute('inputmode', 'url');
            urlField.supportingText = 'Paste an HTTPS link and click Add URL';

            const addUrlButton = document.createElement('md-outlined-button');
            addUrlButton.classList.add('builder-remote-inline-button', 'builder-button');
            const addUrlIcon = document.createElement('md-icon');
            addUrlIcon.setAttribute('slot', 'icon');
            addUrlIcon.innerHTML =
                '<span class="material-symbols-outlined">add_link</span>';
            addUrlButton.setAttribute('has-icon', '');
            addUrlButton.appendChild(addUrlIcon);
            addUrlButton.appendChild(document.createTextNode('Add URL'));

            const setUrlFeedback = (message, { isError = false } = {}) => {
                urlField.supportingText = message || '';
                urlField.error = Boolean(isError && message);
            };

            const commitUrl = async () => {
                const trimmed = utils.trimString(urlField.value || '');
                if (!trimmed) {
                    setUrlFeedback('Enter a screenshot URL to add.', { isError: true });
                    return;
                }
                setUrlFeedback('');
                try {
                    await verifyScreenshotUrlLoads(trimmed);
                } catch (error) {
                    setUrlFeedback(
                        error.message || 'Unable to load screenshot. Check the link.',
                        { isError: true }
                    );
                    return;
                }
                const additions = addScreenshotsToCarousel([trimmed], { announce: true });
                if (additions.length) {
                    urlField.value = '';
                } else {
                    setUrlFeedback('Enter a valid screenshot URL starting with http or https.', {
                        isError: true
                    });
                }
            };

            addUrlButton.addEventListener('click', () => {
                void commitUrl();
            });
            urlField.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    void commitUrl();
                }
            });

            const urlFieldContainer = document.createElement('div');
            urlFieldContainer.classList.add('screenshot-actions__field');
            urlFieldContainer.appendChild(urlField);

            screenshotActions.appendChild(urlFieldContainer);
            screenshotActions.appendChild(addUrlButton);

            const handleScreenshotImport = async (event) => {
                event.preventDefault();
                const sources = [];
                const files = event.dataTransfer?.files;
                if (files && files.length) {
                    const fileUrls = await Promise.all(
                        Array.from(files)
                            .filter((file) => !file.type || file.type.startsWith('image/'))
                            .map((file) =>
                                readFileAsDataUrl(file).catch(() => {
                                    console.warn('AppToolkit: Unable to read dropped image file.');
                                    return null;
                                })
                            )
                    );
                    fileUrls.filter(Boolean).forEach((value) => sources.push(String(value)));
                }
                const textData =
                    event.dataTransfer?.getData('text/uri-list') ||
                    event.dataTransfer?.getData('text/plain');
                if (textData) {
                    textData
                        .split(/\s+/)
                        .map((segment) => segment.trim())
                        .filter(Boolean)
                        .forEach((value) => sources.push(value));
                }
                if (sources.length) {
                    addScreenshotsToCarousel(sources, { announce: true });
                }
            };
            screenshotActions.addEventListener('dragover', (event) => {
                if (event.dataTransfer) {
                    event.preventDefault();
                }
            });
            screenshotActions.addEventListener('drop', handleScreenshotImport);
            screenshotActions.addEventListener('paste', (event) => {
                if (event.target !== urlField) {
                    const text = event.clipboardData?.getData('text');
                    if (text) {
                        event.preventDefault();
                        const pastedUrls = text
                            .split(/\s+/)
                            .map((segment) => segment.trim())
                            .filter(Boolean);
                        if (pastedUrls.length) {
                            addScreenshotsToCarousel(pastedUrls, { announce: true });
                        }
                    }
                }
            });

            screenshotsSection.appendChild(screenshotActions);

            function updateScreenshotsState({ announce = false } = {}) {
                const count = getFilledScreenshotCount(index);
                if (count >= 3) {
                    screenshotsSection.dataset.countState = 'ready';
                    screenshotCountChip.dataset.state = 'complete';
                    screenshotCountChip.textContent = `${count} screenshots ready`;
                } else {
                    screenshotsSection.dataset.countState = 'needs';
                    screenshotCountChip.dataset.state = 'warning';
                    screenshotCountChip.textContent = `${count}/3 screenshots added`;
                }
                scheduleCarouselUpdate({ announce });
            }

            updateCarouselState();
            updateScreenshotsState();
            const screenshotGroup = utils.createElement('li', {
                classNames: [
                    'builder-field-group',
                    'builder-field-group--list',
                    'builder-field-group--screenshots'
                ]
            });
            screenshotGroup.setAttribute('role', 'listitem');
            screenshotGroup.appendChild(screenshotsSection);
            fields.appendChild(screenshotGroup);
            card.appendChild(fields);
            return card;
        }

        function moveScreenshot(appIndex, from, to) {
            const list = state.apps[appIndex]?.screenshots;
            if (!Array.isArray(list)) {
                return;
            }
            if (from === to || from < 0 || from >= list.length) {
                return;
            }
            let targetIndex = typeof to === 'number' ? to : list.length - 1;
            if (targetIndex < 0) {
                targetIndex = 0;
            }
            if (targetIndex > list.length) {
                targetIndex = list.length;
            }
            const [moved] = list.splice(from, 1);
            if (targetIndex > from) {
                targetIndex -= 1;
            }
            list.splice(targetIndex, 0, moved);
            moveScreenshotMeta(appIndex, from, targetIndex);
            touchWorkspace();
            render();
        }

        function createScreenshotField(appIndex, screenshotIndex, value, { onChange } = {}) {
            const appName = utils.trimString(
                state.apps[appIndex]?.packageName || state.apps[appIndex]?.name || ''
            );
            const existingMeta = getScreenshotMeta(appIndex, screenshotIndex);
            const normalizedValue = normalizeScreenshotEntry(
                value,
                state.apps[appIndex]?.screenshots?.[screenshotIndex]
            );
            setScreenshotEntry(appIndex, screenshotIndex, normalizedValue);
            const urlValue = normalizedValue.url;
            if (
                typeof window !== 'undefined' &&
                window.AppToolkitScreenshotField &&
                typeof window.AppToolkitScreenshotField.create === 'function'
            ) {
                const element = window.AppToolkitScreenshotField.create({
                    appIndex,
                    screenshotIndex,
                    value: urlValue,
                    appName,
                    onChange: (nextValue) => {
                        setScreenshotEntry(appIndex, screenshotIndex, {
                            url: nextValue,
                            aspectRatio:
                                state.apps[appIndex]?.screenshots?.[screenshotIndex]?.aspectRatio || ''
                        });
                        touchWorkspace();
                        requestPreviewUpdate();
                        if (typeof onChange === 'function') {
                            onChange();
                        }
                    },
                    onRemove: () => {
                        state.apps[appIndex].screenshots.splice(screenshotIndex, 1);
                        removeScreenshotMeta(appIndex, screenshotIndex);
                        if (!state.apps[appIndex].screenshots.length) {
                            state.apps[appIndex].screenshots.push(createEmptyScreenshotEntry());
                        }
                        touchWorkspace();
                        render();
                    },
                    onMeta: (meta) => {
                        if (meta && meta.width && meta.height) {
                            setScreenshotMeta(appIndex, screenshotIndex, {
                                width: meta.width,
                                height: meta.height,
                                ratio: meta.ratio || formatAspectRatio(meta.width, meta.height)
                            });
                            applyScreenshotAspectRatio(
                                appIndex,
                                screenshotIndex,
                                meta.ratio || formatAspectRatio(meta.width, meta.height)
                            );
                        } else {
                            setScreenshotMeta(appIndex, screenshotIndex, null);
                            applyScreenshotAspectRatio(appIndex, screenshotIndex, '');
                        }
                    }
                });
                if (existingMeta && element) {
                    element.meta = existingMeta;
                }
                return element;
            }
            return legacyCreateScreenshotField(appIndex, screenshotIndex, normalizedValue, {
                onChange
            });
        }

        function legacyCreateScreenshotField(appIndex, screenshotIndex, value, { onChange } = {}) {
            const item = document.createElement('div');
            item.classList.add('screenshot-item');
            item.dataset.appIndex = String(appIndex);
            item.dataset.screenshotIndex = String(screenshotIndex);
            item.draggable = true;
            item.setAttribute('role', 'listitem');
            item.tabIndex = -1;

            const actionsRow = document.createElement('div');
            actionsRow.classList.add('screenshot-item-actions');

            const dragHandle = document.createElement('md-icon-button');
            dragHandle.classList.add('screenshot-drag-handle');
            dragHandle.innerHTML = '<span class="material-symbols-outlined">drag_indicator</span>';
            actionsRow.appendChild(dragHandle);

            const actionsEnd = document.createElement('div');
            actionsEnd.classList.add('screenshot-item-actions-end');

            const removeButton = document.createElement('md-icon-button');
            removeButton.setAttribute('aria-label', 'Remove screenshot');
            removeButton.innerHTML = '<span class="material-symbols-outlined">delete</span>';
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                state.apps[appIndex].screenshots.splice(screenshotIndex, 1);
                removeScreenshotMeta(appIndex, screenshotIndex);
                if (!state.apps[appIndex].screenshots.length) {
                    state.apps[appIndex].screenshots.push(createEmptyScreenshotEntry());
                }
                touchWorkspace();
                render();
            });
            actionsEnd.appendChild(removeButton);

            actionsRow.appendChild(actionsEnd);
            item.appendChild(actionsRow);

            const thumbnailWrapper = document.createElement('div');
            thumbnailWrapper.classList.add('screenshot-thumbnail');
            const thumbnail = document.createElement('img');
            thumbnail.alt = `Screenshot ${screenshotIndex + 1}`;
            thumbnail.decoding = 'async';
            thumbnail.loading = 'lazy';
            thumbnail.referrerPolicy = 'no-referrer';
            thumbnailWrapper.appendChild(thumbnail);
            item.appendChild(thumbnailWrapper);

            const infoContainer = document.createElement('div');
            infoContainer.classList.add('screenshot-info');

            const textField = document.createElement('md-outlined-text-field');
            textField.setAttribute('label', `Screenshot ${screenshotIndex + 1}`);
            textField.setAttribute('placeholder', 'https://example.com/screenshot.png');
            textField.value = getScreenshotUrl(value) || '';
            textField.addEventListener('input', (event) => {
                const nextValue = event.target.value;
                setScreenshotEntry(appIndex, screenshotIndex, {
                    url: nextValue,
                    aspectRatio:
                        state.apps[appIndex]?.screenshots?.[screenshotIndex]?.aspectRatio || ''
                });
                updateThumbnail(nextValue);
                touchWorkspace();
                requestPreviewUpdate();
                if (typeof onChange === 'function') {
                    onChange();
                }
            });
            infoContainer.appendChild(textField);

            const metaInfo = document.createElement('div');
            metaInfo.classList.add('screenshot-meta');
            infoContainer.appendChild(metaInfo);

            item.appendChild(infoContainer);

            const applyMetaInfo = (meta) => {
                if (meta && meta.width && meta.height) {
                    const ratioText = meta.ratio ? ` · ${meta.ratio}` : '';
                    metaInfo.dataset.state = meta.state || 'info';
                    metaInfo.textContent = `${meta.width}×${meta.height}${ratioText}`;
                } else {
                    metaInfo.dataset.state = 'info';
                    metaInfo.textContent = 'Drop an image or paste a URL to preview size.';
                }
            };

            const updateThumbnail = (url) => {
                const trimmed = utils.trimString(url);
                if (!trimmed) {
                    thumbnail.removeAttribute('src');
                    thumbnailWrapper.dataset.state = 'empty';
                    setScreenshotMeta(appIndex, screenshotIndex, null);
                    applyScreenshotAspectRatio(appIndex, screenshotIndex, '');
                    applyMetaInfo(null);
                    return;
                }
                thumbnailWrapper.dataset.state = 'loading';
                thumbnail.src = trimmed;
            };

            thumbnail.addEventListener('load', () => {
                thumbnailWrapper.dataset.state = 'ready';
                const width = thumbnail.naturalWidth;
                const height = thumbnail.naturalHeight;
                const ratio = formatAspectRatio(width, height);
                const meta = { width, height, ratio };
                setScreenshotMeta(appIndex, screenshotIndex, meta);
                applyScreenshotAspectRatio(appIndex, screenshotIndex, ratio);
                applyMetaInfo(meta);
            });
            thumbnail.addEventListener('error', () => {
                thumbnailWrapper.dataset.state = 'error';
                setScreenshotMeta(appIndex, screenshotIndex, null);
                applyScreenshotAspectRatio(appIndex, screenshotIndex, '');
                metaInfo.dataset.state = 'error';
                metaInfo.textContent = 'Preview unavailable — check the link.';
            });

            const existingMeta = getScreenshotMeta(appIndex, screenshotIndex);
            if (existingMeta) {
                applyMetaInfo(existingMeta);
            } else {
                applyMetaInfo(null);
            }

            updateThumbnail(value);
            return item;
        }

        function importJson(text) {
            try {
                const json = utils.parseJson(text);
                const appsData = extractAppsArray(json);
                if (!appsData.length) {
                    setPreviewStatus({
                        status: 'error',
                        message: 'No apps found in the imported JSON.'
                    });
                    alert('No apps found in the imported JSON.');
                    return;
                }
                state.apps = appsData.map((raw) => {
                    const app = {
                        name: utils.trimString(raw.name || ''),
                        packageName: utils.trimString(raw.packageName || ''),
                        category: normalizeCategoryInput(raw.category),
                        description: utils.trimString(raw.description || ''),
                        iconLogo: utils.trimString(raw.iconLogo || ''),
                        screenshots: (() => {
                            const sanitized = utils
                                .normalizeArray(raw.screenshots)
                                .map((value) => normalizeScreenshotEntry(value))
                                .filter((entry) => Boolean(entry.url));
                            return sanitized.length
                                ? sanitized.map((entry) => normalizeScreenshotEntry(entry))
                                : [createEmptyScreenshotEntry()];
                        })()
                    };
                    ensureScreenshotList(app);
                    return app;
                });
                touchWorkspace();
                render();
            } catch (error) {
                console.error('AppToolkit: Failed to import JSON.', error);
                setPreviewStatus({
                    status: 'error',
                    message: error.message || 'Unable to import JSON file.'
                });
                alert(error.message || 'Unable to import JSON file.');
            }
        }

        function extractAppsArray(json) {
            if (!json || typeof json !== 'object') {
                return [];
            }
            if (Array.isArray(json)) {
                return json;
            }
            if (Array.isArray(json.apps)) {
                return json.apps;
            }
            if (json.data && Array.isArray(json.data.apps)) {
                return json.data.apps;
            }
            return [];
        }

        function setFetchState(state = 'idle', message) {
            const resolvedState = FETCH_STATE_COPY[state] ? state : 'idle';
            if (fetchFieldset) {
                fetchFieldset.dataset.state = resolvedState;
                fetchFieldset.title = message || FETCH_STATE_COPY[resolvedState];
                if (resolvedState === 'success') {
                    fetchFieldset.classList.add('builder-remote-presets--pulse');
                    if (fetchPulseTimeout) {
                        clearTimeout(fetchPulseTimeout);
                    }
                    fetchPulseTimeout = setTimeout(() => {
                        fetchFieldset.classList.remove('builder-remote-presets--pulse');
                    }, 1200);
                } else {
                    fetchFieldset.classList.remove('builder-remote-presets--pulse');
                }
            }
        }

        function flashButton(button, label) {
            if (!button) return;
            const originalLabel = button.innerHTML;
            button.disabled = true;
            button.innerHTML = label;
            setTimeout(() => {
                button.innerHTML = originalLabel;
                button.disabled = false;
            }, 1500);
        }

        function setLoadingState(button, isLoading, loadingLabel = 'Fetching…') {
            if (!button) return;
            const LOADING_LABEL =
                `<span class="material-symbols-outlined">hourglass_empty</span><span>${loadingLabel}</span>`;
            if (isLoading) {
                if (!button.dataset.originalLabel) {
                    button.dataset.originalLabel = button.innerHTML;
                }
                button.disabled = true;
                button.innerHTML = LOADING_LABEL;
                button.setAttribute('aria-busy', 'true');
            } else {
                if (button.dataset.originalLabel) {
                    button.innerHTML = button.dataset.originalLabel;
                    delete button.dataset.originalLabel;
                }
                button.disabled = false;
                button.removeAttribute('aria-busy');
            }
        }

        async function fetchRemoteJson(urlSource, { fromPreset = false, sourceButton } = {}) {
            const targetUrl = utils.trimString(urlSource || '');
            if (!targetUrl) {
                setFetchState('error', 'Choose a quick link to load data.');
                setPreviewStatus({
                    status: 'error',
                    message: 'Select a quick link to fetch the latest data before editing.'
                });
                alert('Choose a quick link before loading.');
                return;
            }
            if (sourceButton) {
                setLoadingState(sourceButton, true, 'Loading…');
            }
            setFetchState('loading');
            try {
                const response = await fetch(targetUrl, { cache: 'no-store' });
                if (!response.ok) {
                    const message = `Request failed: ${response.status} ${response.statusText}`;
                    console.error('AppToolkit: Remote fetch failed.', message);
                    if (sourceButton) {
                        setLoadingState(sourceButton, false);
                    }
                    setFetchState('error', message);
                    return;
                }
                const text = await response.text();
                importJson(text);
                remoteBaselinePayload = lastPreviewState.payload
                    ? utils.cloneJson(lastPreviewState.payload)
                    : null;
                updateDiffSheet();
                if (sourceButton) {
                    setLoadingState(sourceButton, false);
                    flashButton(
                        sourceButton,
                        '<span class="material-symbols-outlined">check</span><span>Loaded</span>'
                    );
                }
                setFetchState('success');
            } catch (error) {
                console.error('AppToolkit: Remote fetch failed.', error);
                if (sourceButton) {
                    setLoadingState(sourceButton, false);
                }
                setFetchState('error', error.message || FETCH_STATE_COPY.error);
                setPreviewStatus({
                    status: 'error',
                    message: error.message || 'Unable to fetch remote JSON.'
                });
                alert(error.message || 'Unable to fetch remote JSON.');
            }
        }

        function clearGithubStatus() {
            if (!githubStatus) {
                return;
            }
            githubStatus.dataset.status = '';
            githubStatus.innerHTML = '';
        }

        function setGithubStatus({ status = 'success', message = '' }) {
            if (!githubStatus) {
                return;
            }
            utils.setValidationStatus(githubStatus, { status, message });
        }

        function validateGithubToken(value) {
            const token = utils.trimString(value || '');
            if (!token) {
                throw new Error('Provide a GitHub personal access token.');
            }
            if (/\s/.test(token)) {
                throw new Error('Token cannot contain spaces or line breaks.');
            }
            if (token.length < MIN_GITHUB_TOKEN_LENGTH) {
                throw new Error('Token format not recognized. Provide a valid GitHub personal access token.');
            }
            return token;
        }

        function extractGithubTokenFromText(text) {
            const content = typeof text === 'string' ? text : '';
            const lines = content
                .split(/\r?\n/)
                .map((line) => utils.trimString(line))
                .filter(Boolean);
            if (!lines.length) {
                throw new Error('The selected file does not contain a personal access token.');
            }
            return lines[0];
        }

        function createFileHandleStore({ dbName, storeName, key }) {
            if (typeof indexedDB === 'undefined') {
                return {
                    async set() {
                        // IndexedDB is unavailable; persist in-memory only.
                    },
                    async clear() {
                        // IndexedDB is unavailable; nothing to clear.
                    },
                    async get() {
                        return null;
                    }
                };
            }

            function openDb() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(dbName, 1);
                    request.addEventListener('upgradeneeded', () => {
                        const db = request.result;
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName);
                        }
                    });
                    request.addEventListener('success', () => {
                        resolve(request.result);
                    });
                    request.addEventListener('error', () => {
                        reject(request.error);
                    });
                });
            }

            async function runTransaction(mode, executor) {
                const db = await openDb();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(storeName, mode);
                    const store = tx.objectStore(storeName);
                    let settled = false;

                    const safeResolve = (value) => {
                        if (!settled) {
                            settled = true;
                            resolve(value);
                        }
                    };

                    const safeReject = (error) => {
                        if (!settled) {
                            settled = true;
                            reject(error);
                        }
                    };

                    tx.addEventListener('complete', () => {
                        db.close();
                        safeResolve(undefined);
                    });
                    tx.addEventListener('abort', () => {
                        const error = tx.error || new Error('Transaction aborted.');
                        db.close();
                        safeReject(error);
                    });
                    tx.addEventListener('error', () => {
                        // handled via abort
                    });
                    executor(store, safeResolve, safeReject);
                });
            }

            return {
                async get() {
                    try {
                        const db = await openDb();
                        return await new Promise((resolve, reject) => {
                            const tx = db.transaction(storeName, 'readonly');
                            const store = tx.objectStore(storeName);
                            const request = store.get(key);
                            request.addEventListener('success', () => {
                                resolve(request.result || null);
                            });
                            request.addEventListener('error', () => {
                                reject(request.error);
                            });
                            tx.addEventListener('complete', () => {
                                db.close();
                            });
                            tx.addEventListener('abort', () => {
                                const error = tx.error || request.error || new Error('Transaction aborted.');
                                db.close();
                                reject(error);
                            });
                        });
                    } catch (error) {
                        console.warn('AppToolkit: Unable to read stored GitHub token file handle.', error);
                        return null;
                    }
                },
                async set(value) {
                    try {
                        await runTransaction('readwrite', (store, resolve, reject) => {
                            const request = store.put(value, key);
                            request.addEventListener('success', () => {
                                resolve();
                            });
                            request.addEventListener('error', () => {
                                reject(request.error);
                            });
                        });
                    } catch (error) {
                        console.warn('AppToolkit: Unable to store GitHub token file handle.', error);
                    }
                },
                async clear() {
                    try {
                        await runTransaction('readwrite', (store, resolve, reject) => {
                            const request = store.delete(key);
                            request.addEventListener('success', () => {
                                resolve();
                            });
                            request.addEventListener('error', () => {
                                reject(request.error);
                            });
                        });
                    } catch (error) {
                        console.warn('AppToolkit: Unable to clear stored GitHub token file handle.', error);
                    }
                }
            };
        }

        async function persistGithubTokenFileHandle(handle) {
            if (!supportsFileSystemAccess || !handle) {
                return;
            }
            githubTokenFileHandle = handle;
            githubTokenHandleLoaded = true;
            await githubTokenHandleStore.set(handle);
        }

        async function clearPersistedGithubTokenFileHandle() {
            if (supportsFileSystemAccess) {
                await githubTokenHandleStore.clear();
            }
            githubTokenFileHandle = null;
            githubTokenHandleLoaded = false;
        }

        async function loadPersistedGithubTokenFileHandle() {
            if (!supportsFileSystemAccess) {
                return null;
            }
            if (githubTokenFileHandle) {
                return githubTokenFileHandle;
            }
            if (githubTokenHandleLoaded) {
                return null;
            }
            githubTokenHandleLoaded = true;
            const handle = await githubTokenHandleStore.get();
            if (handle) {
                githubTokenFileHandle = handle;
                return handle;
            }
            return null;
        }

        /**
         * @param {FileSystemHandle | null} handle
         * @param {'read' | 'readwrite'} [mode]
         */
        async function ensureFileHandlePermission(handle, mode = 'read') {
            if (!handle) {
                return 'denied';
            }
            /** @type {{mode: 'read' | 'readwrite'}} */
            const options = { mode };
            if (typeof handle.queryPermission === 'function') {
                try {
                    const status = await handle.queryPermission(options);
                    if (status === 'granted' || status === 'denied') {
                        return status;
                    }
                } catch (error) {
                    // ignore and attempt to request permission below
                }
            }
            if (typeof handle.requestPermission === 'function') {
                try {
                    return await handle.requestPermission(options);
                } catch (error) {
                    return 'denied';
                }
            }
            return 'denied';
        }

        async function tryReuseStoredGithubTokenHandle() {
            let handle = githubTokenFileHandle;
            if (!handle) {
                handle = await loadPersistedGithubTokenFileHandle();
            }
            if (!handle) {
                return false;
            }
            const permission = await ensureFileHandlePermission(handle, 'read');
            if (permission !== 'granted') {
                if (permission === 'denied') {
                    await clearPersistedGithubTokenFileHandle();
                    setGithubStatus({
                        status: 'error',
                        message: 'Access to the saved token file was denied. Pick the file again.'
                    });
                }
                return false;
            }
            try {
                const file = await handle.getFile();
                const success = await handleGithubTokenFileSelection(file, { handle });
                if (!success) {
                    await clearPersistedGithubTokenFileHandle();
                    return false;
                }
                return true;
            } catch (error) {
                console.warn('AppToolkit: Unable to reuse stored GitHub token file.', error);
                await clearPersistedGithubTokenFileHandle();
                setGithubStatus({
                    status: 'error',
                    message: 'Unable to read the saved token file. Choose it again.'
                });
                return false;
            }
        }

        async function tryReuseFallbackGithubTokenFile() {
            if (!githubTokenFallbackFile) {
                return false;
            }
            const success = await handleGithubTokenFileSelection(githubTokenFallbackFile);
            if (!success) {
                githubTokenFallbackFile = null;
                return false;
            }
            return true;
        }

        function shouldForceGithubTokenFilePicker(event) {
            if (!event) {
                return false;
            }
            return Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
        }

        async function pickGithubTokenFileWithFsAccess() {
            if (!supportsFileSystemAccess) {
                return false;
            }
            let handles;
            try {
                const openFilePicker = window?.showOpenFilePicker;
                if (typeof openFilePicker !== 'function') {
                    return false;
                }
                handles = await openFilePicker({
                    multiple: false,
                    excludeAcceptAllOption: false,
                    types: [
                        {
                            description: 'Token files',
                            accept: {
                                'text/plain': ['.txt', '.text', '.token'],
                                'application/json': ['.json']
                            }
                        }
                    ]
                });
            } catch (error) {
                if (error?.name === 'AbortError') {
                    return true;
                }
                console.warn('AppToolkit: Unable to open GitHub token file picker.', error);
                setGithubStatus({
                    status: 'error',
                    message: 'Unable to open the file picker. Select the token file manually.'
                });
                return false;
            }
            const handle = Array.isArray(handles) ? handles[0] : null;
            if (!handle) {
                return false;
            }
            const permission = await ensureFileHandlePermission(handle, 'read');
            if (permission !== 'granted') {
                if (permission === 'denied') {
                    await clearPersistedGithubTokenFileHandle();
                }
                setGithubStatus({
                    status: 'error',
                    message: 'Allow read access to the selected token file to continue.'
                });
                return false;
            }
            try {
                const file = await handle.getFile();
                const success = await handleGithubTokenFileSelection(file, { handle });
                if (!success) {
                    await clearPersistedGithubTokenFileHandle();
                }
            } catch (error) {
                console.warn('AppToolkit: Unable to read selected GitHub token file.', error);
                setGithubStatus({
                    status: 'error',
                    message: 'Unable to read the selected token file.'
                });
                await clearPersistedGithubTokenFileHandle();
                return false;
            }
            return true;
        }

        async function handleGithubTokenFileSelection(file, { handle = null } = {}) {
            if (!file) {
                return false;
            }
            try {
                const text = await file.text();
                const token = validateGithubToken(extractGithubTokenFromText(text));
                if (githubTokenInput) {
                    githubTokenInput.value = token;
                }
                githubTokenFallbackFile = file;
                if (handle && supportsFileSystemAccess) {
                    await persistGithubTokenFileHandle(handle);
                }
                const reuseHint =
                    supportsFileSystemAccess || githubTokenFallbackFile
                        ? ' Click the button again to reuse this file or hold Shift to pick a different one.'
                        : '';
                setGithubStatus({
                    status: 'success',
                    message: `Loaded token from ${file.name}.${reuseHint}`
                });
                return true;
            } catch (error) {
                githubTokenFallbackFile = null;
                if (handle && supportsFileSystemAccess) {
                    await clearPersistedGithubTokenFileHandle();
                }
                const message = error?.message || 'Unable to read GitHub token from file.';
                setGithubStatus({
                    status: 'error',
                    message
                });
                alert(message);
                return false;
            }
        }

        function parseRepository(value) {
            const trimmed = utils.trimString(value || '');
            const segments = trimmed.split('/').filter(Boolean);
            if (segments.length !== 2) {
                throw new Error('Repository must be provided as owner/name.');
            }
            return { owner: segments[0], repo: segments[1] };
        }

        function getChannelLabel(channel) {
            return channel === 'debug' ? 'Debug' : 'Release';
        }

        function encodeGithubPath(path) {
            return path
                .split('/')
                .map((segment) => encodeURIComponent(segment))
                .join('/');
        }

        function encodeContentToBase64(text) {
            const string = typeof text === 'string' ? text : String(text ?? '');
            if (typeof TextEncoder !== 'undefined') {
                const encoder = new TextEncoder();
                const bytes = encoder.encode(string);
                let binary = '';
                bytes.forEach((byte) => {
                    binary += String.fromCharCode(byte);
                });
                return btoa(binary);
            }
            if (typeof btoa !== 'undefined') {
                return btoa(unescape(encodeURIComponent(string)));
            }
            throw new Error('Base64 encoding is not supported in this environment.');
        }

        async function readGithubError(response) {
            let details = {};
            try {
                details = await response.json();
            } catch (error) {
                // ignore parsing errors, fall back to status text
            }
            const message =
                details?.message || `GitHub request failed: ${response.status} ${response.statusText}`;
            if (Array.isArray(details?.errors) && details.errors.length) {
                const reasons = details.errors
                    .map((entry) => entry?.message || entry?.code)
                    .filter(Boolean)
                    .join(', ');
                if (reasons) {
                    return `${message} (${reasons})`;
                }
            }
            return message;
        }

        async function publishToGithub() {
            if (!githubNextButton) {
                return;
            }

            let token;
            try {
                token = validateGithubToken(githubTokenInput ? githubTokenInput.value : '');
            } catch (error) {
                setGithubStatus({ status: 'error', message: error.message });
                return;
            }

            if (!validationStatus || validationStatus.dataset.status !== 'success' || !lastPreviewState.success) {
                setGithubStatus({ status: 'error', message: 'Resolve JSON validation issues before publishing.' });
                return;
            }

            if (!previewArea || !previewArea.value.trim()) {
                setGithubStatus({ status: 'error', message: 'No JSON payload available to publish.' });
                return;
            }

            let repository;
            try {
                repository = parseRepository(githubRepoInput ? githubRepoInput.value : '');
            } catch (error) {
                setGithubStatus({ status: 'error', message: error.message });
                return;
            }

            const branch = utils.trimString(githubBranchInput ? githubBranchInput.value : '') || 'main';
            const commitMessageBase =
                utils.trimString(githubMessageInput ? githubMessageInput.value : '') ||
                'chore(app-toolkit): update catalog';
            const channelSelection = githubChannelSelect ? githubChannelSelect.value : 'debug';
            const channels =
                channelSelection === 'both'
                    ? ['debug', 'release']
                    : channelSelection === 'release'
                        ? ['release']
                        : ['debug'];
            const jsonText = previewArea.value;
            const encodedContent = encodeContentToBase64(jsonText);

            setLoadingState(githubNextButton, true, 'Publishing…');
            if (githubBackButton) {
                githubBackButton.disabled = true;
            }

            try {
                const headers = {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-GitHub-Api-Version': '2022-11-28'
                };

                const results = [];
                for (const channel of channels) {
                    const channelLabel = getChannelLabel(channel);
                    setGithubStatus({
                        status: 'warning',
                        message: `Uploading ${channelLabel} JSON to ${repository.owner}/${repository.repo}…`
                    });

                    const path = GITHUB_CHANNEL_PATHS[channel];
                    const encodedPath = encodeGithubPath(path);
                    const contentsUrl = `https://api.github.com/repos/${repository.owner}/${repository.repo}/contents/${encodedPath}`;
                    let currentSha;

                    const getResponse = await fetch(`${contentsUrl}?ref=${encodeURIComponent(branch)}`, {
                        headers,
                        cache: 'no-store'
                    });

                    if (getResponse.ok) {
                        const payload = await getResponse.json();
                        currentSha = payload?.sha;
                    } else if (getResponse.status !== 404) {
                        const message = await readGithubError(getResponse);
                        setGithubStatus({ status: 'error', message });
                        return;
                    }

                    const commitMessage =
                        channels.length > 1
                            ? `${commitMessageBase} · ${channelLabel}`
                            : commitMessageBase;

                    const putBody = {
                        message: commitMessage,
                        content: encodedContent,
                        branch
                    };
                    if (currentSha) {
                        putBody.sha = currentSha;
                    }

                    const putResponse = await fetch(contentsUrl, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(putBody)
                    });

                    if (!putResponse.ok) {
                        const message = await readGithubError(putResponse);
                        setGithubStatus({ status: 'error', message });
                        return;
                    }

                    const putResult = await putResponse.json();
                    results.push({
                        channel: channelLabel,
                        sha: putResult?.commit?.sha
                    });
                }

                const summary = results
                    .map((entry) =>
                        entry.sha
                            ? `${entry.channel} (#${String(entry.sha).substring(0, 7)})`
                            : entry.channel
                    )
                    .join(', ');
                setGithubStatus({
                    status: 'success',
                    message: `Published ${summary} to ${repository.owner}/${repository.repo}@${branch}.`
                });
                flashButton(
                    githubNextButton,
                    '<span class="material-symbols-outlined">check</span><span>Published</span>'
                );
            } catch (error) {
                console.error('AppToolkit: Failed to publish via GitHub API.', error);
                setGithubStatus({
                    status: 'error',
                    message: error.message || 'GitHub publish request failed.'
                });
            } finally {
                setLoadingState(githubNextButton, false);
                if (githubBackButton) {
                    githubBackButton.disabled = githubStepIndex === 0;
                }
            }
        }

        if (addButton) {
            addButton.addEventListener('click', () => {
                state.apps.push(createEmptyApp());
                touchWorkspace();
                render();
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => {
                resetWorkspace({ message: 'Workspace reset. Start fresh with a new app entry.' });
            });
        }

        if (copyButton && previewArea) {
            copyButton.addEventListener('click', async () => {
                await utils.copyToClipboard(previewArea.value);
                flashButton(copyButton, '<span class="material-symbols-outlined">check</span><span>Copied</span>');
            });
        }

        if (downloadButton && previewArea) {
            downloadButton.addEventListener('click', () => {
                utils.downloadJson(DEFAULT_FILENAME, previewArea.value);
                resetWorkspace({ message: 'Export complete. Workspace cleared.' });
            });
        }

        if (presetButtons.length) {
            presetButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const presetUrl = utils.trimString(
                        button.dataset.appToolkitPreset || ''
                    );
                    if (!presetUrl) {
                        return;
                    }
                    fetchRemoteJson(presetUrl, { fromPreset: true, sourceButton: button });
                });
            });
        }

        if (sortMenu) {
            if (sortButton && 'anchorElement' in sortMenu) {
                try {
                    sortMenu.anchorElement = sortButton;
                } catch (error) {
                    console.warn('AppToolkit: Unable to set sort menu anchor.', error);
                }
            }
            sortMenuItems = Array.from(sortMenu.querySelectorAll('[data-sort-key]'));
            sortMenuItems.forEach((item) => {
                item.addEventListener('click', () => {
                    handleSortSelection(item.dataset.sortKey || '');
                });
            });
            sortMenu.addEventListener('action', (event) => {
                const index = typeof event.detail?.index === 'number' ? event.detail.index : -1;
                const selectedItem = index >= 0 ? sortMenuItems[index] : null;
                if (selectedItem) {
                    handleSortSelection(selectedItem.dataset.sortKey || '');
                }
            });
            sortMenu.addEventListener('selected', (event) => {
                const index = typeof event.detail?.index === 'number' ? event.detail.index : -1;
                const selectedItem = index >= 0 ? sortMenuItems[index] : null;
                if (selectedItem) {
                    handleSortSelection(selectedItem.dataset.sortKey || '');
                }
            });
            sortMenu.addEventListener('closed', () => {
                if (sortButton) {
                    sortButton.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (sortButton && sortMenu) {
            sortButton.addEventListener('click', () => {
                const nextState = !sortMenu.open;
                sortMenu.open = nextState;
                sortButton.setAttribute('aria-expanded', nextState ? 'true' : 'false');
            });
        }

        if (githubTokenFileButton && githubTokenFileInput) {
            githubTokenFileButton.addEventListener('click', async (event) => {
                clearGithubStatus();
                const forcePicker = shouldForceGithubTokenFilePicker(event);
                if (!forcePicker) {
                    if (supportsFileSystemAccess) {
                        const reused = await tryReuseStoredGithubTokenHandle();
                        if (reused) {
                            return;
                        }
                    } else {
                        const reusedFallback = await tryReuseFallbackGithubTokenFile();
                        if (reusedFallback) {
                            return;
                        }
                    }
                }

                if (supportsFileSystemAccess) {
                    const handled = await pickGithubTokenFileWithFsAccess();
                    if (handled) {
                        return;
                    }
                }

                githubTokenFileInput.value = '';
                githubTokenFileInput.click();
            });
            githubTokenFileInput.addEventListener('change', async () => {
                const file = githubTokenFileInput.files && githubTokenFileInput.files[0];
                if (file) {
                    clearGithubStatus();
                    await handleGithubTokenFileSelection(file);
                }
            });
        }

        if (githubWizardButton && githubDialog) {
            githubWizardButton.addEventListener('click', () => {
                clearGithubStatus();
                setGithubStep(0);
                if (typeof AppDialogs !== 'undefined' && AppDialogs && typeof AppDialogs.rememberTrigger === 'function') {
                    AppDialogs.rememberTrigger(githubDialog, document.activeElement);
                }
                githubDialog.open = true;
            });
        }

        if (githubDialog) {
            ['close', 'cancel'].forEach((eventName) => {
                githubDialog.addEventListener(eventName, () => {
                    setGithubStep(0);
                    clearGithubStatus();
                    setLoadingState(githubNextButton, false);
                });
            });
        }

        if (githubBackButton) {
            githubBackButton.addEventListener('click', () => {
                if (githubStepIndex > 0) {
                    setGithubStep(githubStepIndex - 1);
                    clearGithubStatus();
                }
            });
        }

        if (githubNextButton) {
            githubNextButton.addEventListener('click', async () => {
                clearGithubStatus();
                if (githubStepIndex === 0) {
                    try {
                        validateGithubToken(githubTokenInput ? githubTokenInput.value : '');
                        setGithubStep(1);
                    } catch (error) {
                        setGithubStatus({ status: 'error', message: error.message });
                    }
                    return;
                }
                if (githubStepIndex === 1) {
                    try {
                        parseRepository(githubRepoInput ? githubRepoInput.value : '');
                    } catch (error) {
                        setGithubStatus({ status: 'error', message: error.message });
                        return;
                    }
                    setGithubStep(2);
                    updateDiffSheet();
                    return;
                }
                await publishToGithub();
            });
        }

        if (filterChipSet) {
            filterChipSet.addEventListener('change', () => {
                syncFiltersFromChipSet();
            });
            filterChipSet.addEventListener('click', () => {
                syncFiltersFromChipSet();
            });
        }

        builderRoot.dataset.initialized = 'true';
        render();
    }

    global.initAppToolkitWorkspace = initAppToolkitWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
