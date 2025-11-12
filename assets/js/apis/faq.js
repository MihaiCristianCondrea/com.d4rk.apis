(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('FaqBuilder: ApiBuilderUtils is required.');
        return;
    }

    const DEFAULT_FILENAME = 'faq_dataset.json';
    const GITHUB_PAGES_BASE = 'https://mihaicristiancondrea.github.io/com.d4rk.apis';
    const DEFAULT_DATA_URL = `${GITHUB_PAGES_BASE}/api/app_toolkit/v2/debug/en/home/api_android_apps.json`;
    const ICONS_ENDPOINT = 'https://fonts.google.com/metadata/icons?incomplete=1&icon.set=Material+Symbols';
    const ICON_PICKER_MAX_RENDER = 400;
    const CUSTOM_PRESET_LABEL = 'Fetch custom URL';

    const CATEGORY_GROUPS = [
        {
            label: 'General',
            options: [
                { value: 'general', label: 'General' },
                { value: 'distribution_stores', label: 'Distribution & Stores' },
                { value: 'privacy_data', label: 'Privacy & Data' },
                { value: 'ads_monetization', label: 'Ads & Monetization' },
                { value: 'design_ux', label: 'Design & UX (Material 3)' }
            ]
        },
        {
            label: '\ud83d\udcf1 Apps / Projects',
            options: [
                { value: 'android_studio_tutorials', label: 'Android Studio Tutorials' },
                { value: 'app_toolkit', label: 'App Toolkit' },
                { value: 'smart_cleaner', label: 'Smart Cleaner' },
                { value: 'english_with_lidia', label: 'English with Lidia' },
                { value: 'low_brightness', label: 'Low Brightness' },
                { value: 'weddix', label: 'Weddix' },
                { value: 'cart_calculator', label: 'Cart Calculator' },
                { value: 'profile_website', label: 'Profile Website' },
                { value: 'apis_website', label: "API's Website" }
            ]
        }
    ];

    const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((group) =>
        group.options.map((option) => ({ ...option, group: group.label }))
    );
    const CATEGORY_LOOKUP = new Map(ALL_CATEGORIES.map((item) => [item.value, item]));
    const CATEGORY_ORDER = new Map(ALL_CATEGORIES.map((item, index) => [item.value, index]));
    const DEFAULT_CATEGORIES = ['general'];

    const FAQ_API_PRESET_OPTIONS = (() => {
        const faqBase = `${GITHUB_PAGES_BASE}/api/faq/v1`;
        const categoryPresets = ALL_CATEGORIES.map((category) => ({
            value: `faq-${category.value}`,
            label: `FAQ · ${category.label}`,
            url: `${faqBase}/${category.value}.json`
        }));
        return [
            {
                value: 'app-toolkit-debug',
                label: 'App Toolkit · Debug',
                url: `${GITHUB_PAGES_BASE}/api/app_toolkit/v2/debug/en/home/api_android_apps.json`
            },
            {
                value: 'app-toolkit-release',
                label: 'App Toolkit · Release',
                url: `${GITHUB_PAGES_BASE}/api/app_toolkit/v2/release/en/home/api_android_apps.json`
            },
            {
                value: 'faq-index',
                label: 'FAQ · Index (all categories)',
                url: `${faqBase}/index.json`
            },
            ...categoryPresets
        ];
    })();

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
        const presetSelectRoot = document.getElementById('faqPresetSelect');
        const presetButtonLabel = document.getElementById('faqPresetButtonLabel');
        const previewArea = document.getElementById('faqPreview');
        const validationStatus = document.getElementById('faqValidation');
        const toolbarStatus = document.getElementById('faqToolbarStatus');
        const copyButton = document.getElementById('faqCopyButton');
        const downloadButton = document.getElementById('faqDownloadButton');
        const iconList = document.getElementById('faqIconOptions');
        const refreshIconsButton = document.getElementById('faqRefreshIcons');
        const iconStatus = document.getElementById('faqIconStatus');
        const iconCountEl = document.getElementById('faqIconCount');
        const iconPickerRoot = document.getElementById('faqIconPicker');
        const iconPickerBackdrop = document.getElementById('faqIconPickerBackdrop');
        const iconPickerClose = document.getElementById('faqIconPickerClose');
        const iconPickerDismiss = document.getElementById('faqIconPickerDismiss');
        const iconPickerSearch = document.getElementById('faqIconPickerSearch');
        const iconPickerList = document.getElementById('faqIconPickerList');
        const iconPickerEmpty = document.getElementById('faqIconPickerEmpty');
        const iconPickerQuery = document.getElementById('faqIconPickerQuery');
        const iconPickerLoading = document.getElementById('faqIconPickerLoading');
        const iconPickerLimit = document.getElementById('faqIconPickerLimit');
        const iconPickerResultCount = document.getElementById('faqIconPickerResultCount');
        const iconPickerSelection = document.getElementById('faqIconPickerSelection');
        const iconPickerClear = document.getElementById('faqIconPickerClear');
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
        let activeIconContext = null;
        let previousBodyOverflow = '';
        let activeCategoryMenu = null;
        const defaultPreset =
            FAQ_API_PRESET_OPTIONS.find((preset) => preset.url === DEFAULT_DATA_URL) ||
            FAQ_API_PRESET_OPTIONS[0] ||
            null;
        let activePreset = defaultPreset;
        let presetSelectEl = null;

        builderRoot.dataset.initialized = 'true';

        if (presetSelectRoot && FAQ_API_PRESET_OPTIONS.length) {
            const presetField = utils.createSelectField({
                label: 'Select API preset',
                value: activePreset ? activePreset.value : '',
                options: FAQ_API_PRESET_OPTIONS.map((preset) => ({
                    value: preset.value,
                    label: preset.label
                })),
                onChange: (value) => {
                    const selectedPreset = findPresetByValue(value);
                    applyPresetSelection(selectedPreset);
                }
            });
            presetSelectEl = presetField.select;
            presetSelectRoot.appendChild(presetField.wrapper);
        }

        applyPresetSelection(activePreset, { updateInput: true, updatePlaceholder: true });

        function sortCategories(values = []) {
            const seen = new Set();
            const normalized = [];
            values.forEach((value) => {
                const trimmed = utils.trimString(value);
                if (!trimmed || seen.has(trimmed)) {
                    return;
                }
                if (!CATEGORY_LOOKUP.has(trimmed)) {
                    return;
                }
                seen.add(trimmed);
                normalized.push(trimmed);
            });
            if (!normalized.length) {
                return [...DEFAULT_CATEGORIES];
            }
            return normalized.sort((a, b) => {
                const orderA = CATEGORY_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
                const orderB = CATEGORY_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
                return orderA - orderB;
            });
        }

        function formatCategorySummary(values = []) {
            const valid = sortCategories(values);
            const labels = valid
                .map((value) => CATEGORY_LOOKUP.get(value)?.label || value)
                .filter(Boolean);
            if (!labels.length) {
                return 'Select categories';
            }
            if (labels.length === 1) {
                return labels[0];
            }
            if (labels.length === 2) {
                return `${labels[0]} • ${labels[1]}`;
            }
            return `${labels[0]} +${labels.length - 1} more`;
        }

        if (fetchInput) {
            fetchInput.addEventListener('input', (event) => {
                const typedValue = utils.trimString(event.target.value);
                const matchingPreset = FAQ_API_PRESET_OPTIONS.find((preset) => preset.url === typedValue);
                if (matchingPreset) {
                    applyPresetSelection(matchingPreset, { updateInput: false, updatePlaceholder: false });
                    return;
                }
                if (!typedValue) {
                    if (defaultPreset) {
                        applyPresetSelection(defaultPreset, { updateInput: false, updatePlaceholder: true });
                    } else if (presetButtonLabel) {
                        presetButtonLabel.textContent = CUSTOM_PRESET_LABEL;
                    }
                    return;
                }
                activePreset = null;
                if (presetSelectEl) {
                    presetSelectEl.value = '';
                }
                if (presetButton) {
                    presetButton.removeAttribute('data-faq-preset');
                }
                if (presetButtonLabel) {
                    presetButtonLabel.textContent = CUSTOM_PRESET_LABEL;
                }
            });
        }

        function findPresetByValue(value) {
            return (
                FAQ_API_PRESET_OPTIONS.find((preset) => preset.value === value) ||
                FAQ_API_PRESET_OPTIONS.find((preset) => preset.url === value) ||
                FAQ_API_PRESET_OPTIONS[0] ||
                null
            );
        }

        function applyPresetSelection(preset, { updateInput = true, updatePlaceholder = true } = {}) {
            if (!preset) {
                return;
            }
            activePreset = preset;
            if (presetSelectEl && presetSelectEl.value !== preset.value) {
                presetSelectEl.value = preset.value;
            }
            if (presetButton) {
                presetButton.setAttribute('data-faq-preset', preset.url);
            }
            if (presetButtonLabel) {
                presetButtonLabel.textContent = `Fetch ${preset.label}`;
            }
            if (fetchInput) {
                if (updatePlaceholder) {
                    fetchInput.setAttribute('placeholder', preset.url);
                }
                if (updateInput) {
                    fetchInput.value = preset.url;
                }
            }
        }

        function createEmptyEntry() {
            return {
                id: '',
                question: '',
                iconSymbol: '',
                categories: [...DEFAULT_CATEGORIES],
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
                categories: Array.isArray(entry.categories)
                    ? [...entry.categories]
                    : [...DEFAULT_CATEGORIES],
                featured: Boolean(entry.featured),
                homeAnswerHtml: typeof entry.homeAnswerHtml === 'string' ? entry.homeAnswerHtml : '',
                answerHtml: typeof entry.answerHtml === 'string' ? entry.answerHtml : ''
            };
        }

        function normalizeEntry(raw) {
            if (!raw || typeof raw !== 'object') {
                return createEmptyEntry();
            }
            let categories = [];
            if (Array.isArray(raw.categories)) {
                categories = raw.categories;
            } else if (typeof raw.category === 'string') {
                categories = [raw.category];
            } else if (raw.category && typeof raw.category === 'object') {
                const categoryId =
                    typeof raw.category.category_id === 'string'
                        ? raw.category.category_id
                        : typeof raw.category.id === 'string'
                        ? raw.category.id
                        : '';
                const fallbackLabel =
                    typeof raw.category.label === 'string' ? raw.category.label : '';
                const resolvedCategory = (categoryId || fallbackLabel || '').trim();
                if (resolvedCategory) {
                    categories = [resolvedCategory];
                }
            }
            return {
                id: typeof raw.id === 'string' ? raw.id : '',
                question: typeof raw.question === 'string' ? raw.question : '',
                iconSymbol: typeof raw.iconSymbol === 'string' ? raw.iconSymbol : '',
                categories: sortCategories(categories),
                featured: Boolean(raw.featured),
                homeAnswerHtml: typeof raw.homeAnswerHtml === 'string' ? raw.homeAnswerHtml : '',
                answerHtml: typeof raw.answerHtml === 'string' ? raw.answerHtml : ''
            };
        }

        function closeCategoryMenu() {
            if (!activeCategoryMenu) {
                return;
            }
            const { menu, trigger } = activeCategoryMenu;
            if (menu) {
                menu.dataset.open = 'false';
                menu.setAttribute('hidden', '');
            }
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
            document.removeEventListener('click', handleCategoryMenuOutsideClick);
            document.removeEventListener('keydown', handleCategoryMenuKeydown);
            activeCategoryMenu = null;
        }

        function openCategoryMenu(menu, trigger) {
            if (!menu || !trigger) {
                return;
            }
            if (activeCategoryMenu && activeCategoryMenu.menu !== menu) {
                closeCategoryMenu();
            }
            menu.dataset.open = 'true';
            menu.removeAttribute('hidden');
            trigger.setAttribute('aria-expanded', 'true');
            activeCategoryMenu = { menu, trigger };
            document.addEventListener('click', handleCategoryMenuOutsideClick);
            document.addEventListener('keydown', handleCategoryMenuKeydown);
        }

        function handleCategoryMenuOutsideClick(event) {
            if (!activeCategoryMenu) {
                return;
            }
            const { menu, trigger } = activeCategoryMenu;
            const target = event.target;
            if (!menu || !trigger) {
                return;
            }
            if (menu.contains(target) || trigger === target || trigger.contains(target)) {
                return;
            }
            closeCategoryMenu();
        }

        function handleCategoryMenuKeydown(event) {
            if (event.key === 'Escape') {
                closeCategoryMenu();
            }
        }

        function getBaseHref() {
            if (typeof window !== 'undefined' && window.location && typeof window.location.href === 'string') {
                return window.location.href;
            }
            if (typeof globalThis !== 'undefined' && globalThis.location && typeof globalThis.location.href === 'string') {
                return globalThis.location.href;
            }
            return 'https://example.com/';
        }

        function deriveBaseUrl(url) {
            if (!url) {
                return '';
            }
            try {
                const resolved = new URL(url, getBaseHref());
                const base = new URL('.', resolved);
                return base.toString();
            } catch (error) {
                console.error('FaqBuilder: Failed to derive base URL.', error);
                return '';
            }
        }

        function render() {
            if (!entriesContainer) {
                return;
            }
            closeCategoryMenu();
            utils.clearElement(entriesContainer);
            if (!state.entries.length) {
                state.entries.push(createEmptyEntry());
            }
            state.entries.forEach((entry, index) => {
                entriesContainer.appendChild(createEntryCard(entry, index));
            });
            requestPreviewUpdate();
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
                    requestPreviewUpdate();
                }
            });
            fields.appendChild(idField.wrapper);

            const questionField = utils.createInputField({
                label: 'Question',
                value: entry.question,
                helperText: 'Keep questions concise and specific.',
                onInput: (value) => {
                    state.entries[index].question = value;
                    requestPreviewUpdate();
                }
            });
            fields.appendChild(questionField.wrapper);

            const iconField = utils.createInputField({
                label: 'Icon symbol',
                value: entry.iconSymbol,
                helperText: 'Material Symbols name. Browse or type to filter.',
                onInput: (value) => {
                    const normalized = utils.trimString(value);
                    state.entries[index].iconSymbol = normalized;
                    syncIconPreview(normalized);
                    if (activeIconContext && activeIconContext.index === index) {
                        updateIconPickerSelection(normalized);
                        renderIconPickerOptions(iconPickerSearch ? iconPickerSearch.value : '');
                    }
                    requestPreviewUpdate();
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
            iconPreview.dataset.empty = entry.iconSymbol ? 'false' : 'true';
            const syncIconPreview = (value) => {
                const symbol = value ? value : 'help';
                iconPreview.textContent = symbol;
                iconPreview.dataset.empty = value ? 'false' : 'true';
            };
            const iconButtons = utils.createElement('div', { classNames: 'faq-icon-buttons' });
            const pickButton = utils.createInlineButton({
                icon: 'grid_view',
                label: 'Browse icons',
                onClick: () =>
                    openIconPicker({
                        index,
                        input: iconField.input,
                        preview: iconPreview,
                        trigger: pickButton
                    })
            });
            pickButton.classList.add('faq-icon-button');
            const clearButton = utils.createInlineButton({
                icon: 'backspace',
                label: 'Clear icon',
                onClick: () => {
                    state.entries[index].iconSymbol = '';
                    if (iconField.input) {
                        iconField.input.value = '';
                    }
                    syncIconPreview('');
                    if (activeIconContext && activeIconContext.index === index) {
                        updateIconPickerSelection('');
                        renderIconPickerOptions(iconPickerSearch ? iconPickerSearch.value : '');
                    }
                    requestPreviewUpdate();
                }
            });
            clearButton.classList.add('faq-icon-button');
            iconButtons.appendChild(pickButton);
            iconButtons.appendChild(clearButton);
            const iconMeta = utils.createElement('div', { classNames: 'faq-icon-meta' });
            iconMeta.appendChild(iconPreview);
            iconMeta.appendChild(iconButtons);
            const iconHelper = iconField.wrapper.querySelector('.api-field-helper');
            if (iconHelper) {
                iconField.wrapper.insertBefore(iconMeta, iconHelper);
            } else {
                iconField.wrapper.appendChild(iconMeta);
            }
            fields.appendChild(iconField.wrapper);

            const categoryField = utils.createElement('div', {
                classNames: ['api-field', 'faq-category-field']
            });
            categoryField.appendChild(
                utils.createElement('span', {
                    classNames: 'api-field-label',
                    text: 'Categories'
                })
            );
            const categoryDropdown = utils.createElement('div', {
                classNames: 'faq-category-dropdown'
            });
            const categoryTrigger = utils.createElement('button', {
                classNames: 'faq-category-trigger',
                attrs: { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' }
            });
            const categorySummary = utils.createElement('span', {
                classNames: 'faq-category-trigger__label',
                text: formatCategorySummary(entry.categories)
            });
            const categoryIcon = utils.createElement('span', {
                classNames: ['material-symbols-outlined', 'faq-category-trigger__icon'],
                text: 'arrow_drop_down'
            });
            categoryTrigger.appendChild(categorySummary);
            categoryTrigger.appendChild(categoryIcon);
            const categoryMenu = utils.createElement('div', {
                classNames: 'faq-category-menu',
                attrs: { hidden: '' }
            });
            categoryMenu.dataset.open = 'false';
            const checkboxRefs = [];
            const syncCategorySummary = () => {
                categorySummary.textContent = formatCategorySummary(state.entries[index].categories || []);
                checkboxRefs.forEach(({ input, value }) => {
                    input.checked = Array.isArray(state.entries[index].categories)
                        ? state.entries[index].categories.includes(value)
                        : false;
                });
            };
            categoryTrigger.addEventListener('click', () => {
                if (categoryMenu.dataset.open === 'true') {
                    closeCategoryMenu();
                } else {
                    openCategoryMenu(categoryMenu, categoryTrigger);
                }
            });
            CATEGORY_GROUPS.forEach((group) => {
                const groupBlock = utils.createElement('div', {
                    classNames: 'faq-category-menu__group'
                });
                groupBlock.appendChild(
                    utils.createElement('p', {
                        classNames: 'faq-category-menu__group-label',
                        text: group.label
                    })
                );
                group.options.forEach((option) => {
                    const optionId = `faq-category-${option.value}-${index}`;
                    const optionRow = utils.createElement('label', {
                        classNames: 'faq-category-menu__option',
                        attrs: { for: optionId }
                    });
                    const checkbox = utils.createElement('input', {
                        classNames: 'faq-category-menu__checkbox',
                        attrs: { type: 'checkbox', id: optionId, value: option.value }
                    });
                    checkbox.checked = Array.isArray(entry.categories)
                        ? entry.categories.includes(option.value)
                        : false;
                    checkbox.addEventListener('change', (event) => {
                        const selected = Array.isArray(state.entries[index].categories)
                            ? [...state.entries[index].categories]
                            : [...DEFAULT_CATEGORIES];
                        const value = option.value;
                        const currentIndex = selected.indexOf(value);
                        if (event.target.checked && currentIndex === -1) {
                            selected.push(value);
                        } else if (!event.target.checked && currentIndex !== -1) {
                            selected.splice(currentIndex, 1);
                        }
                        state.entries[index].categories = sortCategories(selected);
                        syncCategorySummary();
                        requestPreviewUpdate();
                    });
                    checkboxRefs.push({ input: checkbox, value: option.value });
                    optionRow.appendChild(checkbox);
                    optionRow.appendChild(
                        utils.createElement('span', {
                            classNames: 'faq-category-menu__option-label',
                            text: option.label
                        })
                    );
                    groupBlock.appendChild(optionRow);
                });
                categoryMenu.appendChild(groupBlock);
            });
            categoryDropdown.appendChild(categoryTrigger);
            categoryDropdown.appendChild(categoryMenu);
            categoryField.appendChild(categoryDropdown);
            categoryField.appendChild(
                utils.createElement('span', {
                    classNames: 'api-field-helper',
                    text: 'Select every category that applies. General remains selected by default.'
                })
            );
            fields.appendChild(categoryField);

            const featuredField = utils.createSelectField({
                label: 'Featured on home',
                value: entry.featured ? 'true' : 'false',
                options: [
                    { value: 'false', label: 'No' },
                    { value: 'true', label: 'Yes' }
                ],
                onChange: (value) => {
                    state.entries[index].featured = value === 'true';
                    requestPreviewUpdate();
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
                    requestPreviewUpdate();
                }
            });
            fields.appendChild(homeAnswerField.wrapper);

            let renderAnswerPreview = () => {};
            const answerField = utils.createTextareaField({
                label: 'Full answer HTML',
                value: entry.answerHtml,
                rows: 6,
                placeholder: '<p>Rich answer with paragraphs and lists...</p>',
                helperText: 'Provide complete context. HTML is preserved as typed.',
                onInput: (value) => {
                    state.entries[index].answerHtml = value;
                    renderAnswerPreview();
                    requestPreviewUpdate();
                }
            });
            fields.appendChild(answerField.wrapper);

            const answerPreviewSection = utils.createElement('div', {
                classNames: 'faq-answer-preview-section'
            });
            const answerPreviewHeader = utils.createElement('div', {
                classNames: 'faq-answer-preview-header'
            });
            answerPreviewHeader.appendChild(
                utils.createElement('span', {
                    classNames: 'faq-answer-preview-title',
                    text: 'Live preview'
                })
            );
            const htmlPreview = utils.createElement('div', {
                classNames: 'faq-answer-preview',
                attrs: { 'data-empty': 'true' }
            });
            renderAnswerPreview = () => {
                const sanitized = utils.sanitizeHtml(state.entries[index].answerHtml || '');
                if (sanitized) {
                    htmlPreview.innerHTML = sanitized;
                    htmlPreview.dataset.empty = 'false';
                } else {
                    htmlPreview.innerHTML = '';
                    htmlPreview.dataset.empty = 'true';
                }
            };
            const formatButton = utils.createInlineButton({
                icon: 'format_indent_increase',
                label: 'Format HTML',
                onClick: () => {
                    const formatted = utils.prettifyHtmlFragment(state.entries[index].answerHtml || '');
                    const nextValue = formatted || utils.trimString(state.entries[index].answerHtml || '');
                    state.entries[index].answerHtml = nextValue || '';
                    if (answerField.textarea) {
                        answerField.textarea.value = state.entries[index].answerHtml;
                    }
                    renderAnswerPreview();
                    requestPreviewUpdate();
                }
            });
            formatButton.classList.add('faq-html-format-button');
            answerPreviewHeader.appendChild(formatButton);
            answerPreviewSection.appendChild(answerPreviewHeader);
            answerPreviewSection.appendChild(htmlPreview);
            fields.appendChild(answerPreviewSection);
            renderAnswerPreview();

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
            const normalizedEntries = Array.isArray(entries)
                ? entries
                      .map((entry) => normalizeEntry(entry))
                      .map((entry) => {
                          const id = utils.trimString(entry.id);
                          const question = utils.trimString(entry.question);
                          const answerHtml = typeof entry.answerHtml === 'string' ? entry.answerHtml : '';
                          if (!id || !question || !answerHtml.trim()) {
                              return null;
                          }
                          const categories = sortCategories(entry.categories || []);
                          const iconSymbol = utils.trimString(entry.iconSymbol);
                          const homeAnswer = typeof entry.homeAnswerHtml === 'string' ? entry.homeAnswerHtml : '';
                          const payloadEntry = {
                              id,
                              question,
                              categories,
                              answerHtml
                          };
                          if (iconSymbol) {
                              payloadEntry.iconSymbol = iconSymbol;
                          }
                          if (entry.featured) {
                              payloadEntry.featured = true;
                          }
                          if (homeAnswer && homeAnswer.trim()) {
                              payloadEntry.homeAnswerHtml = homeAnswer;
                          }
                          return payloadEntry;
                      })
                      .filter(Boolean)
                : [];
            return {
                index: buildIndexPayload(normalizedEntries),
                catalog: buildCatalogPayload(normalizedEntries)
            };
        }

        function buildIndexPayload(entries) {
            const categories = ALL_CATEGORIES.map((category) => {
                const count = entries.filter((entry) => entry.categories.includes(category.value)).length;
                return {
                    code: category.value,
                    label: category.label,
                    group: category.group,
                    path: `${category.value}.json`,
                    count
                };
            });
            return {
                schemaVersion: 1,
                totalEntries: entries.length,
                categories
            };
        }

        function buildCatalogPayload(entries) {
            const catalog = {};
            ALL_CATEGORIES.forEach((category) => {
                catalog[category.value] = [];
            });
            entries.forEach((entry) => {
                const categories = Array.isArray(entry.categories) ? entry.categories : [...DEFAULT_CATEGORIES];
                const categoryList = sortCategories(categories);
                categoryList.forEach((code) => {
                    if (!catalog[code]) {
                        catalog[code] = [];
                    }
                    const record = {
                        id: entry.id,
                        question: entry.question,
                        categories: [...categoryList],
                        answerHtml: entry.answerHtml
                    };
                    if (entry.iconSymbol) {
                        record.iconSymbol = entry.iconSymbol;
                    }
                    if (entry.featured) {
                        record.featured = true;
                    }
                    if (entry.homeAnswerHtml) {
                        record.homeAnswerHtml = entry.homeAnswerHtml;
                    }
                    catalog[code].push(record);
                });
            });
            return catalog;
        }

        function mergeEntryRecords(target, source) {
            const base = normalizeEntry(target);
            const incoming = normalizeEntry(source);
            const merged = { ...base };
            if (incoming.id) {
                merged.id = incoming.id;
            }
            if (incoming.question) {
                merged.question = incoming.question;
            }
            merged.iconSymbol = incoming.iconSymbol || merged.iconSymbol || '';
            merged.featured = Boolean(incoming.featured || merged.featured);
            merged.homeAnswerHtml = incoming.homeAnswerHtml || merged.homeAnswerHtml || '';
            merged.answerHtml = incoming.answerHtml || merged.answerHtml || '';
            merged.categories = sortCategories([...(base.categories || []), ...(incoming.categories || [])]);
            return merged;
        }

        function mergeEntries(entries) {
            if (!Array.isArray(entries)) {
                return [];
            }
            const map = new Map();
            entries.forEach((entry) => {
                const normalized = normalizeEntry(entry);
                if (!normalized.id) {
                    return;
                }
                if (map.has(normalized.id)) {
                    const existing = map.get(normalized.id);
                    map.set(normalized.id, mergeEntryRecords(existing, normalized));
                } else {
                    map.set(normalized.id, normalized);
                }
            });
            return Array.from(map.values());
        }

        function flattenCatalogPayload(catalog) {
            const entries = [];
            if (!catalog || typeof catalog !== 'object') {
                return entries;
            }
            Object.entries(catalog).forEach(([code, list]) => {
                if (!Array.isArray(list)) {
                    return;
                }
                list.forEach((entry) => {
                    const normalized = normalizeEntry(entry);
                    if (!normalized.categories.includes(code)) {
                        normalized.categories = sortCategories([...normalized.categories, code]);
                    }
                    entries.push(normalized);
                });
            });
            return entries;
        }

        function isIndexPayload(payload) {
            if (!payload || typeof payload !== 'object') {
                return false;
            }
            if (!Array.isArray(payload.categories)) {
                return false;
            }
            return payload.categories.some((item) => typeof item?.path === 'string' || typeof item?.code === 'string');
        }

        function extractEntriesFromPayload(payload) {
            if (Array.isArray(payload)) {
                return payload;
            }
            if (payload && typeof payload === 'object') {
                if (Array.isArray(payload.entries)) {
                    return payload.entries;
                }
                if (payload.catalog && typeof payload.catalog === 'object') {
                    return flattenCatalogPayload(payload.catalog);
                }
                if (payload.categories && typeof payload.categories === 'object' && !Array.isArray(payload.categories)) {
                    return flattenCatalogPayload(payload.categories);
                }
            }
            throw new Error('Unsupported FAQ dataset format.');
        }

        async function loadEntriesFromIndex(payload, sourceUrl) {
            const categories = Array.isArray(payload?.categories) ? payload.categories : [];
            if (!categories.length) {
                return [];
            }
            const aggregated = [];
            const baseUrl = deriveBaseUrl(sourceUrl);
            for (const category of categories) {
                const code = typeof category?.code === 'string' ? category.code : '';
                const path = typeof category?.path === 'string' ? category.path : code ? `${code}.json` : '';
                if (!path) {
                    continue;
                }
                let resolvedUrl = path;
                try {
                    resolvedUrl = baseUrl ? new URL(path, baseUrl).toString() : new URL(path, getBaseHref()).toString();
                } catch (error) {
                    resolvedUrl = path;
                }
                try {
                    const response = await fetch(resolvedUrl, { cache: 'no-store' });
                    if (!response.ok) {
                        console.warn('FaqBuilder: Failed to fetch FAQ category dataset.', resolvedUrl, response.status);
                        continue;
                    }
                    const text = await response.text();
                    const parsed = utils.parseJson(text);
                    const entries = await resolveEntriesFromDataset(parsed, resolvedUrl, { allowIndex: false });
                    aggregated.push(...entries);
                } catch (error) {
                    console.error('FaqBuilder: Failed to load FAQ category dataset.', error);
                }
            }
            return mergeEntries(aggregated);
        }

        async function resolveEntriesFromDataset(payload, sourceUrl = '', { allowIndex = true } = {}) {
            if (allowIndex && isIndexPayload(payload)) {
                if (!sourceUrl) {
                    throw new Error('A base URL is required to resolve the FAQ index dataset.');
                }
                return loadEntriesFromIndex(payload, sourceUrl);
            }
            const rawEntries = extractEntriesFromPayload(payload);
            return mergeEntries(rawEntries);
        }

        function applyFaqEntries(entries) {
            const normalized = Array.isArray(entries) ? entries.map((entry) => normalizeEntry(entry)) : [];
            state.entries = normalized.length ? normalized : [createEmptyEntry()];
            render();
        }

        function getExportedEntryCount(payload) {
            if (Array.isArray(payload)) {
                return payload.length;
            }
            if (payload && typeof payload === 'object') {
                if (typeof payload.index?.totalEntries === 'number') {
                    return payload.index.totalEntries;
                }
                if (Array.isArray(payload.entries)) {
                    return payload.entries.length;
                }
            }
            return 0;
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
            if (getExportedEntryCount(payload) === 0) {
                warnings.push('Add at least one complete FAQ entry before exporting.');
            }
            return { errors, warnings };
        }

        async function updatePreview() {
            if (!previewArea) {
                return;
            }
            const result = await utils.renderJsonPreview({
                previewArea,
                statusElement: null,
                data: state.entries,
                buildPayload
            });
            if (result && typeof result === 'object') {
                lastPreviewState = result;
            } else {
                lastPreviewState = { success: false, payload: {} };
            }
            const payload = lastPreviewState.success ? lastPreviewState.payload || {} : {};
            lastEvaluation = evaluateState(payload);
            applyValidationState(payload);
            updateMetrics(payload);
            updateExportControls();
        }

        const previewUpdateTask = utils.createDeferredTask(updatePreview, {
            delay: 320,
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
            const exportedCount = getExportedEntryCount(payload);
            if (exportedCount === 0) {
                utils.setValidationStatus(validationStatus, {
                    status: 'warning',
                    message: 'Valid JSON · Add FAQs to export.'
                });
                toolbarStatus.textContent = 'Awaiting entries';
                toolbarStatus.dataset.state = 'warning';
                const warningMessage = warnings[0] || 'Start adding entries to generate the FAQ dataset.';
                updateWorkspacePulse(warningMessage);
                return;
            }
            const message = exportedCount === 1
                ? 'Valid JSON · 1 FAQ entry'
                : `Valid JSON · ${exportedCount} FAQ entries`;
            utils.setValidationStatus(validationStatus, {
                status: 'success',
                message
            });
            toolbarStatus.textContent = message;
            toolbarStatus.dataset.state = 'success';
            updateWorkspacePulse('FAQ dataset is ready to export.');
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
            const payload = lastPreviewState.success ? lastPreviewState.payload || {} : {};
            const errors = Array.isArray(lastEvaluation.errors) ? lastEvaluation.errors : [];
            const exportedCount = getExportedEntryCount(payload);
            const valid = exportedCount > 0 && errors.length === 0;
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
                const entries = await resolveEntriesFromDataset(parsed, response.url || trimmed);
                applyFaqEntries(entries);
                if (!silent) {
                    setFetchStatus('FAQ dataset loaded successfully.', 'success');
                }
            } catch (error) {
                console.error('FaqBuilder: Failed to fetch JSON.', error);
                if (!silent) {
                    setFetchStatus('Unable to fetch FAQ dataset. Check the URL and try again.', 'error');
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
                renderIconPickerOptions(iconPickerSearch ? iconPickerSearch.value : '');
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

        function updateIconPickerSelection(value) {
            if (iconPickerSelection) {
                iconPickerSelection.textContent = value ? value : 'None';
            }
        }

        function renderIconPickerOptions(query = '') {
            if (!iconPickerList) {
                return;
            }
            utils.clearElement(iconPickerList);
            const searchTerm = typeof query === 'string' ? utils.trimString(query) : '';
            const normalizedQuery = searchTerm.toLowerCase();
            if (!iconNames.length) {
                if (iconPickerLoading) {
                    iconPickerLoading.hidden = false;
                }
                if (iconPickerEmpty) {
                    iconPickerEmpty.hidden = true;
                }
                if (iconPickerResultCount) {
                    iconPickerResultCount.textContent = '0';
                }
                if (iconPickerLimit) {
                    iconPickerLimit.hidden = true;
                }
                return;
            }
            if (iconPickerLoading) {
                iconPickerLoading.hidden = true;
            }
            let matches = iconNames;
            if (normalizedQuery) {
                matches = iconNames.filter((name) => name.toLowerCase().includes(normalizedQuery));
            }
            const totalMatches = matches.length;
            const limited = matches.slice(0, ICON_PICKER_MAX_RENDER);
            if (iconPickerResultCount) {
                iconPickerResultCount.textContent =
                    totalMatches > ICON_PICKER_MAX_RENDER
                        ? `${ICON_PICKER_MAX_RENDER}+`
                        : String(totalMatches);
            }
            if (iconPickerLimit) {
                iconPickerLimit.hidden = totalMatches <= ICON_PICKER_MAX_RENDER;
            }
            if (iconPickerEmpty) {
                if (limited.length) {
                    iconPickerEmpty.hidden = true;
                } else {
                    iconPickerEmpty.hidden = false;
                    if (iconPickerQuery) {
                        iconPickerQuery.textContent = searchTerm || 'your search';
                    }
                }
            }
            const selected = activeIconContext?.input
                ? utils.trimString(activeIconContext.input.value).toLowerCase()
                : '';
            limited.forEach((name) => {
                const button = utils.createElement('button', {
                    classNames: ['faq-icon-picker__option'],
                    attrs: {
                        type: 'button',
                        role: 'option',
                        'data-icon-name': name
                    }
                });
                const iconGlyph = utils.createElement('span', {
                    classNames: ['material-symbols-outlined', 'faq-icon-picker__icon'],
                    text: name
                });
                const label = utils.createElement('span', {
                    classNames: 'faq-icon-picker__label',
                    text: name
                });
                button.appendChild(iconGlyph);
                button.appendChild(label);
                const isSelected = selected === name.toLowerCase();
                button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                if (isSelected) {
                    button.classList.add('is-selected');
                }
                button.addEventListener('click', () => {
                    applyIconSelection(name);
                });
                iconPickerList.appendChild(button);
            });
        }

        function openIconPicker(context = null) {
            if (!iconPickerRoot) {
                return;
            }
            activeIconContext = context;
            const selectedValue = context?.input ? utils.trimString(context.input.value) : '';
            updateIconPickerSelection(selectedValue);
            iconPickerRoot.removeAttribute('hidden');
            iconPickerRoot.dataset.open = 'true';
            previousBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            if (iconPickerSearch) {
                iconPickerSearch.value = '';
            }
            if (!iconNames.length && !iconsRequested) {
                refreshIcons();
            }
            renderIconPickerOptions('');
            if (iconPickerSearch) {
                window.setTimeout(() => iconPickerSearch.focus(), 0);
            }
            document.addEventListener('keydown', handleIconPickerKeydown);
        }

        function closeIconPicker() {
            if (!iconPickerRoot) {
                return;
            }
            iconPickerRoot.dataset.open = 'false';
            iconPickerRoot.setAttribute('hidden', '');
            if (iconPickerSearch) {
                iconPickerSearch.value = '';
            }
            document.removeEventListener('keydown', handleIconPickerKeydown);
            document.body.style.overflow = previousBodyOverflow || '';
            const trigger = activeIconContext?.trigger;
            activeIconContext = null;
            if (trigger && typeof trigger.focus === 'function') {
                window.setTimeout(() => trigger.focus(), 0);
            }
        }

        function handleIconPickerKeydown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeIconPicker();
            }
        }

        function applyIconSelection(name) {
            if (!activeIconContext) {
                return;
            }
            const normalized = typeof name === 'string' ? utils.trimString(name) : '';
            const entry = state.entries[activeIconContext.index];
            if (entry) {
                entry.iconSymbol = normalized;
            }
            if (activeIconContext.input) {
                activeIconContext.input.value = normalized;
            }
            if (activeIconContext.preview) {
                activeIconContext.preview.textContent = normalized || 'help';
                activeIconContext.preview.dataset.empty = normalized ? 'false' : 'true';
            }
            updateIconPickerSelection(normalized);
            renderIconPickerOptions(iconPickerSearch ? iconPickerSearch.value : '');
            requestPreviewUpdate();
        }

        async function handleImport(content) {
            try {
                const parsed = utils.parseJson(content);
                const entries = await resolveEntriesFromDataset(parsed);
                applyFaqEntries(entries);
                setFetchStatus('Imported FAQ dataset from file.', 'success');
            } catch (error) {
                console.error('FaqBuilder: Failed to import JSON file.', error);
                const message =
                    error && typeof error.message === 'string' && error.message.includes('base URL')
                        ? 'FAQ index files must be fetched from a hosted URL.'
                        : 'Could not import the selected FAQ dataset.';
                setFetchStatus(message, 'error');
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
                const typedUrl = fetchInput ? utils.trimString(fetchInput.value) : '';
                const presetUrl = activePreset?.url || typedUrl || presetButton.getAttribute('data-faq-preset');
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

        if (iconPickerBackdrop) {
            iconPickerBackdrop.addEventListener('click', () => closeIconPicker());
        }

        if (iconPickerClose) {
            iconPickerClose.addEventListener('click', () => closeIconPicker());
        }

        if (iconPickerDismiss) {
            iconPickerDismiss.addEventListener('click', () => closeIconPicker());
        }

        if (iconPickerSearch) {
            iconPickerSearch.addEventListener('input', (event) => {
                renderIconPickerOptions(event.target.value);
            });
        }

        if (iconPickerClear) {
            iconPickerClear.addEventListener('click', () => {
                if (!activeIconContext) {
                    return;
                }
                applyIconSelection('');
            });
        }

        render();
        refreshIcons();
        fetchFromUrl(DEFAULT_DATA_URL, { silent: true });
    }

    global.initFaqWorkspace = initFaqWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
