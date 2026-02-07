/**
 * @file Navigation state helpers for syncing active link styles across nav surfaces.
 */

// Change Rationale: Centralize navigation link highlighting so both the modal drawer
// and the desktop rail stay in sync with the active route without duplicating logic.

/**
 * Normalizes the current location hash into a route-safe value.
 *
 * @param {Location} location - Window location object.
 * @returns {string} Normalized hash route (defaults to `#home`).
 */
function getActiveHash(location) {
  if (!location || !location.hash) {
    return '#home';
  }
  return location.hash;
}

/**
 * Extracts a hash route from a navigation link element.
 *
 * @param {HTMLAnchorElement} link - Anchor element to inspect.
 * @returns {string} Normalized hash route.
 */
function getLinkHash(link) {
  if (!link) {
    return '';
  }
  if (link.hash) {
    return link.hash;
  }
  const href = link.getAttribute('href') || '';
  if (href.startsWith('#')) {
    return href;
  }
  const hashIndex = href.indexOf('#');
  if (hashIndex >= 0) {
    return `#${href.slice(hashIndex + 1)}`;
  }
  return '';
}

/**
 * Applies active state styling to any navigation links matching the current route.
 *
 * @param {HTMLElement} root - Root element to search within.
 * @param {string} linkSelector - Selector for nav link anchors.
 * @param {Location} location - Window location object.
 * @returns {void}
 */
function applyActiveState(root, linkSelector, location) {
  if (!root) {
    return;
  }
  const links = Array.from(root.querySelectorAll(linkSelector));
  if (!links.length) {
    return;
  }

  const activeHash = getActiveHash(location);

  links.forEach((link) => {
    const linkHash = getLinkHash(link);
    const isActive = Boolean(linkHash) && linkHash === activeHash;
    // Change Rationale: Use BeerCSS surface helpers for selected state styling
    // so active links highlight without custom CSS overrides.
    link.classList.toggle('active', isActive);
    link.classList.toggle('primary-container', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Initializes navigation state syncing for nav link collections.
 *
 * @param {Object} [options]
 * @param {string} [options.linkSelector='[data-nav-link]'] Selector for nav link anchors.
 * @param {HTMLElement} [options.root=document] Root scope for querying links.
 * @param {Location} [options.location=window.location] Location object to read the hash from.
 * @returns {void}
 */
export function initNavigationState({
  linkSelector = '[data-nav-link]',
  root = typeof document !== 'undefined' ? document : null,
  location = typeof window !== 'undefined' ? window.location : null,
} = {}) {
  if (!root || !location) {
    return;
  }

  const syncActiveState = () => applyActiveState(root, linkSelector, location);

  syncActiveState();
  window.addEventListener('hashchange', syncActiveState);
  window.addEventListener('popstate', syncActiveState);
}
