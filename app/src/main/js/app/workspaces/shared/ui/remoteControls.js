// Change Rationale: The shared builder template now lives under the workspaces shared UI views
// folder, so update the import to the canonical Screen + Views location.
import builderRemoteTemplateSource from './views/BuilderRemoteView.html?raw';

// Change Rationale: Remote fetch and publish controls were duplicated across workspaces, leading to mismatched labels,
// missing IDs, and preset drift. Centralizing hydration keeps the Material layout consistent, wires existing listeners via
// data attributes, and lets each workspace declare presets without repeating markup.

/**
 * Hydrates builder remote controls within a workspace using the shared partial and host-provided data attributes.
 *
 * @param {Document | HTMLElement} container - Scope that contains remote control placeholders.
 */
export function initBuilderRemoteControls(container = document) {
  const template = getBuilderRemoteTemplate();
  if (!template) {
    return;
  }

  const scope = container instanceof Document ? container : container.ownerDocument || document;
  const hostScope = container && typeof container.querySelectorAll === 'function' ? container : scope;
  const hosts = (hostScope.querySelectorAll ? hostScope : document).querySelectorAll('[data-partial="builder-remote"]');

  hosts.forEach((host) => {
    const fragment = template.content.cloneNode(true);
    const prefix = host.dataset.remotePrefix || 'builder';

    assignText(fragment, 'fetch-title', host.dataset.fetchTitle);
    assignText(fragment, 'fetch-helper', host.dataset.fetchHelper);
    assignText(fragment, 'preset-label', host.dataset.presetLabel);
    assignText(fragment, 'github-title', host.dataset.githubTitle);
    assignText(fragment, 'github-helper', host.dataset.githubHelper);
    assignText(fragment, 'github-note', host.dataset.githubNote);
    assignText(fragment, 'github-launch-helper', host.dataset.githubLaunchHelper);

    assignId(fragment, 'fetch-input', host.dataset.fetchInputId);
    assignId(fragment, 'fetch-button', host.dataset.fetchButtonId);
    assignId(fragment, 'fetch-target', host.dataset.fetchTargetId);
    assignId(fragment, 'fetch-status', host.dataset.fetchStatusId);
    assignId(fragment, 'github-launch', host.dataset.githubButtonId);
    assignId(fragment, 'github-status', host.dataset.githubStatusId);

    setSelectOptions(fragment, host.dataset.homeLabel, host.dataset.lessonLabel);
    setFetchDefault(fragment, host.dataset.fetchDefaultTarget);

    hydratePreset(fragment, {
      slot: 'home-debug',
      labelSlot: 'home-debug-label',
      label: host.dataset.homeDebugLabel,
      url: host.dataset.homeDebugPreset,
      prefix,
      target: 'home',
    });
    hydratePreset(fragment, {
      slot: 'home-release',
      labelSlot: 'home-release-label',
      label: host.dataset.homeReleaseLabel,
      url: host.dataset.homeReleasePreset,
      prefix,
      target: 'home',
    });
    hydratePreset(fragment, {
      slot: 'lesson-debug',
      labelSlot: 'lesson-debug-label',
      label: host.dataset.lessonDebugLabel,
      url: host.dataset.lessonDebugPreset,
      prefix,
      target: 'lesson',
    });
    hydratePreset(fragment, {
      slot: 'lesson-release',
      labelSlot: 'lesson-release-label',
      label: host.dataset.lessonReleaseLabel,
      url: host.dataset.lessonReleasePreset,
      prefix,
      target: 'lesson',
    });

    applyTargetToggle(fragment, 'home-target', host.dataset.homeLabel || 'Home');
    applyTargetToggle(fragment, 'lesson-target', host.dataset.lessonLabel || 'Lesson');

    host.replaceWith(fragment);
  });
}

/**
 * Parses and caches the shared builder remote template.
 *
 * @returns {HTMLTemplateElement | null} The template used to hydrate remote controls.
 */
function getBuilderRemoteTemplate() {
  if (getBuilderRemoteTemplate.cachedTemplate) {
    return getBuilderRemoteTemplate.cachedTemplate;
  }

  const parsed = new DOMParser().parseFromString(builderRemoteTemplateSource, 'text/html');
  const template = parsed.querySelector('template[data-partial="builder-remote"]');
  getBuilderRemoteTemplate.cachedTemplate = template;
  return template;
}

