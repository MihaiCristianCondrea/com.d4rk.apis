/**
 * @file Domain models for Help FAQ data.
 *
 * Change Rationale: Document FAQ domain shapes in the Help feature tree to
 * align with the requested domain/model structure.
 */

/**
 * @typedef {Object} FaqItem
 * @property {string} id - Unique FAQ identifier.
 * @property {string} question - Question headline.
 * @property {string} answerHtml - HTML answer content.
 * @property {string[]} categories - Category identifiers.
 * @property {boolean} isFeatured - Whether the FAQ is featured.
 * @property {string|null} icon - Material icon name.
 */

/**
 * @typedef {Object} FaqCatalog
 * @property {number} schemaVersion - Schema version for the catalog.
 * @property {Array<object>} products - Product entries defined in the catalog.
 */

export const FaqDomainShapes = {
  catalog: {
    schemaVersion: 1,
    products: [],
  },
  item: {
    id: '',
    question: '',
    answerHtml: '',
    categories: [],
    isFeatured: false,
    icon: null,
  },
};
