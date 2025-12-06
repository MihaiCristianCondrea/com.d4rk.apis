import {probeImage} from '@/services/appToolkit/imageProbeService.js';
import {formatAspectRatio, formatDimensionLabel, normalizeImageUrl} from '@/app/workspaces/appToolkit/domain/images.js';

const styleHref = new URL('../../../styles/appToolkit/screenshot-field.css', import.meta.url);

const template = document.createElement('template');
template.innerHTML = `
  <div class="actions" part="actions">
    <slot name="drag">
      <md-icon-button class="drag-handle" aria-label="Reorder screenshot" part="drag-handle">
        <span class="material-symbols-outlined">drag_indicator</span>
      </md-icon-button>
    </slot>
    <div class="actions-end" part="actions-end">
      <md-icon-button class="remove-button" aria-label="Remove screenshot" part="remove-button">
        <span class="material-symbols-outlined">delete</span>
      </md-icon-button>
    </div>
  </div>
  <div class="thumbnail" data-state="empty" part="thumbnail">
    <img
      part="image"
      alt=""
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
    />
  </div>
  <div class="info" part="info">
    <md-outlined-text-field class="input" label="Screenshot" placeholder="https://example.com/screenshot.png" part="input"></md-outlined-text-field>
    <div class="meta" data-state="info" part="meta">
      <span class="meta__hint" part="meta-hint">Drop an image or paste a URL to preview size.</span>
    </div>
  </div>
`;

export class AppToolkitScreenshotField extends HTMLElement {
  static get observedAttributes() {
    return ['value'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = styleHref;

    const iconStyle = document.createElement('style');
    iconStyle.textContent = `
      .material-symbols-outlined {
        font-family:
          var(--material-symbols-font, 'Material Symbols Outlined'),
          'Material Symbols Outlined', sans-serif;
        font-weight: normal;
        font-style: normal;
        font-size: 20px;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        font-feature-settings: 'liga';
        -webkit-font-feature-settings: 'liga';
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      }
    `;

    this.shadowRoot.append(link, iconStyle, template.content.cloneNode(true));

    this._input = this.shadowRoot.querySelector('.input');
    this._thumbnail = this.shadowRoot.querySelector('.thumbnail');
    this._image = this.shadowRoot.querySelector('img');
    this._meta = this.shadowRoot.querySelector('.meta');
    this._removeButton = this.shadowRoot.querySelector('.remove-button');

    this._value = '';
    this._position = 1;
    this._appName = '';
    this._metaController = null;
  }

  connectedCallback() {
    this.classList.add('screenshot-item');
    this.setAttribute('role', 'listitem');
    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = -1;
    }

    if (this._input) {
      this._input.addEventListener('input', this._handleInput);
    }
    if (this._removeButton) {
      this._removeButton.addEventListener('click', this._handleRemove);
    }
    this._syncFromAttributes();
  }

