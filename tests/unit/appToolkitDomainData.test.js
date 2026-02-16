import {
  createCategoryCatalog,
  createEmptyCategory,
  normalizeCategoryInput,
  createCategoryId
} from '../../src/entities/app-toolkit-category/index.js';
import { isValidPackageName } from '../../src/entities/app-toolkit-category/index.js';
import { createFileHandleStore } from '../../src/app/workspaces/app-toolkit/data/services/fileHandleStoreService.js';

/**
 * Change Rationale:
 * - Extracted domain/data helpers must be verified independently from route wiring.
 * - These tests keep normalization and IO fallback behavior deterministic.
 */

describe('NormalizeAppToolkitCategoryUseCase', () => {
  const trimString = (value) => String(value || '').trim();

  test('normalizes known categories and preserves fallback labels', () => {
    const { categoryById } = createCategoryCatalog(trimString);
    expect(normalizeCategoryInput('Art & Design', { trimString, categoryById })).toEqual({
      label: 'Art & Design',
      category_id: 'art_and_design'
    });
    expect(normalizeCategoryInput({ label: 'custom tools' }, { trimString, categoryById })).toEqual({
      label: 'Custom Tools',
      category_id: 'custom_tools'
    });
    expect(createEmptyCategory()).toEqual({ label: '', category_id: '' });
    expect(createCategoryId('Maps & Navigation', trimString)).toBe('maps_and_navigation');
  });

  test('validates package names with reverse-domain format', () => {
    expect(isValidPackageName('com.example.app', trimString)).toBe(true);
    expect(isValidPackageName('example', trimString)).toBe(false);
  });
});

describe('fileHandleStoreService', () => {
  test('falls back safely when indexedDB is unavailable', async () => {
    const originalIndexedDb = global.indexedDB;
    Object.defineProperty(global, 'indexedDB', { value: undefined, configurable: true });

    const store = createFileHandleStore({ dbName: 'test', storeName: 'handles', key: 'k' });
    await expect(store.set({ token: 'abc' })).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBeUndefined();
    await expect(store.get()).resolves.toBeNull();

    Object.defineProperty(global, 'indexedDB', { value: originalIndexedDb, configurable: true });
  });
});
