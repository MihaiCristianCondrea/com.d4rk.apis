/**
 * @file View helper for the main Help screen content area.
 *
 * Change Rationale: Provide a single rendering helper for Help screen content so
 * future UI updates can be centralized in the feature structure.
 */

/**
 * Creates the Help screen content container.
 *
 * @param {HTMLElement[]} children - Child elements to append.
 * @returns {HTMLElement} Content container.
 */
export function createHelpScreenContent(children = []) {
  const container = document.createElement('section');
  container.className = 'help-screen-content';
  children.forEach((child) => {
    if (child) {
      container.appendChild(child);
    }
  });
  return container;
}
