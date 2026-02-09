/**
 * @file Home feature route entrypoint for rendering the landing grid.
 */
// Change Rationale: Home content data and screens now live under the feature-first home tree,
// keeping configuration and UI assets co-located without changing runtime behavior.
import { githubTools, workspaceCards } from '../data/homeContentDataSource.js';
// Change Rationale: The Home screen now follows the Screen naming convention, so import the
// new screen path for bundling and future router usage.
import homeScreenSource from './HomeScreen.html?raw';
// Change Rationale: Home cards now hydrate from dedicated view templates so action/info
// card roles remain consistent without per-screen class overrides.
import actionCardViewSource from './views/ActionCardView.html?raw';
import infoCardViewSource from './views/InfoCardView.html?raw';
import { RouterRoutes } from '@/core/ui/router/routes.js';

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
 * Parses an HTML view template for card rendering.
 *
 * @param {string} source Raw HTML source.
 * @param {string} viewName Name of the template to locate.
 * @returns {HTMLTemplateElement} Template element for the view.
 */
function parseCardTemplate(source, viewName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, 'text/html');
  const template = doc.querySelector(`template[data-view="${viewName}"]`);
  if (template) {
    return template;
  }

  /* Change Rationale: In tests or compatibility builds the raw view source may be delivered
   * without the wrapper template node. Falling back to an in-memory template keeps route
   * lifecycle registration deterministic without relying on globals. */
  const fallbackTemplate = document.createElement('template');
  fallbackTemplate.dataset.view = viewName;
  fallbackTemplate.innerHTML = source;
  return fallbackTemplate;
}

const actionCardTemplate = parseCardTemplate(actionCardViewSource, 'action-card');
const infoCardTemplate = parseCardTemplate(infoCardViewSource, 'info-card');

/**
 * Creates a card element from a template and hydrates its data slots.
 *
 * @param {HTMLTemplateElement} template Card template to clone.
 * @param {Object} data Payload to populate the card.
 * @param {string} data.href Link URL for action cards.
 * @param {string} data.ariaLabel Accessibility label for the card.
 * @param {string} data.icon Material icon name.
 * @param {string} data.title Card title.
 * @param {string} data.description Card description.
 * @param {string} [data.kicker] Optional kicker text.
 * @param {string[]} [data.features] Optional list of features.
 * @param {string} [data.cta] Optional footer CTA text.
 * @returns {HTMLElement} Hydrated card element.
 */
function buildCardFromTemplate(template, data) {
  const fragment = document.importNode(template.content, true);
  const card = fragment.firstElementChild;
  if (!card) {
    throw new Error('HomeRoute: Card template is empty.');
  }

  if (card instanceof HTMLAnchorElement) {
    card.href = data.href;
    card.setAttribute('aria-label', data.ariaLabel);
  }

  const iconSlot = card.querySelector('[data-slot="icon"]');
  if (iconSlot) {
    iconSlot.textContent = data.icon;
  }

  const kickerSlot = card.querySelector('[data-slot="kicker"]');
  if (kickerSlot) {
    if (data.kicker) {
      kickerSlot.textContent = data.kicker;
    } else {
      kickerSlot.remove();
    }
  }

  const titleSlot = card.querySelector('[data-slot="title"]');
  if (titleSlot) {
    titleSlot.textContent = data.title;
  }

  const descriptionSlot = card.querySelector('[data-slot="description"]');
  if (descriptionSlot) {
    descriptionSlot.textContent = data.description;
  }

  const featureSlot = card.querySelector('[data-slot="features"]');
  if (featureSlot) {
    if (Array.isArray(data.features) && data.features.length) {
      data.features.forEach((feature) => {
        const item = document.createElement('li');
        item.textContent = feature;
        featureSlot.appendChild(item);
      });
    } else {
      featureSlot.remove();
    }
  }

  const ctaSlot = card.querySelector('[data-slot="cta"]');
  if (ctaSlot) {
    if (data.cta) {
      ctaSlot.innerHTML =
        `${data.cta} <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>`;
    } else {
      ctaSlot.remove();
    }
  }

  return card;
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
  const tile = buildCardFromTemplate(actionCardTemplate, {
    href: card.href,
    ariaLabel: `Open ${card.title} workspace`,
    icon: card.icon,
    kicker: card.kicker,
    title: card.title,
    description: card.description,
    features: card.features,
    cta: 'Open workspace',
  });

  tile.classList.add('workspace-card');
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
  const card = buildCardFromTemplate(actionCardTemplate, {
    href: tool.href,
    ariaLabel: `Launch ${tool.title}`,
    icon: tool.icon,
    title: tool.title,
    description: tool.description,
    cta: 'Launch tool',
  });

  card.classList.add('tool-card');
  if (tool.wide) {
    card.classList.add('tool-card-wide');
  }
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
 * - Exported as an explicit route lifecycle mount hook and registered through RouterRoutes.
 *
 * @returns {void}
 */
export function mountHomeRoute() {
  renderWorkspaceGrid();
  renderGithubToolsGrid();
}


/**
 * No-op unmount hook for the home route.
 *
 * @returns {void}
 */
export function unmountHomeRoute() {}

/**
 * Registers home lifecycle hooks through the canonical RouterRoutes API.
 *
 * @returns {void}
 */
export function registerHomeRoute() {
  const existingRoute = RouterRoutes.getRoute('home');
  if (!existingRoute) {
    return;
  }

  RouterRoutes.registerRoute({
    ...existingRoute,
    onLoad: mountHomeRoute,
  });
}

registerHomeRoute();
