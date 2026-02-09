/**
 * @jest-environment jsdom
 */

import {
  initFavoritesPage as initFavoritesFromIndex,
  initGitPatch as initPatchFromIndex,
  initReleaseStats as initReleaseFromIndex,
  initRepoMapper as initMapperFromIndex,
  normalizeRepoSlug,
  parseCommitInput,
} from '../../src/app/githubtools/common/ui/githubToolsUi.js';
import { initRepoMapper } from '../../src/app/githubtools/common/ui/surfaces/mapper/RepoMapperToolUi.js';
import { initGitPatch } from '../../src/app/githubtools/common/ui/surfaces/gitpatch/GitPatchToolUi.js';
import { initReleaseStats } from '../../src/app/githubtools/common/ui/surfaces/releasestats/ReleaseStatsToolUi.js';
import { initFavoritesPage } from '../../src/app/githubtools/common/ui/surfaces/favorites/FavoritesToolUi.js';

describe('githubTools surface module index wiring', () => {
  test('central index composes mapper/patch/release/favorites surface initializers', () => {
    expect(initMapperFromIndex).toBe(initRepoMapper);
    expect(initPatchFromIndex).toBe(initGitPatch);
    expect(initReleaseFromIndex).toBe(initReleaseStats);
    expect(initFavoritesFromIndex).toBe(initFavoritesPage);
  });

  test('parser and commit transform exports remain available during surface split', () => {
    expect(normalizeRepoSlug('https://github.com/openai/codex')).toBe('openai/codex');
    expect(parseCommitInput('openai/codex@abcdef1')).toEqual({
      owner: 'openai',
      repo: 'codex',
      commitSha: 'abcdef1',
    });
  });
});
