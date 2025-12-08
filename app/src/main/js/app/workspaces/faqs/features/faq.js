(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('FaqBuilder: ApiBuilderUtils is required.');
        return;
    }

    const APP_CONFIG = global.__APP_CONFIG__ || {};
    const DEFAULT_FILENAME = 'faq_questions.json';
    const SITE_BASE = (() => {
        try {
            const url = new URL('.', window.location.href);
            return url.href.replace(/\/$/, '');
        } catch (error) {
            console.warn('FaqBuilder: Unable to derive site base.', error);
            return '';
        }
    })();
    const BASE_ASSET_URL = (() => {
        const configured = utils.trimString(APP_CONFIG.assetBaseUrl);
        if (configured) {
            return configured.replace(/\/?$/, '/');
        }
        return SITE_BASE ? `${SITE_BASE}/` : '';
    })();
    const withBase = (path) => {
        try {
            const baseUrl = BASE_ASSET_URL || `${SITE_BASE}/`;
            return new URL(path.replace(/^\//, ''), baseUrl).toString();
        } catch (error) {
            console.warn('FaqBuilder: Unable to resolve URL for', path, error);
            return path;
        }
    };
    const DEBUG_CATALOG_URL = withBase(
        APP_CONFIG.defaultFaqCatalogUrl || 'api/faq/v1/debug/catalog.json'
    );
    const RELEASE_CATALOG_URL = withBase(
        APP_CONFIG.releaseFaqCatalogUrl || 'api/faq/v1/release/catalog.json'
    );
    const DEFAULT_CATALOG_URL = DEBUG_CATALOG_URL;
    const DEFAULT_PRODUCT_KEY = 'api_workspace';
    const ICON_CATALOG_ENDPOINTS = Array.isArray(APP_CONFIG.iconCatalogSources)
        && APP_CONFIG.iconCatalogSources.length
        ? APP_CONFIG.iconCatalogSources
        : [
            withBase('data/material-symbols.json'),
            'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints'
        ];
    const ICON_PICKER_MAX_RENDER = 400;

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
    const DEFAULT_CATEGORIES = [];

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
        const fetchStatus = document.getElementById('faqFetchStatus');
        const catalogStatus = document.getElementById('faqCatalogStatus');
        const catalogButton = document.getElementById('faqCatalogFetchButton');
        const catalogButtonLabel = document.getElementById('faqCatalogButtonLabel');
        const catalogSelectRoot = document.getElementById('faqCatalogSelect');
        const catalogPresetButtons = document.querySelectorAll('[data-faq-catalog-preset]');
        const catalogSchemaField = document.getElementById('faqCatalogSchemaField');
        const catalogProductsContainer = document.getElementById('faqCatalogProducts');
        const catalogAddProductButton = document.getElementById('faqCatalogAddProduct');
        const catalogResetButton = document.getElementById('faqCatalogReset');
        const catalogPreviewArea = document.getElementById('faqCatalogPreview');
        const catalogValidationStatus = document.getElementById('faqCatalogValidation');
        const catalogCopyButton = document.getElementById('faqCatalogCopyButton');
        const catalogDownloadButton = document.getElementById('faqCatalogDownloadButton');
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
        const modeButtons = document.querySelectorAll('[data-faq-mode]');
        const modeStatus = document.getElementById('faqModeStatus');
        const panelButtons = document.querySelectorAll('[data-faq-panel-control]');
        const panels = document.querySelectorAll('[data-faq-panel]');
        const screens = document.querySelectorAll('[data-faq-screen]');
        const chooserScreen = document.querySelector('[data-faq-screen="chooser"]');
        const workspaceScreen = document.querySelector('[data-faq-screen="workspace"]');
        const backToChooserButton = document.getElementById('faqBackToChooser');

        const modeDefaultStatus = 'Select a workflow to continue.';

        const modeTargets = {
            catalog: document.getElementById('faqCatalogBuilder') || catalogSchemaField,
            faqs: document.querySelector('.faq-product-loader') || entriesContainer
        };

        const panelByMode = {
            catalog: 'catalog',
            faqs: 'faqs'
        };

        const setPanel = (panel) => {
            const availablePanels = Array.from(panels);
            const activePanel = availablePanels.find((panelEl) => panelEl.dataset.faqPanel === panel)
                ? panel
                : availablePanels[0]?.dataset.faqPanel;

            availablePanels.forEach((panelEl) => {
                const isActive = panelEl.dataset.faqPanel === activePanel;
                panelEl.toggleAttribute('hidden', !isActive);
            });

            panelButtons.forEach((button) => {
                const isActive = button.dataset.faqPanelControl === activePanel;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
        };

        panelButtons.forEach((button) => {
            button.addEventListener('click', () => setPanel(button.dataset.faqPanelControl));
        });

        setPanel(panels[0]?.dataset.faqPanel || 'catalog');

        const setModeStatus = (message) => {
            if (modeStatus) {
                modeStatus.textContent = message;
            }
        };

        const setScreen = (screen = 'chooser') => {
            const targetScreen = screen === 'workspace' ? 'workspace' : 'chooser';

            screens.forEach((screenEl) => {
                const isActive = screenEl.dataset.faqScreen === targetScreen;
                screenEl.toggleAttribute('hidden', !isActive);
                screenEl.classList.toggle('is-active', isActive);
            });

            if (targetScreen === 'chooser') {
                modeButtons.forEach((button) => {
                    button.classList.remove('is-active');
                    button.setAttribute('aria-pressed', 'false');
                });
                setPanel('catalog');
                setModeStatus(modeDefaultStatus);
                if (chooserScreen) {
                    chooserScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else if (workspaceScreen) {
                workspaceScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        setScreen('chooser');

        const modeMessages = {
            catalog: 'Update catalog.json and refresh products before exporting.',
            faqs: 'Pick a product to load its FAQs directly from the catalog.'
        };

        const setMode = (mode) => {
            const selectedMode = modeMessages[mode] ? mode : 'catalog';
            setScreen('workspace');
            setPanel(panelByMode[selectedMode] || 'catalog');
            modeButtons.forEach((button) => {
                const isActive = button.dataset.faqMode === selectedMode;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

            setModeStatus(modeMessages[selectedMode]);

            const target = modeTargets[selectedMode];
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                target.classList.add('faq-mode-pulse');
                setTimeout(() => target.classList.remove('faq-mode-pulse'), 650);
            }
        };

        modeButtons.forEach((button) => {
            button.addEventListener('click', () => setMode(button.dataset.faqMode));
        });

        if (backToChooserButton) {
            backToChooserButton.addEventListener('click', () => setScreen('chooser'));
        }

        const state = {
            entries: [createEmptyEntry()]
        };
        const catalogFormState = {
            schemaVersion: 1,
            products: [createEmptyCatalogProduct()]
        };
        let iconNames = [];
        let lastPreviewState = { success: false, payload: [] };
        let lastEvaluation = { errors: [], warnings: [] };
        let lastCatalogPreviewState = { success: false, payload: {} };
        let lastCatalogEvaluation = { errors: [], warnings: [] };
        let iconsRequested = false;
        let activeIconContext = null;
        let previousBodyOverflow = '';
        let activeCategoryMenu = null;
        const catalogState = { products: [], loaded: false, source: DEFAULT_CATALOG_URL };
        let catalogSelectEl = null;
        catalogState.selectedKey = DEFAULT_PRODUCT_KEY;

        builderRoot.dataset.initialized = 'true';

        function sortCategories(values = []) {
            const seen = new Set();
            const normalized = [];
            values.forEach((value) => {
                const trimmed = utils.trimString(value);
                if (!trimmed || seen.has(trimmed)) {
                    return;
                }
                seen.add(trimmed);
                normalized.push(trimmed);
            });
            return normalized.sort((a, b) => {
                const orderA = CATEGORY_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
                const orderB = CATEGORY_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
                if (orderA === orderB) {
                    return a.localeCompare(b);
                }
                return orderA - orderB;
            });
        }

        function normalizeTags(values = []) {
            const seen = new Set();
            const tags = [];
            if (!Array.isArray(values)) {
                return tags;
            }
            values.forEach((value) => {
                const trimmed = utils.trimString(value);
                if (!trimmed || seen.has(trimmed)) {
                    return;
                }
                seen.add(trimmed);
                tags.push(trimmed);
            });
            return tags;
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

        function createEmptyEntry() {
            return {
                id: '',
                question: '',
                icon: '',
                categories: [...DEFAULT_CATEGORIES],
                featured: false,
                answer: '',
                tags: []
            };
        }

        function createEmptyQuestionSource() {
            return { url: '', category: '' };
        }

        function createEmptyCatalogProduct() {
            return {
                name: '',
                productId: '',
                key: '',
                questionSources: [createEmptyQuestionSource()]
            };
        }

        function normalizeQuestionSource(raw) {
            if (!raw || typeof raw !== 'object') {
                return createEmptyQuestionSource();
            }
            return {
                url: utils.trimString(raw.url),
                category: utils.trimString(raw.category)
            };
        }

        function normalizeCatalogProduct(raw) {
            if (!raw || typeof raw !== 'object') {
                return createEmptyCatalogProduct();
            }
            const normalizedSources = Array.isArray(raw.questionSources)
                ? raw.questionSources.map((source) => normalizeQuestionSource(source))
                : [createEmptyQuestionSource()];
            return {
                name: utils.trimString(raw.name),
                productId: utils.trimString(raw.productId || raw.id || raw.key),
                key: utils.trimString(raw.key || raw.productId),
                questionSources: normalizedSources.length
                    ? normalizedSources
                    : [createEmptyQuestionSource()]
            };
        }

        function cloneEntry(entry) {
            return {
                id: entry.id || '',
                question: entry.question || '',
                icon: entry.icon || '',
                categories: Array.isArray(entry.categories)
                    ? [...entry.categories]
                    : [...DEFAULT_CATEGORIES],
                featured: Boolean(entry.featured),
                answer: typeof entry.answer === 'string' ? entry.answer : '',
                tags: Array.isArray(entry.tags) ? [...entry.tags] : []
            };
        }

        function normalizeEntry(raw) {
            if (!raw || typeof raw !== 'object') {
                return createEmptyEntry();
            }
            let categories = [];
            if (Array.isArray(raw.categories)) {
                categories = raw.categories;
            } else if (Array.isArray(raw.topics)) {
                categories = raw.topics;
            }
            const tags = Array.isArray(raw.tags)
                ? raw.tags
                : Array.isArray(raw.keywords)
                ? raw.keywords
                : [];
            return {
                id: typeof raw.id === 'string' ? raw.id : '',
                question: typeof raw.question === 'string' ? raw.question : '',
                icon: typeof raw.icon === 'string'
                    ? raw.icon
                    : typeof raw.iconSymbol === 'string'
                    ? raw.iconSymbol
                    : '',
                categories: sortCategories(categories),
                featured: Boolean(raw.featured),
                answer:
                    typeof raw.answer === 'string'
                        ? raw.answer
                        : typeof raw.answerHtml === 'string'
                        ? raw.answerHtml
                        : '',
                tags: normalizeTags(tags)
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

        function renderCatalogSchema() {
            if (!catalogSchemaField) {
                return;
            }
            utils.clearElement(catalogSchemaField);
            const schemaField = utils.createInputField({
                label: 'schemaVersion',
                type: 'number',
                value: String(catalogFormState.schemaVersion ?? 1),
                helperText: 'Increment for breaking changes between catalog versions.',
                onInput: (value) => {
                    const parsed = utils.parseNumber(value, { fallback: 1 });
                    catalogFormState.schemaVersion = Number.isFinite(parsed) ? parsed : 1;
                    requestCatalogPreviewUpdate();
                }
            });
            catalogSchemaField.appendChild(schemaField.wrapper);
        }

        function createQuestionSourceField(productIndex, source, sourceIndex) {
            const wrapper = utils.createElement('div', { classNames: 'catalog-source' });
            const urlField = utils.createInputField({
                label: 'FAQ JSON URL',
                value: source.url,
                placeholder: './api/faq/v1/debug/en/questions/general/general.json',
                onInput: (value) => {
                    if (catalogFormState.products[productIndex]) {
                        catalogFormState.products[productIndex].questionSources[sourceIndex].url = utils.trimString(value);
                        requestCatalogPreviewUpdate();
                    }
                }
            });
            const categoryField = utils.createInputField({
                label: 'Category label',
                value: source.category,
                helperText: 'Optional grouping used when merging sources.',
                onInput: (value) => {
                    if (catalogFormState.products[productIndex]) {
                        catalogFormState.products[productIndex].questionSources[sourceIndex].category = utils.trimString(value);
                        requestCatalogPreviewUpdate();
                    }
                }
            });
            const actions = utils.createElement('div', { classNames: 'catalog-source__actions' });
            const removeButton = utils.createInlineButton({
                icon: 'delete',
                label: 'Remove source',
                onClick: () => {
                    const product = catalogFormState.products[productIndex];
                    if (!product) {
                        return;
                    }
                    const sources = product.questionSources || [];
                    sources.splice(sourceIndex, 1);
                    if (!sources.length) {
                        sources.push(createEmptyQuestionSource());
                    }
                    product.questionSources = sources;
                    renderCatalogProducts();
                    requestCatalogPreviewUpdate();
                }
            });
            actions.appendChild(removeButton);
            wrapper.appendChild(urlField.wrapper);
            wrapper.appendChild(categoryField.wrapper);
            wrapper.appendChild(actions);
            return wrapper;
        }

        function createCatalogProductCard(product, index) {
            const wrapper = utils.createElement('div', { classNames: 'builder-card catalog-card' });
            const header = utils.createElement('div', { classNames: 'builder-card-header catalog-card__header' });
            header.appendChild(utils.createElement('h3', { text: `Product ${index + 1}` }));
            const actions = utils.createElement('div', { classNames: 'catalog-card__actions' });
            const removeButton = utils.createInlineButton({
                icon: 'delete',
                label: 'Remove product',
                onClick: () => {
                    catalogFormState.products.splice(index, 1);
                    if (!catalogFormState.products.length) {
                        catalogFormState.products.push(createEmptyCatalogProduct());
                    }
                    renderCatalogProducts();
                    requestCatalogPreviewUpdate();
                }
            });
            actions.appendChild(removeButton);
            header.appendChild(actions);
            wrapper.appendChild(header);

            const fields = utils.createElement('div', { classNames: 'api-builder-fields catalog-card__fields' });
            const nameField = utils.createInputField({
                label: 'Product name',
                value: product.name,
                onInput: (value) => {
                    catalogFormState.products[index].name = value;
                    requestCatalogPreviewUpdate();
                }
            });
            fields.appendChild(nameField.wrapper);

            const productIdField = utils.createInputField({
                label: 'productId',
                value: product.productId,
                helperText: 'Use the Android package name or unique identifier.',
                onInput: (value) => {
                    catalogFormState.products[index].productId = utils.trimString(value);
                    requestCatalogPreviewUpdate();
                }
            });
            fields.appendChild(productIdField.wrapper);

            const keyField = utils.createInputField({
                label: 'key',
                value: product.key,
                helperText: 'Snake_case identifier used by tools and analytics.',
                onInput: (value) => {
                    catalogFormState.products[index].key = utils.trimString(value);
                    requestCatalogPreviewUpdate();
                }
            });
            fields.appendChild(keyField.wrapper);

            const sourcesHeader = utils.createElement('div', { classNames: 'catalog-sources__header' });
            sourcesHeader.appendChild(utils.createElement('h4', { text: 'Question sources' }));
            const addSourceButton = utils.createInlineButton({
                icon: 'add',
                label: 'Add source',
                onClick: () => {
                    catalogFormState.products[index].questionSources.push(createEmptyQuestionSource());
                    renderCatalogProducts();
                    requestCatalogPreviewUpdate();
                }
            });
            sourcesHeader.appendChild(addSourceButton);
            fields.appendChild(sourcesHeader);

            const sourcesList = utils.createElement('div', { classNames: 'catalog-sources' });
            const sources = Array.isArray(product.questionSources)
                ? product.questionSources
                : [createEmptyQuestionSource()];
            sources.forEach((source, sourceIndex) => {
                sourcesList.appendChild(createQuestionSourceField(index, source, sourceIndex));
            });
            fields.appendChild(sourcesList);

            wrapper.appendChild(fields);
            return wrapper;
        }

        function renderCatalogProducts() {
            if (!catalogProductsContainer) {
                return;
            }
            utils.clearElement(catalogProductsContainer);
            if (!Array.isArray(catalogFormState.products) || !catalogFormState.products.length) {
                catalogFormState.products = [createEmptyCatalogProduct()];
            }
            catalogFormState.products = catalogFormState.products.map((product) => normalizeCatalogProduct(product));
            catalogFormState.products.forEach((product, index) => {
                catalogProductsContainer.appendChild(createCatalogProductCard(product, index));
            });
        }

        function createEntryCard(entry, index) {
            const wrapper = utils.createElement('div', { classNames: 'builder-card' });
            const header = utils.createElement('div', { classNames: 'builder-card-header' });
            header.appendChild(utils.createElement('h3', { text: `FAQ ${index + 1}` }));

            const moveUpButton = utils.createInlineButton({
                icon: 'arrow_upward',
                label: 'Move up',
                title: 'Move up',
                onClick: () => moveEntry(index, -1)
            });
            moveUpButton.disabled = index === 0;
            header.appendChild(moveUpButton);

            const moveDownButton = utils.createInlineButton({
                icon: 'arrow_downward',
                label: 'Move down',
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
                value: entry.icon,
                helperText: 'Material Symbols name. Browse or type to filter.',
                onInput: (value) => {
                    const normalized = utils.trimString(value);
                    state.entries[index].icon = normalized;
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
                text: entry.icon || 'help'
            });
            iconPreview.dataset.empty = entry.icon ? 'false' : 'true';
            const syncIconPreview = (value) => {
                iconPreview.textContent = value || 'help';
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
                    state.entries[index].icon = '';
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
                    text: 'Select every category that applies (optional).'
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

            const tagsField = utils.createInputField({
                label: 'Tags (comma-separated)',
                value: entry.tags.join(', '),
                helperText: 'Used for search and grouping in the web workspace.',
                onInput: (value) => {
                    state.entries[index].tags = normalizeTags(value.split(','));
                    requestPreviewUpdate();
                }
            });
            fields.appendChild(tagsField.wrapper);

            let renderAnswerPreview = () => {};
            const answerField = utils.createTextareaField({
                label: 'Answer HTML',
                value: entry.answer,
                rows: 6,
                placeholder: '<p>Rich answer with paragraphs and lists...</p>',
                helperText: 'Provide the full response with HTML preserved as typed.',
                onInput: (value) => {
                    state.entries[index].answer = value;
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
                const sanitized = utils.sanitizeHtml(state.entries[index].answer || '');
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
                    const formatted = utils.prettifyHtmlFragment(state.entries[index].answer || '');
                    const nextValue = formatted || utils.trimString(state.entries[index].answer || '');
                    state.entries[index].answer = nextValue || '';
                    if (answerField.textarea) {
                        answerField.textarea.value = state.entries[index].answer;
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
            if (!Array.isArray(entries)) {
                return [];
            }
            return entries
                .map((entry) => normalizeEntry(entry))
                .map((entry) => {
                    const id = utils.trimString(entry.id);
                    const question = utils.trimString(entry.question);
                    const answer = typeof entry.answer === 'string' ? entry.answer : '';
                    if (!id || !question || !answer.trim()) {
                        return null;
                    }
                    const categories = sortCategories(entry.categories || []);
                    const icon = utils.trimString(entry.icon);
                    const tags = normalizeTags(entry.tags || []);
                    const payloadEntry = {
                        id,
                        question,
                        answer: answer
                    };
                    if (categories.length) {
                        payloadEntry.categories = categories;
                    }
                    payloadEntry.featured = Boolean(entry.featured);
                    if (icon) {
                        payloadEntry.icon = icon;
                    }
                    if (tags.length) {
                        payloadEntry.tags = tags;
                    }
                    return payloadEntry;
                })
                .filter(Boolean);
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
            merged.icon = incoming.icon || merged.icon || '';
            merged.featured = Boolean(incoming.featured || merged.featured);
            merged.answer = incoming.answer || merged.answer || '';
            merged.tags = normalizeTags([...(base.tags || []), ...(incoming.tags || [])]);
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
                const answer = typeof entry.answer === 'string' ? entry.answer.trim() : '';
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

        function buildCatalogPayload(form = catalogFormState) {
            const schemaVersion = utils.parseNumber(form?.schemaVersion, { fallback: 1 });
            const products = Array.isArray(form?.products) ? form.products : [];
            const normalizedProducts = products
                .map((product) => normalizeCatalogProduct(product))
                .map((product) => {
                    const name = utils.trimString(product.name);
                    const productId = utils.trimString(product.productId || product.key);
                    const key = utils.trimString(product.key || product.productId);
                    const questionSources = Array.isArray(product.questionSources)
                        ? product.questionSources
                              .map((source) => normalizeQuestionSource(source))
                              .filter((source) => utils.trimString(source.url))
                              .map((source) => {
                                  const url = utils.trimString(source.url);
                                  const category = utils.trimString(source.category);
                                  return category ? { url, category } : { url };
                              })
                        : [];
                    return {
                        name: name || key || productId,
                        productId,
                        key,
                        questionSources
                    };
                })
                .filter((product) => (product.productId || product.key) && product.questionSources.length);
            return {
                schemaVersion: Number.isFinite(schemaVersion) ? schemaVersion : 1,
                products: normalizedProducts
            };
        }

        function evaluateCatalogPayload(payload) {
            const errors = [];
            const warnings = [];
            if (!payload || typeof payload !== 'object') {
                return { errors: ['Catalog payload is missing.'], warnings };
            }
            const products = Array.isArray(payload.products) ? payload.products : [];
            if (!products.length) {
                errors.push('Add at least one product with a FAQ source.');
            }
            products.forEach((product, index) => {
                const productLabel = product.name || product.productId || `Product ${index + 1}`;
                if (!utils.trimString(product.productId) && !utils.trimString(product.key)) {
                    errors.push(`${productLabel} needs a productId or key.`);
                }
                const sources = Array.isArray(product.questionSources) ? product.questionSources : [];
                if (!sources.length) {
                    errors.push(`${productLabel} needs at least one question source.`);
                    return;
                }
                sources.forEach((source, sourceIndex) => {
                    if (!utils.trimString(source.url)) {
                        errors.push(`${productLabel} source ${sourceIndex + 1} is missing a URL.`);
                    }
                });
            });
            return { errors, warnings };
        }

        async function updateCatalogPreview() {
            if (!catalogPreviewArea) {
                return;
            }
            const result = await utils.renderJsonPreview({
                previewArea: catalogPreviewArea,
                statusElement: null,
                data: catalogFormState,
                buildPayload: buildCatalogPayload
            });
            if (result && typeof result === 'object') {
                lastCatalogPreviewState = result;
            } else {
                lastCatalogPreviewState = { success: false, payload: {} };
            }
            const payload = lastCatalogPreviewState.success ? lastCatalogPreviewState.payload || {} : {};
            lastCatalogEvaluation = evaluateCatalogPayload(payload);
            catalogState.products = mapCatalogProducts(payload);
            renderCatalogPicker(catalogState.products);
            applyCatalogValidation(payload);
        }

        const catalogPreviewTask = utils.createDeferredTask(updateCatalogPreview, {
            delay: 320,
            idle: true
        });

        function requestCatalogPreviewUpdate(options = {}) {
            const { immediate = false } = options;
            if (immediate) {
                return catalogPreviewTask.flush();
            }
            catalogPreviewTask.schedule();
            return undefined;
        }

        function applyCatalogValidation(payload) {
            if (!catalogValidationStatus) {
                return;
            }
            const errors = Array.isArray(lastCatalogEvaluation.errors) ? lastCatalogEvaluation.errors : [];
            if (!lastCatalogPreviewState.success) {
                utils.setValidationStatus(catalogValidationStatus, {
                    status: 'error',
                    message: 'Invalid catalog JSON output.'
                });
                return;
            }
            if (errors.length) {
                utils.setValidationStatus(catalogValidationStatus, {
                    status: 'error',
                    message: errors[0]
                });
                return;
            }
            const productCount = Array.isArray(payload.products) ? payload.products.length : 0;
            const label = productCount === 1 ? '1 product' : `${productCount} products`;
            utils.setValidationStatus(catalogValidationStatus, {
                status: 'success',
                message: `Valid catalog · ${label}`
            });
        }

        function updateWorkspacePulse(message) {
            if (!workspacePulseEl) {
                return;
            }
            workspacePulseEl.textContent = message;
        }

        function updateMetrics() {
            const total = state.entries.length;
            const featured = state.entries.filter((entry) => Boolean(entry.featured)).length;
            const withIcons = state.entries.filter((entry) => Boolean(utils.trimString(entry.icon))).length;
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

        function setCatalogStatus(message, status = 'info') {
            if (!catalogStatus) {
                return;
            }
            catalogStatus.textContent = message;
            catalogStatus.dataset.status = status;
        }

        function mapCatalogPayload(payload) {
            const schemaVersion = utils.parseNumber(payload?.schemaVersion, { fallback: 1 });
            const products = Array.isArray(payload?.products)
                ? payload.products.map((product) => normalizeCatalogProduct(product))
                : [createEmptyCatalogProduct()];
            return {
                schemaVersion: Number.isFinite(schemaVersion) ? schemaVersion : 1,
                products: products.length ? products : [createEmptyCatalogProduct()]
            };
        }

        function mapCatalogProducts(payload) {
            if (!payload || typeof payload !== 'object') {
                return [];
            }
            const products = Array.isArray(payload.products) ? payload.products : [];
            return products
                .map((product) => {
                    const key = typeof product.key === 'string' ? product.key : typeof product.productId === 'string' ? product.productId : '';
                    const sources = Array.isArray(product.questionSources)
                        ? product.questionSources.filter((source) => typeof source?.url === 'string')
                        : [];
                    return {
                        name: typeof product.name === 'string' ? product.name : key,
                        key,
                        productId: typeof product.productId === 'string' ? product.productId : key,
                        questionSources: sources
                    };
                })
                .filter((product) => Boolean(product.key || product.productId));
        }

        function findCatalogProduct(identifier) {
            const lookup = utils.trimString(identifier);
            if (!lookup) {
                return null;
            }
            return (
                catalogState.products.find((product) => product.key === lookup) ||
                catalogState.products.find((product) => product.productId === lookup) ||
                null
            );
        }

        function applyCatalogPayload(payload) {
            const mapped = mapCatalogPayload(payload);
            catalogFormState.schemaVersion = mapped.schemaVersion;
            catalogFormState.products = mapped.products;
            const preferredProduct = mapped.products[0];
            catalogState.selectedKey =
                preferredProduct?.key || preferredProduct?.productId || DEFAULT_PRODUCT_KEY;
            renderCatalogSchema();
            renderCatalogProducts();
            requestCatalogPreviewUpdate({ immediate: true });
            catalogState.loaded = true;
        }

        function resetCatalogForm() {
            catalogFormState.schemaVersion = 1;
            catalogFormState.products = [createEmptyCatalogProduct()];
            catalogState.selectedKey = DEFAULT_PRODUCT_KEY;
            renderCatalogSchema();
            renderCatalogProducts();
            requestCatalogPreviewUpdate({ immediate: true });
        }

        function getCatalogSourceLabel(source) {
            if (source === RELEASE_CATALOG_URL) {
                return 'release catalog';
            }
            return 'debug catalog';
        }

        function updateCatalogButton(product) {
            const key = product ? product.key || product.productId : '';
            catalogState.selectedKey = key;
            if (catalogButton) {
                catalogButton.dataset.faqProduct = key;
                catalogButton.disabled = !key;
            }
            if (catalogButtonLabel) {
                const sourceLabel = getCatalogSourceLabel(catalogState.source);
                catalogButtonLabel.textContent = product
                    ? `Fetch ${product.name} from the ${sourceLabel}`
                    : `Fetch selected product from the ${sourceLabel}`;
            }
        }

        function renderCatalogPicker(products = []) {
            if (!catalogSelectRoot) {
                return;
            }
            utils.clearElement(catalogSelectRoot);
            if (!products.length) {
                catalogSelectEl = null;
                updateCatalogButton(null);
                return;
            }
            const options = products.map((product) => ({
                value: product.key || product.productId,
                label: product.name || product.key
            }));
            const preferred = findCatalogProduct(catalogState.selectedKey || DEFAULT_PRODUCT_KEY) || products[0];
            const selectField = utils.createSelectField({
                label: 'Select product',
                value: preferred ? preferred.key || preferred.productId : '',
                options,
                onChange: (value) => {
                    const product = findCatalogProduct(value);
                    updateCatalogButton(product);
                }
            });
            catalogSelectEl = selectField.select;
            catalogSelectRoot.appendChild(selectField.wrapper);
            updateCatalogButton(preferred);
        }

        async function fetchCatalog(url = catalogState.source || DEFAULT_CATALOG_URL, { silent = false } = {}) {
            const resolved = utils.trimString(url) || catalogState.source || DEFAULT_CATALOG_URL;
            catalogState.source = resolved;
            if (!silent) {
                setCatalogStatus(`Loading ${getCatalogSourceLabel(resolved)}…`, 'loading');
            }
            try {
                const response = await fetch(resolved, { cache: 'no-store' });
                if (!response.ok) {
                    if (!silent) {
                        setCatalogStatus(`Request failed with status ${response.status}`, 'error');
                    }
                    return;
                }
                const text = await response.text();
                const parsed = utils.parseJson(text);
                const products = mapCatalogProducts(parsed);
                catalogState.products = products;
                catalogState.loaded = true;
                applyCatalogPayload(parsed);
                renderCatalogPicker(products);
                if (!silent) {
                    const helper = products.length
                        ? 'Select a product and fetch its merged FAQ modules.'
                        : 'Catalog loaded, but no products were found.';
                    setCatalogStatus(helper, products.length ? 'success' : 'warning');
                }
            } catch (error) {
                console.error('FaqBuilder: Failed to load FAQ catalog.', error);
                catalogState.loaded = false;
                if (!silent) {
                    setCatalogStatus('Unable to load the FAQ catalog. Check the URL and try again.', 'error');
                }
            }
        }

        async function fetchCatalogProduct(identifier, { silent = false } = {}) {
            const product = findCatalogProduct(identifier || catalogState.selectedKey || DEFAULT_PRODUCT_KEY);
            if (!product) {
                setCatalogStatus('Select a product from the catalog to fetch FAQs.', 'warning');
                return;
            }
            const sources = Array.isArray(product.questionSources)
                ? product.questionSources.filter((source) => typeof source?.url === 'string')
                : [];
            if (!sources.length) {
                setCatalogStatus('The selected product has no question sources yet.', 'warning');
                setFetchStatus('Add questionSources to the catalog entry, then try again.', 'warning');
                return;
            }
            if (!silent) {
                setCatalogStatus(`Fetching FAQs for ${product.name}…`, 'loading');
                setFetchStatus(`Loading FAQs for ${product.name}…`, 'loading');
            }
            const aggregated = [];
            for (const source of sources) {
                try {
                    const response = await fetch(source.url, { cache: 'no-store' });
                    if (!response.ok) {
                        console.warn('FaqBuilder: Failed to fetch FAQ module', source.url, response.status);
                        continue;
                    }
                    const text = await response.text();
                    const parsed = utils.parseJson(text);
                    let entries = await resolveEntriesFromDataset(parsed, response.url || source.url, { allowIndex: false });
                    if (source.category && Array.isArray(entries)) {
                        entries = entries.map((entry) => {
                            const normalized = normalizeEntry(entry);
                            if (!normalized.categories.length) {
                                normalized.categories = sortCategories([source.category]);
                            } else if (!normalized.categories.includes(source.category)) {
                                normalized.categories = sortCategories([...(normalized.categories || []), source.category]);
                            }
                            return normalized;
                        });
                    }
                    aggregated.push(...entries);
                } catch (error) {
                    console.error('FaqBuilder: Unable to fetch FAQ module.', error);
                }
            }
            if (!aggregated.length) {
                setCatalogStatus('No FAQs were returned for the selected product.', 'warning');
                setFetchStatus('No FAQs were returned for the selected product.', 'warning');
                return;
            }
            applyFaqEntries(mergeEntries(aggregated));
            setCatalogStatus(`Loaded ${aggregated.length} FAQs for ${product.name}.`, 'success');
            setFetchStatus(
                `Loaded ${aggregated.length} FAQs from ${getCatalogSourceLabel(catalogState.source)}.`,
                'success'
            );
        }

        function setIconStatus(message, status = 'info') {
            if (!iconStatus) {
                return;
            }
            iconStatus.textContent = message;
            iconStatus.dataset.status = status;
        }

        function parseIconCatalog(rawText) {
            if (typeof rawText !== 'string') {
                return [];
            }
            const sanitized = rawText.replace(/^\)]}'\n?/, '');
            try {
                const data = JSON.parse(sanitized);
                if (Array.isArray(data?.icons) && data.icons.length) {
                    return data.icons
                        .map((icon) => (typeof icon?.name === 'string' ? icon.name : ''))
                        .filter(Boolean);
                }
            } catch (error) {
                // Ignore JSON parse errors and fall back to text parsing.
            }
            return rawText
                .split('\n')
                .map((line) => {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) {
                        return '';
                    }
                    const [name] = trimmed.split(/\s+/);
                    return typeof name === 'string' ? name.trim() : '';
                })
                .filter(Boolean);
        }

        function normalizeIconNames(rawNames = []) {
            if (!Array.isArray(rawNames)) {
                return [];
            }
            const unique = new Set();
            rawNames.forEach((name) => {
                if (typeof name !== 'string') {
                    return;
                }
                const trimmed = utils.trimString(name);
                if (trimmed) {
                    unique.add(trimmed);
                }
            });
            return Array.from(unique).sort((a, b) => a.localeCompare(b));
        }

        async function loadIconCatalog() {
            for (const endpoint of ICON_CATALOG_ENDPOINTS) {
                try {
                    const response = await fetch(endpoint, { cache: 'no-store' });
                    if (!response.ok) {
                        throw new Error(`Icon request failed with status ${response.status}`);
                    }
                    const text = await response.text();
                    const names = parseIconCatalog(text);
                    if (Array.isArray(names) && names.length) {
                        return names;
                    }
                    console.warn('FaqBuilder: Icon catalog source returned no icon names.', endpoint);
                } catch (error) {
                    console.warn('FaqBuilder: Failed to load icon catalog source.', endpoint, error);
                }
            }
            throw new Error('All icon catalog sources failed.');
        }

        async function refreshIcons() {
            if (iconsRequested) {
                return;
            }
            iconsRequested = true;
            setIconStatus('Loading Material Symbols catalog…', 'loading');
            try {
                const catalogNames = await loadIconCatalog();
                iconNames = normalizeIconNames(catalogNames);
                populateIconOptions();
                if (iconCountEl) {
                    iconCountEl.textContent = String(iconNames.length);
                }
                setIconStatus('Material Symbols catalog loaded.', 'success');
            } catch (error) {
                console.error('FaqBuilder: Failed to load icon catalog.', error);
                iconNames = [];
                populateIconOptions();
                if (iconCountEl) {
                    iconCountEl.textContent = '0';
                }
                setIconStatus('Failed to load Material Symbols catalog.', 'error');
                iconsRequested = false;
            }
            renderIconPickerOptions(iconPickerSearch ? iconPickerSearch.value : '');
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
            const isLoadingIcons = iconsRequested && !iconNames.length;
            if (!iconNames.length) {
                if (iconPickerLoading) {
                    iconPickerLoading.hidden = !isLoadingIcons;
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
                void refreshIcons();
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
                entry.icon = normalized;
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

        if (catalogAddProductButton) {
            catalogAddProductButton.addEventListener('click', () => {
                catalogFormState.products.push(createEmptyCatalogProduct());
                renderCatalogProducts();
                requestCatalogPreviewUpdate();
            });
        }

        if (catalogResetButton) {
            catalogResetButton.addEventListener('click', () => {
                resetCatalogForm();
                setCatalogStatus('Catalog reset to defaults.', 'info');
            });
        }

        if (catalogButton) {
            catalogButton.addEventListener('click', () => {
                const selectedKey = catalogButton.dataset.faqProduct || catalogState.selectedKey || '';
                void fetchCatalogProduct(selectedKey);
            });
        }

        if (catalogPresetButtons.length) {
            catalogPresetButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const preset = button.dataset.faqCatalogPreset;
                    const source = preset === 'release' ? RELEASE_CATALOG_URL : DEBUG_CATALOG_URL;
                    catalogState.source = source;
                    setCatalogStatus(`Loading ${getCatalogSourceLabel(source)}…`, 'loading');
                    void fetchCatalog(source);
                });
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

        if (catalogCopyButton && catalogPreviewArea) {
            catalogCopyButton.addEventListener('click', async () => {
                await utils.copyToClipboard(catalogPreviewArea.value || '');
                flashButton(
                    catalogCopyButton,
                    '<span class="material-symbols-outlined">check</span><span>Copied</span>'
                );
            });
        }

        if (catalogDownloadButton) {
            catalogDownloadButton.addEventListener('click', () => {
                const payload = buildCatalogPayload(catalogFormState);
                utils.downloadJson('faq_catalog.json', utils.formatJson(payload));
            });
        }

        if (refreshIconsButton) {
            refreshIconsButton.addEventListener('click', () => {
                iconsRequested = false;
                void refreshIcons();
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

        renderCatalogSchema();
        renderCatalogProducts();
        requestCatalogPreviewUpdate({ immediate: true });
        render();
        void refreshIcons();
        fetchCatalog(DEFAULT_CATALOG_URL).then(() => {
            const product = findCatalogProduct(DEFAULT_PRODUCT_KEY);
            if (product) {
                void fetchCatalogProduct(product.key || product.productId, { silent: true });
            }
        });
    }

    global.initFaqWorkspace = initFaqWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
