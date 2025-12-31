import { MEDIA_QUERY, STORAGE_KEYS } from '../../domain/constants.js';
// Change Rationale: Theme controls consume shared DOM helpers from `core/ui/utils`
// after the Android-style separation to avoid mixing UI helpers into data paths.
import { getDynamicElement } from '../../ui/utils/domUtils.js';

const THEME_DATA_ATTR = 'data-theme';
const THEME_OPTIONS = ['light', 'dark', 'auto'];

function resolveHtmlElement() {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.documentElement;
}

function persistTheme(theme) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function readStoredTheme() {
  if (typeof localStorage === 'undefined') {
    return 'auto';
  }
  return localStorage.getItem(STORAGE_KEYS.theme) || 'auto';
}

function isDarkPreferred(explicitTheme) {
  if (explicitTheme === 'dark') {
    return true;
  }
  if (explicitTheme === 'light') {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia?.(MEDIA_QUERY.prefersDark)?.matches ?? false;
}

function applyThemeClass(htmlElement, theme) {
  if (!htmlElement) {
    return;
  }
  const shouldUseDark = isDarkPreferred(theme);
  htmlElement.classList.toggle('dark', shouldUseDark);
  htmlElement.setAttribute(THEME_DATA_ATTR, theme);
}

function wireThemeButtons(buttons, htmlElement) {
  buttons.forEach((button) => {
    const { theme } = button.dataset;
    if (!THEME_OPTIONS.includes(theme)) {
      return;
    }
    button.addEventListener('click', () => {
      persistTheme(theme);
      applyThemeClass(htmlElement, theme);
      updateSelectionState(buttons, theme);
    });
  });
}

function updateSelectionState(buttons, selectedTheme) {
  buttons.forEach((button) => {
    button.toggleAttribute('aria-pressed', button.dataset.theme === selectedTheme);
    button.classList.toggle('selected', button.dataset.theme === selectedTheme);
  });
}

function subscribeToSystemTheme(htmlElement, buttons) {
  if (typeof window === 'undefined') {
    return;
  }

  const mediaQueryList = window.matchMedia?.(MEDIA_QUERY.prefersDark);
  if (!mediaQueryList) {
    return;
  }

  mediaQueryList.addEventListener('change', () => {
    const storedTheme = readStoredTheme();
    if (storedTheme === 'auto') {
      applyThemeClass(htmlElement, storedTheme);
      updateSelectionState(buttons, storedTheme);
    }
  });
}

export function initThemeControls({
  lightId = 'lightThemeButton',
  darkId = 'darkThemeButton',
  autoId = 'autoThemeButton',
} = {}) {
  const htmlElement = resolveHtmlElement();
  if (!htmlElement) {
    return;
  }

  const lightThemeButton = getDynamicElement(lightId);
  const darkThemeButton = getDynamicElement(darkId);
  const autoThemeButton = getDynamicElement(autoId);

  const buttons = [lightThemeButton, darkThemeButton, autoThemeButton].filter(Boolean);
  if (!buttons.length) {
    return;
  }

  const storedTheme = readStoredTheme();
  applyThemeClass(htmlElement, storedTheme);
  updateSelectionState(buttons, storedTheme);
  wireThemeButtons(buttons, htmlElement);
  subscribeToSystemTheme(htmlElement, buttons);
}

export function applyTheme(theme) {
  const htmlElement = resolveHtmlElement();
  if (!htmlElement) {
    return;
  }

  persistTheme(theme);
  applyThemeClass(htmlElement, theme);
}
