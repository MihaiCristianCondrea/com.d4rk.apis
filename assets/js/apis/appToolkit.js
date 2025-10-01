(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('AppToolkit: ApiBuilderUtils is required.');
        return;
    }

    const DEFAULT_FILENAME = 'api_android_apps.json';

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

        const state = {
            apps: [createEmptyApp()]
        };

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
            utils.renderJsonPreview({
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
                    updatePreview();
                }
            });
            fields.appendChild(packageField.wrapper);

            const categoryField = utils.createInputField({
                label: 'Category',
                value: app.category,
                onInput: (value) => {
                    state.apps[index].category = value;
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
                    utils.setValidationStatus(validationStatus, {
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
                render();
            } catch (error) {
                console.error('AppToolkit: Failed to import JSON.', error);
                utils.setValidationStatus(validationStatus, {
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

        function setLoadingState(button, isLoading) {
            if (!button) return;
            const LOADING_LABEL =
                '<span class="material-symbols-outlined">hourglass_empty</span><span>Fetching…</span>';
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
                utils.setValidationStatus(validationStatus, {
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
                utils.setValidationStatus(validationStatus, {
                    status: 'error',
                    message: error.message || 'Unable to fetch remote JSON.'
                });
                alert(error.message || 'Unable to fetch remote JSON.');
            }
        }

        if (addButton) {
            addButton.addEventListener('click', () => {
                state.apps.push(createEmptyApp());
                render();
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => {
                state.apps = [createEmptyApp()];
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

        builderRoot.dataset.initialized = 'true';
        render();
    }

    global.initAppToolkitWorkspace = initAppToolkitWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
