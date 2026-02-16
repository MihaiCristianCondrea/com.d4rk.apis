/**
 * @file DOM renderer for navigation sections.
 */
// Change Rationale: Navigation rendering now lives in a focused module so the
// rail and drawer can share one rendering pipeline, reducing duplication and
// making it easier to extend sections with consistent Material 3 structure.

import { NAVIGATION_SECTIONS } from './navigation-content.js';

/**
 * @typedef {import('./navigation-content.js').NavigationItem} NavigationItem
 * @typedef {import('./navigation-content.js').NavigationSection} NavigationSection
 */

/**
 * Creates a navigation list item for a single destination.
 *
 * @param {NavigationItem} item Navigation item data.
 * @returns {HTMLLIElement} Rendered list item.
 */
export function createNavigationItem(item) {
  const listItem = document.createElement('li');
  // Change Rationale: Navigation selected-state semantics are now explicit: the list row owns
  // visual selection shape while the anchor owns ARIA current state.
  listItem.classList.add('wave', 'round', 'nav-item');
  listItem.setAttribute('data-nav-item', '');

  const link = document.createElement('a');
  link.classList.add('nav-link');
  link.setAttribute('data-nav-link', '');
  link.href = item.href;
  link.setAttribute('aria-label', item.label);

  const icon = document.createElement('i');
  icon.textContent = item.icon;
  icon.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.classList.add('max');

  const label = document.createElement('span');
  label.classList.add('type-title-medium');
  label.textContent = item.label;
  content.appendChild(label);

  if (item.description) {
    const description = document.createElement('small');
    description.classList.add('type-body-small');
    description.textContent = item.description;
    content.appendChild(description);
  }

  link.appendChild(icon);
  link.appendChild(content);
  listItem.appendChild(link);

  return listItem;
}

/**
 * Creates a navigation section with a list of items.
 *
 * @param {NavigationSection} section Navigation section data.
 * @returns {DocumentFragment} Rendered section fragment.
 */
export function createNavigationSection(section) {
  const fragment = document.createDocumentFragment();

  if (section.label) {
    const label = document.createElement('div');
    label.classList.add('padding', 'type-label-large');
    label.textContent = section.label;
    fragment.appendChild(label);
  }

  const list = document.createElement('ul');
  list.classList.add('list');
  section.items.forEach((item) => {
    list.appendChild(createNavigationItem(item));
  });
  fragment.appendChild(list);

  return fragment;
}

/**
 * Renders navigation sections into a target container.
 *
 * @param {HTMLElement} container Container to populate.
 * @param {NavigationSection[]} [sections=NAVIGATION_SECTIONS] Sections to render.
 * @returns {void}
 */
export function renderNavigationSections(container, sections = NAVIGATION_SECTIONS) {
  if (!container) {
    return;
  }

  const fragment = document.createDocumentFragment();
  sections.forEach((section, index) => {
    if (index > 0) {
      fragment.appendChild(document.createElement('hr'));
    }
    fragment.appendChild(createNavigationSection(section));
  });
  container.replaceChildren(fragment);
}

/**
 * Hydrates every navigation section container within the app shell.
 *
 * @param {HTMLElement} root Root element that owns navigation containers.
 * @returns {void}
 */
export function hydrateNavigationContainers(root) {
  if (!root) {
    return;
  }

  const containers = root.querySelectorAll('[data-navigation-sections]');
  containers.forEach((container) => {
    renderNavigationSections(container);
  });
}
