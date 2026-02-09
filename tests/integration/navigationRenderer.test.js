const fs = require('fs');
const path = require('path');

import {
  createNavigationItem,
  createNavigationSection,
  renderNavigationSections,
} from '../../app/src/main/js/core/ui/components/navigation/navigationRenderer.js';
import { updateActiveNavLink } from '../../app/src/main/js/core/ui/router/navigationState.js';

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



  it('keeps github feature screens on BeerCSS button class patterns', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const screenPaths = [
      path.join(repoRoot, 'app', 'src', 'main', 'js', 'app', 'githubtools', 'releasestats', 'ui', 'ReleaseStatsScreen.html'),
      path.join(repoRoot, 'app', 'src', 'main', 'js', 'app', 'githubtools', 'repomapper', 'ui', 'RepoMapperScreen.html'),
      path.join(repoRoot, 'app', 'src', 'main', 'js', 'app', 'githubtools', 'gitpatch', 'ui', 'GitPatchScreen.html'),
    ];

    const html = screenPaths.map((screenPath) => fs.readFileSync(screenPath, 'utf8')).join('\n');

    expect(html.includes('app-button')).toBe(false);
    expect(html.includes('api-inline-button')).toBe(false);
    expect(html.includes('class="button small border app-ui-button"')).toBe(true);
  });


  it('keeps navigation active-state and icon-button class contracts consistent', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const navTemplatePath = path.join(
      repoRoot,
      'app',
      'src',
      'main',
      'js',
      'core',
      'ui',
      'components',
      'navigation',
      'AppNavigationView.html',
    );
    const html = fs.readFileSync(navTemplatePath, 'utf8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const allIconButtons = Array.from(
      doc.querySelectorAll('#closeDrawerButton, #lightThemeButton, #darkThemeButton, #autoThemeButton'),
    );
    allIconButtons.forEach((button) => {
      expect(button.className).toContain('button transparent circle app-nav-icon-button');
    });

    document.body.innerHTML = `
      <nav>
        <a href="#home" data-nav-link class="nav-link">Home</a>
        <a href="#repo-mapper" data-nav-link class="nav-link">Repo Mapper</a>
      </nav>
      <dialog>
        <a href="#repo-mapper" data-nav-link class="nav-link">Repo Mapper</a>
      </dialog>
    `;
    updateActiveNavLink('repo-mapper');

    const activeLinks = Array.from(document.querySelectorAll('[data-nav-link].active'));
    expect(activeLinks).toHaveLength(2);
    activeLinks.forEach((link) => {
      expect(link.getAttribute('aria-current')).toBe('page');
      expect(link.classList.contains('primary-container')).toBe(true);
    });
  });


  it('keeps app shell navigation as a mount-only surface hydrated from AppNavigationView', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const shellPath = path.join(repoRoot, 'index.html');
    const html = fs.readFileSync(shellPath, 'utf8');

    expect(html.includes('id="appNavigationMount"')).toBe(true);
    expect(html.includes('id="navDrawer"')).toBe(false);
    expect(html.includes('id="navRail"')).toBe(false);
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
