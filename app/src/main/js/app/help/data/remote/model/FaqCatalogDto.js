/**
 * @file DTO definition for FAQ catalog payloads.
 *
 * Change Rationale: Capture the remote catalog shape explicitly to keep data
 * contracts documented within the Help feature structure.
 */

/**
 * @typedef {Object} FaqCatalogDto
 * @property {number} [schemaVersion] - Schema version for the catalog.
 * @property {Array<object>} [products] - List of product entries in the catalog.
 */

export const FaqCatalogDtoShape = {
  schemaVersion: 1,
  products: [],
};
