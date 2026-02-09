/**
 * @file UI controller for App Toolkit sort menu interactions.
 */

/**
 * Wires sort menu behavior.
 *
 * @param {{sortButton: HTMLElement|null, sortMenu: HTMLElement|null, onSelect: (sortKey: string) => void, onMenuItemsReady?: (items: HTMLElement[]) => void}} deps Controller dependencies.
 * @returns {void}
 */
export function wireSortMenuController({ sortButton, sortMenu, onSelect, onMenuItemsReady }) {
  if (!sortMenu) return;

  if (sortButton && 'anchorElement' in sortMenu) {
    try { sortMenu.anchorElement = sortButton; } catch (error) { console.warn('AppToolkit: Unable to set sort menu anchor.', error); }
  }

  const menuItems = Array.from(sortMenu.querySelectorAll('[data-sort-key]'));
  if (typeof onMenuItemsReady === 'function') onMenuItemsReady(menuItems);

  const selectFromIndex = (index) => {
    const selectedItem = index >= 0 ? menuItems[index] : null;
    if (selectedItem) onSelect(selectedItem.dataset.sortKey || '');
  };

  menuItems.forEach((item) => item.addEventListener('click', () => onSelect(item.dataset.sortKey || '')));
  sortMenu.addEventListener('action', (event) => selectFromIndex(typeof event.detail?.index === 'number' ? event.detail.index : -1));
  sortMenu.addEventListener('selected', (event) => selectFromIndex(typeof event.detail?.index === 'number' ? event.detail.index : -1));
  sortMenu.addEventListener('closed', () => { if (sortButton) sortButton.setAttribute('aria-expanded', 'false'); });

  if (sortButton) {
    sortButton.addEventListener('click', () => {
      const nextState = !sortMenu.open;
      sortMenu.open = nextState;
      sortButton.setAttribute('aria-expanded', nextState ? 'true' : 'false');
    });
  }
}