/**
 * Updates visible text content for a slot target when provided.
 *
 * @param {DocumentFragment} fragment - Hydrated fragment containing slot targets.
 * @param {string} slot - Slot target name.
 * @param {string | undefined} text - Optional text to inject.
 */
function assignText(fragment, slot, text) {
  if (!text) {
    return;
  }
  const target = fragment.querySelector(`[data-slot-target="${slot}"]`);
  if (target) {
    target.textContent = text;
  }
}

/**
 * Assigns an ID to the first matching slot target.
 *
 * @param {DocumentFragment} fragment - Hydrated fragment containing slot targets.
 * @param {string} slot - Slot target name.
 * @param {string | undefined} id - Identifier to apply.
 */
function assignId(fragment, slot, id) {
  if (!id) {
    return;
  }
  const target = fragment.querySelector(`[data-slot-target="${slot}"]`);
  if (target) {
    target.id = id;
  }
}

/**
 * Hydrates a preset button with labels, dataset attributes, and the configured URL.
 *
 * @param {DocumentFragment} fragment - Hydrated fragment containing preset buttons.
 * @param {{ slot: string, labelSlot: string, label?: string, url?: string, prefix: string, target: 'home' | 'lesson' }} config -
 *        Preset hydration settings.
 */
function hydratePreset(fragment, config) {
  const button = fragment.querySelector(`[data-slot-target="${config.slot}"]`);
  const label = fragment.querySelector(`[data-slot-target="${config.labelSlot}"]`);
  if (!button) {
    return;
  }
  if (label && config.label) {
    label.textContent = config.label;
  }
  if (config.url) {
    button.dataset[`${config.prefix}FetchPreset`] = config.url;
  }
  button.dataset[`${config.prefix}FetchTarget`] = config.target;
  button.dataset.presetTarget = config.target;
}

/**
 * Updates select options and toggle labels with workspace-specific copy.
 *
 * @param {DocumentFragment} fragment - Hydrated fragment containing select and toggle targets.
 * @param {string | undefined} homeLabel - Optional label for the home target.
 * @param {string | undefined} lessonLabel - Optional label for the lesson target.
 */
function setSelectOptions(fragment, homeLabel, lessonLabel) {
  const select = fragment.querySelector('[data-slot-target="fetch-target"]');
  const homeOption = fragment.querySelector('md-select-option[value="home"] div[slot="headline"]');
  const lessonOption = fragment.querySelector('md-select-option[value="lesson"] div[slot="headline"]');
  if (select && select.setAttribute) {
    select.setAttribute('aria-label', 'Fetch target');
  }
  if (homeLabel && homeOption) {
    homeOption.textContent = homeLabel;
  }
  if (lessonLabel && lessonOption) {
    lessonOption.textContent = lessonLabel;
  }
}

/**
 * Applies a default target to the select when provided by the host.
 *
 * @param {DocumentFragment} fragment - Hydrated fragment containing the target select.
 * @param {string | undefined} target - Preferred default target value.
 */
function setFetchDefault(fragment, target) {
  if (!target) {
    return;
  }
  const select = fragment.querySelector('[data-slot-target="fetch-target"]');
  if (select) {
    select.value = target;
  }
}

/**
 * Mirrors target labels onto the quick-toggle buttons so screen readers and data attributes stay in sync.
 *
 * @param {DocumentFragment} fragment - Hydrated fragment containing toggle buttons.
 * @param {'home-target' | 'lesson-target'} slot - Slot target name for the toggle.
 * @param {string} label - Text to apply to the toggle.
 */
function applyTargetToggle(fragment, slot, label) {
  const toggle = fragment.querySelector(`[data-slot-target="${slot}"]`);
  if (!toggle) {
    return;
  }
  const textNode = Array.from(toggle.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = ` ${label}`;
  } else {
    toggle.append(document.createTextNode(label));
  }
  toggle.dataset.remoteTarget = slot.startsWith('home') ? 'home' : 'lesson';
}

if (typeof window !== 'undefined') {
  window.initBuilderRemoteControls = initBuilderRemoteControls;
}
