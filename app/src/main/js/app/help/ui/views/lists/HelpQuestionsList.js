/**
 * @file View helper for rendering FAQ question lists.
 *
 * Change Rationale: Provide a list renderer within the Help UI views so the
 * requested list view hierarchy is present without altering existing UI flows.
 */

import { createQuestionCard } from '../cards/QuestionCard.js';

/**
 * Creates a list of FAQ question cards.
 *
 * @param {Array<import('../../../domain/model/FaqItem.js').FaqItem>} items - FAQ items.
 * @returns {HTMLElement} List container.
 */
export function createHelpQuestionsList(items = []) {
  const list = document.createElement('div');
  list.className = 'help-questions-list';
  items.forEach((item) => {
    list.appendChild(createQuestionCard(item));
  });
  return list;
}
