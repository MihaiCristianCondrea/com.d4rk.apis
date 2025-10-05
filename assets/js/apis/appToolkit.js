(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('AppToolkit: ApiBuilderUtils is required.');
        return;
    }

    const DEFAULT_FILENAME = 'api_android_apps.json';
    const GITHUB_CHANNEL_PATHS = {
        debug: 'App Toolkit/debug/en/home/api_android_apps.json',
        release: 'App Toolkit/release/en/home/api_android_apps.json'
    };
    const MIN_GITHUB_TOKEN_LENGTH = 20;
    const GOOGLE_PLAY_CATEGORIES = [
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
    const PACKAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;

    function initAppToolkitWorkspace() {
        const builderRoot = document.getElementById('appToolkitBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const entriesContainer = document.getElementById('appToolkitEntries');
        const builderLayout = builderRoot.querySelector('.builder-layout');
        const addButton = document.getElementById('appToolkitAddApp');
        const resetButton = document.getElementById('appToolkitResetButton');
        const copyButton = document.getElementById('appToolkitCopyButton');
        const downloadButton = document.getElementById('appToolkitDownloadButton');
        const previewArea = document.getElementById('appToolkitPreview');
        const validationStatus = document.getElementById('appToolkitValidation');
        const importButton = document.getElementById('appToolkitImportButton');
        const importInput = document.getElementById('appToolkitImportInput');
        const fetchInput = document.getElementById('appToolkitFetchInput');
        const fetchButton = document.getElementById('appToolkitFetchButton');
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
        const channelSegments = document.getElementById('appToolkitChannelSegments');
        const modeSegments = document.getElementById('appToolkitLayoutSegments');
        const filterChipSet = document.getElementById('appToolkitFilterChips');
        const focusButton = document.getElementById('appToolkitFocusButton');
        const notesButton = document.getElementById('appToolkitNotesButton');
        const screenshotDialog = document.getElementById('appToolkitScreenshotDialog');
        const screenshotDialogHeadline = document.getElementById('appToolkitScreenshotDialogHeadline');
        const screenshotDialogImage = document.getElementById('appToolkitScreenshotDialogImage');
        const screenshotDialogCaption = document.getElementById('appToolkitScreenshotDialogCaption');
        const screenshotDialogOpenButton = document.getElementById('appToolkitScreenshotDialogOpen');
        const focusDialog = document.getElementById('appToolkitFocusDialog');
        const focusTimerEl = document.getElementById('appToolkitFocusTimer');
        const focusStartButton = document.getElementById('appToolkitFocusStart');
        const focusPauseButton = document.getElementById('appToolkitFocusPause');
        const focusResetButton = document.getElementById('appToolkitFocusReset');
        const focusSaveButton = document.getElementById('appToolkitFocusSave');
        const focusChecklist = document.getElementById('appToolkitFocusChecklist');
        const focusNotesField = document.getElementById('appToolkitFocusNotes');
        const diffSheet = document.getElementById('appToolkitDiffSheet');
        const diffContent = document.getElementById('appToolkitDiffContent');
        const dialogsToWire = [screenshotDialog, focusDialog, githubDialog];
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
        let sessionNotesStorage = null;
        const SESSION_NOTE_KEY = 'appToolkitWorkspaceNote';

        const state = {
            apps: [createEmptyApp()]
        };
        let lastPreviewState = { success: false, payload: null };
        let lastExportEvaluation = { valid: false, reasons: [] };
        let lastTouchedAt = null;
        let relativeTimer = null;
        let remoteBaselinePayload = null;
        const activeFilters = new Set();
        let draggingScreenshot = null;
        const FOCUS_DEFAULT_DURATION = 25 * 60;
        let focusTimeRemaining = FOCUS_DEFAULT_DURATION;
        let focusTimerInterval = null;
        const GITHUB_STEPS = ['authenticate', 'target', 'review'];
        let githubStepIndex = 0;
        let lastMetricsSnapshot = {
            total: 0,
            releaseReady: 0,
            pending: 0,
            needsScreenshotsCount: 0,
            missingRequiredCount: 0
        };
        const supportsFileSystemAccess =
            typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'; /*FIXME: Unresolved variable showOpenFilePicker */
        const githubTokenHandleStore = createFileHandleStore({
            dbName: 'AppToolkitGithubToken',
            storeName: 'fileHandles',
            key: 'tokenFile'
        });
        let githubTokenFileHandle = null;
        let githubTokenHandleLoaded = false;
        let githubTokenFallbackFile = null;

        if (typeof sessionStorage !== 'undefined') {
            try {
                sessionNotesStorage = sessionStorage;
                const probeKey = `${SESSION_NOTE_KEY}__probe`;
                sessionNotesStorage.setItem(probeKey, '1');
                sessionNotesStorage.removeItem(probeKey);
            } catch (error) {
                sessionNotesStorage = null;
                console.warn('AppToolkit: Session storage unavailable for workspace notes.', error);
            }
        }

        if (!sessionNotesStorage && focusSaveButton) {
            focusSaveButton.disabled = true;
        }

        function createEmptyApp() {
            return {
                name: '',
                packageName: '',
                category: '',
                description: '',
                iconLogo: '',
                screenshots: ['']
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
            return screenshots.reduce((count, value) => (utils.trimString(value) ? count + 1 : count), 0);
        }

        function appendScreenshots(appIndex, values) {
            const app = state.apps[appIndex];
            if (!app || !Array.isArray(app.screenshots)) {
                return [];
            }
            const additions = values
                .map((value) => utils.trimString(value))
                .filter(Boolean);
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

        function updatePreview() {
            const result = utils.renderJsonPreview({ /*FIXME: Argument type {    previewArea: HTMLElement,    statusElement: HTMLElement,    data: [{        name: string,        packageName: string,        category: string,        description: string,        iconLogo: string,        screenshots: [string]    }],    buildPayload: function(any): {        data: {            apps: any        }    },    autoFix: function(any): any,    successMessage: function(any): (string | string | string)} is not assignable to parameter type {    previewArea: any,    statusElement: any,    data: any,    buildPayload: any,    autoFix: any,    validator: any,    successMessage?: string,    errorMessage?: string}  Type function(any): (string | string | string) is not assignable to type string */
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
            const category = trimmed(app.category);
            if (category) output.category = category;
            const description = trimmed(app.description);
            if (description) output.description = description;
            const iconLogo = trimmed(app.iconLogo);
            if (iconLogo) output.iconLogo = iconLogo;
            const screenshots = utils
                .normalizeArray(app.screenshots)
                .map((url) => trimmed(url))
                .filter(Boolean);
            if (screenshots.length) {
                output.screenshots = Array.from(new Set(screenshots));
            }
            return output;
        }

        function deriveAppMeta(app, sanitized) {
            const isEmpty = !sanitized || Object.keys(sanitized).length === 0;
            const screenshotCount = Array.isArray(sanitized?.screenshots)
                ? sanitized.screenshots.length
                : 0;
            const hasRequired = ['name', 'packageName', 'category', 'iconLogo'].every(
                (field) => Boolean(sanitized?.[field])
            );
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
            refreshFocusChecklist({
                total,
                releaseReady,
                pending,
                needsScreenshotsCount,
                missingRequiredCount
            });
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

        function refreshFocusChecklist(metrics = {}) {
            if (!focusChecklist) {
                return;
            }
            const snapshot = {
                total: metrics.total || 0,
                releaseReady: metrics.releaseReady || 0,
                pending: metrics.pending || 0,
                needsScreenshotsCount: metrics.needsScreenshotsCount || 0,
                missingRequiredCount: metrics.missingRequiredCount || 0
            };
            lastMetricsSnapshot = snapshot;
            focusChecklist.innerHTML = '';
            const previewReady = validationStatus?.dataset.status === 'success';
            const previewMessage = extractStatusMessage(validationStatus) ||
                (previewReady ? 'Preview ready to publish.' : 'Resolve JSON validation before publishing.');
            const pluralize = (count, singular, plural = `${singular}s`) =>
                count === 1 ? singular : plural;
            const items = [
                {
                    label: 'Add apps to workspace',
                    detail: snapshot.total
                        ? `${snapshot.total} ${pluralize(snapshot.total, 'app')} tracked`
                        : 'Start by adding your first listing.',
                    done: snapshot.total > 0
                },
                {
                    label: 'Complete required metadata',
                    detail: snapshot.missingRequiredCount
                        ? `${snapshot.missingRequiredCount} ${pluralize(snapshot.missingRequiredCount, 'entry')} missing required fields`
                        : 'All required fields captured.',
                    done: snapshot.total > 0 && snapshot.missingRequiredCount === 0
                },
                {
                    label: 'Provide 3+ screenshots',
                    detail: snapshot.needsScreenshotsCount
                        ? `${snapshot.needsScreenshotsCount} ${pluralize(snapshot.needsScreenshotsCount, 'entry')} under 3 screenshots`
                        : 'Screenshot goals met.',
                    done: snapshot.total > 0 && snapshot.needsScreenshotsCount === 0
                },
                {
                    label: 'Validate JSON preview',
                    detail: previewMessage,
                    done: previewReady
                }
            ];

            items.forEach((item) => {
                const listItem = document.createElement('md-list-item');
                listItem.classList.add('focus-checklist-item');
                const checkbox = document.createElement('md-checkbox');
                checkbox.setAttribute('slot', 'start');
                checkbox.checked = item.done;
                checkbox.disabled = true;
                listItem.appendChild(checkbox);
                const headline = document.createElement('div');
                headline.setAttribute('slot', 'headline');
                headline.textContent = item.label;
                listItem.appendChild(headline);
                if (item.detail) {
                    const supporting = document.createElement('div');
                    supporting.setAttribute('slot', 'supporting-text');
                    supporting.textContent = item.detail;
                    listItem.appendChild(supporting);
                }
                focusChecklist.appendChild(listItem);
            });
        }

        function updateDiffSheet() {
            if (!diffContent) {
                return;
            }
            const setEmptyState = (message) => {
                diffContent.innerHTML = '';
                diffContent.classList.add('diff-view--empty');
                diffContent.textContent = message;
                if (builderLayout) {
                    builderLayout.classList.remove('builder-columns--with-diff');
                }
                if (diffSheet) {
                    diffSheet.open = false;
                    diffSheet.classList.add('is-empty');
                }
            };

            diffContent.classList.remove('diff-view--empty');
            diffContent.innerHTML = '';

            if (!remoteBaselinePayload) {
                setEmptyState('Load a baseline JSON file to compare changes.');
                return;
            }

            if (!lastPreviewState.success || !lastPreviewState.payload) {
                setEmptyState('Resolve preview errors to view the diff.');
                return;
            }

            const diffLib = typeof jsondiffpatch !== 'undefined' ? jsondiffpatch : null; /*FIXME: Unresolved variable or type jsondiffpatch */
            if (!diffLib || typeof diffLib.create !== 'function' || !diffLib.formatters?.html) { /*FIXME: Unresolved variable formatters */
                setEmptyState('Diff viewer unavailable. Ensure jsondiffpatch is loaded.');
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

            const differ = diffLib.create({ arrays: { detectMove: false }, textDiff: { minLength: 120 } });
            const delta = differ.diff(baseline, current); /*FIXME: Unresolved function or method diff() */

            if (!delta || (typeof delta === 'object' && !Object.keys(delta).length)) {
                setEmptyState('No differences detected since the last import.');
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
            baselineColumn.insertAdjacentHTML(
                'beforeend',
                diffLib.formatters.html.format(cloneDelta(), baseline) /*FIXME: Unresolved variable formatters */
            );

            const currentColumn = document.createElement('div');
            currentColumn.className = 'diff-view__column diff-view__column--current';
            const currentHeader = document.createElement('h4');
            currentHeader.textContent = 'Workspace';
            currentColumn.appendChild(currentHeader);
            currentColumn.insertAdjacentHTML(
                'beforeend',
                diffLib.formatters.html.format(cloneDelta(), baseline) /*FIXME: Unresolved variable formatters */
            );

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
            const chips = filterChipSet.querySelectorAll('md-filter-chip'); /*FIXME: Selector matches unknown element md-filter-chip*/
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

        function updateFocusTimerDisplay() {
            if (!focusTimerEl) {
                return;
            }
            const minutes = Math.floor(focusTimeRemaining / 60);
            const seconds = focusTimeRemaining % 60;
            focusTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        function updateFocusControls() {
            if (focusStartButton) {
                focusStartButton.disabled = Boolean(focusTimerInterval);
            }
            if (focusPauseButton) {
                focusPauseButton.disabled = !focusTimerInterval;
            }
        }

        function startFocusTimer() {
            if (typeof window === 'undefined') {
                return;
            }
            if (focusTimerInterval) {
                return;
            }
            if (focusTimeRemaining <= 0) {
                focusTimeRemaining = FOCUS_DEFAULT_DURATION;
            }
            focusTimerInterval = window.setInterval(() => {
                if (focusTimeRemaining <= 0) {
                    pauseFocusTimer();
                    focusTimeRemaining = 0;
                    updateFocusTimerDisplay();
                    if (toolbarPulseEl) {
                        toolbarPulseEl.textContent = 'Focus session complete.';
                    }
                    return;
                }
                focusTimeRemaining -= 1;
                updateFocusTimerDisplay();
            }, 1000);
            updateFocusControls();
        }

        function pauseFocusTimer() {
            if (typeof window === 'undefined') {
                return;
            }
            if (focusTimerInterval) {
                window.clearInterval(focusTimerInterval);
                focusTimerInterval = null;
            }
            updateFocusControls();
        }

        function resetFocusTimer() {
            pauseFocusTimer();
            focusTimeRemaining = FOCUS_DEFAULT_DURATION;
            updateFocusTimerDisplay();
        }

        function openFocusDialog({ autoStart = false } = {}) {
            if (!focusDialog) {
                return;
            }
            updateFocusTimerDisplay();
            updateFocusControls();
            loadSavedNote();
            if (typeof AppDialogs !== 'undefined' && AppDialogs && typeof AppDialogs.rememberTrigger === 'function') {
                AppDialogs.rememberTrigger(focusDialog, document.activeElement);
            }
            focusDialog.open = true;
            if (autoStart) {
                resetFocusTimer();
                startFocusTimer();
            }
        }

        function saveSessionNote(note) {
            if (!sessionNotesStorage) {
                if (toolbarPulseEl) {
                    toolbarPulseEl.textContent = 'Session notes are unavailable in this browser.';
                }
                return '';
            }
            const trimmed = utils.trimString(note);
            if (trimmed) {
                sessionNotesStorage.setItem(SESSION_NOTE_KEY, trimmed);
            } else {
                sessionNotesStorage.removeItem(SESSION_NOTE_KEY);
            }
            loadSavedNote();
            return trimmed;
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

        function syncSegmentedSelection(segmented, value) {
            if (!segmented) {
                return;
            }
            segmented.value = value;
            segmented.querySelectorAll('md-segmented-button').forEach((button) => { /*FIXME: Selector matches unknown element md-segmented-button */
                const buttonValue =
                    button.getAttribute('value') ||
                    button.dataset.appToolkitMode ||
                    button.dataset.appToolkitChannel;
                if (buttonValue === value) {
                    button.setAttribute('selected', '');
                } else {
                    button.removeAttribute('selected');
                }
            });
        }

        function setLayoutMode(mode) {
            if (!builderRoot) {
                return;
            }
            const target = mode === 'compact' ? 'compact' : 'flow';
            builderRoot.dataset.layout = target;
            syncSegmentedSelection(modeSegments, target);
        }

        function setChannelFocus(channel) {
            if (!builderRoot) {
                return;
            }
            const allowed = ['debug', 'release', 'both'];
            const target = allowed.includes(channel) ? channel : 'both';
            builderRoot.dataset.channel = target;
            syncSegmentedSelection(channelSegments, target);
        }

        function setPreviewStatus(options) {
            utils.setValidationStatus(validationStatus, options);
            updateToolbarPulse();
        }

        function loadSavedNote() {
            const saved = sessionNotesStorage
                ? sessionNotesStorage.getItem(SESSION_NOTE_KEY) || ''
                : '';
            if (notesButton) {
                notesButton.dataset.noteState = saved ? 'saved' : 'empty';
                if (saved) {
                    notesButton.setAttribute('aria-label', 'Edit session note');
                    notesButton.setAttribute('title', saved);
                } else {
                    notesButton.setAttribute('aria-label', 'Capture session note');
                    notesButton.removeAttribute('title');
                }
            }
            if (focusNotesField) {
                focusNotesField.value = saved;
            }
            return saved;
        }

        setLayoutMode(builderRoot && builderRoot.dataset ? builderRoot.dataset.layout : 'flow');
        setChannelFocus(
            builderRoot && builderRoot.dataset ? builderRoot.dataset.channel : 'both'
        );
        updateLastEditedDisplay();
        loadSavedNote();
        if (githubStepper) {
            setGithubStep(0);
        }
        updateFocusTimerDisplay();
        updateFocusControls();
        syncFiltersFromChipSet();

        function render() {
            if (!entriesContainer) return;
            utils.clearElement(entriesContainer);
            if (!state.apps.length) {
                state.apps.push(createEmptyApp());
            }
            state.apps.forEach((app, index) => {
                entriesContainer.appendChild(createAppCard(app, index));
            });
            updatePreview();
            applyCardFilters();
        }

        function createAppCard(app, index) {
            const card = utils.createElement('div', { classNames: ['builder-card', 'app-entry-card'] });
            card.dataset.index = String(index);
            const meta = state.apps[index]._meta || deriveAppMeta(app, sanitizeAppEntry(app));
            card.dataset.pendingReleaseReady = meta.cohorts.pendingReleaseReady ? 'true' : 'false';
            card.dataset.needsScreenshots = meta.cohorts.needsScreenshots ? 'true' : 'false';

            const header = utils.createElement('div', { classNames: 'builder-card-header' }); /*FIXME: Argument type { classNames: string } is not assignable to parameter type { classNames?: [], attrs?: {}, text?: string }  Type string is not assignable to type []    Type string is not assignable to type any[]      Type string is not assignable to type Array<any> */
            header.appendChild(utils.createElement('h3', { text: `App ${index + 1}` }));
            const removeButton = utils.createInlineButton({ /*FIXME: Argument type {    label: string,    icon: string,    variant: string,    title: string,    onClick: function(): void} is not assignable to parameter type {    label: any,    icon?: null,    onClick?: function(),    variant?: string,    title?: string}  Type string is not assignable to type null */
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

            const buildFilledTextField = ({
                label,
                value = '',
                placeholder = '',
                rows = 3,
                multiline = false,
                type = 'text',
                onInput = () => {}
            }) => {
                const field = document.createElement('md-filled-text-field');
                field.setAttribute('label', label);
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

            const nameField = buildFilledTextField({ /*FIXME: Argument type {    label: string,    value: any,    onInput: function(any): void} is not assignable to parameter type {    label: any,    value?: string,    placeholder?: string,    rows?: number,    multiline?: boolean,    type?: string,    onInput?: function()}  Type function(any): void is not assignable to type function() */
                label: 'App name',
                value: app.name,
                onInput: (value) => {
                    state.apps[index].name = value;
                    touchWorkspace();
                    updatePreview();
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

            const packageField = buildFilledTextField({ /*FIXME: Argument type {    label: string,    value: string | any,    placeholder: string,    onInput: function(any): void} is not assignable to parameter type {    label: any,    value?: string,    placeholder?: string,    rows?: number,    multiline?: boolean,    type?: string,    onInput?: function()}  Type function(any): void is not assignable to type function() */
                label: 'Package name',
                value: app.packageName,
                placeholder: 'com.example.app',
                onInput: (value) => {
                    state.apps[index].packageName = value;
                    touchWorkspace();
                    updatePreview();
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
            const knownValues = new Set();
            GOOGLE_PLAY_CATEGORIES.forEach((category) => {
                const option = document.createElement('md-select-option');
                option.setAttribute('value', category);
                option.textContent = category;
                if (category === app.category) {
                    option.setAttribute('selected', '');
                }
                knownValues.add(category);
                categorySelect.appendChild(option);
            });
            if (app.category && !knownValues.has(app.category)) {
                const customOption = document.createElement('md-select-option');
                customOption.setAttribute('value', app.category);
                customOption.textContent = app.category;
                customOption.setAttribute('selected', '');
                categorySelect.appendChild(customOption);
            }
            categorySelect.addEventListener('change', () => {
                state.apps[index].category = categorySelect.value || '';
                touchWorkspace();
                updatePreview();
            });
            createFieldGroup(categorySelect);

            const descriptionField = buildFilledTextField({ /*FIXME: Argument type {    label: string,    value: any,    multiline: boolean,    rows: number,    onInput: function(any): void} is not assignable to parameter type {    label: any,    value?: string,    placeholder?: string,    rows?: number,    multiline?: boolean,    type?: string,    onInput?: function()}  Type function(any): void is not assignable to type function() */
                label: 'Description',
                value: app.description,
                multiline: true,
                rows: 4,
                onInput: (value) => {
                    state.apps[index].description = value;
                    touchWorkspace();
                    updatePreview();
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

            const iconField = buildFilledTextField({ /*FIXME: Argument type {    label: string,    value: string | any,    placeholder: string,    onInput: function(any): void} is not assignable to parameter type {    label: any,    value?: string,    placeholder?: string,    rows?: number,    multiline?: boolean,    type?: string,    onInput?: function()}  Type function(any): void is not assignable to type function() */
                label: 'Icon URL',
                value: app.iconLogo,
                placeholder: 'https://example.com/icon.png',
                onInput: (value) => {
                    state.apps[index].iconLogo = value;
                    touchWorkspace();
                    updatePreview();
                    validateIconField(value);
                }
            });
            iconField.setAttribute('aria-describedby', iconHelperId);
            validateIconField(app.iconLogo);
            createFieldGroup(iconField, { helper: iconHelper.element });

            const screenshotsSection = utils.createElement('div', {
                classNames: ['builder-subsection', 'builder-screenshots']
            });
            const screenshotHeader = utils.createElement('div', {
                classNames: ['builder-subsection-header']
            });
            screenshotHeader.appendChild(utils.createElement('h4', { text: 'Screenshots' }));
            const screenshotCountChip = utils.createElement('span', {
                classNames: ['builder-hint-chip'],
                text: ''
            });
            screenshotHeader.appendChild(screenshotCountChip);
            screenshotsSection.appendChild(screenshotHeader);

            const screenshotsList = document.createElement('div');
            screenshotsList.classList.add('screenshot-list');
            screenshotsList.dataset.appIndex = String(index);

            const handleDragStart = (event) => {
                const item = event.target.closest('.screenshot-item[data-screenshot-index]');
                if (!item) {
                    return;
                }
                draggingScreenshot = {
                    appIndex: index,
                    from: Number(item.dataset.screenshotIndex)
                };
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.dataset.screenshotIndex);
                item.classList.add('dragging');
            };

            const handleDragEnd = (event) => {
                const item = event.target.closest('.screenshot-item[data-screenshot-index]');
                if (item) {
                    item.classList.remove('dragging');
                }
                draggingScreenshot = null;
                screenshotsList
                    .querySelectorAll('.drag-over')
                    .forEach((el) => el.classList.remove('drag-over'));
            };

            const handleDragOver = (event) => {
                if (!draggingScreenshot || draggingScreenshot.appIndex !== index) {
                    return;
                }
                const item = event.target.closest('.screenshot-item[data-screenshot-index]');
                event.preventDefault();
                if (item) {
                    screenshotsList
                        .querySelectorAll('.drag-over')
                        .forEach((el) => el.classList.remove('drag-over'));
                    item.classList.add('drag-over');
                }
            };

            const handleDrop = (event) => {
                if (!draggingScreenshot || draggingScreenshot.appIndex !== index) {
                    return;
                }
                event.preventDefault();
                const item = event.target.closest('.screenshot-item[data-screenshot-index]');
                let targetIndex = item
                    ? Number(item.dataset.screenshotIndex)
                    : state.apps[index].screenshots.length - 1;
                if (item) {
                    const rect = item.getBoundingClientRect();
                    const offset = event.clientY - rect.top;
                    if (offset > rect.height / 2) {
                        targetIndex += 1;
                    }
                } else {
                    targetIndex += 1;
                }
                moveScreenshot(index, draggingScreenshot.from, targetIndex);
            };

            screenshotsList.addEventListener('dragstart', handleDragStart);
            screenshotsList.addEventListener('dragend', handleDragEnd);
            screenshotsList.addEventListener('dragover', handleDragOver);
            screenshotsList.addEventListener('drop', handleDrop);

            app.screenshots.forEach((url, screenshotIndex) => {
                screenshotsList.appendChild(
                    createScreenshotField(index, screenshotIndex, url, {
                        onChange: () => updateScreenshotsState()
                    })
                );
            });

            const dropZone = document.createElement('div');
            dropZone.className = 'screenshot-dropzone';
            dropZone.tabIndex = 0;
            dropZone.innerHTML =
                '<strong>Drop images or paste links</strong>' +
                '<span>Drag files, paste URLs, or use the upload button below.</span>' +
                '<span class="shortcut">Tip: <kbd>Ctrl</kbd> + <kbd>V</kbd> to add from clipboard.</span>';

            const screenshotActions = document.createElement('div');
            screenshotActions.classList.add('screenshot-actions');

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.multiple = true;
            fileInput.hidden = true;

            const uploadButton = document.createElement('md-filled-tonal-button');
            const uploadIcon = document.createElement('md-icon');
            uploadIcon.setAttribute('slot', 'icon');
            uploadIcon.innerHTML = '<span class="material-symbols-outlined">cloud_upload</span>';
            uploadButton.appendChild(uploadIcon);
            uploadButton.appendChild(document.createTextNode('Upload images'));
            uploadButton.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', async () => {
                const files = fileInput.files;
                let added = 0;
                if (files && files.length) {
                    added += (await appendScreenshotsFromFiles(index, files)).length;
                }
                fileInput.value = '';
                if (added) {
                    touchWorkspace();
                    render();
                }
            });

            const urlField = document.createElement('md-filled-text-field');
            urlField.setAttribute('label', 'Screenshot URL');
            urlField.setAttribute('placeholder', 'https://example.com/screenshot.png');
            urlField.setAttribute('inputmode', 'url');
            const addUrlButton = document.createElement('md-filled-tonal-button');
            const addUrlIcon = document.createElement('md-icon');
            addUrlIcon.setAttribute('slot', 'icon');
            addUrlIcon.innerHTML =
                '<span class="material-symbols-outlined">add_link</span>';
            addUrlButton.setAttribute('has-icon', '');
            addUrlButton.appendChild(addUrlIcon);
            addUrlButton.appendChild(document.createTextNode('Add URL'));

            const commitUrl = () => {
                const additions = appendScreenshots(index, [urlField.value]);
                if (additions.length) {
                    urlField.value = '';
                    touchWorkspace();
                    render();
                }
            };

            addUrlButton.addEventListener('click', () => {
                commitUrl();
            });
            urlField.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commitUrl();
                }
            });

            screenshotActions.appendChild(uploadButton);
            screenshotActions.appendChild(urlField);
            screenshotActions.appendChild(addUrlButton);
            screenshotActions.appendChild(fileInput);

            const handleDropZone = async (event) => {
                event.preventDefault();
                dropZone.dataset.state = '';
                let added = 0;
                const files = event.dataTransfer?.files;
                if (files && files.length) {
                    added += (await appendScreenshotsFromFiles(index, files)).length;
                }
                const textData =
                    event.dataTransfer?.getData('text/uri-list') ||
                    event.dataTransfer?.getData('text/plain');
                if (textData) {
                    added += appendScreenshotsFromText(index, textData).length;
                }
                if (added) {
                    touchWorkspace();
                    render();
                }
            };

            dropZone.addEventListener('dragover', (event) => {
                event.preventDefault();
                dropZone.dataset.state = 'active';
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.dataset.state = '';
            });
            dropZone.addEventListener('drop', handleDropZone);
            dropZone.addEventListener('paste', (event) => {
                const text = event.clipboardData?.getData('text');
                if (text) {
                    event.preventDefault();
                    const added = appendScreenshotsFromText(index, text).length;
                    if (added) {
                        touchWorkspace();
                        render();
                    }
                }
            });

            screenshotsSection.appendChild(screenshotsList);
            screenshotsSection.appendChild(dropZone);
            screenshotsSection.appendChild(screenshotActions);

            const updateScreenshotsState = () => {
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
            };

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
            const item = document.createElement('div');
            item.classList.add('screenshot-item');
            item.dataset.appIndex = String(appIndex);
            item.dataset.screenshotIndex = String(screenshotIndex);
            item.draggable = true;

            const actionsRow = document.createElement('div');
            actionsRow.classList.add('screenshot-item-actions');

            const dragHandle = document.createElement('md-icon-button');
            dragHandle.classList.add('screenshot-drag-handle');
            dragHandle.innerHTML = '<span class="material-symbols-outlined">drag_indicator</span>';
            actionsRow.appendChild(dragHandle);

            const actionsEnd = document.createElement('div');
            actionsEnd.classList.add('screenshot-item-actions-end');

            const openButton = document.createElement('md-icon-button');
            openButton.setAttribute('aria-label', 'Preview screenshot');
            openButton.innerHTML = '<span class="material-symbols-outlined">visibility</span>';
            openButton.addEventListener('click', (event) => {
                event.stopPropagation();
                openScreenshotDialog(state.apps[appIndex].screenshots[screenshotIndex], {
                    title: `Screenshot ${screenshotIndex + 1}`,
                    packageName: state.apps[appIndex].packageName || state.apps[appIndex].name || ''
                });
            });
            actionsEnd.appendChild(openButton);

            const removeButton = document.createElement('md-icon-button');
            removeButton.setAttribute('aria-label', 'Remove screenshot');
            removeButton.innerHTML = '<span class="material-symbols-outlined">delete</span>';
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                state.apps[appIndex].screenshots.splice(screenshotIndex, 1);
                removeScreenshotMeta(appIndex, screenshotIndex);
                if (!state.apps[appIndex].screenshots.length) {
                    state.apps[appIndex].screenshots.push('');
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
            thumbnail.referrerPolicy = 'no-referrer';
            thumbnailWrapper.appendChild(thumbnail);
            item.appendChild(thumbnailWrapper);

            const infoContainer = document.createElement('div');
            infoContainer.classList.add('screenshot-info');

            const textField = document.createElement('md-filled-text-field');
            textField.setAttribute('label', `Screenshot ${screenshotIndex + 1}`);
            textField.setAttribute('placeholder', 'https://example.com/screenshot.png');
            textField.value = value || '';
            textField.addEventListener('input', (event) => {
                const nextValue = event.target.value;
                state.apps[appIndex].screenshots[screenshotIndex] = nextValue;
                updateThumbnail(nextValue);
                touchWorkspace();
                updatePreview();
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
                applyMetaInfo(meta);
            });
            thumbnail.addEventListener('error', () => {
                thumbnailWrapper.dataset.state = 'error';
                setScreenshotMeta(appIndex, screenshotIndex, null);
                metaInfo.dataset.state = 'error';
                metaInfo.textContent = 'Preview unavailable — check the link.';
            });

            item.addEventListener('dblclick', () => {
                openScreenshotDialog(state.apps[appIndex].screenshots[screenshotIndex], {
                    title: `Screenshot ${screenshotIndex + 1}`,
                    packageName: state.apps[appIndex].packageName || state.apps[appIndex].name || ''
                });
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

        function openScreenshotDialog(url, { title = 'Screenshot preview', packageName = '' } = {}) {
            if (!screenshotDialog || !screenshotDialogImage || !screenshotDialogCaption) {
                return;
            }
            const trimmed = utils.trimString(url);
            if (screenshotDialogHeadline) {
                screenshotDialogHeadline.textContent = title;
            }
            if (trimmed) {
                screenshotDialogImage.removeAttribute('hidden');
                screenshotDialogImage.src = trimmed;
                screenshotDialogImage.alt = packageName ? `${title} · ${packageName}` : title;
                screenshotDialogCaption.textContent = packageName ? `${packageName}` : trimmed;
            } else {
                screenshotDialogImage.setAttribute('hidden', 'true');
                screenshotDialogImage.removeAttribute('src');
                screenshotDialogImage.alt = 'No screenshot available';
                screenshotDialogCaption.textContent = 'Provide a screenshot URL to preview it here.';
            }
            if (screenshotDialogOpenButton) {
                if (trimmed) {
                    screenshotDialogOpenButton.disabled = false;
                    screenshotDialogOpenButton.onclick = () => {
                        if (typeof window !== 'undefined') {
                            window.open(trimmed, '_blank', 'noopener');
                        }
                    };
                } else {
                    screenshotDialogOpenButton.disabled = true;
                    screenshotDialogOpenButton.onclick = null;
                }
            }
            if (typeof AppDialogs !== 'undefined' && AppDialogs && typeof AppDialogs.rememberTrigger === 'function') {
                AppDialogs.rememberTrigger(screenshotDialog, document.activeElement);
            }
            screenshotDialog.open = true;
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
                state.apps = appsData.map((raw) => ({
                    name: utils.trimString(raw.name || ''),
                    packageName: utils.trimString(raw.packageName || ''),
                    category: utils.trimString(raw.category || ''),
                    description: utils.trimString(raw.description || ''),
                    iconLogo: utils.trimString(raw.iconLogo || ''),
                    screenshots: (() => {
                        const sanitized = utils
                            .normalizeArray(raw.screenshots)
                            .map((value) => utils.trimString(String(value ?? '')))
                            .filter(Boolean);
                        return sanitized.length ? sanitized : [''];
                    })()
                }));
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
            } else {
                if (button.dataset.originalLabel) {
                    button.innerHTML = button.dataset.originalLabel;
                    delete button.dataset.originalLabel;
                }
                button.disabled = false;
            }
        }

        async function fetchRemoteJson(urlSource, { fromPreset = false } = {}) {
            const targetUrl =
                urlSource || (fetchInput ? fetchInput.value.trim() : '');
            if (!targetUrl) {
                setPreviewStatus({
                    status: 'error',
                    message: 'Enter a JSON URL to fetch.'
                });
                alert('Enter a JSON URL to fetch.');
                return;
            }
            if (fetchInput && !urlSource) {
                fetchInput.value = targetUrl;
            }
            if (fetchInput && fromPreset) {
                fetchInput.value = targetUrl;
            }
            if (fetchButton) {
                setLoadingState(fetchButton, true);
            }
            try {
                const response = await fetch(targetUrl, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error( /*FIXME: 'throw' of exception caught locally */
                        `Request failed: ${response.status} ${response.statusText}`
                    );
                }
                const text = await response.text();
                importJson(text);
                remoteBaselinePayload = lastPreviewState.payload
                    ? utils.cloneJson(lastPreviewState.payload)
                    : null;
                updateDiffSheet();
                if (fetchButton) {
                    setLoadingState(fetchButton, false);
                    flashButton(
                        fetchButton,
                        '<span class="material-symbols-outlined">check</span><span>Loaded</span>'
                    );
                }
            } catch (error) {
                console.error('AppToolkit: Remote fetch failed.', error);
                if (fetchButton) {
                    setLoadingState(fetchButton, false);
                }
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

        async function ensureFileHandlePermission(handle, mode = 'read') {
            if (!handle) {
                return 'denied';
            }
            const options = { mode };
            if (typeof handle.queryPermission === 'function') { /*FIXME: Unresolved variable queryPermission */
                try {
                    const status = await handle.queryPermission(options); /*FIXME: Unresolved function or method queryPermission() */
                    if (status === 'granted' || status === 'denied') {
                        return status;
                    }
                } catch (error) {
                    // ignore and attempt to request permission below
                }
            }
            if (typeof handle.requestPermission === 'function') {
                try {
                    return await handle.requestPermission(options); /*FIXME: Argument type { mode: string } is not assignable to parameter type NotificationPermissionCallback | undefined  Assigned type doesn't contain call signatures */
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
                handles = await window.showOpenFilePicker({ /*FIXME: Unresolved function or method showOpenFilePicker() */
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
                return btoa(unescape(encodeURIComponent(string))); /*FIXME: Deprecated symbol used, consult docs for better alternative */
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
                        throw new Error(message); /*FIXME: 'throw' of exception caught locally */
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
                        throw new Error(message); /*FIXME: 'throw' of exception caught locally */
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
                state.apps = [createEmptyApp()];
                touchWorkspace();
                render();
                remoteBaselinePayload = null;
                updateDiffSheet();
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
            });
        }

        if (importButton && importInput) {
            utils.attachFilePicker(importButton, importInput, importJson);
        }

        if (fetchButton) {
            fetchButton.addEventListener('click', () => {
                fetchRemoteJson(); /*FIXME: Promise returned from fetchRemoteJson is ignored && Invalid number of arguments, expected 1..2*/
            });
        }

        if (fetchInput) {
            fetchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    fetchRemoteJson(); /*FIXME: Promise returned from fetchRemoteJson is ignored && Invalid number of arguments, expected 1..2*/
                }
            });
        }

        if (presetButtons.length) {
            presetButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const presetUrl = button.dataset.appToolkitPreset;
                    if (presetUrl) {
                        fetchRemoteJson(presetUrl, { fromPreset: true });
                    }
                });
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

        if (channelSegments) {
            const handleChannelChange = (event) => {
                const value = event?.target?.value || channelSegments.value || 'both';
                setChannelFocus(value);
                if (toolbarPulseEl) {
                    const label = value === 'both'
                        ? 'Dual'
                        : value.charAt(0).toUpperCase() + value.slice(1);
                    toolbarPulseEl.textContent = `Channel focus · ${label}`;
                }
            };
            channelSegments.addEventListener('change', handleChannelChange);
            channelSegments.addEventListener('input', handleChannelChange);
        }

        if (modeSegments) {
            const handleModeChange = (event) => {
                const value = event?.target?.value || modeSegments.value || 'flow';
                setLayoutMode(value);
                if (toolbarPulseEl) {
                    toolbarPulseEl.textContent =
                        value === 'compact'
                            ? 'Compact view · Focus on one listing at a time'
                            : 'Flow view · Side-by-side with preview';
                }
            };
            modeSegments.addEventListener('change', handleModeChange);
            modeSegments.addEventListener('input', handleModeChange);
        }

        if (filterChipSet) {
            filterChipSet.addEventListener('change', () => {
                syncFiltersFromChipSet();
            });
            filterChipSet.addEventListener('click', () => {
                syncFiltersFromChipSet();
            });
        }

        if (focusButton) {
            focusButton.addEventListener('click', () => {
                openFocusDialog({ autoStart: true });
                if (toolbarPulseEl) {
                    toolbarPulseEl.textContent = 'Focus session started.';
                }
            });
        }

        if (notesButton) {
            notesButton.addEventListener('click', () => {
                openFocusDialog({ autoStart: false });
                if (toolbarPulseEl) {
                    toolbarPulseEl.textContent = 'Review or capture session notes.';
                }
            });
        }

        if (focusDialog) {
            ['close', 'cancel'].forEach((eventName) => {
                focusDialog.addEventListener(eventName, () => {
                    pauseFocusTimer();
                    loadSavedNote();
                });
            });
        }

        if (focusStartButton) {
            focusStartButton.addEventListener('click', () => {
                startFocusTimer();
            });
        }

        if (focusPauseButton) {
            focusPauseButton.addEventListener('click', () => {
                pauseFocusTimer();
            });
        }

        if (focusResetButton) {
            focusResetButton.addEventListener('click', () => {
                resetFocusTimer();
            });
        }

        if (focusSaveButton) {
            focusSaveButton.addEventListener('click', () => {
                const savedNote = saveSessionNote(focusNotesField ? focusNotesField.value : '');
                if (toolbarPulseEl) {
                    toolbarPulseEl.textContent = savedNote
                        ? 'Session note saved.'
                        : 'Session note cleared.';
                }
                if (focusDialog) {
                    focusDialog.open = false;
                }
            });
        }

        builderRoot.dataset.initialized = 'true';
        render();
    }

    global.initAppToolkitWorkspace = initAppToolkitWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
