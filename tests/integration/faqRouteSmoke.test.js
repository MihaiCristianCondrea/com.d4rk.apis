/**
 * @file Smoke tests for the FAQ workspace route registration.
 */

jest.mock(
  '../../src/pages/workspaces/faq/ui/faq.page.html?raw',
  /**
   * Returns a mock FAQ screen template string for Jest.
   *
   * @returns {string} Mock HTML for the FAQ screen.
   */
  function createFaqScreenMock() {
    return '<div id="faqPage"></div>';
  },
  { virtual: true },
);
jest.mock(
  '../../src/shared/workspaces/ui/views/workspace-insight-card.view.html?raw',
  /**
   * Returns a mock workspace insight card template string for Jest.
   *
   * @returns {string} Mock HTML for the shared insight card view.
   */
  function createWorkspaceInsightCardMock() {
    return '<template data-partial="workspace-insight-card"></template>';
  },
  { virtual: true },
);

const { RouterRoutes } = require('../../src/core/ui/router/routes.js');

require('../../src/pages/workspaces/faq/index.js');

/**
 * Defines the FAQ route smoke test suite.
 *
 * @returns {void}
 */
function defineFaqRouteSmokeSuite() {
  test('route resolves and renders without throwing', verifyFaqRouteRendering);
}

/**
 * Verifies the FAQ route resolves, loads HTML, and renders safely.
 *
 * @returns {void}
 */
function verifyFaqRouteRendering() {
  const route = RouterRoutes.getRoute('faq-api');

  expect(route).not.toBeNull();
  expect(route.inlineHtml).toContain('faqPage');

  const container = document.createElement('div');
  expect(() => {
    container.innerHTML = route.inlineHtml;
  }).not.toThrow();

  expect(container.querySelector('#faqPage')).not.toBeNull();
}

describe('faq route smoke', defineFaqRouteSmokeSuite);
