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
        const importButton = document.getElementById('appToolkitImportButton');
        const importInput = document.getElementById('appToolkitImportInput');

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
            const sanitizedApps = state.apps
                .map((app) => normalizeApp(app))
                .filter((app) => Object.keys(app).length > 0);
            const data = { data: { apps: sanitizedApps } };
            if (previewArea) {
                previewArea.value = utils.formatJson(data);
            }
        }

        function normalizeApp(app) {
            const output = {};
            if (app.name) output.name = app.name;
            if (app.packageName) output.packageName = app.packageName;
            if (app.category) output.category = app.category;
            if (app.description) output.description = app.description;
            if (app.iconLogo) output.iconLogo = app.iconLogo;
            const screenshots = app.screenshots.filter((url) => url && url.trim());
            if (screenshots.length) output.screenshots = screenshots;
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
                    alert('No apps found in the imported JSON.');
                    return;
                }
                state.apps = appsData.map((raw) => ({
                    name: raw.name || '',
                    packageName: raw.packageName || '',
                    category: raw.category || '',
                    description: raw.description || '',
                    iconLogo: raw.iconLogo || '',
                    screenshots: utils.normalizeArray(raw.screenshots).length
                        ? [...raw.screenshots]
                        : ['']
                }));
                render();
            } catch (error) {
                console.error('AppToolkit: Failed to import JSON.', error);
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

        builderRoot.dataset.initialized = 'true';
        render();
    }

    global.initAppToolkitWorkspace = initAppToolkitWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
