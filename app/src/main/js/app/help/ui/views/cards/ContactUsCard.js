/**
 * @file View helper for the Help "Contact Us" card.
 *
 * Change Rationale: Provide a reusable card view module to align Help UI views
 * with the requested feature structure while keeping the current screen logic
 * unchanged.
 */

/**
 * Creates a simple contact card element.
 *
 * @param {{ title?: string, description?: string }} [options] - Card content.
 * @returns {HTMLElement} Card element.
 */
export function createContactUsCard(options = {}) {
  const { title = 'Contact support', description = 'Reach out for additional help.' } = options;
  const card = document.createElement('article');
  card.className = 'help-contact-card';
  const heading = document.createElement('h5');
  heading.textContent = title;
  const body = document.createElement('p');
  body.textContent = description;
  card.append(heading, body);
  return card;
}
