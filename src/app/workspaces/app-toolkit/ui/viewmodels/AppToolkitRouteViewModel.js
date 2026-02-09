/**
 * @file App Toolkit route-level UI state defaults.
 *
 * Change Rationale: App Toolkit route constants previously lived inside the monolithic
 * route/controller module. Moving static UI configuration into a dedicated view model keeps
 * controller wiring focused on event orchestration while making state defaults explicit.
 */

/**
 * Creates route view-model defaults used by App Toolkit UI controllers.
 *
 * @returns {{ defaultFilename: string, minGithubTokenLength: number, githubChannelPaths: Record<string,string> }}
 */
export function createAppToolkitRouteViewModel() {
  return {
    defaultFilename: 'api_android_apps.json',
    minGithubTokenLength: 20,
    githubChannelPaths: {
      debug: 'api/app_toolkit/v2/debug/en/home/api_android_apps.json',
      release: 'api/app_toolkit/v2/release/en/home/api_android_apps.json',
    },
  };
}
