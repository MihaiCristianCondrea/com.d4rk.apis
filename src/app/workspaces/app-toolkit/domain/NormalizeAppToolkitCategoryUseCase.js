import { GOOGLE_PLAY_CATEGORY_LABELS } from './model/AppToolkitCategory.js';

/**
 * @file Domain use case for normalizing App Toolkit category values.
 */

/**
 * Creates a normalized category id from user text.
 *
 * @param {string} value Raw label/id value.
 * @param {(value: string) => string} trimString Shared trimming utility.
 * @returns {string} Normalized category id.
 */
export function createCategoryId(value, trimString) {
  const normalized = trimString(value || '');
  if (!normalized) {
    return '';
  }
  return normalized.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * @returns {{label: string, category_id: string}} Empty category payload.
 */
export function createEmptyCategory() {
  return { label: '', category_id: '' };
}

/**
 * @param {string} label Raw category label.
 * @param {(value: string) => string} trimString Shared trimming utility.
 * @returns {string} Formatted title-cased label.
 */
export function formatCategoryLabel(label, trimString) {
  const normalized = trimString(label || '');
  if (!normalized) {
    return '';
  }
  return normalized
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Builds category lookup maps and list.
 *
 * @param {(value: string) => string} trimString Shared trimming utility.
 * @returns {{categories: Array<{id: string, label: string}>, categoryById: Map<string, {id: string, label: string}>}}
 */
export function createCategoryCatalog(trimString) {
  const categories = GOOGLE_PLAY_CATEGORY_LABELS.map((label) => ({ id: createCategoryId(label, trimString), label }));
  return {
    categories,
    categoryById: new Map(categories.map((category) => [category.id.toLowerCase(), category]))
  };
}

/**
 * Change Rationale:
 * - Category normalization previously lived inside the route module and was hard to unit test.
 * - Pulling this logic into a use case makes schema handling deterministic and reusable.
 * - Predictable normalization improves UX by keeping select options and exported JSON consistent.
 */

/**
 * Normalizes incoming category values.
 *
 * @param {unknown} input Raw category value.
 * @param {{trimString: (value: string) => string, categoryById: Map<string, {id: string, label: string}>}} deps Dependencies.
 * @returns {{label: string, category_id: string}} Normalized category value.
 */
export function normalizeCategoryInput(input, deps) {
  const { trimString, categoryById } = deps;
  const resolve = (candidate) => {
    if (!candidate) {
      return null;
    }
    const trimmed = trimString(candidate);
    if (!trimmed) {
      return null;
    }
    const mapped = categoryById.get(trimmed.toLowerCase()) || categoryById.get(createCategoryId(trimmed, trimString));
    return mapped ? { label: mapped.label, category_id: mapped.id } : null;
  };

  if (!input) return createEmptyCategory();
  if (typeof input === 'string') {
    const trimmed = trimString(input);
    if (!trimmed) return createEmptyCategory();
    const resolved = resolve(trimmed);
    if (resolved) return resolved;
    const fallbackId = createCategoryId(trimmed, trimString) || trimmed;
    return { label: formatCategoryLabel(trimmed, trimString), category_id: fallbackId };
  }

  if (typeof input === 'object') {
    const rawLabel = typeof input.label === 'string' ? trimString(input.label) : '';
    const rawIdCandidate =
      typeof input.category_id === 'string' ? trimString(input.category_id) : typeof input.id === 'string' ? trimString(input.id) : '';
    const resolved = resolve(rawIdCandidate) || resolve(rawLabel);
    if (resolved) return resolved;
    const derivedId = createCategoryId(rawIdCandidate || rawLabel, trimString);
    if (!rawLabel && !derivedId) return createEmptyCategory();
    const fallbackLabel = rawLabel || rawIdCandidate || derivedId;
    return { label: formatCategoryLabel(fallbackLabel, trimString), category_id: rawIdCandidate || derivedId || rawLabel };
  }

  return createEmptyCategory();
}
