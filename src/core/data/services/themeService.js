import { MEDIA_QUERY, STORAGE_KEYS } from '../../domain/constants.js';

const THEME_DATA_ATTR = 'data-theme';
const THEME_OPTIONS = ['light', 'dark', 'auto'];

/**
 * Reads the persisted theme preference from storage.
 *
 * @param {{ getItem: (key: string) => string | null } | null} [storage=globalThis.localStorage] Storage adapter.
 * @returns {'light'|'dark'|'auto'} Persisted theme or `auto` fallback.
 */
export function readStoredTheme(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return 'auto';
  }
  const stored = storage.getItem(STORAGE_KEYS.theme) || 'auto';
  return THEME_OPTIONS.includes(stored) ? stored : 'auto';
}

/**
 * Persists a theme preference into storage.
 *
 * @param {'light'|'dark'|'auto'} theme Theme value to persist.
 * @param {{ setItem: (key: string, value: string) => void } | null} [storage=globalThis.localStorage] Storage adapter.
 * @returns {void}
 */
export function persistTheme(theme, storage = globalThis.localStorage) {
  if (!storage || typeof storage.setItem !== 'function' || !THEME_OPTIONS.includes(theme)) {
    return;
  }
  storage.setItem(STORAGE_KEYS.theme, theme);
}

/**
 * Resolves whether dark mode should be active for a given explicit theme value.
 *
 * @param {'light'|'dark'|'auto'} explicitTheme Theme mode.
 * @param {boolean} [prefersDark=false] System dark-mode preference.
 * @returns {boolean} `true` when dark mode should be applied.
 */
export function isDarkPreferred(explicitTheme, prefersDark = false) {
  if (explicitTheme === 'dark') return true;
  if (explicitTheme === 'light') return false;
  return Boolean(prefersDark);
}

/**
 * Applies the theme state to a provided html element.
 *
 * @param {HTMLElement | null} htmlElement HTML root element.
 * @param {'light'|'dark'|'auto'} theme Theme value.
 * @param {boolean} [prefersDark=false] System dark-mode preference.
 * @returns {void}
 */
export function applyThemeClass(htmlElement, theme, prefersDark = false) {
  if (!htmlElement) return;
  const shouldUseDark = isDarkPreferred(theme, prefersDark);
  htmlElement.classList.toggle('dark', shouldUseDark);
  htmlElement.setAttribute(THEME_DATA_ATTR, theme);
}

/**
 * Synchronizes theme button state for ARIA and selected styling.
 *
 * @param {HTMLElement[]} buttons Theme buttons.
 * @param {'light'|'dark'|'auto'} selectedTheme Currently selected theme.
 * @returns {void}
 */
export function updateSelectionState(buttons, selectedTheme) {
  buttons.forEach((button) => {
    button.toggleAttribute('aria-pressed', button.dataset.theme === selectedTheme);
    button.classList.toggle('selected', button.dataset.theme === selectedTheme);
  });
}

/**
 * Wires theme controls using provided element references and adapters.
 *
 * Change Rationale: Theme behavior previously queried DOM nodes directly from the
 * data service. The new contract receives element refs and environment adapters
 * from UI orchestrators, preserving Android-style layering and testability.
 *
 * @param {{
 *   htmlElement: HTMLElement | null,
 *   buttons: HTMLElement[],
 *   storage?: { getItem: (key: string) => string | null, setItem: (key: string, value: string) => void } | null,
 *   mediaQueryList?: MediaQueryList | null,
 * }} options Theme wiring dependencies.
 * @returns {void}
 */
export function initThemeControls({
  htmlElement,
  buttons,
  storage = globalThis.localStorage,
  mediaQueryList = typeof window !== 'undefined' ? window.matchMedia?.(MEDIA_QUERY.prefersDark) ?? null : null,
} = {}) {
  if (!htmlElement || !Array.isArray(buttons) || !buttons.length) {
    return;
  }

  const getPrefersDark = () => Boolean(mediaQueryList?.matches);
  const storedTheme = readStoredTheme(storage);
  applyThemeClass(htmlElement, storedTheme, getPrefersDark());
  updateSelectionState(buttons, storedTheme);

  buttons.forEach((button) => {
    const { theme } = button.dataset;
    if (!THEME_OPTIONS.includes(theme)) return;
    button.addEventListener('click', () => {
      persistTheme(theme, storage);
      applyThemeClass(htmlElement, theme, getPrefersDark());
      updateSelectionState(buttons, theme);
    });
  });

  mediaQueryList?.addEventListener?.('change', () => {
    const latestTheme = readStoredTheme(storage);
    if (latestTheme === 'auto') {
      applyThemeClass(htmlElement, latestTheme, getPrefersDark());
      updateSelectionState(buttons, latestTheme);
    }
  });
}

/**
 * Applies and persists a theme using provided dependencies.
 *
 * @param {'light'|'dark'|'auto'} theme Theme value.
 * @param {{ htmlElement?: HTMLElement | null, storage?: { setItem: (key: string, value: string) => void } | null, prefersDark?: boolean }} [options]
 * @returns {void}
 */
export function applyTheme(theme, {
  htmlElement = typeof document !== 'undefined' ? document.documentElement : null,
  storage = globalThis.localStorage,
  prefersDark = typeof window !== 'undefined' ? window.matchMedia?.(MEDIA_QUERY.prefersDark)?.matches ?? false : false,
} = {}) {
  persistTheme(theme, storage);
  applyThemeClass(htmlElement, theme, prefersDark);
}
