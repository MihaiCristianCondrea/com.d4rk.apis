/**
 * @file View helper for FAQ question cards.
 *
 * Change Rationale: Add a dedicated question card renderer so Help UI views can
 * reuse consistent markup without affecting existing FAQ layout behavior.
 */

/**
 * Creates a question card element.
 *
 * @param {import('../../../domain/model/FaqItem.js').FaqItem} item - FAQ item to render.
 * @returns {HTMLElement} Card element.
 */
export function createQuestionCard(item) {
  const card = document.createElement('article');
  card.className = 'help-question-card';
  const title = document.createElement('h6');
  title.textContent = item?.question ?? '';
  const body = document.createElement('div');
  body.innerHTML = item?.answerHtml ?? '';
  card.append(title, body);
  return card;
}
