/**
 * @file View helper for Help screen menu actions.
 *
 * Change Rationale: Extract dropdown menu rendering into its own module to match
 * the requested view hierarchy for Help UI components.
 */

/**
 * Creates a simple action menu list for Help screen dropdowns.
 *
 * @param {Array<{ id: string, label: string }>} actions - Action list.
 * @returns {HTMLUListElement} Menu list element.
 */
export function createHelpScreenMenuActions(actions = []) {
  const menu = document.createElement('ul');
  menu.className = 'help-menu-actions';
  actions.forEach((action) => {
    const item = document.createElement('li');
    item.textContent = action.label;
    item.dataset.actionId = action.id;
    menu.appendChild(item);
  });
  return menu;
}
