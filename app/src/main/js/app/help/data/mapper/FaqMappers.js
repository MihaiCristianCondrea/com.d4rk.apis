/**
 * @file Mapping helpers for FAQ data transfer objects.
 *
 * Change Rationale: Provide mapper utilities in the Help data layer so future
 * refactors can isolate DTO normalization without touching UI code.
 */

/**
 * Normalizes a raw FAQ catalog DTO into a domain-friendly shape.
 *
 * @param {import('../remote/model/FaqCatalogDto.js').FaqCatalogDto} dto - Raw catalog DTO.
 * @returns {import('../../domain/model/FaqItem.js').FaqCatalog} Normalized catalog.
 */
export function mapFaqCatalogDto(dto) {
  return {
    schemaVersion: dto?.schemaVersion ?? 1,
    products: Array.isArray(dto?.products) ? dto.products : [],
  };
}

/**
 * Normalizes a raw FAQ question DTO into a domain-friendly shape.
 *
 * @param {import('../remote/model/FaqQuestionDto.js').FaqQuestionDto} dto - Raw question DTO.
 * @returns {import('../../domain/model/FaqItem.js').FaqItem} Normalized FAQ item.
 */
export function mapFaqQuestionDto(dto) {
  return {
    id: String(dto?.id ?? ''),
    question: String(dto?.question ?? ''),
    answerHtml: String(dto?.answerHtml ?? ''),
    categories: Array.isArray(dto?.categories) ? dto.categories : [],
    isFeatured: Boolean(dto?.isFeatured),
    icon: dto?.icon ?? null,
  };
}
