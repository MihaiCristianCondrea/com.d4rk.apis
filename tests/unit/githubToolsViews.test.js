/**
 * @file Validates GitHub tool screen view composition helpers.
 */

// Change Rationale: GitHub tool screens now compose shared views, so tests cover the
// token replacement helpers used to build screen HTML.
const {
  applyTemplateTokens,
  composeGitHubToolScreen,
  renderEmptyStateView,
  renderToolCardView,
  renderToolHeaderView,
} = require('../../app/src/main/js/app/githubtools/common/ui/githubToolsViewComposer.js');

describe('githubToolsViewComposer', () => {
  test('applyTemplateTokens replaces tokens with values', () => {
    const template = 'Hello {{name}}!';
    expect(applyTemplateTokens(template, { name: 'World' })).toBe('Hello World!');
  });

  test('renderToolHeaderView fills header tokens', () => {
    const template = '<h1>{{title}}</h1><p>{{subtext}}</p><span>{{eyebrow}}</span>';
    const html = renderToolHeaderView({
      template,
      eyebrow: 'GitHub Tools',
      title: 'Repo Mapper',
      subtext: 'Maps repos.',
    });
    expect(html).toContain('Repo Mapper');
    expect(html).toContain('Maps repos.');
    expect(html).toContain('GitHub Tools');
  });

  test('renderToolCardView injects content', () => {
    const template = '<div>{{content}}</div>';
    const html = renderToolCardView({ template, content: '<form></form>' });
    expect(html).toBe('<div><form></form></div>');
  });

  test('renderEmptyStateView injects id and message', () => {
    const template = '<div id="{{id}}">{{message}}</div>';
    const html = renderEmptyStateView({
      template,
      id: 'mapper-error',
      message: 'Oops',
    });
    expect(html).toBe('<div id="mapper-error">Oops</div>');
  });

  test('composeGitHubToolScreen replaces view placeholders', () => {
    const screenTemplate = '{{GH_TOOL_HEADER}} {{GH_TOOL_CARD}} {{GH_TOOL_ERROR}}';
    const html = composeGitHubToolScreen({
      screenTemplate,
      headerView: '<header></header>',
      cardView: '<div></div>',
      emptyStateView: '<span></span>',
    });
    expect(html).toBe('<header></header> <div></div> <span></span>');
  });
});
