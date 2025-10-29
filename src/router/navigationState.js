import normalizePageId from './identifiers.js';

export function updateActiveNavLink(currentPageId) {
  const normalizedCurrentPage = normalizePageId(currentPageId);

  document.querySelectorAll('#navDrawer md-list-item[href]').forEach((item) => {
    item.classList.remove('nav-item-active');
    if (item.hasAttribute('active')) {
      item.removeAttribute('active');
    }
    if (typeof item.active === 'boolean' && item.active) {
      item.active = false;
    }
    item.removeAttribute('aria-current');
    item.removeAttribute('aria-selected');

    let itemHref = item.getAttribute('href');
    if (!itemHref) {
      return;
    }

    const normalizedHref = normalizePageId(itemHref);
    if (normalizedHref !== normalizedCurrentPage) {
      return;
    }

    item.classList.add('nav-item-active');
    item.setAttribute('aria-current', 'page');
    item.setAttribute('aria-selected', 'true');
    if (typeof item.active === 'boolean') {
      item.active = true;
    }

    const nestedParent = item.closest('.nested-list');
    if (!nestedParent || !nestedParent.id) {
      return;
    }

    const toggleButton = document.querySelector(`[aria-controls="${nestedParent.id}"]`);
    if (toggleButton && !toggleButton.classList.contains('expanded')) {
      toggleButton.click();
    }
  });
}

export default updateActiveNavLink;
