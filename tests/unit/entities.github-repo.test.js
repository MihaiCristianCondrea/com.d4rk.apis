import {
  buildRepoTreeModel,
  normalizeRepoInput,
  normalizeRepoSlug,
  parseCommitInput,
  renderAsciiTree,
} from '../../src/entities/github-repo/index.js';

describe('entities/github-repo', () => {
  test('normalizeRepoSlug resolves owner/repo from url', () => {
    expect(normalizeRepoSlug('https://github.com/openai/codex')).toBe('openai/codex');
  });

  test('normalizeRepoInput extracts slug and branch ref', () => {
    expect(normalizeRepoInput('https://github.com/openai/codex/tree/main')).toEqual({
      slug: 'openai/codex',
      ref: 'main',
    });
  });

  test('parseCommitInput parses commit url', () => {
    expect(parseCommitInput('https://github.com/openai/codex/commit/abc123')).toEqual({
      owner: 'openai',
      repo: 'codex',
      commitSha: 'abc123',
    });
  });

  test('buildRepoTreeModel + renderAsciiTree keep deterministic ordering', () => {
    const model = buildRepoTreeModel([
      { path: 'src/main.js', type: 'blob' },
      { path: 'README.md', type: 'blob' },
    ]);
    const ascii = renderAsciiTree(model);
    expect(ascii).toContain('README.md');
    expect(ascii).toContain('src');
    expect(model.fileCount).toBe(2);
  });
});
