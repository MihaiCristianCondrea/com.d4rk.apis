const HEADERS = {
    'Accept': 'application/vnd.github.v3+json',
};

const getHeaders = (token) => {
    if (token) {
        return { ...HEADERS, 'Authorization': `token ${token}` };
    }
    return HEADERS;
};

export const fetchRepositoryTree = async ({ owner, repo }, token) => {
    const headers = getHeaders(token);

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

    if (!repoRes.ok) {
        if (repoRes.status === 404) throw new Error('Repository not found. Use a token if it is private.');
        if (repoRes.status === 403) throw new Error('API rate limit exceeded. Please provide a token.');
        throw new Error(`Error: ${repoRes.statusText}`);
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch;

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });

    if (!treeRes.ok) throw new Error('Failed to fetch file tree.');

    const treeData = await treeRes.json();

    return {
        tree: treeData.tree,
        truncated: treeData.truncated
    };
};

export const fetchReleaseStats = async ({ owner, repo }, token) => {
    const headers = getHeaders(token);

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`, { headers });

    if (!response.ok) {
        if (response.status === 404) throw new Error('Repository not found.');
        if (response.status === 403) throw new Error('API rate limit exceeded.');
        throw new Error(`Error: ${response.statusText}`);
    }

    const releases = await response.json();

    if (!releases || releases.length === 0) {
        throw new Error('No releases found for this repository.');
    }

    let grandTotal = 0;
    const processedReleases = releases.map(release => {
        const releaseDownloads = release.assets.reduce((sum, asset) => sum + asset.download_count, 0);
        grandTotal += releaseDownloads;

        return {
            name: release.name || release.tag_name,
            tagName: release.tag_name,
            publishedAt: release.published_at,
            totalDownloads: releaseDownloads,
            assets: release.assets.map(a => ({
                name: a.name,
                downloads: a.download_count
            })).sort((a, b) => b.downloads - a.downloads)
        };
    });

    return {
        owner,
        repo,
        totalDownloads: grandTotal,
        releases: processedReleases
    };
};

export const fetchCommitPatch = async ({ owner, repo, commitSha }, token) => {
    const baseHeaders = getHeaders(token);
    const headers = {
        ...baseHeaders,
        'Accept': 'application/vnd.github.v3.patch'
    };

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`, { headers });

    if (!response.ok) {
        if (response.status === 404) throw new Error('Commit not found.');
        if (response.status === 403) throw new Error('API rate limit exceeded.');
        throw new Error(`Error: ${response.statusText}`);
    }

    return await response.text();
};
