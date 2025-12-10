import workspaceDashboardTemplateSource from '../../../res/layout/workspace-dashboard.html?raw';

/**
 * Hydrates workspace dashboard stubs using the shared layout partial so each workspace can
 * configure insight IDs, labels, and helper copy without duplicating markup.
 *
 * @param {Document | HTMLElement} root - The root node that contains workspace dashboard hosts.
 */
export function renderWorkspaceDashboards(root = document) {
  const template = getWorkspaceDashboardTemplate();
  if (!template) {
    return;
  }

  const hostNodes = (root instanceof Document ? root : root.ownerDocument || document).querySelectorAll(
    '[data-slot="workspace-dashboard"]'
  );

  hostNodes.forEach((host) => {
    const fragment = template.content.cloneNode(true);
    const section = fragment.querySelector('.workspace-dashboard');
    if (!section) {
      return;
    }

    copyHostClasses(host, section);
    hydrateInsight(fragment, host.dataset, 'home', {
      icon: host.dataset.homeIcon,
      label: host.dataset.homeLabel,
      helper: host.dataset.homeHelper,
      valueId: host.dataset.homeCountId,
      defaultValue: host.dataset.homeDefaultValue,
    });
    hydrateInsight(fragment, host.dataset, 'release', {
      icon: host.dataset.releaseIcon,
      label: host.dataset.releaseLabel,
      helper: host.dataset.releaseHelper,
      valueId: host.dataset.releaseReadyId,
      defaultValue: host.dataset.releaseDefaultValue,
    });
    hydrateInsight(fragment, host.dataset, 'blocks', {
      icon: host.dataset.blocksIcon,
      label: host.dataset.blocksLabel,
      helper: host.dataset.blocksHelper,
      valueId: host.dataset.blocksCountId,
      defaultValue: host.dataset.blocksDefaultValue,
    });

    assignId(fragment, 'last-edited', host.dataset.lastEditedId, host.dataset.lastEditedDefault);
    assignId(fragment, 'plan-list', host.dataset.planListId);
    assignId(fragment, 'workspace-pulse', host.dataset.pulseId, host.dataset.pulseDefaultText);
    assignId(fragment, 'release-progress', host.dataset.progressId);
    setLegendLabels(fragment, host.dataset.legendPrimaryText, host.dataset.legendSecondaryText);

    renderListSlot(host, fragment, 'plan-steps', '[data-slot-target="plan-list"]');
    renderListSlot(host, fragment, 'release-tips', '[data-slot-target="release-tips"]');

    host.replaceWith(fragment);
  });
}

/**
 * Parses the shared workspace dashboard template and caches the resulting template element.
 *
 * @returns {HTMLTemplateElement | null} The parsed template element.
 */
function getWorkspaceDashboardTemplate() {
  if (getWorkspaceDashboardTemplate.cachedTemplate) {
    return getWorkspaceDashboardTemplate.cachedTemplate;
  }

  const parsed = new DOMParser().parseFromString(workspaceDashboardTemplateSource, 'text/html');
  const template = parsed.querySelector('template[data-slot="workspace-dashboard"]');
  getWorkspaceDashboardTemplate.cachedTemplate = template;
  return template;
}

/**
 * Copies any non-slot host classes onto the hydrated section so page-level layout hooks remain intact.
 *
 * @param {Element} host - The placeholder that declares the workspace dashboard.
 * @param {Element} section - The template section receiving the inherited classes.
 */
function copyHostClasses(host, section) {
  host.classList.forEach((className) => {
    if (className && className !== 'workspace-dashboard') {
      section.classList.add(className);
    }
  });
}

/**
 * Applies slot-aware insight values and IDs to the cloned fragment.
 *
 * @param {DocumentFragment} fragment - The cloned template fragment.
 * @param {DOMStringMap} dataset - The dataset pulled from the host node.
 * @param {'home' | 'release' | 'blocks'} key - The insight namespace to hydrate.
 * @param {{ icon?: string, label?: string, helper?: string, valueId?: string, defaultValue?: string }} fields - Insight fields.
 */
function hydrateInsight(fragment, dataset, key, fields) {
  const iconTarget = fragment.querySelector(`[data-slot-target="${key}-icon"]`);
  const labelTarget = fragment.querySelector(`[data-slot-target="${key}-label"]`);
  const helperTarget = fragment.querySelector(`[data-slot-target="${key}-helper"]`);
  const valueTarget = fragment.querySelector(`[data-slot-target="${key}-count"]`);

  if (fields.icon && iconTarget) {
    iconTarget.textContent = fields.icon;
  }
  if (fields.label && labelTarget) {
    labelTarget.textContent = fields.label;
  }
  if (fields.helper && helperTarget) {
    helperTarget.textContent = fields.helper;
  }
  if (fields.valueId && valueTarget) {
    valueTarget.id = fields.valueId;
  }
  if (fields.defaultValue && valueTarget) {
    valueTarget.textContent = fields.defaultValue;
  }
}

/**
 * Assigns an ID to a data-slot target and optionally seeds its text content.
 *
 * @param {DocumentFragment} fragment - The hydrated fragment containing the slot target.
 * @param {string} slotName - The slot target name.
 * @param {string | undefined} identifier - The ID to assign.
 * @param {string | undefined} defaultText - Optional initial text content.
 */
function assignId(fragment, slotName, identifier, defaultText) {
  const target = fragment.querySelector(`[data-slot-target="${slotName}"]`);
  if (target && identifier) {
    target.id = identifier;
  }
  if (target && typeof defaultText === 'string') {
    target.textContent = defaultText;
  }
}

/**
 * Updates legend labels for the release progress component so different workspaces can relabel channels.
 *
 * @param {DocumentFragment} fragment - The hydrated fragment containing legend nodes.
 * @param {string | undefined} primary - Label for the first legend entry.
 * @param {string | undefined} secondary - Label for the second legend entry.
 */
function setLegendLabels(fragment, primary, secondary) {
  const primaryEl = fragment.querySelector('[data-slot-target="legend-primary"]');
  const secondaryEl = fragment.querySelector('[data-slot-target="legend-secondary"]');
  if (primary && primaryEl) {
    primaryEl.textContent = primary;
  }
  if (secondary && secondaryEl) {
    secondaryEl.textContent = secondary;
  }
}

/**
 * Renders list-style slots (e.g., plan steps or release tips) by cloning template children.
 *
 * @param {Element} host - The placeholder node that may contain the slot template.
 * @param {DocumentFragment} fragment - The hydrated fragment receiving list content.
 * @param {string} slotName - The slot attribute expected on the source template.
 * @param {string} targetSelector - Selector for the list container within the fragment.
 */
function renderListSlot(host, fragment, slotName, targetSelector) {
  const target = fragment.querySelector(targetSelector);
  const template = host.querySelector(`template[slot="${slotName}"]`);
  if (!target) {
    return;
  }

  if (template && template.content) {
    target.replaceChildren(template.content.cloneNode(true));
    return;
  }

  if (!target.children.length) {
    const fallback = document.createElement('li');
    fallback.textContent = 'Add checklist items to guide the workflow.';
    target.appendChild(fallback);
  }
}
