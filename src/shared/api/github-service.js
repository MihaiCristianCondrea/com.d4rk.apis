const DEFAULT_ACCEPT = 'application/vnd.github.v3+json';

const buildHeaders = (token, accept = DEFAULT_ACCEPT) => {
  const headers = { Accept: accept };
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  return headers;
};

const handleGithubError = async (response, {
  notFoundMessage,
  rateLimitMessage,
  defaultMessage,
} = {}) => {
  if (response.ok) return;

  let message = defaultMessage || 'GitHub request failed.';
  if (response.status === 404 && notFoundMessage) message = notFoundMessage;
  if (response.status === 403 && rateLimitMessage) message = rateLimitMessage;

  try {
    const data = await response.json();
    if (data?.message) message = data.message;
  } catch (error) {
    // ignore parse errors and fall back to existing message
  }

  throw new Error(message);
};

/**
 * Fetches a repository tree for a specific ref, defaulting to the repository's default branch.
 *
 * @param {{ owner: string, repo: string, ref?: string }} params Repository coordinates and optional ref.
 * @param {string} token Optional personal access token for authenticated requests.
 * @returns {Promise<{ tree: Array, truncated: boolean }>} Git tree payload.
 */
export const fetchRepositoryTree = async ({ owner, repo, ref }, token) => {
  const headers = buildHeaders(token);

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    await handleGithubError(repoRes, {
      notFoundMessage: 'Repository not found. Use a token if it is private.',
      rateLimitMessage: 'API rate limit exceeded. Please provide a token.',
      defaultMessage: 'Unable to load repository metadata.',
    });
  }

  const repoData = await repoRes.json();
  /* Change Rationale: Allowing a caller-provided ref enables branch-specific mapping requests
   * (e.g., `/tree/develop`) while preserving the previous default-branch behavior for callers
   * that omit a ref. This aligns the data layer with the Repo Mapper UX expectations.
   */
  const defaultBranch = repoData.default_branch;
  const targetRef = ref || defaultBranch;

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetRef}?recursive=1`,
    { headers },
  );

  if (!treeRes.ok) {
    await handleGithubError(treeRes, {
      defaultMessage: 'Failed to fetch file tree.',
      rateLimitMessage: 'API rate limit exceeded. Please provide a token.',
    });
  }

  const treeData = await treeRes.json();

  return {
    tree: Array.isArray(treeData.tree) ? treeData.tree : [],
    truncated: Boolean(treeData.truncated),
  };
};

export const fetchReleaseStats = async ({ owner, repo }, token) => {
  const headers = buildHeaders(token);

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`,
    { headers },
  );

  if (!response.ok) {
    await handleGithubError(response, {
      notFoundMessage: 'Repository not found.',
      rateLimitMessage: 'API rate limit exceeded.',
      defaultMessage: 'Failed to fetch releases.',
    });
  }

  const releases = await response.json();

  if (!Array.isArray(releases) || releases.length === 0) {
    throw new Error('No releases found for this repository.');
  }

  const processedReleases = releases.map((release) => {
    const releaseDownloads = release.assets.reduce(
      (sum, asset) => sum + asset.download_count,
      0,
    );

    const assets = release.assets
      .map((asset) => ({
        name: asset.name,
        downloads: asset.download_count,
        browserDownloadUrl: asset.browser_download_url,
      }))
      .sort((a, b) => b.downloads - a.downloads);

    return {
      name: release.name || release.tag_name,
      tagName: release.tag_name,
      publishedAt: release.published_at,
      totalDownloads: releaseDownloads,
      url: release.html_url,
      assets,
    };
  });

  const totalDownloads = processedReleases.reduce(
    (sum, release) => sum + release.totalDownloads,
    0,
  );

  return {
    owner,
    repo,
    totalDownloads,
    releases: processedReleases,
  };
};

export const fetchCommitPatch = async ({ owner, repo, commitSha }, token) => {
  const headers = buildHeaders(token, 'application/vnd.github.v3.patch');

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`,
    { headers },
  );

  if (!response.ok) {
    await handleGithubError(response, {
      notFoundMessage: 'Commit not found.',
      rateLimitMessage: 'API rate limit exceeded.',
      defaultMessage: 'Failed to fetch patch.',
    });
  }

  return response.text();
};
