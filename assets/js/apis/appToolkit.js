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

    function initAppToolkitWorkspace() {
        const builderRoot = document.getElementById('appToolkitBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const entriesContainer = document.getElementById('appToolkitEntries');
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
        const githubSubmitButton = document.getElementById('appToolkitGithubSubmit');
        const githubStatus = document.getElementById('appToolkitGithubStatus');
        const trackedCountEl = document.getElementById('appToolkitTrackedCount');
        const releaseReadyCountEl = document.getElementById('appToolkitReleaseReadyCount');
        const screenshotAverageEl = document.getElementById('appToolkitScreenshotAverage');
        const reviewCountEl = document.getElementById('appToolkitReviewCount');
        const workspacePulseEl = document.getElementById('appToolkitWorkspacePulse');
        const toolbarPulseEl = document.getElementById('appToolkitToolbarPulse');
        const releaseProgressEl = document.getElementById('appToolkitReleaseProgress');
        const lastEditedEl = document.getElementById('appToolkitLastEdited');
        const channelButtons = Array.from(
            document.querySelectorAll('[data-app-toolkit-channel]')
        );
        const modeButtons = Array.from(document.querySelectorAll('[data-app-toolkit-mode]'));
        const focusButton = document.getElementById('appToolkitFocusButton');
        const notesButton = document.getElementById('appToolkitNotesButton');
        let sessionNotesStorage = null;
        const SESSION_NOTE_KEY = 'appToolkitWorkspaceNote';

        const state = {
            apps: [createEmptyApp()]
        };
        let lastPreviewState = { success: false, payload: null };
        let lastTouchedAt = null;
        let relativeTimer = null;
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

        function updatePreview() {
            const result = utils.renderJsonPreview({
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

        function getSanitizedApps() {
            return state.apps
                .map((app) => sanitizeAppEntry(app))
                .filter((app) => Object.keys(app).length > 0);
        }

        function formatAverage(value) {
            if (!value) {
                return '0';
            }
            const rounded = Math.round(value * 10) / 10;
            return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
        }

        function updateWorkspaceMetrics() {
            const sanitizedApps = getSanitizedApps();
            const total = sanitizedApps.length;
            const releaseReady = sanitizedApps.filter((app) => {
                const hasRequired = ['name', 'packageName', 'category', 'iconLogo'].every(
                    (field) => Boolean(app[field])
                );
                const screenshotCount = Array.isArray(app.screenshots) ? app.screenshots.length : 0;
                return hasRequired && screenshotCount >= 3;
            }).length;
            const screenshotTotal = sanitizedApps.reduce(
                (count, app) => count + (Array.isArray(app.screenshots) ? app.screenshots.length : 0),
                0
            );
            const averageScreenshots = total ? screenshotTotal / total : 0;
            const pending = Math.max(total - releaseReady, 0);

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
            return { total, releaseReady, pending };
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

        function setLayoutMode(mode) {
            if (!builderRoot) {
                return;
            }
            const target = mode === 'compact' ? 'compact' : 'flow';
            builderRoot.dataset.layout = target;
            modeButtons.forEach((button) => {
                button.classList.toggle('active', button.dataset.appToolkitMode === target);
            });
        }

        function setChannelFocus(channel) {
            if (!builderRoot) {
                return;
            }
            const allowed = ['debug', 'release', 'both'];
            const target = allowed.includes(channel) ? channel : 'both';
            builderRoot.dataset.channel = target;
            channelButtons.forEach((button) => {
                button.classList.toggle('active', button.dataset.appToolkitChannel === target);
            });
        }

        function setPreviewStatus(options) {
            utils.setValidationStatus(validationStatus, options);
            updateToolbarPulse();
        }

        function loadSavedNote() {
            if (!notesButton || !sessionNotesStorage) {
                return;
            }
            const saved = sessionNotesStorage.getItem(SESSION_NOTE_KEY) || '';
            notesButton.dataset.noteState = saved ? 'saved' : 'empty';
            if (saved) {
                notesButton.setAttribute('aria-label', 'Edit session note');
                notesButton.setAttribute('title', saved);
            } else {
                notesButton.setAttribute('aria-label', 'Capture session note');
                notesButton.removeAttribute('title');
            }
        }

        setLayoutMode(builderRoot && builderRoot.dataset ? builderRoot.dataset.layout : 'flow');
        setChannelFocus(
            builderRoot && builderRoot.dataset ? builderRoot.dataset.channel : 'both'
        );
        updateLastEditedDisplay();
        loadSavedNote();

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
        }

        function createAppCard(app, index) {
            const card = utils.createElement('div', { classNames: 'builder-card' });
            const header = utils.createElement('div', { classNames: 'builder-card-header' });
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

            const fields = utils.createElement('div', { classNames: 'builder-card-fields' });
            const nameField = utils.createInputField({
                label: 'App name',
                value: app.name,
                onInput: (value) => {
                    state.apps[index].name = value;
                    touchWorkspace();
                    updatePreview();
                }
            });
            fields.appendChild(nameField.wrapper);

            const packageField = utils.createInputField({
                label: 'Package name',
                value: app.packageName,
                placeholder: 'com.example.app',
                onInput: (value) => {
                    state.apps[index].packageName = value;
                    touchWorkspace();
                    updatePreview();
                }
            });
            fields.appendChild(packageField.wrapper);

            const categoryField = utils.createInputField({
                label: 'Category',
                value: app.category,
                onInput: (value) => {
                    state.apps[index].category = value;
                    touchWorkspace();
                    updatePreview();
                }
            });
            fields.appendChild(categoryField.wrapper);

            const descriptionField = utils.createTextareaField({
                label: 'Description',
                value: app.description,
                rows: 3,
                onInput: (value) => {
                    state.apps[index].description = value;
                    touchWorkspace();
                    updatePreview();
                }
            });
            fields.appendChild(descriptionField.wrapper);

            const iconField = utils.createInputField({
                label: 'Icon URL',
                value: app.iconLogo,
                placeholder: 'https://example.com/icon.png',
                onInput: (value) => {
                    state.apps[index].iconLogo = value;
                    touchWorkspace();
                    updatePreview();
                }
            });
            fields.appendChild(iconField.wrapper);

            const screenshotsSection = utils.createElement('div', { classNames: 'builder-subsection' });
            screenshotsSection.appendChild(utils.createElement('h4', { text: 'Screenshots' }));
            const screenshotsList = utils.createElement('div', { classNames: 'screenshot-list' });
            app.screenshots.forEach((url, screenshotIndex) => {
                screenshotsList.appendChild(createScreenshotField(index, screenshotIndex, url));
            });
            const addScreenshotButton = utils.createInlineButton({
                label: 'Add screenshot',
                icon: 'add',
                onClick: () => {
                    state.apps[index].screenshots.push('');
                    touchWorkspace();
                    render();
                }
            });
            screenshotsSection.appendChild(screenshotsList);
            screenshotsSection.appendChild(addScreenshotButton);

            fields.appendChild(screenshotsSection);
            card.appendChild(fields);
            return card;
        }

        function createScreenshotField(appIndex, screenshotIndex, value) {
            const row = utils.createElement('div', { classNames: 'screenshot-row' });
            const field = utils.createInputField({
                label: `Screenshot ${screenshotIndex + 1}`,
                value,
                placeholder: 'https://example.com/screenshot.png',
                onInput: (text) => {
                    state.apps[appIndex].screenshots[screenshotIndex] = text;
                    touchWorkspace();
                    updatePreview();
                }
            });
            row.appendChild(field.wrapper);
            const removeButton = utils.createInlineButton({
                label: 'Remove',
                icon: 'close',
                title: 'Remove screenshot',
                onClick: () => {
                    state.apps[appIndex].screenshots.splice(screenshotIndex, 1);
                    if (!state.apps[appIndex].screenshots.length) {
                        state.apps[appIndex].screenshots.push('');
                    }
                    touchWorkspace();
                    render();
                }
            });
            row.appendChild(removeButton);
            return row;
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
                    throw new Error(
                        `Request failed: ${response.status} ${response.statusText}`
                    );
                }
                const text = await response.text();
                importJson(text);
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

        function handleGithubTokenFileSelection(file) {
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                try {
                    const text = typeof reader.result === 'string' ? reader.result : '';
                    const token = validateGithubToken(extractGithubTokenFromText(text));
                    if (githubTokenInput) {
                        githubTokenInput.value = token;
                    }
                    setGithubStatus({
                        status: 'success',
                        message: `Loaded token from ${file.name}.`
                    });
                } catch (error) {
                    setGithubStatus({
                        status: 'error',
                        message: error.message || 'Unable to read GitHub token from file.'
                    });
                    alert(error.message || 'Unable to read GitHub token from file.');
                }
            });
            reader.addEventListener('error', () => {
                setGithubStatus({
                    status: 'error',
                    message: `Unable to read ${file.name}.`
                });
                alert(`Unable to read ${file.name}.`);
            });
            reader.readAsText(file);
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
            if (!githubSubmitButton) {
                return;
            }

            let token;
            try {
                token = validateGithubToken(githubTokenInput ? githubTokenInput.value : '');
            } catch (error) {
                setGithubStatus({ status: 'error', message: error.message });
                alert(error.message);
                return;
            }

            if (!validationStatus || validationStatus.dataset.status !== 'success' || !lastPreviewState.success) {
                setGithubStatus({ status: 'error', message: 'Resolve JSON validation issues before publishing.' });
                alert('Resolve JSON validation issues shown in the preview before publishing.');
                return;
            }

            if (!previewArea || !previewArea.value.trim()) {
                setGithubStatus({ status: 'error', message: 'No JSON payload available to publish.' });
                alert('There is no JSON payload to publish.');
                return;
            }

            let repository;
            try {
                repository = parseRepository(githubRepoInput ? githubRepoInput.value : '');
            } catch (error) {
                setGithubStatus({ status: 'error', message: error.message });
                alert(error.message);
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

            setLoadingState(githubSubmitButton, true, 'Publishing…');

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
                        throw new Error(message);
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
                        throw new Error(message);
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
                    githubSubmitButton,
                    '<span class="material-symbols-outlined">check</span><span>Published</span>'
                );
            } catch (error) {
                console.error('AppToolkit: Failed to publish via GitHub API.', error);
                setGithubStatus({
                    status: 'error',
                    message: error.message || 'GitHub publish request failed.'
                });
                alert(error.message || 'GitHub publish request failed.');
            } finally {
                setLoadingState(githubSubmitButton, false);
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
                fetchRemoteJson();
            });
        }

        if (fetchInput) {
            fetchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    fetchRemoteJson();
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
            githubTokenFileButton.addEventListener('click', () => {
                clearGithubStatus();
                githubTokenFileInput.value = '';
                githubTokenFileInput.click();
            });
            githubTokenFileInput.addEventListener('change', () => {
                const file = githubTokenFileInput.files && githubTokenFileInput.files[0];
                if (file) {
                    clearGithubStatus();
                    handleGithubTokenFileSelection(file);
                }
            });
        }

        if (githubSubmitButton) {
            githubSubmitButton.addEventListener('click', () => {
                publishToGithub();
            });
        }

        if (channelButtons.length) {
            channelButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const targetChannel = button.dataset.appToolkitChannel;
                    setChannelFocus(targetChannel);
                    if (toolbarPulseEl) {
                        const label = button.textContent ? button.textContent.trim() : targetChannel;
                        toolbarPulseEl.textContent = `Channel focus · ${label}`;
                    }
                });
            });
        }

        if (modeButtons.length) {
            modeButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const targetMode = button.dataset.appToolkitMode;
                    setLayoutMode(targetMode);
                    if (toolbarPulseEl) {
                        toolbarPulseEl.textContent =
                            targetMode === 'compact'
                                ? 'Compact view · Focus on one listing at a time'
                                : 'Flow view · Side-by-side with preview';
                    }
                });
            });
        }

        if (focusButton) {
            focusButton.addEventListener('click', () => {
                const current = builderRoot && builderRoot.dataset.layout === 'compact';
                const next = current ? 'flow' : 'compact';
                setLayoutMode(next);
                if (toolbarPulseEl) {
                    toolbarPulseEl.textContent =
                        next === 'compact'
                            ? 'Focus mode enabled · Compact layout'
                            : 'Flow layout restored';
                }
            });
        }

        if (notesButton) {
            notesButton.addEventListener('click', () => {
                if (!sessionNotesStorage) {
                    alert('Session notes are unavailable in this environment.');
                    return;
                }
                const existing = sessionNotesStorage.getItem(SESSION_NOTE_KEY) || '';
                const note = typeof window !== 'undefined'
                    ? window.prompt('Capture a quick note for this workspace:', existing)
                    : existing;
                if (note === null || note === undefined) {
                    return;
                }
                const trimmed = note.trim();
                if (trimmed) {
                    sessionNotesStorage.setItem(SESSION_NOTE_KEY, trimmed);
                    loadSavedNote();
                    if (toolbarPulseEl) {
                        toolbarPulseEl.textContent = 'Note saved for this session.';
                    }
                } else {
                    sessionNotesStorage.removeItem(SESSION_NOTE_KEY);
                    loadSavedNote();
                    if (toolbarPulseEl) {
                        toolbarPulseEl.textContent = 'Session note cleared.';
                    }
                }
            });
        }

        builderRoot.dataset.initialized = 'true';
        render();
    }

    global.initAppToolkitWorkspace = initAppToolkitWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
