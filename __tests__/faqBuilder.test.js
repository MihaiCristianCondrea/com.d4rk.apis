const fs = require('fs');
const path = require('path');

const layout = fs.readFileSync(
  path.join(__dirname, '../app/src/main/res/layout/workspaces/faq/faq.html'),
  'utf8',
);

/**
 * Creates a lightweight ApiBuilderUtils stub for FAQ workspace tests.
 * @returns {Record<string, unknown>} Mocked utility surface.
 */
function createUtilsStub() {
    const createElement = (tag, { classNames = [], attrs = {}, text = '' } = {}) => {
        const el = document.createElement(tag);
        const classes = Array.isArray(classNames) ? classNames : [classNames];
        const normalized = [];
        classes
            .filter(Boolean)
            .forEach((cls) => {
                if (typeof cls === 'string') {
                    normalized.push(...cls.split(/\s+/).filter(Boolean));
                }
            });
        normalized.forEach((cls) => el.classList.add(cls));
        Object.entries(attrs).forEach(([key, value]) => {
            if (value !== undefined) {
                el.setAttribute(key, value);
            }
        });
        if (text) {
            el.textContent = text;
        }
        return el;
    };

    const createInputField = ({ label, value = '', type = 'text', placeholder = '', onInput = () => {}, helperText = '' }) => {
        const wrapper = createElement('label', { classNames: 'api-field' });
        if (label) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-label', text: label }));
        }
        const input = createElement('input', { classNames: 'api-input', attrs: { type, value, placeholder } });
        input.addEventListener('input', (event) => onInput(event.target.value));
        wrapper.appendChild(input);
        if (helperText) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-helper', text: helperText }));
        }
        return { wrapper, input };
    };

    const createTextareaField = ({ label, value = '', rows = 3, placeholder = '', onInput = () => {}, helperText = '' }) => {
        const wrapper = createElement('label', { classNames: 'api-field api-field-textarea' });
        if (label) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-label', text: label }));
        }
        const textarea = createElement('textarea', {
            classNames: 'api-textarea',
            attrs: { rows, placeholder },
            text: value
        });
        textarea.addEventListener('input', (event) => onInput(event.target.value));
        wrapper.appendChild(textarea);
        if (helperText) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-helper', text: helperText }));
        }
        return { wrapper, textarea };
    };

    const createSelectField = ({ label, value = '', options = [], onChange = () => {} }) => {
        const wrapper = createElement('label', { classNames: 'api-field' });
        if (label) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-label', text: label }));
        }
        const select = createElement('select', { classNames: 'api-select' });
        options.forEach((option) => {
            const optionEl = createElement('option', { attrs: { value: option.value }, text: option.label });
            if (option.value === value) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });
        select.value = value;
        select.addEventListener('change', (event) => onChange(event.target.value));
        wrapper.appendChild(select);
        return { wrapper, select };
    };

    const createInlineButton = ({ label = '', icon = '', onClick = () => {}, variant = 'ghost', title = '' }) => {
        const button = createElement('button', {
            classNames: ['api-inline-button', `variant-${variant}`],
            attrs: { type: 'button', title }
        });
        if (icon) {
            button.appendChild(createElement('span', { classNames: ['material-symbols-outlined', 'api-inline-icon'], text: icon }));
        }
        if (label) {
            button.appendChild(createElement('span', { text: label }));
        }
        button.addEventListener('click', onClick);
        return button;
    };

    return {
        createElement,
        clearElement: (el) => {
            while (el?.firstChild) {
                el.removeChild(el.firstChild);
            }
        },
        formatJson: (value) => JSON.stringify(value, null, 2),
        parseJson: (value) => JSON.parse(value),
        prettifyHtmlFragment: (value) => (typeof value === 'string' ? value.trim() : ''),
        sanitizeHtml: (value) => (typeof value === 'string' ? value : ''),
        copyToClipboard: jest.fn(() => Promise.resolve()),
        downloadJson: jest.fn(),
        readFileAsText: jest.fn(),
        createInputField,
        createTextareaField,
        createSelectField,
        createInlineButton,
        attachFilePicker: (button, _input, callback) => {
            button.addEventListener('click', () => {
                if (typeof global.__mockFileContent === 'string') {
                    callback(global.__mockFileContent);
                }
            });
        },
        parseNumber: (value, { fallback = 0 } = {}) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        },
        normalizeArray: (value) => (Array.isArray(value) ? value : []),
        trimString: (value) => (typeof value === 'string' ? value.trim() : ''),
        cloneJson: (value) => JSON.parse(JSON.stringify(value)),
        setValidationStatus: (element, { status, message }) => {
            if (!element) return;
            element.textContent = message;
            element.dataset.state = status;
        },
        renderJsonPreview: async ({ previewArea, data, buildPayload }) => {
            const payload = buildPayload ? buildPayload(data) : data;
            if (previewArea) {
                previewArea.value = JSON.stringify(payload, null, 2);
            }
            return { success: true, payload };
        },
        createDeferredTask: (task) => ({
            schedule: (...args) => task(...args),
            flush: (...args) => Promise.resolve(task(...args)),
            cancel: () => {}
        }),
        createIdleTask: (task) => ({
            schedule: (...args) => task(...args),
            flush: (...args) => Promise.resolve(task(...args)),
            cancel: () => {}
        })
    };
}

const sampleCatalog = {
    schemaVersion: 1,
    products: [
        {
            name: 'Sample App',
            key: 'sample_app',
            productId: 'sample.app',
            questionSources: [
                {
                    url: 'https://example.com/questions/sample.json',
                    category: 'Sample Category'
                }
            ]
        }
    ]
};

