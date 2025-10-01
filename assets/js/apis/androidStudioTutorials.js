(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('AndroidStudioTutorials: ApiBuilderUtils is required.');
        return;
    }

    const HOME_FILENAME = 'android_home.json';
    const LESSON_FILENAME = 'android_lesson.json';
    const HOME_TYPE_HINT = 'Suggested: full_banner, square_image, ad_view_banner_large, ad_view_banner, ad_view_native';
    const BLOCK_TYPE_HINT = 'Suggested: content_text, header, image, content_code, content_divider, ad_large_banner, ad_banner';

    const ANDROID_BLOCK_FIELDS = {
        content_text: [
            { key: 'content_text', label: 'Text', type: 'textarea', helperText: 'Supports HTML formatting.' }
        ],
        header: [
            { key: 'content_text', label: 'Header text', type: 'text' }
        ],
        image: [
            { key: 'content_image_url', label: 'Image URL', type: 'url' }
        ],
        content_code: [
            { key: 'content_code_programming_language', label: 'Language', type: 'text', helperText: 'Example: Kotlin, Java, XML' },
            { key: 'content_code', label: 'Code snippet', type: 'textarea', helperText: 'Keep code HTML-escaped.' }
        ],
        ad_large_banner: [],
        ad_banner: [],
        content_divider: []
    };

    function initAndroidTutorialsWorkspace() {
        initHomeBuilder();
        initLessonBuilder();
    }

    function initHomeBuilder() {
        const builderRoot = document.getElementById('androidHomeBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const entriesContainer = document.getElementById('androidHomeEntries');
        const previewArea = document.getElementById('androidHomePreview');
        const validationStatus = document.getElementById('androidHomeValidation');
        const addButton = document.getElementById('androidHomeAddCard');
        const resetButton = document.getElementById('androidHomeResetButton');
        const copyButton = document.getElementById('androidHomeCopyButton');
        const downloadButton = document.getElementById('androidHomeDownloadButton');
        const importButton = document.getElementById('androidHomeImportButton');
        const importInput = document.getElementById('androidHomeImportInput');

        const state = {
            cards: [createEmptyCard()]
        };

        function createEmptyCard() {
            return {
                lesson_id: '',
                lesson_type: '',
                lesson_title: '',
                lesson_description: '',
                thumbnail_image_url: '',
                square_image_url: '',
                deep_link_path: '',
                lesson_tags: [],
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
                    helperText: HOME_TYPE_HINT,
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
                utils.createTextareaField({
                    label: 'Description',
                    value: card.lesson_description,
                    rows: 3,
                    onInput: (value) => {
                        state.cards[index].lesson_description = value;
                        updatePreview();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Thumbnail URL',
                    value: card.thumbnail_image_url,
                    placeholder: 'https://example.com/banner.webp',
                    onInput: (value) => {
                        state.cards[index].thumbnail_image_url = value;
                        updatePreview();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Square image URL',
                    value: card.square_image_url,
                    placeholder: 'https://example.com/square.webp',
                    onInput: (value) => {
                        state.cards[index].square_image_url = value;
                        updatePreview();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Deep link path',
                    value: card.deep_link_path,
                    placeholder: 'com.d4rk.androidtutorials://lesson/...',
                    onInput: (value) => {
                        state.cards[index].deep_link_path = value;
                        updatePreview();
                    }
                }).wrapper
            );

            const tagsSection = utils.createElement('div', { classNames: 'builder-subsection' });
            tagsSection.appendChild(utils.createElement('h4', { text: 'Tags' }));
            const tagsList = utils.createElement('div', { classNames: 'tag-list' });
            card.lesson_tags.forEach((tag, tagIndex) => {
                tagsList.appendChild(createTagRow(tag, (value) => {
                    state.cards[index].lesson_tags[tagIndex] = value;
                    updatePreview();
                }, () => {
                    state.cards[index].lesson_tags.splice(tagIndex, 1);
                    render();
                }));
            });
            tagsSection.appendChild(tagsList);
            tagsSection.appendChild(utils.createInlineButton({
                label: 'Add tag',
                icon: 'add',
                onClick: () => {
                    state.cards[index].lesson_tags.push('');
                    render();
                }
            }));
            fields.appendChild(tagsSection);

            const customSection = utils.createElement('div', { classNames: 'builder-subsection' });
            customSection.appendChild(utils.createElement('h4', { text: 'Custom fields' }));
            const customList = utils.createElement('div', { classNames: 'custom-field-list' });
            card.customFields.forEach((field, fieldIndex) => {
                customList.appendChild(createCustomFieldRow(field, (key) => {
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
            customSection.appendChild(customList);
            customSection.appendChild(utils.createInlineButton({
                label: 'Add field',
                icon: 'add',
                onClick: () => {
                    state.cards[index].customFields.push({ key: '', value: '' });
                    render();
                }
            }));
            fields.appendChild(customSection);

            wrapper.appendChild(fields);
            return wrapper;
        }

        function createTagRow(value, onChange, onRemove) {
            const row = utils.createElement('div', { classNames: 'tag-row' });
            row.appendChild(
                utils.createInputField({
                    label: 'Tag',
                    value,
                    onInput: onChange
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
                    utils.setValidationStatus(validationStatus, {
                        status: 'error',
                        message: 'No cards found in JSON.'
                    });
                    throw new Error('No cards found in JSON.');
                }
                const toStringValue = (value) => (value === undefined || value === null ? '' : String(value));
                state.cards = cards.map((raw) => ({
                    lesson_id: utils.trimString(toStringValue(raw.lesson_id)),
                    lesson_type: utils.trimString(toStringValue(raw.lesson_type)),
                    lesson_title: utils.trimString(toStringValue(raw.lesson_title)),
                    lesson_description: utils.trimString(toStringValue(raw.lesson_description)),
                    thumbnail_image_url: utils.trimString(toStringValue(raw.thumbnail_image_url)),
                    square_image_url: utils.trimString(toStringValue(raw.square_image_url)),
                    deep_link_path: utils.trimString(toStringValue(raw.deep_link_path || raw.deep_link)),
                    lesson_tags: Array.isArray(raw.lesson_tags)
                        ? raw.lesson_tags.map((tag) => utils.trimString(toStringValue(tag))).filter(Boolean)
                        : [],
                    customFields: Object.entries(raw)
                        .filter(([key]) => ![
                            'lesson_id',
                            'lesson_type',
                            'lesson_title',
                            'lesson_description',
                            'thumbnail_image_url',
                            'square_image_url',
                            'deep_link_path',
                            'deep_link',
                            'lesson_tags'
                        ].includes(key))
                        .map(([key, value]) => ({
                            key: utils.trimString(key),
                            value: stringifyValue(value)
                        }))
                }));
                render();
            } catch (error) {
                console.error('AndroidHome import failed', error);
                utils.setValidationStatus(validationStatus, {
                    status: 'error',
                    message: error.message || 'Unable to import JSON.'
                });
                alert(error.message || 'Unable to import JSON.');
            }
        }

        function sanitizeHomeCard(card) {
            const trimmed = (value) =>
                utils.trimString(
                    typeof value === 'string' ? value : value == null ? '' : String(value)
                );
            const payload = {};
            const lessonId = trimmed(card.lesson_id);
            if (lessonId) payload.lesson_id = lessonId;
            const lessonType = trimmed(card.lesson_type);
            if (lessonType) payload.lesson_type = lessonType;
            const lessonTitle = trimmed(card.lesson_title);
            if (lessonTitle) payload.lesson_title = lessonTitle;
            const description = trimmed(card.lesson_description);
            if (description) payload.lesson_description = description;
            const thumbnail = trimmed(card.thumbnail_image_url);
            if (thumbnail) payload.thumbnail_image_url = thumbnail;
            const square = trimmed(card.square_image_url);
            if (square) payload.square_image_url = square;
            const deepLink = trimmed(card.deep_link_path);
            if (deepLink) payload.deep_link_path = deepLink;
            const tags = (Array.isArray(card.lesson_tags) ? card.lesson_tags : [])
                .map((tag) => trimmed(tag))
                .filter(Boolean);
            if (tags.length) {
                payload.lesson_tags = Array.from(new Set(tags));
            }
            card.customFields
                .map((field) => ({ key: trimmed(field.key), value: field.value }))
                .filter((field) => field.key)
                .forEach((field) => {
                    const parsed = parseMaybeNumber(field.value);
                    if (parsed !== '') {
                        payload[field.key] = parsed;
                    }
                });
            return payload;
        }

        function updatePreview() {
            utils.renderJsonPreview({
                previewArea,
                statusElement: validationStatus,
                data: state.cards,
                buildPayload: (cards) => ({ data: cards }),
                autoFix: (payload) => {
                    const cards = Array.isArray(payload?.data) ? payload.data : [];
                    payload.data = cards
                        .map((card) => sanitizeHomeCard(card))
                        .filter((card) => Object.keys(card).length > 0);
                    return payload;
                },
                successMessage: (payload) => {
                    const count = Array.isArray(payload?.data) ? payload.data.length : 0;
                    if (!count) {
                        return 'Valid JSON · No cards yet';
                    }
                    return count === 1
                        ? 'Valid JSON · 1 home card'
                        : `Valid JSON · ${count} home cards`;
                }
            });
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
        const builderRoot = document.getElementById('androidLessonBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const metadataContainer = document.getElementById('androidLessonMetadata');
        const blocksContainer = document.getElementById('androidLessonBlocks');
        const previewArea = document.getElementById('androidLessonPreview');
        const validationStatus = document.getElementById('androidLessonValidation');
        const titleField = document.getElementById('androidLessonTitle');
        const addBlockButton = document.getElementById('androidLessonAddBlock');
        const resetButton = document.getElementById('androidLessonResetButton');
        const copyButton = document.getElementById('androidLessonCopyButton');
        const downloadButton = document.getElementById('androidLessonDownloadButton');
        const importButton = document.getElementById('androidLessonImportButton');
        const importInput = document.getElementById('androidLessonImportInput');

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

            const definitions = ANDROID_BLOCK_FIELDS[block.content_type] || [];
            definitions.forEach((definition) => {
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
            const allowed = new Set((ANDROID_BLOCK_FIELDS[block.content_type] || []).map((field) => field.key));
            Object.keys(block.props).forEach((key) => {
                if (!allowed.has(key)) {
                    delete block.props[key];
                }
            });
        }

        function importJson(text) {
            try {
                const json = utils.parseJson(text);
                const lessons = Array.isArray(json?.data) ? json.data : [];
                if (!lessons.length) {
                    utils.setValidationStatus(validationStatus, {
                        status: 'error',
                        message: 'No lessons found.'
                    });
                    throw new Error('No lessons found.');
                }
                const lesson = lessons[0];
                state.title = utils.trimString(lesson.lesson_title || '');
                if (titleField) titleField.value = state.title;
                state.metadata = Object.entries(lesson)
                    .filter(([key]) => !['lesson_title', 'lesson_content'].includes(key))
                    .map(([key, value]) => ({
                        key: utils.trimString(key),
                        value: stringifyValue(value)
                    }));
                const content = Array.isArray(lesson.lesson_content) ? lesson.lesson_content : [];
                state.blocks = content.map((entry, index) => mapBlockFromJson(entry, index));
                render();
            } catch (error) {
                console.error('AndroidLesson import failed', error);
                utils.setValidationStatus(validationStatus, {
                    status: 'error',
                    message: error.message || 'Unable to import lesson JSON.'
                });
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
            const allowed = new Set((ANDROID_BLOCK_FIELDS[block.content_type] || []).map((field) => field.key));
            Object.entries(entry).forEach(([key, value]) => {
                if (key === 'content_id' || key === 'content_type') {
                    return;
                }
                if (allowed.has(key)) {
                    block.props[key] = stringifyValue(value);
                } else {
                    block.customFields.push({
                        key: utils.trimString(key),
                        value: stringifyValue(value)
                    });
                }
            });
            return block;
        }

        function composeLessonPayload() {
            const lesson = {};
            const title = utils.trimString(state.title ?? '');
            if (title) {
                lesson.lesson_title = title;
            }
            state.metadata
                .map((field) => ({ key: utils.trimString(field.key), value: field.value }))
                .filter((field) => field.key)
                .forEach((field) => {
                    const parsed = parseMaybeNumber(field.value);
                    if (parsed !== '') {
                        lesson[field.key] = parsed;
                    }
                });
            const content = state.blocks
                .map((block) => buildBlockPayload(block))
                .filter((payload) => Object.keys(payload).length > 0);
            if (content.length) {
                lesson.lesson_content = content;
            }
            const finalData = Object.keys(lesson).length ? [lesson] : [];
            return { data: finalData };
        }

        function updatePreview() {
            utils.renderJsonPreview({
                previewArea,
                statusElement: validationStatus,
                data: null,
                buildPayload: composeLessonPayload,
                successMessage: (payload) => {
                    const lessons = Array.isArray(payload?.data) ? payload.data : [];
                    const firstLesson = lessons[0];
                    if (!firstLesson || Object.keys(firstLesson).length === 0) {
                        return 'Valid JSON · No lesson data yet';
                    }
                    const blocks = Array.isArray(firstLesson.lesson_content)
                        ? firstLesson.lesson_content.length
                        : 0;
                    if (!blocks) {
                        return 'Valid JSON · Lesson metadata only';
                    }
                    return blocks === 1
                        ? 'Valid JSON · 1 content block'
                        : `Valid JSON · ${blocks} content blocks`;
                }
            });
        }

        function buildBlockPayload(block) {
            const payload = {};
            const contentId = utils.trimString(block.content_id ?? '');
            if (contentId) payload.content_id = contentId;
            const contentType = utils.trimString(block.content_type ?? '');
            if (contentType) payload.content_type = contentType;
            const definitions = ANDROID_BLOCK_FIELDS[block.content_type] || [];
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
                    const trimmed = utils.trimString(value);
                    if (trimmed) {
                        payload[definition.key] = trimmed;
                    }
                }
            });
            block.customFields
                .map((field) => ({ key: utils.trimString(field.key), value: field.value }))
                .filter((field) => field.key)
                .forEach((field) => {
                    const parsed = parseMaybeNumber(field.value);
                    if (parsed !== '') {
                        payload[field.key] = parsed;
                    }
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
        if (addButton) addButton.addEventListener('click', onAdd);
        if (resetButton) resetButton.addEventListener('click', onReset);
        if (copyButton && previewArea) {
            copyButton.addEventListener('click', async () => {
                await utils.copyToClipboard(previewArea.value);
                flashButton(copyButton, '<span class="material-symbols-outlined">check</span><span>Copied</span>');
            });
        }
        if (downloadButton) downloadButton.addEventListener('click', onDownload);
        if (importButton && importInput) {
            utils.attachFilePicker(importButton, importInput, onImport);
        }
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

    function flashButton(button, html) {
        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = html;
        setTimeout(() => {
            button.innerHTML = original;
            button.disabled = false;
        }, 1500);
    }

    global.initAndroidTutorialsWorkspace = initAndroidTutorialsWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
