/**
 * @file Entity API for lesson payload normalization.
 */

/**
 * Normalizes lesson payload to deterministic primitive fields.
 *
 * @param {unknown} lesson Raw lesson payload.
 * @returns {{id:string,title:string,summary:string}} Normalized lesson.
 */
export function normalizeLesson(lesson) {
  const source = lesson && typeof lesson === 'object' ? lesson : {};
  const id = String(source.id ?? source.lesson_id ?? '').trim();
  const title = String(source.title ?? source.lesson_title ?? '').trim();
  const summary = String(source.summary ?? source.description ?? '').trim();
  return { id, title, summary };
}

/**
 * Validates normalized lesson invariants.
 *
 * @param {{id:string,title:string,summary:string}} lesson Normalized lesson.
 * @returns {boolean} True when lesson has required fields.
 */
export function isValidLesson(lesson) {
  return Boolean(lesson && lesson.id && lesson.title);
}
