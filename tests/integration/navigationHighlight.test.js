/**
 * @file Navigation active-state tests for the canonical rail + drawer links.
 */
/*
 * Change Rationale: Verify the router-owned active state highlights both rail and
 * drawer links so navigation stays synchronized across breakpoints.
 */
const { updateActiveNavLink } = require('../../app/src/main/js/core/ui/router/navigationState.js');

/**
 * Seeds the DOM with navigation rail + drawer links for active state testing.
 *
 * @returns {void}
 */
function seedNavigationMarkup() {
  document.body.innerHTML = `
    <nav id="navRail">
      <a href="#home" data-nav-link>Home</a>
      <a href="#repo-mapper" data-nav-link>Repo Mapper</a>
    </nav>
    <dialog id="navDrawer">
      <a href="#home" data-nav-link>Home</a>
      <a href="#repo-mapper" data-nav-link>Repo Mapper</a>
    </dialog>
  `;
}

describe('navigation active state', () => {
  beforeEach(() => {
    seedNavigationMarkup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('highlights matching nav links across rail and drawer', () => {
    updateActiveNavLink('repo-mapper');

    const activeLinks = Array.from(document.querySelectorAll('[data-nav-link].active'));
    expect(activeLinks).toHaveLength(2);

    activeLinks.forEach((link) => {
      expect(link.classList.contains('primary-container')).toBe(true);
      expect(link.getAttribute('aria-current')).toBe('page');
    });
  });
});
