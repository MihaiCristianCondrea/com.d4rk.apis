import { initThemeControls } from '@/core/data/services/themeService.js';
import { getDynamicElement } from '@/core/ui/utils/domUtils.js';
import { MEDIA_QUERY } from '@/core/domain/constants.js';

const THEME_INIT_SCHEDULE_KEY = '__APP_THEME_INIT_SCHEDULED__';

/**
 * Resolves theme control button references from DOM IDs.
 *
 * @param {{ lightId?: string, darkId?: string, autoId?: string }} [options]
 * @returns {HTMLElement[]} Resolved theme buttons in canonical order.
 */
function resolveThemeButtons({
  lightId = 'lightThemeButton',
  darkId = 'darkThemeButton',
  autoId = 'autoThemeButton',
} = {}) {
  return [
    getDynamicElement(lightId),
    getDynamicElement(darkId),
    getDynamicElement(autoId),
  ].filter(Boolean);
}

/**
 * Initializes theme controls by resolving DOM refs in the UI layer.
 *
 * Change Rationale: Theme controls can remount with navigation redraws. This
 * initializer now tolerates transient missing DOM by scheduling a single
 * deferred retry, so button wiring remains stable after remount without
 * accumulating duplicate listeners.
 *
 * @param {{ lightId?: string, darkId?: string, autoId?: string }} [options]
 * @returns {void}
 */
export function initThemeControlsFromDom(options = {}) {
  const htmlElement = typeof document !== 'undefined' ? document.documentElement : null;
  const buttons = resolveThemeButtons(options);

  if (!htmlElement || !buttons.length) {
    if (typeof window !== 'undefined' && !window[THEME_INIT_SCHEDULE_KEY]) {
      window[THEME_INIT_SCHEDULE_KEY] = true;
      window.requestAnimationFrame?.(() => {
        window[THEME_INIT_SCHEDULE_KEY] = false;
        initThemeControlsFromDom(options);
      });
    }
    return;
  }

  if (typeof window !== 'undefined') {
    window[THEME_INIT_SCHEDULE_KEY] = false;
  }

  initThemeControls({
    htmlElement,
    buttons,
    mediaQueryList: typeof window !== 'undefined' ? window.matchMedia?.(MEDIA_QUERY.prefersDark) ?? null : null,
  });
}