const sampleFaqModule = [
    { id: 'catalog-faq', question: 'Catalog question', answer: '<p>Catalog answer</p>' }
];

function mockResponse(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
    };
}

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('FAQ workspace builder', () => {
    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = layout;
        if (!Element.prototype.scrollIntoView) {
            Element.prototype.scrollIntoView = jest.fn();
        }
        window.scrollTo = jest.fn();
        global.renderWorkspaceInsightCards = () => {
            ['faqTotalCount', 'faqFeaturedCount', 'faqIconCoverage'].forEach((id) => {
                const el = document.createElement('span');
                el.id = id;
                document.body.appendChild(el);
            });
        };
        global.__APP_CONFIG__ = {};
        global.ApiBuilderUtils = createUtilsStub();
        global.fetch = jest.fn((url) => {
            if (String(url).includes('catalog.json')) {
                return Promise.resolve(mockResponse(sampleCatalog));
            }
            if (String(url).includes('sample.json')) {
                return Promise.resolve(mockResponse(sampleFaqModule));
            }
            if (String(url).includes('material')) {
                return Promise.resolve(mockResponse('bolt\nsailing\napps'));
            }
            return Promise.resolve(mockResponse('[]'));
        });
        // Change Rationale: The FAQ workspace entrypoint now lives under the Help feature tree,
        // so tests load HelpActivity to reflect the canonical module location.
        require('../app/src/main/js/app/help/ui/HelpActivity.js');
        global.initFaqWorkspace();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete global.ApiBuilderUtils;
        delete global.__APP_CONFIG__;
        delete global.__mockFileContent;
    });

    test('adding and removing entries updates counts and validation', async () => {
        const idInput = document.querySelector('#faqEntries .api-input');
        const questionInput = document.querySelectorAll('#faqEntries .api-input')[1];
        const answerTextarea = document.querySelector('#faqEntries textarea.api-textarea');
        idInput.value = 'faq-1';
        idInput.dispatchEvent(new Event('input', { bubbles: true }));
        questionInput.value = 'Why is the sky blue?';
        questionInput.dispatchEvent(new Event('input', { bubbles: true }));
        answerTextarea.value = '<p>Rayleigh scattering</p>';
        answerTextarea.dispatchEvent(new Event('input', { bubbles: true }));

        await flushAsync();

        expect(document.getElementById('faqValidation').dataset.state).toBe('success');

        const addButton = document.getElementById('faqAddEntry');
        addButton.click();
        await flushAsync();
        expect(document.getElementById('faqTotalCount').textContent).toBe('2');

        const removeButtons = document.querySelectorAll('.api-inline-button.variant-danger');
        removeButtons[removeButtons.length - 1].click();
        await flushAsync();
        expect(document.getElementById('faqTotalCount').textContent).toBe('1');
    });

    test('importing JSON populates the builder and live preview', async () => {
        global.__mockFileContent = JSON.stringify([
            {
                id: 'imported',
                question: 'Imported question',
                answer: '<p>Imported answer</p>',
                categories: ['custom_import']
            }
        ]);
        document.getElementById('faqImportButton').click();
        await flushAsync();

        const cards = document.querySelectorAll('#faqEntries .builder-card');
        expect(cards.length).toBe(1);
        const questionInputs = Array.from(document.querySelectorAll('input.api-input')).map((el) => el.value);
        expect(questionInputs).toContain('Imported question');
        expect(document.getElementById('faqLivePreviewList').children.length).toBe(1);
    });

    test('switching FAQ panels updates tabbed navigation state', () => {
        const panelButtons = document.querySelectorAll('[data-faq-panel-control]');
        const catalogPanel = document.getElementById('faqPanelCatalog');
        const faqPanel = document.getElementById('faqPanelFaq');

        expect(panelButtons.length).toBe(2);
        expect(panelButtons[0].classList.contains('active')).toBe(true);
        expect(panelButtons[0].getAttribute('aria-selected')).toBe('true');
        expect(catalogPanel.hasAttribute('hidden')).toBe(false);
        expect(faqPanel.hasAttribute('hidden')).toBe(true);

        panelButtons[1].click();

        expect(panelButtons[0].classList.contains('active')).toBe(false);
        expect(panelButtons[1].classList.contains('active')).toBe(true);
        expect(panelButtons[1].getAttribute('aria-selected')).toBe('true');
        expect(catalogPanel.hasAttribute('hidden')).toBe(true);
        expect(faqPanel.hasAttribute('hidden')).toBe(false);
    });

    test('icon picker selection writes to the entry', async () => {
        const browseButton = document.querySelector('.faq-icon-button');
        browseButton.click();
        await flushAsync();
        const iconOption = document.querySelector('#faqIconPickerList button');
        iconOption.click();
        const iconInput = document.querySelector('input[list="faqIconOptions"]');
        const chosenIcon = iconOption.getAttribute('data-icon-name') || iconOption.textContent;
        expect(iconInput.value).toBe(chosenIcon);
        const iconPreview = document.querySelector('.faq-icon-preview');
        expect(iconPreview.textContent).toBe(chosenIcon);
    });

    test('catalog fetch toggles status messages', async () => {
        const releasePreset = document.querySelector('[data-faq-catalog-preset="release"]');
        releasePreset.click();
        await flushAsync();
        expect(document.getElementById('faqCatalogStatus').textContent).toContain('Select a product');

        document.getElementById('faqCatalogFetchButton').click();
        await flushAsync();
        expect(document.getElementById('faqCatalogStatus').textContent).toContain('Loaded');
        expect(document.getElementById('faqFetchStatus').textContent).toContain('Loaded');
    });
});
