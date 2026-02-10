/**
 * @file Ensures the Home content data source exports stable configuration arrays.
 */

// Change Rationale: Home content exports moved to a dedicated data source module, so the tests
// now validate the new canonical path without touching UI code.
const {
  githubTools,
  workspaceCards,
} = require('../../src/app/home/data/homeContentDataSource.js');

describe('homeContentDataSource', () => {
  test('exports workspace cards with required fields', () => {
    expect(Array.isArray(workspaceCards)).toBe(true);
    expect(workspaceCards.length).toBeGreaterThan(0);
    workspaceCards.forEach((card) => {
      expect(card).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          href: expect.any(String),
          icon: expect.any(String),
          kicker: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
        }),
      );
    });
  });

  test('exports GitHub tool cards with required fields', () => {
    expect(Array.isArray(githubTools)).toBe(true);
    expect(githubTools.length).toBeGreaterThan(0);
    githubTools.forEach((tool) => {
      expect(tool).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          href: expect.any(String),
          icon: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
        }),
      );
    });
  });
});
