import { githubTools, workspaceCards } from './homeContent.js';

const globalScope = typeof window !== 'undefined' ? window : globalThis;

function createIcon(name) {
  const icon = document.createElement('span');
  icon.className = 'feature-card-icon material-symbols-outlined';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = name;
  return icon;
}

function createWorkspaceHeader(card) {
  const header = document.createElement('div');
  header.className = 'workspace-tile-header';

  const iconWrapper = document.createElement('div');
  iconWrapper.className = 'workspace-tile-icon';
  iconWrapper.appendChild(createIcon(card.icon));

  const textWrapper = document.createElement('div');
  const kicker = document.createElement('p');
  kicker.className = 'workspace-tile-kicker';
  kicker.textContent = card.kicker;

  const title = document.createElement('h3');
  title.textContent = card.title;

  textWrapper.append(kicker, title);
  header.append(iconWrapper, textWrapper);
  return header;
}

function createWorkspaceTile(card) {
  const tile = document.createElement('a');
  tile.className = 'feature-card workspace-tile';
  tile.href = card.href;
  tile.setAttribute('aria-label', `Open ${card.title} workspace`);

  tile.appendChild(createWorkspaceHeader(card));

  const description = document.createElement('p');
  description.className = 'workspace-tile-body';
  description.textContent = card.description;
  tile.appendChild(description);

  if (Array.isArray(card.features) && card.features.length) {
    const list = document.createElement('ul');
    list.className = 'workspace-tile-list';
    card.features.forEach((feature) => {
      const item = document.createElement('li');
      item.textContent = feature;
      list.appendChild(item);
    });
    tile.appendChild(list);
  }

  const footer = document.createElement('span');
  footer.className = 'workspace-tile-footer';
  footer.innerHTML = 'Open workspace <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>';
  tile.appendChild(footer);

  return tile;
}

function createGithubToolCard(tool) {
  const card = document.createElement('a');
  card.className = 'feature-card tool-card';
  if (tool.wide) {
    card.classList.add('tool-card-wide');
  }
  card.href = tool.href;
  card.setAttribute('aria-label', `Launch ${tool.title}`);

  card.appendChild(createIcon(tool.icon));

  const title = document.createElement('h3');
  title.textContent = tool.title;
  card.appendChild(title);

  const description = document.createElement('p');
  description.textContent = tool.description;
  card.appendChild(description);

  const footer = document.createElement('span');
  footer.className = 'card-footer';
  footer.innerHTML = 'Launch Tool <span class="material-symbols-outlined">arrow_forward</span>';
  card.appendChild(footer);

  return card;
}

function renderWorkspaceGrid() {
  const grid = document.querySelector('[data-workspace-grid]');
  if (!grid) {
    return;
  }

  const tiles = workspaceCards.map((card) => createWorkspaceTile(card));
  grid.replaceChildren(...tiles);
}

function renderGithubToolsGrid() {
  const grid = document.querySelector('[data-github-tools-grid]');
  if (!grid) {
    return;
  }

  const tools = githubTools.map((tool) => createGithubToolCard(tool));
  grid.replaceChildren(...tools);
}

export function initHomePage() {
  renderWorkspaceGrid();
  renderGithubToolsGrid();
}

globalScope.initHomePage = initHomePage;

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage, { once: true });
  } else {
    initHomePage();
  }
}
