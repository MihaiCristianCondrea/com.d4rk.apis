/**
 * @file Pure GitHub tools domain helpers (no DOM, storage, or browser side effects).
 */

/**
 * Change Rationale: The previous monolithic module mixed storage/DOM integrations with parsing
 * and formatting logic. Keeping pure transforms isolated makes tests deterministic and preserves
 * Android-style data/domain/ui boundaries.
 */

/** @param {string} value @returns {string} */
function deriveCompactSlug(value) {
  const sanitized = value.replace(/\.git$/i, '').trim();
  if (!sanitized) return '';
  const dotIndex = sanitized.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < sanitized.length - 1) {
    return `${sanitized.slice(0, dotIndex)}/${sanitized.slice(dotIndex + 1)}`;
  }
  const hasUppercase = /[A-Z]/.test(sanitized);
  const segments = hasUppercase ? sanitized.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])/g) : null;
  if (segments && segments.length > 1) {
    const owner = segments.slice(0, -1).join('');
    const repo = segments[segments.length - 1];
    if (owner && repo) return `${owner}/${repo}`;
  }
  return '';
}

/** @param {string} value @returns {string} */
function normalizeRepoSlug(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const finalizeSlug = (owner, repo) => (owner && repo ? `${owner}/${repo}`.replace(/\.git$/i, '') : '');

  try {
    const url = new URL(trimmed, trimmed.startsWith('http') ? undefined : 'https://github.com');
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (owner && repo) return finalizeSlug(owner, repo);
  } catch (error) {
    // noop
  }

  const parts = trimmed.replace(/^https?:\/\/github.com\//i, '').split('/').filter(Boolean);
  if (parts.length >= 2) return finalizeSlug(parts[0], parts[1]);
  if (parts.length === 1) return deriveCompactSlug(parts[0]);
  return '';
}

/** @param {string} value @returns {{ slug: string, ref: string }} */
function normalizeRepoInput(value) {
  const slug = normalizeRepoSlug(value);
  if (!slug) return { slug: '', ref: '' };

  const findRef = (segments) => {
    const refIndex = segments.findIndex((part) => part === 'tree' || part === 'blob');
    return refIndex >= 0 && segments[refIndex + 1] ? segments.slice(refIndex + 1).join('/') : '';
  };

  let ref = '';
  try {
    const url = new URL(value, value.startsWith('http') ? undefined : 'https://github.com');
    ref = findRef(url.pathname.split('/').filter(Boolean));
  } catch (error) {
    // noop
  }

  if (!ref) {
    const segments = value.replace(/^https?:\/\/github.com\//i, '').split('/').filter(Boolean);
    ref = findRef(segments);
  }

  return { slug, ref };
}

/** @param {string} value @returns {{ owner: string, repo: string, commitSha: string } | null} */
function parseCommitInput(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const normalized = trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`;

  try {
    const url = new URL(normalized);
    const parts = url.pathname.split('/').filter(Boolean);
    const commitIndex = parts.findIndex((part) => part === 'commit');
    if (commitIndex >= 2 && parts[commitIndex + 1]) {
      return { owner: parts[commitIndex - 2], repo: parts[commitIndex - 1], commitSha: parts[commitIndex + 1] };
    }
  } catch (error) {
    // noop
  }

  const fallback = trimmed.replace(/^https?:\/\/github.com\//i, '').split('@');
  const slug = normalizeRepoSlug(fallback[0]);
  const sha = fallback[1];
  if (slug && sha) {
    const [owner, repo] = slug.split('/');
    return { owner, repo, commitSha: sha };
  }
  return null;
}

/** @param {Array<{path:string,type:'blob'|'tree'}>} [tree=[]] */
function buildRepoTreeModel(tree = []) {
  const root = { name: '', type: 'tree', children: new Map() };
  const folderSet = new Set();
  let fileCount = 0;
  [...tree].sort((a, b) => a.path.localeCompare(b.path)).forEach((entry) => {
    if (!entry?.path) return;
    const parts = entry.path.split('/').filter(Boolean);
    if (!parts.length) return;
    const isDirectory = entry.type === 'tree';
    for (let i = 0; i < parts.length - (isDirectory ? 0 : 1); i += 1) folderSet.add(parts.slice(0, i + 1).join('/'));
    if (isDirectory) folderSet.add(entry.path); else fileCount += 1;
    let cursor = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      const nodeType = isLeaf && !isDirectory ? 'file' : 'tree';
      if (!cursor.children.has(part)) cursor.children.set(part, { name: part, type: nodeType, children: new Map() });
      cursor = cursor.children.get(part);
    });
  });
  return { root, fileCount, folderCount: folderSet.size };
}

/** @param {{children: Map<string, {name:string,type:'file'|'tree',children:Map<string, any>}>}} node */
function sortTreeChildren(node) {
  return [...node.children.values()].sort((a, b) => (a.type !== b.type ? (a.type === 'tree' ? -1 : 1) : a.name.localeCompare(b.name)));
}

/** @param {{root: {children: Map<string, any>}}} treeModel */
function renderAsciiTree(treeModel) {
  const traverse = (node, prefix = '') => {
    const children = sortTreeChildren(node);
    return children.flatMap((child, index) => {
      const isLast = index === children.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      const line = `${prefix}${connector}${child.name}`;
      if (child.children.size === 0) return [line];
      return [line, ...traverse(child, nextPrefix)];
    });
  };
  return traverse(treeModel.root).join('\n');
}

/** @param {Array<{path:string}>} [tree=[]] */
function renderPathList(tree = []) {
  return tree.filter((entry) => entry?.path).sort((a, b) => a.path.localeCompare(b.path)).map((entry) => entry.path).join('\n');
}

/** @param {{owner:string,repo:string,totalDownloads:number,releases:Array<any>}} data */
function formatReleaseSummary(data) {
  return {
    repository: `${data.owner}/${data.repo}`,
    totalDownloads: data.totalDownloads,
    releases: data.releases.map((release) => ({
      name: release.name,
      tag: release.tagName,
      publishedAt: release.publishedAt,
      downloads: release.totalDownloads,
      assets: release.assets.map((asset) => ({
        name: asset.name,
        downloads: asset.downloads,
        browserDownloadUrl: asset.browserDownloadUrl,
      })),
    })),
  };
}

/** @param {{releases:Array<any>}} data */
function formatReleaseCsv(data) {
  const rows = [['Release', 'Tag', 'Published', 'Total Downloads', 'Asset', 'Asset Downloads']];
  data.releases.forEach((release) => {
    if (!release.assets.length) {
      rows.push([release.name, release.tagName, release.publishedAt, release.totalDownloads, '—', 0]);
      return;
    }
    release.assets.forEach((asset) => rows.push([release.name, release.tagName, release.publishedAt, release.totalDownloads, asset.name, asset.downloads]));
  });
  return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

/** @param {string} value @returns {string} */
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export {
  buildRepoTreeModel,
  formatDate,
  formatReleaseCsv,
  formatReleaseSummary,
  normalizeRepoInput,
  normalizeRepoSlug,
  parseCommitInput,
  renderAsciiTree,
  renderPathList,
};
