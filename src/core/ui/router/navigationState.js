// Change Rationale: Navigation state now targets the canonical rail + drawer
// anchors so the router owns the active highlight across all navigation surfaces.
import normalizePageId from './identifiers.js';

/**
 * Updates the active navigation item in the side drawer based on the current page ID.
 *
 * This function keeps the navigation drawer in sync with the router by:
 *
 * - Normalizing the current page ID using {@link normalizePageId}.
 * - Iterating over all drawer links inside `#navDrawer` that have an `href`.
 * - Clearing any previous "active" styling and ARIA state from each item.
 * - Comparing each item's `href` (normalized) to the current page.
 * - Marking the matching item as active using:
 *   - `.active` CSS class
 *   - `aria-current="page"`
 *   - `aria-selected="true"`
 * - Ensuring parent nested lists are expanded when the active item is in a nested group
 *   by programmatically clicking the associated toggle button.
 *
 * This function is intended to be invoked after route changes so the UI
 * consistently reflects the active page.
 *
 * ### DOM structure assumptions
 *
 * The implementation assumes:
 *
 * - A navigation drawer root with id `#navDrawer`.
 * - Navigation items implemented as anchor elements with the `.nav-link` class.
 * - Nested lists wrapped in an element with the `.nested-list` class and an `id`.
 * - A corresponding toggle button controlling each nested list, referenced via
 *   `aria-controls="{nestedParent.id}"`, which:
 *   - Has an `.expanded` class when open.
 *   - Responds to `.click()` by toggling its expanded state.
 *
 * If some of these elements are missing, the function fails gracefully and
 * simply skips the unsupported behavior.
 *
 * @param {string} currentPageId
 *   The current route or page identifier (hash, path, or canonical ID). It will
 *   be normalized with {@link normalizePageId} before comparisons.
 *
 * @returns {void}
 */
export function updateActiveNavLink(currentPageId) {
  const normalizedCurrentPage = normalizePageId(currentPageId);

  document.querySelectorAll('[data-nav-link][href]').forEach((item) => {
    item.classList.remove('active', 'primary-container');
    item.removeAttribute('aria-current');
    item.removeAttribute('aria-selected');

    const itemHref = item.getAttribute('href');
    if (!itemHref) {
      return;
    }

    const normalizedHref = normalizePageId(itemHref);
    if (normalizedHref !== normalizedCurrentPage) {
      return;
    }

    item.classList.add('active', 'primary-container');
    item.setAttribute('aria-current', 'page');
    item.setAttribute('aria-selected', 'true');
  });
}

export default updateActiveNavLink;
