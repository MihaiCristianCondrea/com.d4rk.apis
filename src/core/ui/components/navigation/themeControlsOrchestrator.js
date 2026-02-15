import { initThemeControls } from '@/core/data/services/themeService.js';
import { getDynamicElement } from '@/core/ui/utils/domUtils.js';
import { MEDIA_QUERY } from '@/core/domain/constants.js';

/**
 * Initializes theme controls by resolving DOM refs in the UI layer.
 *
 * Change Rationale: DOM helper access moved out of data services so core/data
 * remains free of UI querying concerns.
 *
 * @param {{ lightId?: string, darkId?: string, autoId?: string }} [options]
 * @returns {void}
 */
export function initThemeControlsFromDom({
  lightId = 'lightThemeButton',
  darkId = 'darkThemeButton',
  autoId = 'autoThemeButton',
} = {}) {
  const htmlElement = typeof document !== 'undefined' ? document.documentElement : null;
  // Change Rationale: Keep explicit ID lookups as the canonical contract with
  // AppNavigationView while allowing safe re-initialization after shell remounts.
  const buttons = [
    getDynamicElement(lightId),
    getDynamicElement(darkId),
    getDynamicElement(autoId),
  ].filter(Boolean);

  initThemeControls({
    htmlElement,
    buttons,
    mediaQueryList: typeof window !== 'undefined' ? window.matchMedia?.(MEDIA_QUERY.prefersDark) ?? null : null,
  });
}
