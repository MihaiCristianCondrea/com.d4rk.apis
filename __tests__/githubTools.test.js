const {
  buildRepoTreeModel,
  formatReleaseCsv,
  formatReleaseSummary,
  normalizeRepoSlug,
  normalizeRepoInput,
  parseCommitInput,
  renderAsciiTree,
  renderPathList,
// Change Rationale: GitHub tools now live under the `app/githubtools/common` feature namespace,
// so tests should import from the canonical path to stay aligned with the refactor.
} = require('../app/src/main/js/app/githubtools/common/domain/githubTools.js');

describe('normalizeRepoSlug', () => {
  test('extracts owner and repo from full URL', () => {
    expect(normalizeRepoSlug('https://github.com/d4rk7355608/com.d4rk.apis')).toBe(
      'd4rk7355608/com.d4rk.apis',
    );
  });

  test('returns owner/repo when provided a valid slug with dots', () => {
    expect(normalizeRepoSlug('MihaiCristianCondrea/com.d4rk.apis')).toBe(
      'MihaiCristianCondrea/com.d4rk.apis',
    );
  });

  test('derives slug from compact dot form', () => {
    expect(normalizeRepoSlug('MihaiCristianCondrea.com.d4rk.apis')).toBe(
      'MihaiCristianCondrea.com.d4rk/apis',
    );
  });

  test('derives slug from CamelCase compact input', () => {
    expect(normalizeRepoSlug('OpenAIRepo')).toBe('OpenAI/Repo');
  });

  test('returns empty string for invalid input', () => {
    expect(normalizeRepoSlug('not-a-url')).toBe('');
  });
});

describe('normalizeRepoInput', () => {
  test('extracts branch refs from tree URLs', () => {
    expect(
      normalizeRepoInput('https://github.com/MihaiCristianCondrea/App-Toolkit-for-Android/tree/develop'),
    ).toEqual({
      slug: 'MihaiCristianCondrea/App-Toolkit-for-Android',
      ref: 'develop',
    });
  });

  test('returns empty ref when none is present', () => {
    expect(normalizeRepoInput('foo/bar')).toEqual({ slug: 'foo/bar', ref: '' });
  });
});

describe('parseCommitInput', () => {
  test('parses commit URLs', () => {
    const parsed = parseCommitInput('https://github.com/foo/bar/commit/abcdef123');
    expect(parsed).toEqual({ owner: 'foo', repo: 'bar', commitSha: 'abcdef123' });
  });

  test('parses shorthand owner/repo@sha', () => {
    const parsed = parseCommitInput('foo/bar@12345');
    expect(parsed).toEqual({ owner: 'foo', repo: 'bar', commitSha: '12345' });
  });

  test('returns null for invalid commit strings', () => {
    expect(parseCommitInput('foo')).toBeNull();
  });
});

describe('repository tree helpers', () => {
  const tree = [
    { path: 'src/index.js', type: 'blob' },
    { path: 'src/utils/helpers.js', type: 'blob' },
    { path: 'src/utils', type: 'tree' },
    { path: 'README.md', type: 'blob' },
  ];

  test('builds counts for files and folders', () => {
    const model = buildRepoTreeModel(tree);
    expect(model.fileCount).toBe(3);
    expect(model.folderCount).toBe(2);
  });

  test('renders ASCII tree in sorted order', () => {
    const model = buildRepoTreeModel(tree);
    const output = renderAsciiTree(model).split('\n');
    expect(output[0]).toContain('src');
    expect(output).toContain('└── README.md');
  });

  test('renders path list', () => {
    const list = renderPathList(tree).split('\n');
    expect(list[0]).toBe('README.md');
    expect(list[list.length - 1]).toBe('src/utils/helpers.js');
  });
});

describe('release summary formatting', () => {
  const sample = {
    owner: 'foo',
    repo: 'bar',
    totalDownloads: 30,
    releases: [
      {
        name: 'v1',
        tagName: 'v1',
        publishedAt: '2024-01-01',
        totalDownloads: 20,
        url: 'example.com',
        assets: [
          { name: 'a.zip', downloads: 10, browserDownloadUrl: 'a' },
          { name: 'b.zip', downloads: 10, browserDownloadUrl: 'b' },
        ],
      },
      {
        name: 'v0',
        tagName: 'v0',
        publishedAt: '2023-12-01',
        totalDownloads: 10,
        url: 'example.com',
        assets: [],
      },
    ],
  };

  test('summarizes releases for JSON', () => {
    const summary = formatReleaseSummary(sample);
    expect(summary.repository).toBe('foo/bar');
    expect(summary.releases[0].assets).toHaveLength(2);
  });

  test('creates CSV rows with headers', () => {
    const csv = formatReleaseCsv(sample).split('\n');
    expect(csv[0]).toBe('"Release","Tag","Published","Total Downloads","Asset","Asset Downloads"');
    expect(csv[csv.length - 1]).toContain('v0');
  });
});
