/**
 * @file Entity API for FAQ question normalization.
 */

/**
 * Normalizes FAQ question payload.
 *
 * @param {unknown} question Raw FAQ payload.
 * @returns {{id:string,question:string,answer:string}} Normalized FAQ question.
 */
export function normalizeFaqQuestion(question) {
  const source = question && typeof question === 'object' ? question : {};
  const id = String(source.id ?? source.question_id ?? '').trim();
  const questionText = String(source.question ?? source.title ?? '').trim();
  const answer = String(source.answer ?? source.content ?? '').trim();
  return { id, question: questionText, answer };
}

/**
 * Validates FAQ entity invariants.
 *
 * @param {{id:string,question:string,answer:string}} faq Normalized FAQ payload.
 * @returns {boolean} True when required fields are present.
 */
export function isValidFaqQuestion(faq) {
  return Boolean(faq && faq.id && faq.question && faq.answer);
}
