/**
 * @file DTO definition for FAQ question payloads.
 *
 * Change Rationale: Document the FAQ question payload shape in the Help data
 * layer for consistent mapping and validation.
 */

/**
 * @typedef {Object} FaqQuestionDto
 * @property {string} [id] - Unique question identifier.
 * @property {string} [question] - FAQ question headline.
 * @property {string} [answerHtml] - HTML answer body.
 * @property {string[]} [categories] - Category identifiers for grouping.
 * @property {boolean} [isFeatured] - Whether the FAQ is featured.
 * @property {string|null} [icon] - Material icon name.
 */

export const FaqQuestionDtoShape = {
  id: '',
  question: '',
  answerHtml: '',
  categories: [],
  isFeatured: false,
  icon: null,
};
