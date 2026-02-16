import {
  createCategoryCatalog,
  createCategoryId,
  normalizeCategoryInput,
  isValidPackageName,
} from '../../src/entities/app-toolkit-category/index.js';

describe('entities/app-toolkit-category', () => {
  const trimString = (value) => String(value || '').trim();

  test('createCategoryId normalizes labels', () => {
    expect(createCategoryId('Art & Design', trimString)).toBe('art_and_design');
  });

  test('normalizeCategoryInput resolves from catalog ids', () => {
    const { categoryById } = createCategoryCatalog(trimString);
    expect(normalizeCategoryInput('art_and_design', { trimString, categoryById })).toEqual({
      label: 'Art & Design',
      category_id: 'art_and_design',
    });
  });

  test('package validation enforces reverse domain', () => {
    expect(isValidPackageName('com.example.app', trimString)).toBe(true);
    expect(isValidPackageName('invalid package', trimString)).toBe(false);
  });
});
