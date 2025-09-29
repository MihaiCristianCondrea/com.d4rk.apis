(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('EnglishWithLidia: ApiBuilderUtils is required.');
        return;
    }

    const HOME_FILENAME = 'english_home.json';
    const LESSON_FILENAME = 'english_lesson.json';
    const BLOCK_TYPE_HINT = 'Suggested: content_text, header, image, content_player, content_divider, ad_large_banner, ad_banner';

    const ENGLISH_BLOCK_FIELDS = {
        content_text: [
            { key: 'content_text', label: 'Text', type: 'textarea', helper: 'Supports HTML formatting.' }
        ],
        header: [
            { key: 'content_text', label: 'Header text', type: 'text' }
        ],
        image: [
            { key: 'content_image_url', label: 'Image URL', type: 'url' }
        ],
        content_player: [
            { key: 'content_audio_url', label: 'Audio URL', type: 'url' },
            { key: 'content_thumbnail_url', label: 'Thumbnail URL', type: 'url' },
            { key: 'content_title', label: 'Track title', type: 'text' },
            { key: 'content_artist', label: 'Artist', type: 'text' },
            { key: 'content_album_title', label: 'Album title', type: 'text' },
            { key: 'content_genre', label: 'Genre', type: 'text' },
            { key: 'content_description', label: 'Description', type: 'textarea' },
            { key: 'content_release_year', label: 'Release year', type: 'number' }
        ],
        ad_large_banner: [],
        ad_banner: [],
        content_divider: []
    };

    function initEnglishWorkspace() {
        initHomeBuilder();
        initLessonBuilder();
    }

    function initHomeBuilder() {
        const builderRoot = document.getElementById('englishHomeBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const entriesContainer = document.getElementById('englishHomeEntries');
        const previewArea = document.getElementById('englishHomePreview');
        const addButton = document.getElementById('englishHomeAddCard');
        const resetButton = document.getElementById('englishHomeResetButton');
        const copyButton = document.getElementById('englishHomeCopyButton');
        const downloadButton = document.getElementById('englishHomeDownloadButton');
        const importButton = document.getElementById('englishHomeImportButton');
        const importInput = document.getElementById('englishHomeImportInput');

        const state = {
            cards: [createEmptyCard()]
        };

        function createEmptyCard() {
            return {
                lesson_id: '',
                lesson_type: '',
                lesson_title: '',
                lesson_thumbnail_image_url: '',
                lesson_deep_link_path: '',
                customFields: []
            };
        }

        function render() {
            if (!entriesContainer) return;
            utils.clearElement(entriesContainer);
            if (!state.cards.length) {
                state.cards.push(createEmptyCard());
            }
            state.cards.forEach((card, index) => {
                entriesContainer.appendChild(createCard(card, index));
            });
            updatePreview();
        }

        function createCard(card, index) {
            const wrapper = utils.createElement('div', { classNames: 'builder-card' });
            const header = utils.createElement('div', { classNames: 'builder-card-header' });
            header.appendChild(utils.createElement('h3', { text: `Card ${index + 1}` }));
            header.appendChild(utils.createInlineButton({
                label: 'Remove',
                icon: 'delete',
                variant: 'danger',
                onClick: () => {
                    if (state.cards.length === 1) {
                        state.cards[0] = createEmptyCard();
                    } else {
                        state.cards.splice(index, 1);
                    }
                    render();
                }
            }));
            wrapper.appendChild(header);

            const fields = utils.createElement('div', { classNames: 'builder-card-fields' });
            fields.appendChild(
                utils.createInputField({
                    label: 'Lesson ID',
                    value: card.lesson_id,
                    onInput: (value) => {
                        state.cards[index].lesson_id = value;
                        updatePreview();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Lesson type',
                    value: card.lesson_type,
                    helperText: BLOCK_TYPE_HINT,
                    onInput: (value) => {
                        state.cards[index].lesson_type = value;
                        updatePreview();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Lesson title',
                    value: card.lesson_title,
                    onInput: (value) => {
                        state.cards[index].lesson_title = value;
                        updatePreview();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Thumbnail URL',
                    value: card.lesson_thumbnail_image_url,
                    placeholder: 'https://example.com/thumbnail.webp',
                    onInput: (value) => {
                        state.cards[index].lesson_thumbnail_image_url = value;
                        updatePreview();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Deep link path',
                    value: card.lesson_deep_link_path,
                    placeholder: 'com.d4rk.english://lesson/...',
                    onInput: (value) => {
                        state.cards[index].lesson_deep_link_path = value;
                        updatePreview();
                    }
                }).wrapper
            );

            const customSection = utils.createElement('div', { classNames: 'builder-subsection' });
            customSection.appendChild(utils.createElement('h4', { text: 'Optional fields' }));
            const list = utils.createElement('div', { classNames: 'custom-field-list' });
            card.customFields.forEach((field, fieldIndex) => {
                list.appendChild(createCustomFieldRow(field, (key) => {
                    state.cards[index].customFields[fieldIndex].key = key;
                    updatePreview();
                }, (value) => {
                    state.cards[index].customFields[fieldIndex].value = value;
                    updatePreview();
                }, () => {
                    state.cards[index].customFields.splice(fieldIndex, 1);
                    render();
                }));
            });
            const addFieldButton = utils.createInlineButton({
                label: 'Add field',
                icon: 'add',
                onClick: () => {
                    state.cards[index].customFields.push({ key: '', value: '' });
                    render();
                }
            });
            customSection.appendChild(list);
            customSection.appendChild(addFieldButton);
            fields.appendChild(customSection);
            wrapper.appendChild(fields);
            return wrapper;
        }

        function createCustomFieldRow(field, onKeyChange, onValueChange, onRemove) {
            const row = utils.createElement('div', { classNames: 'custom-field-row' });
            row.appendChild(
                utils.createInputField({
                    label: 'Key',
                    value: field.key,
                    onInput: onKeyChange
                }).wrapper
            );
            row.appendChild(
                utils.createInputField({
                    label: 'Value',
                    value: field.value,
                    onInput: onValueChange
                }).wrapper
            );
            row.appendChild(utils.createInlineButton({
                label: 'Remove',
                icon: 'close',
                onClick: onRemove
            }));
            return row;
        }

        function importJson(text) {
            try {
                const json = utils.parseJson(text);
                const cards = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
                if (!cards.length) {
                    throw new Error('No cards found in the imported JSON.');
                }
                state.cards = cards.map((raw) => ({
                    lesson_id: raw.lesson_id ? String(raw.lesson_id) : '',
                    lesson_type: raw.lesson_type || '',
                    lesson_title: raw.lesson_title || '',
                    lesson_thumbnail_image_url: raw.lesson_thumbnail_image_url || '',
                    lesson_deep_link_path: raw.lesson_deep_link_path || '',
                    customFields: Object.entries(raw)
                        .filter(([key]) => ![
                            'lesson_id',
                            'lesson_type',
                            'lesson_title',
                            'lesson_thumbnail_image_url',
                            'lesson_deep_link_path'
                        ].includes(key))
                        .map(([key, value]) => ({ key, value: stringifyValue(value) }))
                }));
                render();
            } catch (error) {
                console.error('EnglishWithLidia(Home):', error);
                alert(error.message || 'Unable to import JSON.');
            }
        }

        function updatePreview() {
            const cards = state.cards
                .map((card) => {
                    const payload = {};
                    if (card.lesson_id) payload.lesson_id = card.lesson_id;
                    if (card.lesson_type) payload.lesson_type = card.lesson_type;
                    if (card.lesson_title) payload.lesson_title = card.lesson_title;
                    if (card.lesson_thumbnail_image_url) payload.lesson_thumbnail_image_url = card.lesson_thumbnail_image_url;
                    if (card.lesson_deep_link_path) payload.lesson_deep_link_path = card.lesson_deep_link_path;
                    card.customFields
                        .filter((field) => field.key)
                        .forEach((field) => {
                            payload[field.key] = parseMaybeNumber(field.value);
                        });
                    return payload;
                })
                .filter((card) => Object.keys(card).length > 0);
            if (previewArea) {
                previewArea.value = utils.formatJson({ data: cards });
            }
        }

        attachCommonHandlers({
            addButton,
            resetButton,
            copyButton,
            downloadButton,
            importButton,
            importInput,
            previewArea,
            onAdd: () => {
                state.cards.push(createEmptyCard());
                render();
            },
            onReset: () => {
                state.cards = [createEmptyCard()];
                render();
            },
            onDownload: () => {
                utils.downloadJson(HOME_FILENAME, previewArea?.value || '');
            },
            onImport: importJson
        });

        builderRoot.dataset.initialized = 'true';
        render();
    }

    function initLessonBuilder() {
        const builderRoot = document.getElementById('englishLessonBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const metadataContainer = document.getElementById('englishLessonMetadata');
        const blocksContainer = document.getElementById('englishLessonBlocks');
        const previewArea = document.getElementById('englishLessonPreview');
        const titleField = document.getElementById('englishLessonTitle');
        const addBlockButton = document.getElementById('englishLessonAddBlock');
        const resetButton = document.getElementById('englishLessonResetButton');
        const copyButton = document.getElementById('englishLessonCopyButton');
        const downloadButton = document.getElementById('englishLessonDownloadButton');
        const importButton = document.getElementById('englishLessonImportButton');
        const importInput = document.getElementById('englishLessonImportInput');

        const state = {
            title: '',
            metadata: [],
            blocks: []
        };

        if (titleField) {
            titleField.addEventListener('input', (event) => {
                state.title = event.target.value;
                updatePreview();
            });
        }

        function render() {
            renderMetadata();
            renderBlocks();
            updatePreview();
        }

        function renderMetadata() {
            if (!metadataContainer) return;
            utils.clearElement(metadataContainer);
            const header = utils.createElement('div', { classNames: 'builder-subsection-header' });
            header.appendChild(utils.createElement('h4', { text: 'Lesson metadata' }));
            header.appendChild(utils.createInlineButton({
                label: 'Add field',
                icon: 'add',
                onClick: () => {
                    state.metadata.push({ key: '', value: '' });
                    renderMetadata();
                    updatePreview();
                }
            }));
            metadataContainer.appendChild(header);
            const list = utils.createElement('div', { classNames: 'custom-field-list' });
            state.metadata.forEach((field, index) => {
                list.appendChild(createCustomFieldRow(field, (key) => {
                    state.metadata[index].key = key;
                    updatePreview();
                }, (value) => {
                    state.metadata[index].value = value;
                    updatePreview();
                }, () => {
                    state.metadata.splice(index, 1);
                    renderMetadata();
                    updatePreview();
                }));
            });
            metadataContainer.appendChild(list);
        }

        function renderBlocks() {
            if (!blocksContainer) return;
            utils.clearElement(blocksContainer);
            if (!state.blocks.length) {
                state.blocks.push(createEmptyBlock());
            }
            state.blocks.forEach((block, index) => {
                blocksContainer.appendChild(createBlockCard(block, index));
            });
        }

        function createEmptyBlock() {
            return {
                content_id: String(state.blocks.length + 1),
                content_type: 'content_text',
                props: {},
                customFields: []
            };
        }

        function createBlockCard(block, index) {
            const card = utils.createElement('div', { classNames: 'builder-card' });
            const header = utils.createElement('div', { classNames: 'builder-card-header' });
            header.appendChild(utils.createElement('h3', { text: `Block ${index + 1}` }));
            header.appendChild(utils.createInlineButton({
                label: 'Remove',
                icon: 'delete',
                variant: 'danger',
                onClick: () => {
                    if (state.blocks.length === 1) {
                        state.blocks[0] = createEmptyBlock();
                    } else {
                        state.blocks.splice(index, 1);
                    }
                    renderBlocks();
                    updatePreview();
                }
            }));
            card.appendChild(header);

            const fields = utils.createElement('div', { classNames: 'builder-card-fields' });
            fields.appendChild(
                utils.createInputField({
                    label: 'Content ID',
                    value: block.content_id,
                    onInput: (value) => {
                        state.blocks[index].content_id = value;
                        updatePreview();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Content type',
                    value: block.content_type,
                    helperText: BLOCK_TYPE_HINT,
                    onInput: (value) => {
                        state.blocks[index].content_type = value;
                        cleanupPropsForType(state.blocks[index]);
                        renderBlocks();
                        updatePreview();
                    }
                }).wrapper
            );

            const fieldDefinitions = ENGLISH_BLOCK_FIELDS[block.content_type] || [];
            fieldDefinitions.forEach((definition) => {
                if (definition.type === 'textarea') {
                    fields.appendChild(
                        utils.createTextareaField({
                            label: definition.label,
                            value: block.props[definition.key] || '',
                            helperText: definition.helperText || '',
                            onInput: (value) => {
                                state.blocks[index].props[definition.key] = value;
                                updatePreview();
                            }
                        }).wrapper
                    );
                } else {
                    fields.appendChild(
                        utils.createInputField({
                            label: definition.label,
                            value: block.props[definition.key] || '',
                            type: definition.type === 'number' ? 'number' : 'text',
                            placeholder: definition.placeholder || '',
                            helperText: definition.helperText || '',
                            onInput: (value) => {
                                state.blocks[index].props[definition.key] = value;
                                updatePreview();
                            }
                        }).wrapper
                    );
                }
            });

            const customSection = utils.createElement('div', { classNames: 'builder-subsection' });
            customSection.appendChild(utils.createElement('h4', { text: 'Custom fields' }));
            const list = utils.createElement('div', { classNames: 'custom-field-list' });
            block.customFields.forEach((field, fieldIndex) => {
                list.appendChild(createCustomFieldRow(field, (key) => {
                    state.blocks[index].customFields[fieldIndex].key = key;
                    updatePreview();
                }, (value) => {
                    state.blocks[index].customFields[fieldIndex].value = value;
                    updatePreview();
                }, () => {
                    state.blocks[index].customFields.splice(fieldIndex, 1);
                    renderBlocks();
                    updatePreview();
                }));
            });
            customSection.appendChild(list);
            customSection.appendChild(utils.createInlineButton({
                label: 'Add field',
                icon: 'add',
                onClick: () => {
                    state.blocks[index].customFields.push({ key: '', value: '' });
                    renderBlocks();
                }
            }));
            fields.appendChild(customSection);
            card.appendChild(fields);
            return card;
        }

        function cleanupPropsForType(block) {
            const allowed = new Set((ENGLISH_BLOCK_FIELDS[block.content_type] || []).map((field) => field.key));
            Object.keys(block.props).forEach((key) => {
                if (!allowed.has(key)) {
                    delete block.props[key];
                }
            });
        }

        function importJson(text) {
            try {
                const json = utils.parseJson(text);
                const lessonArray = Array.isArray(json?.data) ? json.data : [];
                if (!lessonArray.length) {
                    throw new Error('No lessons found in JSON.');
                }
                const lesson = lessonArray[0];
                state.title = lesson.lesson_title || '';
                if (titleField) {
                    titleField.value = state.title;
                }
                state.metadata = Object.entries(lesson)
                    .filter(([key]) => !['lesson_title', 'lesson_content'].includes(key))
                    .map(([key, value]) => ({ key, value: stringifyValue(value) }));
                const content = Array.isArray(lesson.lesson_content) ? lesson.lesson_content : [];
                state.blocks = content.map((entry, index) => mapBlockFromJson(entry, index));
                render();
            } catch (error) {
                console.error('EnglishWithLidia(Lesson):', error);
                alert(error.message || 'Unable to import lesson JSON.');
            }
        }

        function mapBlockFromJson(entry, index) {
            const block = {
                content_id: entry.content_id ? String(entry.content_id) : String(index + 1),
                content_type: entry.content_type || 'content_text',
                props: {},
                customFields: []
            };
            const allowed = new Set((ENGLISH_BLOCK_FIELDS[block.content_type] || []).map((field) => field.key));
            Object.entries(entry).forEach(([key, value]) => {
                if (key === 'content_id' || key === 'content_type') {
                    return;
                }
                if (allowed.has(key)) {
                    block.props[key] = stringifyValue(value);
                } else {
                    block.customFields.push({ key, value: stringifyValue(value) });
                }
            });
            return block;
        }

        function updatePreview() {
            const lesson = {};
            if (state.title) {
                lesson.lesson_title = state.title;
            }
            state.metadata.filter((field) => field.key).forEach((field) => {
                lesson[field.key] = parseMaybeNumber(field.value);
            });
            const content = state.blocks
                .map((block) => buildBlockPayload(block))
                .filter((payload) => Object.keys(payload).length > 0);
            if (content.length) {
                lesson.lesson_content = content;
            }
            const finalData = Object.keys(lesson).length ? [lesson] : [];
            if (previewArea) {
                previewArea.value = utils.formatJson({ data: finalData });
            }
        }

        function buildBlockPayload(block) {
            const payload = {};
            if (block.content_id) payload.content_id = block.content_id;
            if (block.content_type) payload.content_type = block.content_type;
            const definitions = ENGLISH_BLOCK_FIELDS[block.content_type] || [];
            definitions.forEach((definition) => {
                const value = block.props[definition.key];
                if (value === undefined || value === '') {
                    return;
                }
                if (definition.type === 'number') {
                    const parsed = utils.parseNumber(value);
                    if (parsed !== undefined) {
                        payload[definition.key] = parsed;
                    }
                } else {
                    payload[definition.key] = value;
                }
            });
            block.customFields
                .filter((field) => field.key)
                .forEach((field) => {
                    payload[field.key] = parseMaybeNumber(field.value);
                });
            return payload;
        }

        attachCommonHandlers({
            addButton: addBlockButton,
            resetButton,
            copyButton,
            downloadButton,
            importButton,
            importInput,
            previewArea,
            onAdd: () => {
                state.blocks.push(createEmptyBlock());
                renderBlocks();
                updatePreview();
            },
            onReset: () => {
                state.title = '';
                if (titleField) titleField.value = '';
                state.metadata = [];
                state.blocks = [createEmptyBlock()];
                render();
            },
            onDownload: () => {
                utils.downloadJson(LESSON_FILENAME, previewArea?.value || '');
            },
            onImport: importJson
        });

        builderRoot.dataset.initialized = 'true';
        render();
    }

    function attachCommonHandlers({
        addButton,
        resetButton,
        copyButton,
        downloadButton,
        importButton,
        importInput,
        previewArea,
        onAdd,
        onReset,
        onDownload,
        onImport
    }) {
        if (addButton) {
            addButton.addEventListener('click', onAdd);
        }
        if (resetButton) {
            resetButton.addEventListener('click', onReset);
        }
        if (copyButton && previewArea) {
            copyButton.addEventListener('click', async () => {
                await utils.copyToClipboard(previewArea.value);
                flashButton(copyButton, '<span class="material-symbols-outlined">check</span><span>Copied</span>');
            });
        }
        if (downloadButton) {
            downloadButton.addEventListener('click', onDownload);
        }
        if (importButton && importInput) {
            utils.attachFilePicker(importButton, importInput, onImport);
        }
    }

    function parseMaybeNumber(value) {
        if (value === '' || value === null || value === undefined) {
            return '';
        }
        const trimmed = String(value).trim();
        if (trimmed === '') {
            return '';
        }
        const number = Number(trimmed);
        return Number.isFinite(number) ? number : trimmed;
    }

    function stringifyValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch (error) {
                return '';
            }
        }
        return String(value);
    }

    function flashButton(button, html) {
        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = html;
        setTimeout(() => {
            button.innerHTML = original;
            button.disabled = false;
        }, 1500);
    }

    global.initEnglishWorkspace = initEnglishWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
