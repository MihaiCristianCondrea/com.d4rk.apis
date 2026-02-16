import { Workspaces, getWorkspaceAnchor } from '../../src/entities/workspace/index.js';

describe('entities/workspace', () => {
  test('registry exposes canonical workspace ids', () => {
    expect(Workspaces.app_toolkit.id).toBe('app_toolkit');
    expect(Workspaces.faq.route).toBe('faq');
  });

  test('getWorkspaceAnchor resolves route-based hash', () => {
    expect(getWorkspaceAnchor(Workspaces.app_toolkit)).toBe('#app-toolkit-api');
    expect(getWorkspaceAnchor('faq')).toBe('#faq-api');
  });
});