  disconnectedCallback() {
    if (this._input) {
      this._input.removeEventListener('input', this._handleInput);
    }
    if (this._removeButton) {
      this._removeButton.removeEventListener('click', this._handleRemove);
    }
    this._abortMetaProbe();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'value' && oldValue !== newValue) {
      this.value = newValue;
    }
  }

  get value() {
    return this._value;
  }

  set value(next) {
    const normalized = normalizeImageUrl(next);
    if (this._value === normalized) {
      return;
    }
    this._value = normalized;
    if (this._input && this._input.value !== normalized) {
      this._input.value = normalized;
    }
    void this._refreshPreview();
  }

  get position() {
    return this._position;
  }

  set position(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return;
    }
    this._position = Math.max(1, numeric);
    this._updateLabel();
  }

  get appName() {
    return this._appName;
  }

  set appName(value) {
    this._appName = value ? String(value) : '';
    this._updateLabel();
  }

  get meta() {
    return null;
  }

  set meta(meta) {
    if (meta && meta.width && meta.height) {
      this._setMeta({ width: meta.width, height: meta.height, state: meta.state || 'info' });
    } else {
      this._setMeta(null);
    }
  }

  _handleInput = (event) => {
    this.value = event.target.value;
    this.dispatchEvent(
      new CustomEvent('screenshot-change', {
        detail: { value: this._value },
        bubbles: true,
        composed: true,
      })
    );
  };

  _handleRemove = (event) => {
    event?.stopPropagation?.();
    this.dispatchEvent(
      new CustomEvent('screenshot-remove', {
        detail: { value: this._value, position: this._position },
        bubbles: true,
        composed: true,
      })
    );
  };

  _updateLabel() {
    if (this._input) {
      const label = `Screenshot ${this._position}`;
      this._input.label = label;
      this._input.setAttribute('label', label);
    }
    if (this._image) {
      const base = `Screenshot ${this._position}`;
      this._image.alt = this._appName ? `${base} · ${this._appName}` : base;
    }
  }

  _syncFromAttributes() {
    if (this.hasAttribute('data-position')) {
      this.position = Number(this.getAttribute('data-position')) || 1;
    }
    if (this.hasAttribute('data-app-name')) {
      this.appName = this.getAttribute('data-app-name');
    }
    if (this.hasAttribute('value')) {
      this.value = this.getAttribute('value');
    }
  }

  _setThumbnailState(state) {
    if (this._thumbnail) {
      this._thumbnail.dataset.state = state;
    }
  }

  _setMeta(meta, { error } = {}) {
    if (this._meta) {
      if (meta && meta.width && meta.height) {
        this._meta.dataset.state = meta.state || 'info';
        this._meta.textContent = formatDimensionLabel(meta);
      } else if (error) {
        this._meta.dataset.state = 'error';
        this._meta.textContent = error;
      } else {
        this._meta.dataset.state = 'info';
        this._meta.textContent = 'Drop an image or paste a URL to preview size.';
      }
    }
    if (meta && meta.width && meta.height) {
      this.style.setProperty('--app-toolkit-thumb-aspect', `${meta.width} / ${meta.height}`);
    } else {
      this.style.removeProperty('--app-toolkit-thumb-aspect');
    }
    const detailMeta = meta && meta.width && meta.height
      ? { width: meta.width, height: meta.height, ratio: formatAspectRatio(meta.width, meta.height) }
      : null;
    this.dispatchEvent(
      new CustomEvent('screenshot-meta', {
        detail: { meta: detailMeta },
        bubbles: true,
        composed: true,
      })
    );
  }

  _abortMetaProbe() {
    if (this._metaController) {
      this._metaController.abort();
      this._metaController = null;
    }
  }

  async _refreshPreview() {
    this._abortMetaProbe();
    const url = this._value;
    if (!url) {
      this._setThumbnailState('empty');
      this._image?.removeAttribute('src');
      this._setMeta(null);
      return;
    }
    this._setThumbnailState('loading');
    const controller = new AbortController();
    this._metaController = controller;
    try {
      const meta = await probeImage(url, { signal: controller.signal });
      if (controller.signal.aborted) {
        return;
      }
      if (this._image) {
        this._image.src = url;
      }
      this._setThumbnailState('ready');
      this._setMeta({ width: meta.width, height: meta.height });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      this._image?.removeAttribute('src');
      this._setThumbnailState('error');
      this._setMeta(null, { error: error.message || 'Preview unavailable — check the link.' });
    } finally {
      if (this._metaController === controller) {
        this._metaController = null;
      }
    }
  }
}

customElements.define('app-toolkit-screenshot-field', AppToolkitScreenshotField);

export function createScreenshotField({
  appIndex,
  screenshotIndex,
  value = '',
  appName = '',
  onChange,
  onRemove,
  onMeta,
}) {
  const element = document.createElement('app-toolkit-screenshot-field');
  element.dataset.appIndex = String(appIndex);
  element.dataset.screenshotIndex = String(screenshotIndex);
  element.dataset.position = String(screenshotIndex + 1);
  element.dataset.appName = appName || '';
  element.position = screenshotIndex + 1;
  element.appName = appName || '';
  element.value = value || '';
  element.draggable = true;
  element.tabIndex = -1;

  if (typeof onChange === 'function') {
    element.addEventListener('screenshot-change', (event) => {
      onChange(event.detail?.value ?? '');
    });
  }

  if (typeof onRemove === 'function') {
    element.addEventListener('screenshot-remove', (event) => {
      onRemove(event.detail?.value ?? '');
    });
  }

  if (typeof onMeta === 'function') {
    element.addEventListener('screenshot-meta', (event) => {
      onMeta(event.detail?.meta || null);
    });
  }

  return element;
}
