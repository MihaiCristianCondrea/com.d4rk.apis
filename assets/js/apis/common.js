(function (global) {
    const noop = () => {};

    function createElement(tag, { classNames = [], attrs = {}, text = '' } = {}) {
        const el = document.createElement(tag);
        if (typeof classNames === 'string') {
            el.className = classNames; /*FIXME: Assigned expression type any[] is not assignable to type string */
        } else if (Array.isArray(classNames) && classNames.length) {
            el.className = classNames.join(' ');
        }
        Object.entries(attrs).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }
            if (key === 'dataset' && value && typeof value === 'object') {
                Object.entries(value).forEach(([dataKey, dataValue]) => { /*FIXME: Argument type unknown is not assignable to parameter type { [p: string]: unknown } | ArrayLike<unknown>  Type unknown is not assignable to type ArrayLike<unknown> */
                    if (dataValue !== undefined && dataValue !== null) {
                        el.dataset[dataKey] = dataValue; /*FIXME: Assigned expression type unknown is not assignable to type string */
                    }
                });
                return;
            }
            if (key in el) {
                el[key] = value;
            } else {
                el.setAttribute(key, value);
            }
        });
        if (text) {
            el.textContent = text;
        }
        return el;
    }

    function clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function formatJson(data) {
        try {
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('ApiBuilderUtils: Failed to stringify JSON.', error);
            return '';
        }
    }

    function parseJson(input) {
        if (input === undefined || input === null) {
            throw new Error('JSON input is empty.');
        }
        if (typeof input === 'object') {
            return input;
        }
        const text = String(input).trim();
        if (!text) {
            throw new Error('JSON input is empty.');
        }
        const sanitized = text.replace(/^\uFEFF/, '');
        try {
            return JSON.parse(sanitized);
        } catch (error) {
            console.error('ApiBuilderUtils: Invalid JSON provided.', error);
            throw new Error('Invalid JSON format.');
        }
    }

    function prettifyJsonString(input) {
        const parsed = parseJson(input);
        const formatted = formatJson(parsed);
        if (!formatted) {
            throw new Error('Unable to format JSON string.');
        }
        return formatted;
    }

    function sanitizeHtml(input) {
        if (typeof input !== 'string') {
            return '';
        }
        const template = document.createElement('template');
        template.innerHTML = input;
        const disallowedTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'template']);
        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT, null);
        const toRemove = [];
        while (walker.nextNode()) {
            const element = walker.currentNode;
            const tagName = element.tagName.toLowerCase();
            if (disallowedTags.has(tagName)) {
                toRemove.push(element);
                continue;
            }
            Array.from(element.attributes).forEach((attribute) => {
                const name = attribute.name.toLowerCase();
                const value = attribute.value || '';
                if (name.startsWith('on')) {
                    element.removeAttribute(attribute.name);
                    return;
                }
                if ((name === 'href' || name === 'src' || name === 'srcset') && value.trim()) {
                    const safePattern = /^(https?:|mailto:|tel:|#)/i;
                    if (!safePattern.test(value.trim())) {
                        element.removeAttribute(attribute.name);
                    }
                }
            });
        }
        toRemove.forEach((element) => element.remove());
        return template.innerHTML.trim();
    }

    function prettifyHtmlFragment(input) {
        if (typeof input !== 'string') {
            return '';
        }
        const sanitized = sanitizeHtml(input);
        if (!sanitized) {
            return '';
        }
        const template = document.createElement('template');
        template.innerHTML = sanitized;
        const voidElements = new Set([
            'area',
            'base',
            'br',
            'col',
            'embed',
            'hr',
            'img',
            'input',
            'link',
            'meta',
            'source',
            'track',
            'wbr'
        ]);
        const lines = [];
        const indent = (depth) => '  '.repeat(depth);
        const serialize = (node, depth) => {
            if (!node) {
                return;
            }
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (!text) {
                    return;
                }
                const trimmed = text.replace(/\s+/g, ' ').trim();
                if (trimmed) {
                    lines.push(`${indent(depth)}${trimmed}`);
                }
                return;
            }
            if (node.nodeType === Node.COMMENT_NODE) {
                const text = node.textContent ? node.textContent.trim() : '';
                if (text) {
                    lines.push(`${indent(depth)}<!-- ${text} -->`);
                }
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }
            const tag = node.tagName.toLowerCase();
            const attributes = Array.from(node.attributes)
                .map((attribute) => `${attribute.name}="${attribute.value}"`)
                .join(' ');
            const openingTag = attributes ? `<${tag} ${attributes}>` : `<${tag}>`;
            if (voidElements.has(tag)) {
                lines.push(`${indent(depth)}${openingTag}`);
                return;
            }
            lines.push(`${indent(depth)}${openingTag}`);
            Array.from(node.childNodes).forEach((child) => serialize(child, depth + 1));
            lines.push(`${indent(depth)}</${tag}>`);
        };
        Array.from(template.content.childNodes).forEach((child) => serialize(child, 0));
        return lines.join('\n');
    }

    async function copyToClipboard(text) {
        if (!navigator.clipboard) {
            fallbackCopy(text);
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.warn('ApiBuilderUtils: Clipboard API failed, falling back to execCommand.', error);
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textarea = createElement('textarea', { classNames: 'sr-only', attrs: { value: text } });
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (error) {
            console.error('ApiBuilderUtils: copy command failed.', error);
        }
        document.body.removeChild(textarea);
    }

    function downloadJson(filename, jsonString) {
        try {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = createElement('a', {
                attrs: {
                    href: url,
                    download: filename
                }
            });
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('ApiBuilderUtils: Failed to download JSON.', error);
        }
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Unable to read file.'));
            reader.onload = () => resolve(reader.result);
            reader.readAsText(file);
        });
    }

    function createInputField({
        label,
        value = '',
        type = 'text',
        placeholder = '',
        onInput = noop,
        helperText = ''
    }) {
        const wrapper = createElement('label', { classNames: 'api-field' });
        if (label) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-label', text: label }));
        }
        const input = createElement('input', {
            classNames: 'api-input',
            attrs: {
                type,
                value,
                placeholder
            }
        });
        input.addEventListener('input', (event) => onInput(event.target.value));
        wrapper.appendChild(input);
        if (helperText) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-helper', text: helperText }));
        }
        return { wrapper, input };
    }

    function createTextareaField({
        label,
        value = '',
        rows = 3,
        placeholder = '',
        onInput = noop,
        helperText = ''
    }) {
        const wrapper = createElement('label', { classNames: 'api-field api-field-textarea' });
        if (label) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-label', text: label }));
        }
        const textarea = createElement('textarea', {
            classNames: 'api-textarea',
            attrs: {
                rows,
                placeholder
            },
            text: value
        });
        textarea.addEventListener('input', (event) => onInput(event.target.value));
        wrapper.appendChild(textarea);
        if (helperText) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-helper', text: helperText }));
        }
        return { wrapper, textarea };
    }

    function createSelectField({ label, value = '', options = [], onChange = noop }) {
        const wrapper = createElement('label', { classNames: 'api-field' });
        if (label) {
            wrapper.appendChild(createElement('span', { classNames: 'api-field-label', text: label }));
        }
        const select = createElement('select', { classNames: 'api-select' });
        options.forEach((option) => {
            const optionEl = createElement('option', {
                attrs: { value: option.value },
                text: option.label
            });
            if (option.value === value) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });
        select.addEventListener('change', (event) => onChange(event.target.value));
        wrapper.appendChild(select);
        return { wrapper, select };
    }

    function createInlineButton({ label, icon = null, onClick = noop, variant = 'ghost', title = '' }) {
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
    }

    function attachFilePicker(button, input, callback) {
        if (!button || !input) {
            return;
        }
        button.addEventListener('click', () => input.click());
        input.addEventListener('change', async () => {
            if (!input.files || input.files.length === 0) {
                return;
            }
            const file = input.files[0];
            try {
                const content = await readFileAsText(file);
                callback(content);
            } catch (error) {
                console.error('ApiBuilderUtils: Failed to import JSON.', error);
                alert('Could not read the selected file.');
            } finally {
                input.value = '';
            }
        });
    }

    function parseNumber(value) {
        if (value === '' || value === null || value === undefined) {
            return undefined;
        }
        const number = Number(value);
        return Number.isFinite(number) ? number : undefined;
    }

    function normalizeArray(value) {
        if (!value) {
            return [];
        }
        if (Array.isArray(value)) {
            return value;
        }
        return [value];
    }

    function trimString(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function cloneJson(value) {
        if (value === null || typeof value !== 'object') {
            return value;
        }
        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(value);
            } catch (error) {
                console.warn('ApiBuilderUtils: structuredClone failed, falling back to JSON clone.', error);
            }
        }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            console.error('ApiBuilderUtils: Failed to clone JSON value.', error);
            return value;
        }
    }

    function setValidationStatus(element, { status = 'success', message = '' } = {}) {
        if (!element) {
            return;
        }
        element.dataset.status = status;
        element.innerHTML = '';
        if (!message) {
            return;
        }
        const icon =
            status === 'success'
                ? 'check_circle'
                : status === 'warning'
                    ? 'info'
                    : 'error';
        element.appendChild(
            createElement('span', {
                classNames: ['material-symbols-outlined'],
                text: icon
            })
        );
        element.appendChild(createElement('span', { text: message }));
    }

    async function renderJsonPreview({
        previewArea,
        statusElement,
        data,
        buildPayload,
        autoFix,
        validator,
        successMessage = 'Valid JSON',
        errorMessage = 'Invalid JSON output.'
    }) {
        if (!previewArea) {
            return { success: false };
        }
        const previousValue = previewArea.value;
        const workerClient = global.jsonWorkerClient;
        try {
            let payload = buildPayload ? buildPayload(data) : data;
            if (payload && typeof payload === 'object') {
                payload = cloneJson(payload);
            }
            if (autoFix) {
                const result = autoFix(payload);
                if (result !== undefined) {
                    payload = result;
                }
            }
            if (validator) {
                const result = validator(payload);
                if (result !== undefined) {
                    payload = result;
                }
            }

            let formatted;
            if (workerClient && typeof workerClient.stringify === 'function') {
                formatted = await workerClient.stringify(payload ?? {});
            } else {
                try {
                    formatted = JSON.stringify(payload ?? {}, null, 2);
                } catch (error) {
                    console.error('ApiBuilderUtils: Failed to format JSON preview.', error);
                    throw new Error('Unable to format JSON preview.');
                }
            }

            previewArea.value = formatted;
            if (statusElement) {
                const message =
                    typeof successMessage === 'function'
                        ? successMessage(payload)
                        : successMessage;
                setValidationStatus(statusElement, {
                    status: 'success',
                    message: message || 'Valid JSON'
                });
            }
            return { success: true, payload };
        } catch (error) {
            console.error('ApiBuilderUtils: Unable to update JSON preview.', error);
            if (statusElement) {
                setValidationStatus(statusElement, {
                    status: 'error',
                    message: error.message || errorMessage
                });
            }
            previewArea.value = previousValue;
            return { success: false, error };
        }
    }

    global.ApiBuilderUtils = {
        createElement,
        clearElement,
        formatJson,
        parseJson,
        prettifyJsonString,
        sanitizeHtml,
        prettifyHtmlFragment,
        copyToClipboard,
        downloadJson,
        readFileAsText,
        createInputField,
        createTextareaField,
        createSelectField,
        createInlineButton,
        attachFilePicker,
        parseNumber,
        normalizeArray,
        trimString,
        cloneJson,
        setValidationStatus,
        renderJsonPreview
    };
})(typeof window !== 'undefined' ? window : globalThis);
