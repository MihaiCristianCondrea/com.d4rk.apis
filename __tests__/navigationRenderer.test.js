import {
  createNavigationItem,
  createNavigationSection,
  renderNavigationSections,
} from '../app/src/main/js/core/ui/components/navigation/navigationRenderer.js';

/**
 * Creates a stub navigation item for testing.
 *
 * @returns {{id: string, label: string, description: string, icon: string, href: string}}
 */
function buildNavigationItem() {
  return {
    id: 'home',
    label: 'Home',
    description: 'Primary destination',
    icon: 'home',
    href: '#home',
  };
}

/**
 * Creates a stub navigation section for testing.
 *
 * @returns {{id: string, label: string, items: Array}}
 */
function buildNavigationSection() {
  return {
    id: 'primary',
    label: 'Primary',
    items: [buildNavigationItem()],
  };
}

describe('navigationRenderer', () => {
  it('builds a navigation item with label, icon, and description', () => {
    const item = buildNavigationItem();
    const listItem = createNavigationItem(item);
    const link = listItem.querySelector('a.nav-link');
    const icon = listItem.querySelector('i');
    const description = listItem.querySelector('small');

    expect(listItem.tagName).toBe('LI');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('#home');
    expect(icon.textContent).toBe('home');
    expect(description.textContent).toBe('Primary destination');
  });

  it('creates a section with label and list items', () => {
    const section = buildNavigationSection();
    const fragment = createNavigationSection(section);
    const container = document.createElement('div');
    container.appendChild(fragment);

    const label = container.querySelector('.type-label-large');
    const listItems = container.querySelectorAll('li');

    expect(label.textContent).toBe('Primary');
    expect(listItems).toHaveLength(1);
  });

  it('renders sections with dividers between them', () => {
    const container = document.createElement('div');
    const sections = [buildNavigationSection(), buildNavigationSection()];

    renderNavigationSections(container, sections);

    const dividers = container.querySelectorAll('hr');
    const lists = container.querySelectorAll('ul.list');

    expect(dividers).toHaveLength(1);
    expect(lists).toHaveLength(2);
  });
});
