import { createAppToolkitRouteViewModel } from '../../src/app/workspaces/app-toolkit/ui/viewmodels/AppToolkitRouteViewModel.js';

describe('AppToolkitRouteViewModel', () => {
  test('provides stable route defaults for filename/token/channel paths', () => {
    const vm = createAppToolkitRouteViewModel();
    expect(vm.defaultFilename).toBe('api_android_apps.json');
    expect(vm.minGithubTokenLength).toBe(20);
    expect(vm.githubChannelPaths).toEqual({
      debug: 'api/app_toolkit/v2/debug/en/home/api_android_apps.json',
      release: 'api/app_toolkit/v2/release/en/home/api_android_apps.json',
    });
  });
});
