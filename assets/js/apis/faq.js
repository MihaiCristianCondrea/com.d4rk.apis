(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('FaqBuilder: ApiBuilderUtils is required.');
        return;
    }

    const DEFAULT_FILENAME = 'faq_entries.json';
    const DEFAULT_DATA_URL = 'api/faq/v1/faq_entries.json';
    const ICONS_ENDPOINT = 'https://fonts.google.com/metadata/icons?incomplete=1&icon.set=Material+Symbols';

    function initFaqWorkspace() {
        const builderRoot = document.getElementById('faqBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const entriesContainer = document.getElementById('faqEntries');
        const addButton = document.getElementById('faqAddEntry');
        const resetButton = document.getElementById('faqResetButton');
        const importButton = document.getElementById('faqImportButton');
        const importInput = document.getElementById('faqImportInput');
        const fetchButton = document.getElementById('faqFetchButton');
        const fetchInput = document.getElementById('faqFetchInput');
        const fetchStatus = document.getElementById('faqFetchStatus');
        const presetButton = document.getElementById('faqPresetButton');
        const previewArea = document.getElementById('faqPreview');
        const validationStatus = document.getElementById('faqValidation');
        const toolbarStatus = document.getElementById('faqToolbarStatus');
        const copyButton = document.getElementById('faqCopyButton');
        const downloadButton = document.getElementById('faqDownloadButton');
        const iconList = document.getElementById('faqIconOptions');
        const refreshIconsButton = document.getElementById('faqRefreshIcons');
        const iconStatus = document.getElementById('faqIconStatus');
        const iconCountEl = document.getElementById('faqIconCount');
        const totalCountEl = document.getElementById('faqTotalCount');
        const featuredCountEl = document.getElementById('faqFeaturedCount');
        const iconCoverageEl = document.getElementById('faqIconCoverage');
        const workspacePulseEl = document.getElementById('faqWorkspacePulse');

        const state = {
            entries: [createEmptyEntry()]
        };
        let iconNames = [];
        let lastPreviewState = { success: false, payload: [] };
        let lastEvaluation = { errors: [], warnings: [] };
        let iconsRequested = false;

        builderRoot.dataset.initialized = 'true';

        function createEmptyEntry() {
            return {
                id: '',
                question: '',
                iconSymbol: '',
                category: 'general',
                featured: false,
                homeAnswerHtml: '',
                answerHtml: ''
            };
        }

        function cloneEntry(entry) {
            return {
                id: entry.id || '',
                question: entry.question || '',
                iconSymbol: entry.iconSymbol || '',
                category: entry.category || 'general',
                featured: Boolean(entry.featured),
                homeAnswerHtml: typeof entry.homeAnswerHtml === 'string' ? entry.homeAnswerHtml : '',
                answerHtml: typeof entry.answerHtml === 'string' ? entry.answerHtml : ''
            };
        }

        function normalizeEntry(raw) {
            if (!raw || typeof raw !== 'object') {
                return createEmptyEntry();
            }
            return {
                id: typeof raw.id === 'string' ? raw.id : '',
                question: typeof raw.question === 'string' ? raw.question : '',
                iconSymbol: typeof raw.iconSymbol === 'string' ? raw.iconSymbol : '',
                category: utils.trimString(raw.category) || 'general',
                featured: Boolean(raw.featured),
                homeAnswerHtml: typeof raw.homeAnswerHtml === 'string' ? raw.homeAnswerHtml : '',
                answerHtml: typeof raw.answerHtml === 'string' ? raw.answerHtml : ''
            };
        }

        function render() {
            if (!entriesContainer) {
                return;
            }
            utils.clearElement(entriesContainer);
            if (!state.entries.length) {
                state.entries.push(createEmptyEntry());
            }
            state.entries.forEach((entry, index) => {
                entriesContainer.appendChild(createEntryCard(entry, index));
            });
            updatePreview();
        }

        function createEntryCard(entry, index) {
            const wrapper = utils.createElement('div', { classNames: 'builder-card' });
            const header = utils.createElement('div', { classNames: 'builder-card-header' });
            header.appendChild(utils.createElement('h3', { text: `FAQ ${index + 1}` }));

            const moveUpButton = utils.createInlineButton({
                icon: 'arrow_upward',
                title: 'Move up',
                onClick: () => moveEntry(index, -1)
            });
            moveUpButton.disabled = index === 0;
            header.appendChild(moveUpButton);

            const moveDownButton = utils.createInlineButton({
                icon: 'arrow_downward',
                title: 'Move down',
                onClick: () => moveEntry(index, 1)
            });
            moveDownButton.disabled = index === state.entries.length - 1;
            header.appendChild(moveDownButton);

            header.appendChild(
                utils.createInlineButton({
                    icon: 'content_copy',
                    label: 'Duplicate',
                    onClick: () => {
                        state.entries.splice(index + 1, 0, cloneEntry(state.entries[index]));
                        render();
                    }
                })
            );

            header.appendChild(
                utils.createInlineButton({
                    icon: 'delete',
                    label: 'Remove',
                    variant: 'danger',
                    onClick: () => {
                        if (state.entries.length === 1) {
                            state.entries[0] = createEmptyEntry();
                        } else {
                            state.entries.splice(index, 1);
                        }
                        render();
                    }
                })
            );
            wrapper.appendChild(header);

            const fields = utils.createElement('div', { classNames: 'builder-card-fields' });

            const idField = utils.createInputField({
                label: 'FAQ ID',
                value: entry.id,
                helperText: 'Use lowercase hyphenated IDs (e.g., faq-gms).',
                onInput: (value) => {
                    state.entries[index].id = value;
                    updatePreview();
                }
            });
            fields.appendChild(idField.wrapper);

            const questionField = utils.createInputField({
                label: 'Question',
                value: entry.question,
                helperText: 'Keep questions concise and specific.',
                onInput: (value) => {
                    state.entries[index].question = value;
                    updatePreview();
                }
            });
            fields.appendChild(questionField.wrapper);

            const iconField = utils.createInputField({
                label: 'Icon symbol',
                value: entry.iconSymbol,
                helperText: 'Material Symbols name. Type to filter suggestions.',
                onInput: (value) => {
                    state.entries[index].iconSymbol = value;
                    iconPreview.textContent = value ? value : 'help';
                    updatePreview();
                }
            });
            if (iconField.input) {
                iconField.input.setAttribute('list', 'faqIconOptions');
                iconField.input.setAttribute('spellcheck', 'false');
            }
            const iconPreview = utils.createElement('span', {
                classNames: ['material-symbols-outlined', 'faq-icon-preview'],
                text: entry.iconSymbol || 'help'
            });
            iconField.wrapper.appendChild(iconPreview);
            fields.appendChild(iconField.wrapper);

            const categoryField = utils.createInputField({
                label: 'Category',
                value: entry.category || 'general',
                helperText: 'Default is general. Update only if a new section is required.',
                onInput: (value) => {
                    state.entries[index].category = value || 'general';
                    updatePreview();
                }
            });
            fields.appendChild(categoryField.wrapper);

            const featuredField = utils.createSelectField({
                label: 'Featured on home',
                value: entry.featured ? 'true' : 'false',
                options: [
                    { value: 'false', label: 'No' },
                    { value: 'true', label: 'Yes' }
                ],
                onChange: (value) => {
                    state.entries[index].featured = value === 'true';
                    updatePreview();
                }
            });
            fields.appendChild(featuredField.wrapper);

            const homeAnswerField = utils.createTextareaField({
                label: 'Home answer HTML (optional)',
                value: entry.homeAnswerHtml,
                rows: 4,
                placeholder: '<p>Short summary for cards...</p>',
                helperText: 'Shortened copy for home surfaces. Leave blank to omit.',
                onInput: (value) => {
                    state.entries[index].homeAnswerHtml = value;
                    updatePreview();
                }
            });
            fields.appendChild(homeAnswerField.wrapper);

            const answerField = utils.createTextareaField({
                label: 'Full answer HTML',
                value: entry.answerHtml,
                rows: 6,
                placeholder: '<p>Rich answer with paragraphs and lists...</p>',
                helperText: 'Provide complete context. HTML is preserved as typed.',
                onInput: (value) => {
                    state.entries[index].answerHtml = value;
                    updatePreview();
                }
            });
            fields.appendChild(answerField.wrapper);

            wrapper.appendChild(fields);
            return wrapper;
        }

        function moveEntry(index, delta) {
            const target = index + delta;
            if (target < 0 || target >= state.entries.length) {
                return;
            }
            const temp = state.entries[index];
            state.entries[index] = state.entries[target];
            state.entries[target] = temp;
            render();
        }

        function buildPayload(entries) {
            return entries
                .map((entry) => {
                    const id = utils.trimString(entry.id);
                    const question = utils.trimString(entry.question);
                    const category = utils.trimString(entry.category) || 'general';
                    const iconSymbol = utils.trimString(entry.iconSymbol);
                    const featured = Boolean(entry.featured);
                    const homeAnswer = typeof entry.homeAnswerHtml === 'string' ? entry.homeAnswerHtml : '';
                    const answer = typeof entry.answerHtml === 'string' ? entry.answerHtml : '';
                    if (!id || !question || !answer.trim()) {
                        return null;
                    }
                    const payload = {
                        id,
                        question,
                        iconSymbol: iconSymbol || undefined,
                        category,
                        featured: featured || undefined,
                        homeAnswerHtml: homeAnswer && homeAnswer.trim() ? homeAnswer : undefined,
                        answerHtml: answer.trim() ? answer : undefined
                    };
                    if (!payload.iconSymbol) {
                        delete payload.iconSymbol;
                    }
                    if (!payload.featured) {
                        delete payload.featured;
                    }
                    if (!payload.homeAnswerHtml) {
                        delete payload.homeAnswerHtml;
                    }
                    if (!payload.answerHtml) {
                        return null;
                    }
                    return payload;
                })
                .filter(Boolean)
                .map((entry) => {
                    const cleaned = { id: entry.id, question: entry.question, category: entry.category, answerHtml: entry.answerHtml };
                    if (entry.iconSymbol) {
                        cleaned.iconSymbol = entry.iconSymbol;
                    }
                    if (entry.featured) {
                        cleaned.featured = true;
                    }
                    if (entry.homeAnswerHtml) {
                        cleaned.homeAnswerHtml = entry.homeAnswerHtml;
                    }
                    return cleaned;
                });
        }

        function evaluateState(payload) {
            const errors = [];
            const warnings = [];
            const seenIds = new Set();
            state.entries.forEach((entry, index) => {
                const id = utils.trimString(entry.id);
                const question = utils.trimString(entry.question);
                const answer = typeof entry.answerHtml === 'string' ? entry.answerHtml.trim() : '';
                const isBlank = !id && !question && !answer;
                if (isBlank) {
                    return;
                }
                if (!id) {
                    errors.push(`FAQ ${index + 1} is missing an id.`);
                } else if (seenIds.has(id)) {
                    errors.push(`Duplicate id detected: ${id}`);
                } else {
                    seenIds.add(id);
                }
                if (!question) {
                    errors.push(`FAQ ${index + 1} is missing a question.`);
                }
                if (!answer) {
                    errors.push(`FAQ ${index + 1} is missing answer HTML.`);
                }
            });
            if (!payload.length) {
                warnings.push('Add at least one complete FAQ entry before exporting.');
            }
            return { errors, warnings };
        }

        function updatePreview() {
            if (!previewArea) {
                return;
            }
            const result = utils.renderJsonPreview({
                previewArea,
                statusElement: null,
                data: state.entries,
                buildPayload
            });
            if (result && typeof result === 'object') {
                lastPreviewState = result;
            } else {
                lastPreviewState = { success: false, payload: [] };
            }
            const payload = lastPreviewState.success ? lastPreviewState.payload || [] : [];
            lastEvaluation = evaluateState(payload);
            applyValidationState(payload);
            updateMetrics(payload);
            updateExportControls();
        }

        function applyValidationState(payload) {
            const errors = Array.isArray(lastEvaluation.errors) ? lastEvaluation.errors : [];
            const warnings = Array.isArray(lastEvaluation.warnings) ? lastEvaluation.warnings : [];
            if (!validationStatus || !toolbarStatus) {
                return;
            }
            if (!lastPreviewState.success) {
                utils.setValidationStatus(validationStatus, {
                    status: 'error',
                    message: 'Invalid JSON output.'
                });
                toolbarStatus.textContent = 'Validation error';
                toolbarStatus.dataset.state = 'error';
                updateWorkspacePulse('Resolve validation errors.');
                return;
            }
            if (errors.length) {
                utils.setValidationStatus(validationStatus, {
                    status: 'error',
                    message: errors[0]
                });
                toolbarStatus.textContent = errors[0];
                toolbarStatus.dataset.state = 'error';
                updateWorkspacePulse(errors[0]);
                return;
            }
            if (!payload.length) {
                utils.setValidationStatus(validationStatus, {
                    status: 'warning',
                    message: 'Valid JSON · Add FAQs to export.'
                });
                toolbarStatus.textContent = 'Awaiting entries';
                toolbarStatus.dataset.state = 'warning';
                const warningMessage = warnings[0] || 'Start adding entries to generate the FAQ payload.';
                updateWorkspacePulse(warningMessage);
                return;
            }
            const message = payload.length === 1
                ? 'Valid JSON · 1 FAQ entry'
                : `Valid JSON · ${payload.length} FAQ entries`;
            utils.setValidationStatus(validationStatus, {
                status: 'success',
                message
            });
            toolbarStatus.textContent = message;
            toolbarStatus.dataset.state = 'success';
            updateWorkspacePulse('FAQ payload is ready to export.');
        }

        function updateWorkspacePulse(message) {
            if (!workspacePulseEl) {
                return;
            }
            workspacePulseEl.textContent = message;
        }

        function updateMetrics(payload) {
            const total = state.entries.length;
            const featured = state.entries.filter((entry) => Boolean(entry.featured)).length;
            const withIcons = state.entries.filter((entry) => Boolean(utils.trimString(entry.iconSymbol))).length;
            if (totalCountEl) {
                totalCountEl.textContent = String(total);
            }
            if (featuredCountEl) {
                featuredCountEl.textContent = String(featured);
            }
            if (iconCoverageEl) {
                if (total === 0) {
                    iconCoverageEl.textContent = '0/0';
                } else {
                    const percentage = Math.round((withIcons / total) * 100);
                    iconCoverageEl.textContent = `${withIcons}/${total} (${percentage}%)`;
                }
            }
        }

        function updateExportControls() {
            const payload = lastPreviewState.success ? lastPreviewState.payload || [] : [];
            const errors = Array.isArray(lastEvaluation.errors) ? lastEvaluation.errors : [];
            const valid = payload.length > 0 && errors.length === 0;
            const helper = valid ? 'Ready to export' : errors[0] || 'Add complete entries to export.';
            if (copyButton) {
                copyButton.disabled = !valid;
                copyButton.title = helper;
            }
            if (downloadButton) {
                downloadButton.disabled = !valid;
                downloadButton.title = helper;
            }
        }

        function flashButton(button, html) {
            if (!button) {
                return;
            }
            const original = button.innerHTML;
            button.disabled = true;
            button.innerHTML = html;
            setTimeout(() => {
                button.innerHTML = original;
                button.disabled = false;
            }, 1500);
        }

        function setFetchStatus(message, status = 'info') {
            if (!fetchStatus) {
                return;
            }
            fetchStatus.textContent = message;
            fetchStatus.dataset.status = status;
        }

        function setIconStatus(message, status = 'info') {
            if (!iconStatus) {
                return;
            }
            iconStatus.textContent = message;
            iconStatus.dataset.status = status;
        }

        function applyFaqData(data) {
            if (!Array.isArray(data)) {
                throw new Error('FAQ payload must be an array.');
            }
            const normalized = data.map((entry) => normalizeEntry(entry));
            state.entries = normalized.length ? normalized : [createEmptyEntry()];
            render();
        }

        async function fetchFromUrl(url, { silent = false } = {}) {
            const trimmed = utils.trimString(url);
            if (!trimmed) {
                if (!silent) {
                    setFetchStatus('Enter a JSON URL to import.', 'warning');
                }
                return;
            }
            if (!silent) {
                setFetchStatus('Fetching FAQ JSON…', 'loading');
            }
            try {
                const response = await fetch(trimmed, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                const text = await response.text();
                const parsed = utils.parseJson(text);
                applyFaqData(parsed);
                if (!silent) {
                    setFetchStatus('FAQ payload loaded successfully.', 'success');
                }
            } catch (error) {
                console.error('FaqBuilder: Failed to fetch JSON.', error);
                if (!silent) {
                    setFetchStatus('Unable to fetch FAQ JSON. Check the URL and try again.', 'error');
                }
            }
        }

        async function refreshIcons() {
            if (iconsRequested) {
                return;
            }
            iconsRequested = true;
            setIconStatus('Loading Material Symbols catalog…', 'loading');
            try {
                const response = await fetch(ICONS_ENDPOINT, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`Icon request failed with status ${response.status}`);
                }
                const text = await response.text();
                const sanitized = text.replace(/^\)\]\}'\n?/, '');
                const data = JSON.parse(sanitized);
                const names = Array.isArray(data?.icons)
                    ? data.icons
                          .map((icon) => (typeof icon?.name === 'string' ? icon.name : ''))
                          .filter(Boolean)
                    : [];
                iconNames = names.sort((a, b) => a.localeCompare(b));
                populateIconOptions();
                if (iconCountEl) {
                    iconCountEl.textContent = String(iconNames.length);
                }
                setIconStatus('Material Symbols catalog loaded.', 'success');
            } catch (error) {
                console.error('FaqBuilder: Failed to load icon catalog.', error);
                setIconStatus('Failed to load Material Symbols catalog.', 'error');
            }
        }

        function populateIconOptions() {
            if (!iconList) {
                return;
            }
            utils.clearElement(iconList);
            iconNames.forEach((name) => {
                iconList.appendChild(utils.createElement('option', { attrs: { value: name } }));
            });
        }

        function handleImport(content) {
            try {
                const parsed = utils.parseJson(content);
                applyFaqData(parsed);
                setFetchStatus('Imported FAQ payload from file.', 'success');
            } catch (error) {
                console.error('FaqBuilder: Failed to import JSON file.', error);
                setFetchStatus('Could not import the selected JSON file.', 'error');
            }
        }

        if (addButton) {
            addButton.addEventListener('click', () => {
                state.entries.push(createEmptyEntry());
                render();
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => {
                state.entries = [createEmptyEntry()];
                render();
                setFetchStatus('Workspace reset to a blank FAQ.', 'info');
            });
        }

        if (importButton && importInput) {
            utils.attachFilePicker(importButton, importInput, handleImport);
        }

        if (fetchButton && fetchInput) {
            fetchButton.addEventListener('click', () => fetchFromUrl(fetchInput.value));
        }

        if (presetButton) {
            presetButton.addEventListener('click', () => {
                const presetUrl = presetButton.getAttribute('data-faq-preset');
                if (presetUrl) {
                    if (fetchInput) {
                        fetchInput.value = presetUrl;
                    }
                    fetchFromUrl(presetUrl);
                }
            });
        }

        if (copyButton && previewArea) {
            copyButton.addEventListener('click', async () => {
                if (copyButton.disabled) {
                    return;
                }
                await utils.copyToClipboard(previewArea.value);
                flashButton(copyButton, '<span class="material-symbols-outlined">check</span><span>Copied</span>');
            });
        }

        if (downloadButton && previewArea) {
            downloadButton.addEventListener('click', () => {
                if (downloadButton.disabled) {
                    return;
                }
                utils.downloadJson(DEFAULT_FILENAME, previewArea.value);
            });
        }

        if (refreshIconsButton) {
            refreshIconsButton.addEventListener('click', () => {
                iconsRequested = false;
                refreshIcons();
            });
        }

        render();
        refreshIcons();
        fetchFromUrl(DEFAULT_DATA_URL, { silent: true });
    }

    global.initFaqWorkspace = initFaqWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
