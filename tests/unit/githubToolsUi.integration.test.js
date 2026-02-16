const {
  initFavoritesPage,
} = require('../../src/features/github-tools/common/ui/githubToolsUi.js');

describe('githubTools UI integration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section>
        <div id="favorites-empty" hidden>No favorites</div>
        <div id="favorites-grid"></div>
      </section>
    `;
    localStorage.clear();
    sessionStorage.clear();
  });

  test('renders favorite cards from localStorage', () => {
    localStorage.setItem('github_tool_favorites', JSON.stringify([{ slug: 'foo/bar' }]));
    initFavoritesPage();

    const grid = document.getElementById('favorites-grid');
    const empty = document.getElementById('favorites-empty');
    expect(grid.hidden).toBe(false);
    expect(empty.hidden).toBe(true);
    expect(grid.querySelectorAll('.gh-favorite-card')).toHaveLength(1);
    expect(grid.textContent).toContain('foo/bar');
  });
});
