// Change Rationale: The import previously only traversed three directories, landing in `app/src/main/js/res/…` and causing
// Vite to fail resolving the shared insight card partial. Bumping the path up four levels correctly targets
// `app/src/main/res/layout` so dashboards and FAQs can continue reusing the Material 3-aligned card markup without
// duplication.
import workspaceInsightCardTemplateSource from '../../../../res/layout/workspace-insight-card.html?raw';

/**
 * Parses and caches the shared workspace insight card partial for reuse across dashboards.
 *
 * @returns {HTMLTemplateElement | null} The parsed template element containing the insight card structure.
 */
function getWorkspaceInsightCardTemplate() {
  if (getWorkspaceInsightCardTemplate.cachedTemplate) {
    return getWorkspaceInsightCardTemplate.cachedTemplate;
  }

  const parsed = new DOMParser().parseFromString(workspaceInsightCardTemplateSource, 'text/html');
  const template = parsed.querySelector('template[data-partial="workspace-insight-card"]');
  getWorkspaceInsightCardTemplate.cachedTemplate = template;
  return template;
}

/**
 * Creates a configured workspace insight card by hydrating the shared partial with the provided settings.
 *
 * @param {{ icon?: string, label?: string, helper?: string, valueId?: string, defaultValue?: string, slotPrefix?: string, extraClasses?: string[] }} config
 *        Icon, label, helper text, and optional slot prefix to connect to downstream selectors.
 * @returns {HTMLElement} The hydrated insight card ready to insert into the DOM.
 */
export function createWorkspaceInsightCard(config) {
  const template = getWorkspaceInsightCardTemplate();
  if (!template) {
    const fallback = document.createElement('div');
    fallback.className = 'workspace-insight-card';
    return fallback;
  }

  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector('.workspace-insight-card');
  const iconEl = fragment.querySelector('[data-slot-target="insight-icon"]');
  const labelEl = fragment.querySelector('[data-slot-target="insight-label"]');
  const valueEl = fragment.querySelector('[data-slot-target="insight-value"]');
  const helperEl = fragment.querySelector('[data-slot-target="insight-helper"]');

  if (config.slotPrefix) {
    setSlotTarget(iconEl, `${config.slotPrefix}-icon`);
    setSlotTarget(labelEl, `${config.slotPrefix}-label`);
    setSlotTarget(valueEl, `${config.slotPrefix}-count`);
    setSlotTarget(helperEl, `${config.slotPrefix}-helper`);
  }

  if (config.icon && iconEl) {
    iconEl.textContent = config.icon;
  }
  if (config.label && labelEl) {
    labelEl.textContent = config.label;
  }
  if (config.helper && helperEl) {
    helperEl.textContent = config.helper;
  }
  if (config.defaultValue && valueEl) {
    valueEl.textContent = config.defaultValue;
  }
  if (config.valueId && valueEl) {
    valueEl.id = config.valueId;
  }
  if (config.extraClasses?.length && card) {
    card.classList.add(...config.extraClasses);
  }

  return card ?? fragment;
}

/**
 * Hydrates every placeholder marked with `data-partial="workspace-insight-card"` using dataset values.
 *
 * @param {Document | DocumentFragment | HTMLElement} root - The scope to search for placeholders within.
 */
export function renderWorkspaceInsightCards(root = document) {
  const template = getWorkspaceInsightCardTemplate();
  if (!template) {
    return;
  }

  const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
  const hosts = scope.querySelectorAll('[data-partial="workspace-insight-card"]');

  hosts.forEach((host) => {
    const card = createWorkspaceInsightCard({
      icon: host.dataset.icon,
      label: host.dataset.label,
      helper: host.dataset.helper,
      valueId: host.dataset.valueId,
      defaultValue: host.dataset.defaultValue,
      slotPrefix: host.dataset.slotPrefix,
      extraClasses: Array.from(host.classList).filter((className) => className !== 'workspace-insight-card'),
    });

    host.replaceWith(card);
  });
}

/**
 * Assigns a data-slot target attribute when both an element and name are provided.
 *
 * @param {Element | null} target - The element receiving the slot target attribute.
 * @param {string} name - The slot name to assign.
 */
function setSlotTarget(target, name) {
  if (target && name) {
    target.setAttribute('data-slot-target', name);
  }
}

if (typeof window !== 'undefined') {
  window.renderWorkspaceInsightCards = renderWorkspaceInsightCards;
}
