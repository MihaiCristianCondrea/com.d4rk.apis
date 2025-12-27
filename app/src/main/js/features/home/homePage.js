import { githubTools, workspaceCards } from './homeContent.js';

const globalScope = typeof window !== 'undefined' ? window : globalThis;

/**
 * Configuration for a workspace tile on the home page.
 *
 * This type is inferred from how `workspaceCards` is consumed in this module.
 *
 * @typedef {Object} WorkspaceCard
 * @property {string} icon Material symbol name to display as the workspace icon.
 * @property {string} kicker Short label above the title (e.g. category).
 * @property {string} title Workspace title.
 * @property {string} description One-line description of the workspace.
 * @property {string} href Link to the workspace page or route.
 * @property {string[]} [features] Optional bullet list of key features.
 */

/**
 * Configuration for a GitHub tool card on the home page.
 *
 * This type is inferred from how `githubTools` is consumed in this module.
 *
 * @typedef {Object} GithubToolCard
 * @property {string} icon Material symbol name to display as the tool icon.
 * @property {string} title Tool name.
 * @property {string} description One-line description of the tool.
 * @property {string} href Link to the tool page or route.
 * @property {boolean} [wide] Optional flag to render the card in a wider layout.
 */

/**
 * Creates a Material icon span element for use in cards.
 *
 * The icon:
 * - Uses the `material-symbols-outlined` font.
 * - Is marked as decorative via `aria-hidden="true"`.
 *
 * @param {string} name Material symbol name to render (e.g. `"terminal"`).
 * @returns {HTMLSpanElement} Configured icon element.
 */
function createIcon(name) {
  const icon = document.createElement('span');
  icon.className = 'feature-card-icon material-symbols-outlined';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = name;
  return icon;
}

/**
 * Builds the header section for a workspace tile.
 *
 * Layout:
 * - Left: Icon in a circular wrapper.
 * - Right: Kicker text and workspace title.
 *
 * @param {WorkspaceCard} card Workspace configuration.
 * @returns {HTMLDivElement} Header element for the workspace tile.
 */
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

/**
 * Creates a full workspace tile anchor element for the home page.
 *
 * Structure:
 * - Clickable `<a>` root with `feature-card workspace-tile` classes.
 * - Header section created by {@link createWorkspaceHeader}.
 * - Description paragraph.
 * - Optional unordered list of features (if provided in the card).
 * - Footer with “Open workspace” label and arrow icon.
 *
 * Accessibility:
 * - The anchor gets an `aria-label` in the form
 *   `"Open {card.title} workspace"`.
 *
 * @param {WorkspaceCard} card Workspace configuration.
 * @returns {HTMLAnchorElement} Fully assembled workspace tile element.
 */
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
  footer.innerHTML =
      'Open workspace <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>';
  tile.appendChild(footer);

  return tile;
}

/**
 * Creates a GitHub tool card anchor element for the home page.
 *
 * Structure:
 * - Root `<a>` with `feature-card tool-card` classes and optional
 *   `tool-card-wide` when `tool.wide` is truthy.
 * - Leading icon.
 * - Title and description.
 * - Footer with “Launch Tool” label and arrow icon.
 *
 * Accessibility:
 * - The anchor gets an `aria-label` in the form `"Launch {tool.title}"`.
 *
 * @param {GithubToolCard} tool Tool configuration.
 * @returns {HTMLAnchorElement} Fully assembled tool card element.
 */
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
  footer.innerHTML =
      'Launch Tool <span class="material-symbols-outlined">arrow_forward</span>';
  card.appendChild(footer);

  return card;
}

/**
 * Renders the workspace grid section on the home page.
 *
 * Behavior:
 * - Selects the container annotated with `[data-workspace-grid]`.
 * - Creates a workspace tile for each item in `workspaceCards`.
 * - Replaces all existing children with the new tiles.
 *
 * If the grid container is not present, the function exits silently.
 *
 * @returns {void}
 */
function renderWorkspaceGrid() {
  const grid = document.querySelector('[data-workspace-grid]');
  if (!grid) {
    return;
  }

  const tiles = workspaceCards.map((card) => createWorkspaceTile(card));
  // `replaceChildren` ensures the grid is fully refreshed and avoids
  // incremental DOM cleanup.
  grid.replaceChildren(...tiles);
}

/**
 * Renders the GitHub tools grid section on the home page.
 *
 * Behavior:
 * - Selects the container annotated with `[data-github-tools-grid]`.
 * - Creates a tool card for each item in `githubTools`.
 * - Replaces all existing children with the new cards.
 *
 * If the grid container is not present, the function exits silently.
 *
 * @returns {void}
 */
function renderGithubToolsGrid() {
  const grid = document.querySelector('[data-github-tools-grid]');
  if (!grid) {
    return;
  }

  const tools = githubTools.map((tool) => createGithubToolCard(tool));
  grid.replaceChildren(...tools);
}

/**
 * Initializes the home page content.
 *
 * This function is the main entry point for the home view:
 * - Renders the workspace tiles grid.
 * - Renders the GitHub tools grid.
 *
 * It is:
 * - Exported for module usage.
 * - Attached to `globalScope` for non-module contexts.
 * - Invoked automatically on `DOMContentLoaded` (or immediately if the
 *   document is already loaded).
 *
 * @returns {void}
 */
export function initHomePage() {
  renderWorkspaceGrid();
  renderGithubToolsGrid();
}

// Expose for scripts that may call it from inline HTML or other globals.
globalScope.initHomePage = initHomePage;

// Auto-initialize when the DOM is ready (browser environments only).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage, { once: true });
  } else {
    initHomePage();
  }
}
