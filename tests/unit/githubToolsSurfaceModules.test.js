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
} from '../../src/features/github-tools/common/ui/github-tools-ui.js';
import { initRepoMapper } from '../../src/features/github-tools/common/ui/surfaces/mapper/repo-mapper-tool-ui.js';
import { initGitPatch } from '../../src/features/github-tools/common/ui/surfaces/gitpatch/git-patch-tool-ui.js';
import { initReleaseStats } from '../../src/features/github-tools/common/ui/surfaces/releasestats/release-stats-tool-ui.js';
import { initFavoritesPage } from '../../src/features/github-tools/common/ui/surfaces/favorites/favorites-tool-ui.js';

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
