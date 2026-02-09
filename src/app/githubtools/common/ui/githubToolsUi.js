// Change Rationale: GitHub tool domain logic now imports shared side-effect services from
// `core/data/services` to keep feature domain code free of legacy paths while preserving
// identical functionality and side effects.
import { copyToClipboard, downloadJson, downloadText } from '@/app/githubtools/common/data/services/githubToolsBrowserService.js';
import {
  fetchCommitPatch,
  fetchReleaseStats,
  fetchRepositoryTree,
} from '@/core/data/services/githubService.js';
import { GitHubToolsEvent } from './contract/GitHubToolsEvent.js';
import {
  consumePrefill as consumePrefillFromStorage,
  navigateWithHash,
  readFavorites as readFavoritesFromStorage,
  savePrefill as savePrefillToStorage,
  writeFavorites as writeFavoritesToStorage,
} from '@/app/githubtools/common/data/services/githubToolsStorageService.js';


/**
 * Attempts to split a compact GitHub slug that is missing the `owner/` separator.
 *
 * Supported heuristics (evaluated in order):
 * - Dot-delimited owner and repo: `"owner.repo"` => `"owner/repo"` (using the last dot).
 * - CamelCase boundary: `"OwnerRepo"` => `"Owner/Repo"` (splitting at the final lower->upper transition).
 *
 * Inputs that do not match either pattern return an empty string so callers can fall
 * back to their stricter parsing flow.
 *
 * @param {string} value Raw candidate slug without protocol information.
 * @returns {string} Derived `owner/repo` slug or an empty string when parsing fails.
 */
function deriveCompactSlug(value) {
  const sanitized = value.replace(/\.git$/i, '').trim();
  if (!sanitized) return '';

  const dotIndex = sanitized.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < sanitized.length - 1) {
    return `${sanitized.slice(0, dotIndex)}/${sanitized.slice(dotIndex + 1)}`;
  }

  const hasUppercase = /[A-Z]/.test(sanitized);
  const segments = hasUppercase
    ? sanitized.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])/g)
    : null;
  if (segments && segments.length > 1) {
    const owner = segments.slice(0, -1).join('');
    const repo = segments[segments.length - 1];
    if (owner && repo) {
      return `${owner}/${repo}`;
    }
  }

  return '';
}

/**
 * A single flattened entry in a GitHub repository tree.
 *
 * This mirrors the shape returned by the GitHub "Get a Tree" API.
 * Only the fields used by this module are documented here.
 *
 * @typedef {Object} RepoTreeEntry
 * @property {string} path Full path of the entry relative to repo root.
 * @property {'blob'|'tree'} type Git object type. Only `tree` is treated as a folder.
 */

/**
 * A node in the in-memory hierarchical tree model used for display/export.
 *
 * @typedef {Object} RepoTreeNode
 * @property {string} name Node name (file or folder name).
 * @property {'file'|'tree'} type Node type.
 * @property {Map<string, RepoTreeNode>} children Child nodes keyed by name.
 */

/**
 * Hierarchical representation of a repository tree plus high-level statistics.
 *
 * @typedef {Object} RepoTreeModel
 * @property {RepoTreeNode} root Synthetic root node (represents the repo root).
 * @property {number} fileCount Total number of files (blobs) in the tree.
 * @property {number} folderCount Total number of distinct folder paths.
 */

/**
 * A single asset attached to a GitHub release.
 *
 * @typedef {Object} ReleaseAsset
 * @property {string} name Asset file name.
 * @property {number} downloads Download count for this asset.
 * @property {string} browserDownloadUrl Public URL to download the asset.
 */

/**
 * A GitHub release with aggregated download statistics.
 *
 * @typedef {Object} ReleaseItem
 * @property {string} name Display name of the release (may be empty).
 * @property {string} tagName Git tag associated with the release.
 * @property {string} publishedAt ISO timestamp for the release publication date.
 * @property {number} totalDownloads Sum of downloads for all assets in this release.
 * @property {ReleaseAsset[]} assets List of attached assets.
 */

/**
 * Aggregated release statistics for a single repository.
 *
 * This is the shape expected from `fetchReleaseStats`.
 *
 * @typedef {Object} ReleaseStats
 * @property {string} owner Repository owner (user or organization).
 * @property {string} repo Repository name.
 * @property {number} totalDownloads Sum of downloads across all releases.
 * @property {ReleaseItem[]} releases List of releases with asset stats.
 */

/**
 * Normalizes various GitHub repository input formats into a canonical `owner/repo` slug.
 *
 * Accepts:
 * - Raw slugs: `"owner/repo"`
 * - HTTPS URLs: `"https://github.com/owner/repo"` (with or without `.git`)
 * - Strings that look like URLs but are missing protocol (treated as GitHub URLs)
 *
 * If parsing fails, this function returns an empty string instead of throwing.
 * Callers should treat an empty string as "invalid repository input".
 *
 * @param {string} value Raw user input.
 * @returns {string} Normalized `owner/repo` slug, or an empty string if invalid.
 */
function normalizeRepoSlug(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  const finalizeSlug = (owner, repo) => {
    if (!owner || !repo) return '';
    return `${owner}/${repo}`.replace(/\.git$/i, '');
  };

  /* Change Rationale: GitHub slugs now come from QR codes and compact text fields that
   * omit a single slash. Heuristically splitting dot-delimited or CamelCase strings
   * preserves the fast entry path while keeping URL handling unchanged.
   */
  try {
    const url = new URL(
        trimmed,
        trimmed.startsWith('http') ? undefined : 'https://github.com',
    );
    /* Change Rationale: Preserve the owner/repo order from full GitHub URLs by avoiding the
     * leading empty segment skip. This prevents mistakenly treating `/tree` as the repo when
     * branch-specific URLs are pasted into the mapper form.
     */
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (owner && repo) {
      return finalizeSlug(owner, repo);
    }
  } catch (error) {
    /* noop – fall back to manual parsing below. */
  }

  const parts = trimmed
      .replace(/^https?:\/\/github.com\//i, '')
      .split('/')
      .filter(Boolean);
  if (parts.length >= 2) {
    return finalizeSlug(parts[0], parts[1]);
  }

  if (parts.length === 1) {
    const compact = deriveCompactSlug(parts[0]);
    if (compact) {
      return compact;
    }
  }

  return '';
}

/**
 * Normalizes repository input and extracts an optional ref (branch or tag) when present.
 *
 * Supported ref detection:
 * - URLs containing `/tree/<ref>` or `/blob/<ref>`.
 * - Slug-like strings that include those path segments without a protocol.
 *
 * The `slug` field always contains the canonical `owner/repo` value produced by
 * {@link normalizeRepoSlug}. If parsing fails, both `slug` and `ref` are empty strings.
 *
 * @param {string} value Raw user input.
 * @returns {{ slug: string, ref: string }} Normalized slug and optional ref.
 */
function normalizeRepoInput(value) {
  /* Change Rationale: Users often paste branch-specific URLs (e.g., `/tree/develop`). Preserving
   * the ref alongside the normalized slug ensures the Repo Mapper fetches the exact branch they
   * requested instead of silently falling back to the default branch, reducing confusion for
   * multi-branch workflows.
   */
  const slug = normalizeRepoSlug(value);
  if (!slug) return { slug: '', ref: '' };

  const findRef = (segments) => {
    const refIndex = segments.findIndex((part) => part === 'tree' || part === 'blob');
    if (refIndex >= 0 && segments[refIndex + 1]) {
      return segments.slice(refIndex + 1).join('/');
    }
    return '';
  };

  let ref = '';
  try {
    const url = new URL(value, value.startsWith('http') ? undefined : 'https://github.com');
    ref = findRef(url.pathname.split('/').filter(Boolean));
  } catch (error) {
    /* noop – fall back to manual parsing below. */
  }

  if (!ref) {
    const segments = value
        .replace(/^https?:\/\/github.com\//i, '')
        .split('/')
        .filter(Boolean);
    ref = findRef(segments);
  }

  return { slug, ref };
}

/**
 * Parses a commit input string into owner, repo and commit SHA.
 *
 * Supported formats:
 * - Full commit URL:
 *   `"https://github.com/owner/repo/commit/<sha>"`
 * - Minimal URL without protocol:
 *   `"github.com/owner/repo/commit/<sha>"`
 * - Slug with SHA:
 *   `"owner/repo@<sha>"`
 *
 * The parser is intentionally forgiving and returns `null` for unrecognized inputs
 * instead of throwing. Callers must handle a `null` result as "invalid commit input".
 *
 * @param {string} value Raw user input representing a commit.
 * @returns {{ owner: string, repo: string, commitSha: string } | null}
 * Parsed commit data or `null` if the input cannot be interpreted.
 */
function parseCommitInput(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`;

  try {
    const url = new URL(normalized);
    const parts = url.pathname.split('/').filter(Boolean);
    const commitIndex = parts.findIndex((part) => part === 'commit');
    if (commitIndex >= 2 && parts[commitIndex + 1]) {
      return {
        owner: parts[commitIndex - 2],
        repo: parts[commitIndex - 1],
        commitSha: parts[commitIndex + 1],
      };
    }
  } catch (error) {
    /* noop – fall back to slug@sha parsing. */
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

/**
 * Consumes a pending prefill payload for a given tool from `sessionStorage`.
 *
 * The prefill mechanism is used to pass a repository slug from the favorites
 * page into one of the GitHub tools (Repo Mapper, Release Stats, etc.) when
 * navigating between routes.
 *
 * Behavior:
 * - If a matching prefill exists, it is returned and removed from storage.
 * - If the stored entry is malformed or does not match the requested tool,
 *   an empty string is returned.
 *
 * @param {string} tool Tool identifier (e.g. `"mapper"`, `"releases"`).
 * @returns {string} Prefilled slug for that tool, or an empty string if none.
 */
function consumePrefill(tool) {
  return consumePrefillFromStorage(tool);
}

/**
 * Saves a prefill payload for a given tool into `sessionStorage`.
 *
 * The stored value is later consumed by {@link consumePrefill} when
 * initializing a tool page. This is used to provide a "jump into tool
 * with prefilled repo" experience from the favorites view.
 *
 * @param {string} tool Tool identifier (e.g. `"mapper"`, `"releases"`).
 * @param {string} slug Normalized repository slug (`owner/repo`).
 * @returns {void}
 */
function savePrefill(tool, slug) {
  savePrefillToStorage(tool, slug);
}

/**
 * Reads the list of GitHub favorites from `localStorage`.
 *
 * The stored structure is an array of objects with a `slug` property:
 * `[ { slug: 'owner/repo' }, ... ]`.
 *
 * If parsing fails or the shape is unexpected, this function falls back to an
 * empty array. This ensures that errors in persisted data never break the UI.
 *
 * @returns {{ slug: string }[]} List of favorite repository entries.
 */
function readFavorites() {
  return readFavoritesFromStorage();
}

/**
 * Persists the full favorites list into `localStorage`.
 *
 * This helper overwrites the previous value. Callers are expected to read the
 * current list via {@link readFavorites}, modify it, and then call this
 * function with the updated array.
 *
 * @param {{ slug: string }[]} items List of favorite entries to persist.
 * @returns {void}
 */
function writeFavorites(items) {
  writeFavoritesToStorage(items);
}

/**
 * Builds a hierarchical tree model from a flat GitHub tree listing.
 *
 * Input:
 * - A flat list of {@link RepoTreeEntry} objects, each with a `path` string.
 *
 * Output:
 * - A {@link RepoTreeModel} containing:
 *   - A root node with nested folder/file nodes.
 *   - A `fileCount` of all non-tree entries.
 *   - A `folderCount` of distinct folders derived from paths.
 *
 * Notes:
 * - Entries are sorted by path to ensure deterministic traversal.
 * - Directories are inferred both from explicit `type === 'tree'` entries and
 *   from intermediate segments of file paths.
 *
 * @param {RepoTreeEntry[]} [tree=[]] Flat tree entries returned from GitHub.
 * @returns {RepoTreeModel} Hierarchical tree structure and aggregate stats.
 */
function buildRepoTreeModel(tree = []) {
  const root = /** @type {RepoTreeNode} */ ({
    name: '',
    type: 'tree',
    children: new Map(),
  });
  const folderSet = new Set();
  let fileCount = 0;

  const sortedEntries = [...tree].sort((a, b) => a.path.localeCompare(b.path));

  sortedEntries.forEach((entry) => {
    if (!entry?.path) return;

    const parts = entry.path.split('/').filter(Boolean);
    if (!parts.length) return;
    const isDirectory = entry.type === 'tree';

    // Collect all folder paths for statistics.
    for (let i = 0; i < parts.length - (isDirectory ? 0 : 1); i += 1) {
      folderSet.add(parts.slice(0, i + 1).join('/'));
    }
    if (isDirectory) {
      folderSet.add(entry.path);
    } else {
      fileCount += 1;
    }

    // Walk or create the corresponding node chain.
    let cursor = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      const nodeType = isLeaf && !isDirectory ? 'file' : 'tree';
      if (!cursor.children.has(part)) {
        cursor.children.set(
            part,
            /** @type {RepoTreeNode} */ ({
              name: part,
              type: nodeType,
              children: new Map(),
            }),
        );
      }
      cursor = /** @type {RepoTreeNode} */ (cursor.children.get(part));
    });
  });

  return { root, fileCount, folderCount: folderSet.size };
}

/**
 * Returns a sorted array of child nodes for a given tree node.
 *
 * Sorting rules:
 * - Folders (`type === 'tree'`) are listed before files.
 * - Within the same type, entries are sorted alphabetically by name.
 *
 * This ensures a stable, predictable order for both ASCII rendering and
 * any UI that consumes the tree model.
 *
 * @param {RepoTreeNode} node Parent node whose children should be sorted.
 * @returns {RepoTreeNode[]} Sorted child nodes.
 */
function sortTreeChildren(node) {
  return [...node.children.values()].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'tree' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Renders a hierarchical repository tree as an ASCII diagram.
 *
 * Example output:
 *
 * ├── src
 * │   ├── index.js
 * │   └── utils
 * │       └── helpers.js
 * └── README.md
 *
 * The function relies on a {@link RepoTreeModel} produced by
 * {@link buildRepoTreeModel} and uses box-drawing characters to represent
 * folder/file structure.
 *
 * @param {RepoTreeModel} treeModel Tree model to render.
 * @returns {string} Multi-line ASCII representation of the tree.
 */
function renderAsciiTree(treeModel) {
  /**
   * @param {RepoTreeNode} node
   * @param {string} prefix
   * @returns {string[]}
   */
  const traverse = (node, prefix = '') => {
    const children = sortTreeChildren(node);
    return children.flatMap((child, index) => {
      const isLast = index === children.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      const line = `${prefix}${connector}${child.name}`;
      if (child.children.size === 0) {
        return [line];
      }
      return [line, ...traverse(child, nextPrefix)];
    });
  };

  return traverse(treeModel.root).join('\n');
}

/**
 * Renders a flat list of file and folder paths from a GitHub tree.
 *
 * The input is the raw `tree` array returned from the GitHub API. Paths are
 * filtered, sorted lexicographically, and joined by newline characters.
 *
 * This is useful for scripts or tools that want a simple "one path per line"
 * representation instead of an ASCII tree.
 *
 * @param {RepoTreeEntry[]} [tree=[]] Flat tree entries returned from GitHub.
 * @returns {string} Newline-separated list of paths.
 */
function renderPathList(tree = []) {
  return tree
      .filter((entry) => entry?.path)
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((entry) => entry.path)
      .join('\n');
}

/**
 * Produces a compact summary object for release statistics.
 *
 * This function takes a {@link ReleaseStats} input and maps it into a
 * JSON-friendly summary structure with only the fields needed for export:
 *
 * {
 *   repository: "owner/repo",
 *   totalDownloads: number,
 *   releases: [
 *     {
 *       name: string,
 *       tag: string,
 *       publishedAt: string,
 *       downloads: number,
 *       assets: [
 *         {
 *           name: string,
 *           downloads: number,
 *           browserDownloadUrl: string
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * @param {ReleaseStats} data Raw release statistics.
 * @returns {Object} Summary view optimized for JSON export/clipboard.
 */
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

/**
 * Formats release statistics as a CSV string.
 *
 * Output columns:
 * - Release
 * - Tag
 * - Published
 * - Total Downloads
 * - Asset
 * - Asset Downloads
 *
 * Each asset generates a separate row. Releases without assets are represented
 * by a row with `"—"` for the asset name and `0` downloads.
 *
 * All cells are CSV-escaped by double-quoting and escaping inner quotes.
 *
 * @param {ReleaseStats} data Raw release statistics.
 * @returns {string} CSV representation suitable for download or clipboard.
 */
function formatReleaseCsv(data) {
  const rows = [
    ['Release', 'Tag', 'Published', 'Total Downloads', 'Asset', 'Asset Downloads'],
  ];

  data.releases.forEach((release) => {
    if (!release.assets.length) {
      rows.push([
        release.name,
        release.tagName,
        release.publishedAt,
        release.totalDownloads,
        '—',
        0,
      ]);
      return;
    }

    release.assets.forEach((asset) => {
      rows.push([
        release.name,
        release.tagName,
        release.publishedAt,
        release.totalDownloads,
        asset.name,
        asset.downloads,
      ]);
    });
  });

  return rows
      .map((row) =>
          row
              .map((cell) => {
                const value = cell ?? '';
                const safe = String(value).replace(/"/g, '""');
                return `"${safe}"`;
              })
              .join(','),
      )
      .join('\n');
}

/**
 * Checks whether a repository slug is currently favorited.
 *
 * This is a thin convenience wrapper over {@link readFavorites}.
 *
 * @param {string} slug Normalized repository slug (`owner/repo`).
 * @returns {boolean} `true` if the slug is present in favorites.
 */
function isFavorited(slug) {
  if (!slug) return false;
  return readFavorites().some((item) => item.slug === slug);
}

/**
 * Toggles a repository slug in the favorites list.
 *
 * Behavior:
 * - If the slug is present in favorites, it is removed.
 * - If the slug is not present, it is added.
 * - The updated list is persisted and the favorites page is re-rendered.
 *
 * This function is stateful and has side effects:
 * - It reads and writes `localStorage`.
 * - It calls {@link renderFavoritesPage} to update the DOM.
 *
 * @param {string} slug Normalized repository slug (`owner/repo`).
 * @returns {{ slug: string }[]} The updated favorites array.
 */
function toggleFavorite(slug) {
  if (!slug) return readFavorites();
  const favorites = readFavorites();
  const existingIndex = favorites.findIndex((item) => item.slug === slug);
  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({ slug });
  }
  writeFavorites(favorites);
  renderFavoritesPage();
  return favorites;
}

/**
 * Renders the favorites page grid based on the current favorites list.
 *
 * This function:
 * - Reads favorites from storage.
 * - Clears and repopulates the favorites grid DOM.
 * - Shows or hides the "empty state" message.
 * - Wires up click handlers for:
 *   - Removing a favorite.
 *   - Opening Repo Mapper with a prefilled slug.
 *   - Opening Release Stats with a prefilled slug.
 *
 * Requirements:
 * - The DOM must contain `#favorites-grid` and `#favorites-empty` elements.
 *
 * @returns {void}
 */
function renderFavoritesPage() {
  const grid = document.getElementById('favorites-grid');
  const empty = document.getElementById('favorites-empty');
  if (!grid || !empty) {
    return;
  }

  const favorites = readFavorites();
  grid.innerHTML = '';

  if (!favorites.length) {
    empty.hidden = false;
    grid.hidden = true;
    return;
  }

  favorites.forEach(({ slug }) => {
    /* Change Rationale: Favorites now render as flat Material cards with badge headers and
     * monospace slugs, keeping the remove action aligned to the top-right and actions in
     * a single row for consistent scanning on narrow layouts.
     */
    // Change Rationale: Button classes now lean on BeerCSS-native `.button` controls with shared
    // `app-ui-button` utilities so favorites actions stay consistent across GitHub tool surfaces.
    const card = document.createElement('article');
    card.className = 'gh-favorite-card';
    card.innerHTML = `
      <div class="gh-favorite-meta">
        <div class="gh-favorite-badge-row">
          <span class="gh-favorite-badge">
            <span class="material-symbols-outlined" aria-hidden="true">bookmark_added</span>
            <span>Saved repository</span>
          </span>
          <button class="gh-icon-button small circle transparent" type="button" data-remove-favorite aria-label="Unfavorite ${slug}">
            <span class="material-symbols-outlined" aria-hidden="true">star</span>
          </button>
        </div>
        <div class="gh-favorite-heading">
          <h3 class="gh-favorite-slug">${slug}</h3>
          <p class="gh-muted">Launch Repo Mapper or Release Stats with one tap.</p>
        </div>
      </div>
      <div class="gh-favorite-actions">
        <button class="button small app-ui-button" type="button" data-open-mapper>
          <span class="material-symbols-outlined">terminal</span>
          <span>Map</span>
        </button>
        <button class="button small border app-ui-button" type="button" data-open-stats>
          <span class="material-symbols-outlined">bar_chart</span>
          <span>Stats</span>
        </button>
        <a class="button small border app-ui-button" href="https://github.com/${slug}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined">open_in_new</span>
          <span>Open</span>
        </a>
      </div>
    `;
    const removeBtn = card.querySelector('[data-remove-favorite]');
    removeBtn?.addEventListener('click', () => {
      toggleFavorite(slug);
    });

    const mapperBtn = card.querySelector('[data-open-mapper]');
    mapperBtn?.addEventListener('click', () => {
      savePrefill('mapper', slug);
      // Change Rationale: GitHub tool routes now use stable human-readable slugs
      // so location hashes remain concise and match the canonical route IDs.
      navigateWithHash('repo-mapper');
    });

    const statsBtn = card.querySelector('[data-open-stats]');
    statsBtn?.addEventListener('click', () => {
      savePrefill('releases', slug);
      // Change Rationale: GitHub tool routes now use stable human-readable slugs
      // so location hashes remain concise and match the canonical route IDs.
      navigateWithHash('release-stats');
    });

    grid.appendChild(card);
  });

  grid.hidden = false;
  empty.hidden = true;
}

/**
 * Wires a "favorite" toggle button to an input field that contains a repository slug.
 *
 * The button:
 * - Stays visible at all times to maintain consistent affordances.
 * - Disables interaction when the input does not contain a valid repository slug.
 * - Reflects active state (`favorited` CSS class, ARIA attributes, label text).
 * - Toggles the favorite entry when clicked.
 *
 * The input:
 * - Trigger re-evaluation of the button state on every `input` event.
 *
 * @param {string} buttonId DOM id of the favorite button element.
 * @param {string} inputId DOM id of the associated text input element.
 * @returns {void}
 */
function setupFavoriteButton(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!button || !input) return;

  /**
   * Change Rationale: Material icon buttons swap between default and `selected`
   * slots based on the `selected` state. Explicitly syncing the property,
   * attribute, and `aria-pressed` flag keeps the outlined icon visible on load
   * while letting the filled icon render immediately when favorited.
   *
   * @param {boolean} isSelected Whether the favorite control is active.
   * @returns {void}
   */
  const syncSelectionState = (isSelected) => {
    button.selected = isSelected;
    button.toggleAttribute('selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  };

  /**
   * Syncs the button with the current slug validity and favorite state.
   *
   * Change Rationale: Keeping the star visible (but disabling the control)
   * avoids layout shifts while still preventing invalid toggles. Aligning the
   * `selected` state with ARIA ensures the correct slot renders on Material's
   * icon button while assistive tech reads an accurate pressed state.
   *
   * @returns {void}
   */
  const refreshState = () => {
    const slug = normalizeRepoSlug(input.value);
    const valid = !!slug;
    button.hidden = false;
    button.disabled = !valid;
    if (!valid) {
      syncSelectionState(false);
      button.classList.remove('favorited');
      button.setAttribute('aria-label', 'Save favorite');
      button.title = 'Save favorite';
      const label = button.querySelector('.favorite-label');
      if (label) {
        label.textContent = 'Favorite';
      }
      return;
    }
    const active = isFavorited(slug);
    syncSelectionState(active);
    button.classList.toggle('favorited', active);
    button.setAttribute('aria-label', active ? 'Remove favorite' : 'Save favorite');
    button.title = active ? 'Remove favorite' : 'Save favorite';
    const label = button.querySelector('.favorite-label');
    if (label) {
      label.textContent = active ? 'Favorited' : 'Favorite';
    }
  };

  button.addEventListener('click', () => {
    const slug = normalizeRepoSlug(input.value);
    if (!slug) return;
    toggleFavorite(slug);
    refreshState();
  });

  input.addEventListener('input', refreshState);
  refreshState();
}

/**
 * Wires token UI controls on a tool page.
 *
 * Responsibilities:
 * - Expand/collapse the token settings panel via an "advanced" toggle button.
 * - Toggle token visibility between password and plain text fields.
 * - Maintain ARIA attributes and a CSS state (`.is-open`, `[open]`).
 *
 * Expected DOM structure:
 * - A toggle button with `toggleButtonId` living inside `.gh-token-settings`.
 * - A wrapper element containing the token controls (`wrapperId`).
 * - An `<input>` field for the token (`fieldId`).
 * - A visibility toggle control (`visibilityToggleId`) with:
 *   - A label element annotated via `[data-token-visibility-label]`.
 *
 * @param {{
 *   toggleButtonId: string,
 *   wrapperId: string,
 *   fieldId: string,
 *   visibilityToggleId: string
 * }} options Configuration linking controls together.
 * @returns {void}
 */
function wireTokenControls({ toggleButtonId, wrapperId, fieldId, visibilityToggleId }) {
  const toggleButton = document.getElementById(toggleButtonId);
  const wrapper = document.getElementById(wrapperId);
  const field = document.getElementById(fieldId);
  const visibilityToggle = document.getElementById(visibilityToggleId);
  const container = toggleButton ? toggleButton.closest('.gh-token-settings') : null;

  if (toggleButton && wrapper) {
    /**
     * @param {boolean} expanded
     */
    const update = (expanded) => {
      // Change Rationale: The control row now mirrors the token panel height so segmented
      // controls stay aligned with the reveal button when the accordion opens.
      toggleButton.setAttribute('aria-expanded', String(expanded));
      wrapper.hidden = !expanded;
      if (container) {
        container.classList.toggle('is-open', expanded);
        container.toggleAttribute('open', expanded);
      }
      const controlRow = toggleButton.closest('.gh-control-row');
      if (controlRow) {
        controlRow.classList.toggle('gh-token-open', expanded);
      }
    };
    toggleButton.addEventListener('click', () => {
      const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
      update(!isExpanded);
    });
    update(toggleButton.getAttribute('aria-expanded') === 'true');
  }

  if (visibilityToggle && field) {
    const label = visibilityToggle.querySelector('[data-token-visibility-label]');
    /**
     * @param {boolean} visible
     */
    const setVisible = (visible) => {
      field.type = visible ? 'text' : 'password';
      if (label) {
        label.textContent = visible ? 'Hide token' : 'Show token';
      }
    };
    visibilityToggle.addEventListener('change', (event) => {
      setVisible(!!event.target.checked);
    });
    setVisible(false);
  }
}

/**
 * Applies GitHub tools-specific styling to Material text fields within a container.
 *
 * This is a cosmetic helper to attach the `.gh-md-field` class to all
 * `<md-outlined-text-field>` elements under a given DOM subtree.
 *
 * @param {HTMLElement | Document | null} container Root element to search under.
 * @returns {void}
 */
function hydrateInputs(container) {
  if (!container) return;
  container.querySelectorAll('md-outlined-text-field').forEach((field) => {
    field.classList.add('gh-md-field');
  });
}

/**
 * Initializes the Repo Mapper form behavior.
 *
 * Responsibilities:
 * - Validates the repository URL/slug using {@link normalizeRepoSlug}.
 * - Enables/disables the submit button based on validity.
 * - Manages inline error messages.
 * - Emits a `repo-mapper:submit` custom event on the form with `{ slug }`
 *   when submitted and valid.
 *
 * Requirements:
 * - The DOM must provide:
 *   - `#mapper-form`
 *   - `#mapper-url`
 *   - `#mapper-url-error` (optional error container)
 *   - `#mapper-submit`
 *
 * @param {{ tokenFieldId?: string }} [options] Optional controls to revalidate when tokens change.
 * @returns {{ validate: () => { slug: string, isValid: boolean } } | null} Validator utilities or `null` if the form is missing.
 */
function setupRepoMapperForm(options = {}) {
  const form = document.getElementById('mapper-form');
  const urlField = document.getElementById('mapper-url');
  const errorEl = document.getElementById('mapper-url-error');
  const submitButton = document.getElementById('mapper-submit');
  const tokenField = options.tokenFieldId
    ? /** @type {HTMLInputElement | null} */ (document.getElementById(options.tokenFieldId))
    : null;

  /* Change Rationale: Exposing the validator and clearing stale state on errors prevents the
   * submit button from reactivating while invalid slugs or token edits are pending. This
   * keeps the async Repo Mapper flow from flashing empty output after failed attempts.
   */
  if (!form || !urlField || !submitButton) return null;

  const hideError = () => {
    if (errorEl) {
      errorEl.hidden = true;
    }
  };

  /**
   * @param {string} message
   */
  const showError = (message) => {
    if (!errorEl) return;
    errorEl.hidden = false;
    if (message) {
      errorEl.textContent = message;
    }
    form.dataset.repoSlug = '';
    submitButton.disabled = true;
  };

  const validate = () => {
    const slug = normalizeRepoSlug(urlField.value);
    const isValid = !!slug;
    submitButton.disabled = !isValid;
    if (errorEl) {
      const hasText = !!urlField.value.trim();
      errorEl.hidden = isValid || !hasText;
    }
    return { slug, isValid };
  };

  urlField.addEventListener('input', () => {
    hideError();
    validate();
  });

  if (tokenField) {
    tokenField.addEventListener('input', () => {
      hideError();
      validate();
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { slug, isValid } = validate();
    const { ref } = normalizeRepoInput(urlField.value);
    if (!isValid) {
      /* Change Rationale: Error copy now mirrors the slug-friendly input (owner/repo or URL)
       * instead of implying only full URLs are allowed, reducing confusion for compact slugs.
       */
      showError('Enter a GitHub URL or owner/repo slug.');
      urlField.focus();
      return;
    }

    form.dataset.repoSlug = slug;
    form.dataset.repoRef = ref || '';
    form.dispatchEvent(
        new CustomEvent(GitHubToolsEvent.REPO_MAPPER_SUBMIT, {
          bubbles: true,
          detail: { slug, ref },
        }),
    );
  });

  validate();
  return { validate };
}

/**
 * Initializes the Release Stats form behavior.
 *
 * Responsibilities:
 * - Validates the repository URL/slug via {@link normalizeRepoSlug}.
 * - Enables/disables the submit button based on validity.
 * - Manages inline error messages.
 * - Emits a `release-stats:submit` event on the form with `{ slug }` detail
 *   when submitted and valid.
 *
 * Requirements:
 * - DOM elements:
 *   - `#releases-form`
 *   - `#releases-url`
 *   - `#releases-url-error` (optional)
 *   - `#releases-submit`
 *
 * @returns {void}
 */
function setupReleaseStatsForm() {
  const form = document.getElementById('releases-form');
  const urlField = document.getElementById('releases-url');
  const errorEl = document.getElementById('releases-url-error');
  const submitButton = document.getElementById('releases-submit');

  if (!form || !urlField || !submitButton) return;

  const hideError = () => {
    if (errorEl) errorEl.hidden = true;
  };

  /**
   * @param {string} message
   */
  const showError = (message) => {
    if (!errorEl) return;
    errorEl.hidden = false;
    if (message) errorEl.textContent = message;
  };

  const validate = () => {
    const slug = normalizeRepoSlug(urlField.value);
    const isValid = !!slug;
    submitButton.disabled = !isValid;
    if (errorEl) {
      const hasText = !!urlField.value.trim();
      errorEl.hidden = isValid || !hasText;
    }
    return { slug, isValid };
  };

  urlField.addEventListener('input', () => {
    hideError();
    validate();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { slug, isValid } = validate();
    if (!isValid) {
      showError('Invalid repository URL.');
      urlField.focus();
      return;
    }

    form.dataset.repoSlug = slug;
    form.dispatchEvent(
        new CustomEvent(GitHubToolsEvent.RELEASE_STATS_SUBMIT, {
          bubbles: true,
          detail: { slug },
        }),
    );
  });

  validate();
  return { validate };
}

/**
 * Initializes the Git Patch form behavior.
 *
 * Responsibilities:
 * - Validates commit input via {@link parseCommitInput}.
 * - Enables/disables the submit button based on validity.
 * - Manages inline error messages.
 * - Emits a `git-patch:submit` event on the form with parsed commit detail
 *   when submitted and valid.
 *
 * Supported commit input formats are the same as {@link parseCommitInput}.
 *
 * @returns {void}
 */
function setupPatchForm() {
  const form = document.getElementById('patch-form');
  const urlField = document.getElementById('patch-url');
  const errorEl = document.getElementById('patch-url-error');
  const submitButton = document.getElementById('patch-submit');

  if (!form || !urlField || !submitButton) return;

  const hideError = () => {
    if (errorEl) errorEl.hidden = true;
  };

  /**
   * @param {string} message
   */
  const showError = (message) => {
    if (!errorEl) return;
    errorEl.hidden = false;
    if (message) errorEl.textContent = message;
  };

  const validate = () => {
    const parsed = parseCommitInput(urlField.value);
    const isValid = !!parsed;
    submitButton.disabled = !isValid;
    if (errorEl) {
      const hasText = !!urlField.value.trim();
      errorEl.hidden = isValid || !hasText;
    }
    return { parsed, isValid };
  };

  urlField.addEventListener('input', () => {
    hideError();
    validate();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { parsed, isValid } = validate();
    if (!isValid) {
      showError('Invalid commit URL.');
      urlField.focus();
      return;
    }

    form.dataset.commitSlug = `${parsed.owner}/${parsed.repo}@${parsed.commitSha}`;
    form.dispatchEvent(
        new CustomEvent(GitHubToolsEvent.GIT_PATCH_SUBMIT, {
          bubbles: true,
          detail: parsed,
        }),
    );
  });

  validate();
}

/**
 * Marks a button as busy and provides a restore function to reset it.
 *
 * Behavior:
 * - Disables the button.
 * - Optionally replaces the button's `innerHTML` with a busy indicator string.
 * - Adds the `is-loading` CSS class while busy.
 *
 * The function returns a closure that:
 * - Re-enables the button.
 * - Removes the `is-loading` class.
 * - Restores the original `innerHTML`.
 *
 * This pattern ensures that asynchronous flows can safely restore button state
 * in a `finally` block without duplicating cleanup logic.
 *
 * @param {HTMLButtonElement | null} button Button element to update.
 * @param {string} [busy] Optional busy label HTML (e.g. with spinner icon).
 * @returns {() => void} A function that restores the button to its original state.
 */
function setButtonBusy(button, busy) {
  /* Change Rationale: Repo Mapper's submit button could remain stuck with a spinner if a nested
   * busy call overwrote its innerHTML. Caching the original label on the element ensures that the
   * final restore always returns to the true baseline copy, matching Material Design's guidance
   * for predictable feedback loops after async actions complete.
   */
  if (!button) return () => {};
  const hasCachedLabel = typeof button.dataset.originalLabel !== 'undefined';
  const originalLabel = hasCachedLabel ? button.dataset.originalLabel : button.innerHTML;
  if (!hasCachedLabel) {
    button.dataset.originalLabel = originalLabel;
  }
  button.disabled = true;
  if (busy) {
    button.classList.add('is-loading');
    button.innerHTML = busy;
    button.setAttribute('aria-busy', 'true');
  }
  return () => {
    button.disabled = false;
    button.classList.remove('is-loading');
    button.innerHTML = button.dataset.originalLabel || originalLabel;
    button.removeAttribute('aria-busy');
  };
}

/**
 * Renders an error message inside a named error container.
 *
 * Expected DOM structure:
 * - A wrapper element identified by `containerId`.
 * - An optional child element annotated with `[data-error-text]` to receive
 *   the text content.
 *
 * The wrapper is unhidden regardless of whether `message` is provided; if
 * `message` is falsy, the previous text will remain.
 *
 * @param {string} containerId DOM id of the wrapper element.
 * @param {string} message Error message to display.
 * @returns {void}
 */
function renderError(containerId, message) {
  const wrapper = document.getElementById(containerId);
  if (!wrapper) return;
  const text = wrapper.querySelector('[data-error-text]');
  if (text && message) {
    text.textContent = message;
  }
  wrapper.hidden = false;
}

/**
 * Clears (hides) an error container.
 *
 * This does not reset the error text; it only hides the wrapper element.
 *
 * @param {string} containerId DOM id of the wrapper element.
 * @returns {void}
 */
function clearError(containerId) {
  const wrapper = document.getElementById(containerId);
  if (wrapper) {
    wrapper.hidden = true;
  }
}

/**
 * Formats a date string for display using the user's locale.
 *
 * Behavior:
 * - If `value` is falsy, returns `"Unknown date"`.
 * - Otherwise, attempts to construct a `Date` and format it using
 *   `toLocaleDateString` with `year: 'numeric', month: 'short', day: 'numeric'`.
 * - If parsing fails (invalid date), falls back to the raw input string.
 *
 * @param {string | Date | null | undefined} value Date-like value to format.
 * @returns {string} Human-readable date or a fallback description.
 */
function formatDate(value) {
  if (!value) return 'Unknown date';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return String(value);
  }
}

/**
 * Initializes shared GitHub tools page behavior.
 *
 * This helper:
 * - Locates the `.gh-tools-page` root element.
 * - Ensures the page is only initialized once (via a data attribute).
 * - Wires token controls and favorite button for the current tool (if provided).
 * - Hydrates Material text fields for consistent styling.
 *
 * It returns the page element when initialization is successful, or `null`
 * if the tools page is not present in the current view.
 *
 * @param {{
 *   tokenControls?: {
 *     toggleButtonId: string,
 *     wrapperId: string,
 *     fieldId: string,
 *     visibilityToggleId: string
 *   },
 *   favoriteControl?: {
 *     buttonId: string,
 *     inputId: string
 *   },
 *   favoriteControls?: Array<{
 *     buttonId: string,
 *     inputId: string
 *   }>
 * }} [options={}] Hook-up options for the current tool context.
 * @returns {HTMLElement | null} The initialized page element, or `null`.
 */
function initGhToolsPage({
                           tokenControls,
                           favoriteControl,
                           favoriteControls,
                         } = {}) {
  const page = document.querySelector('.gh-tools-page');
  if (!page) return null;
  if (page.dataset.ghToolsInitialized === 'true') return page;

  if (tokenControls) {
    wireTokenControls(tokenControls);
  }

  /**
   * Change Rationale: GitHub tools can now expose multiple favorite stars without
   * duplicating setup logic. Accepting a list of favorite controls keeps markup
   * declarative while ensuring each button/input pair inherits the same Material
   * icon fill sync and visibility rules used by Repo Mapper.
   */
  const favoritePairs = [];
  if (favoriteControl) {
    favoritePairs.push(favoriteControl);
  }
  if (Array.isArray(favoriteControls)) {
    favoritePairs.push(...favoriteControls);
  }

  favoritePairs.forEach(({ buttonId, inputId }) => {
    setupFavoriteButton(buttonId, inputId);
  });

  hydrateInputs(page);
  page.dataset.ghToolsInitialized = 'true';
  return page;
}

/**
 * Bootstraps the Repo Mapper tool page.
 *
 * Responsibilities:
 * - Calls {@link initGhToolsPage} with token and favorites wiring.
 * - Sets up the Repo Mapper form.
 * - Handles `repo-mapper:submit` events to fetch the repository tree.
 * - Renders either:
 *   - An ASCII tree view, or
 *   - A simple path list,
 *   depending on the currently selected format.
 * - Updates file and folder statistics counters.
 * - Wires copy-to-clipboard behavior for the generated output.
 * - Applies any pending prefill slug from {@link consumePrefill}.
 *
 * Notes:
 * - This function is safe to call multiple times; internal guards prevent
 *   double initialization of shared page state.
 *
 * @returns {void}
 */
function initRepoMapper() {
  const page = initGhToolsPage({
    tokenControls: {
      toggleButtonId: 'mapper-token-reveal',
      wrapperId: 'mapper-token-wrapper',
      fieldId: 'mapper-token',
      visibilityToggleId: 'mapper-token-toggle',
    },
    /**
     * Change Rationale: Use the shared favorites list API so future tools can add stars
     * by configuration rather than bespoke wiring. Keeping the config array-based
     * preserves consistent spacing and focus affordances across Repo Mapper and peers.
     */
    favoriteControls: [{ buttonId: 'mapper-fav-btn', inputId: 'mapper-url' }],
  });
  if (!page) return;
  const mapperFormControls = setupRepoMapperForm({ tokenFieldId: 'mapper-token' });

  const form = document.getElementById('mapper-form');
  const urlField = document.getElementById('mapper-url');
  const tokenField = document.getElementById('mapper-token');
  const codeEl = document.getElementById('mapper-code');
  const resultEl = document.getElementById('mapper-result');
  const copyBtn = document.getElementById('mapper-copy-btn');
  const fileCountEl = document.getElementById('mapper-stats-files');
  const folderCountEl = document.getElementById('mapper-stats-folders');
  const asciiBtn = document.getElementById('btn-format-ascii');
  const pathsBtn = document.getElementById('btn-format-paths');
  const submitButton = document.getElementById('mapper-submit');

  if (!form || !codeEl || !resultEl || !asciiBtn || !pathsBtn) return;

  /** @type {'ascii'|'paths'} */
  let currentFormat = 'ascii';
  /** @type {RepoTreeEntry[]} */
  let currentTree = [];
  let mapperIsLoading = false;

  /**
   * Synchronizes the repo mapper segmented buttons so they lean on Material's
   * native selection visuals instead of bespoke classes.
   *
   * Change rationale:
   * - The previous chip-based segmented buttons needed custom CSS to read as
   *   a toggle set.
   * - Switching to `md-outlined-segmented-button` keeps the control aligned
   *   with Material defaults and only requires toggling the `selected` state
   *   and ARIA attributes to broadcast the active format to assistive tech.
   *
   * @returns {void}
   */
  const updateFormatButtons = () => {
    const isAscii = currentFormat === 'ascii';
    asciiBtn.toggleAttribute('selected', isAscii);
    // @ts-ignore: Material web components may define `.selected` at runtime.
    asciiBtn.selected = isAscii;
    asciiBtn.setAttribute('aria-pressed', isAscii ? 'true' : 'false');
    asciiBtn.setAttribute('aria-selected', isAscii ? 'true' : 'false');

    const isPaths = currentFormat === 'paths';
    pathsBtn.toggleAttribute('selected', isPaths);
    // @ts-ignore
    pathsBtn.selected = isPaths;
    pathsBtn.setAttribute('aria-pressed', isPaths ? 'true' : 'false');
    pathsBtn.setAttribute('aria-selected', isPaths ? 'true' : 'false');
  };

  /**
   * Renders the current tree into the output element according to the
   * selected format, and updates the stats counters.
   *
   * @returns {void}
   */
  const renderOutput = () => {
    if (!currentTree.length) return;
    const model = buildRepoTreeModel(currentTree);
    if (fileCountEl) fileCountEl.textContent = model.fileCount.toLocaleString();
    if (folderCountEl) folderCountEl.textContent = model.folderCount.toLocaleString();
    const output =
        currentFormat === 'paths' ? renderPathList(currentTree) : renderAsciiTree(model);
    codeEl.textContent = output;
    clearError('mapper-error');
    resultEl.hidden = false;
  };

  /**
   * Handles the Repo Mapper submission lifecycle:
   * - Clears previous results and errors.
   * - Fetches the repository tree via {@link fetchRepositoryTree}.
   * - Updates local state and re-renders the output.
   *
   * @param {string} slug Normalized repository slug (`owner/repo`).
   * @param {string} [ref] Optional branch or tag ref to map.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (slug, ref) => {
    /* Change Rationale: Overlapping submissions previously cleared the output while a fetch
     * was still in flight, flashing an empty panel. Guarding re-entry and ignoring empty
     * payloads keeps the visible output stable until fresh data arrives.
     */
    const normalizedSlug = (slug || '').trim();
    if (mapperIsLoading || !normalizedSlug) {
      return;
    }

    mapperIsLoading = true;
    clearError('mapper-error');
    if (!currentTree.length) {
      resultEl.hidden = true;
      codeEl.textContent = '';
    }

    const [owner, repo] = normalizedSlug.split('/');
    const refToUse = (ref || '').trim();
    const stopLoading = setButtonBusy(
        submitButton,
        '<span class="gh-rolling material-symbols-outlined">progress_activity</span> Generating…',
    );

    try {
      const { tree } = await fetchRepositoryTree(
          { owner, repo, ref: refToUse || undefined },
          tokenField?.value?.trim(),
      );
      if (!Array.isArray(tree) || tree.length === 0) {
        currentTree = [];
        renderError('mapper-error', 'No repository contents detected for this slug.');
        return;
      }
      currentTree = tree;
      renderOutput();
    } catch (error) {
      renderError('mapper-error', error.message);
    } finally {
      stopLoading();
      mapperIsLoading = false;
      mapperFormControls?.validate?.();
    }
  };

  form.addEventListener(GitHubToolsEvent.REPO_MAPPER_SUBMIT, (event) => {
    /* Change Rationale: Repo Mapper now carries the requested ref so branch-specific URLs map
     * the exact branch users paste (e.g., `/tree/develop`) instead of silently defaulting.
     */
    handleSubmit(event.detail.slug, event.detail.ref);
  });

  asciiBtn.addEventListener('click', () => {
    currentFormat = 'ascii';
    updateFormatButtons();
    renderOutput();
  });

  pathsBtn.addEventListener('click', () => {
    currentFormat = 'paths';
    updateFormatButtons();
    renderOutput();
  });

  /**
   * Provides a transient confirmation state on the copy button after successful clipboard writes.
   *
   * @returns {void}
   */
  const flashCopyConfirmation = () => {
    if (!copyBtn) return;
    const original = copyBtn.innerHTML;
    copyBtn.disabled = true;
    copyBtn.classList.add('gh-button-success');
    copyBtn.innerHTML = '<span class="material-symbols-outlined">check</span><span>Copied</span>';
    /* Change Rationale: The confirmation badge now dismisses after three seconds instead of
     * four to match the rapid feedback cadence in the inspiration UI while still giving
     * users enough time to notice the success state before the icon returns to the copy
     * affordance.
     */
    setTimeout(() => {
      copyBtn.innerHTML = original;
      copyBtn.disabled = false;
      copyBtn.classList.remove('gh-button-success');
    }, 3000);
  };

  copyBtn?.addEventListener('click', async () => {
    if (codeEl.textContent) {
      /* Change Rationale: The copy button now waits for confirmation before flashing success so
       * users get reliable feedback that their clipboard actually updated, aligning with
       * Material Design's emphasis on immediate, accurate status cues.
       */
      const copied = await copyToClipboard(codeEl.textContent);
      if (copied) {
        flashCopyConfirmation();
      }
    }
  });

  const prefillSlug = consumePrefill('mapper');
  if (prefillSlug && urlField) {
    urlField.value = prefillSlug;
    urlField.dispatchEvent(new Event('input'));
  }
}

/**
 * Bootstraps the Release Stats tool page.
 *
 * Responsibilities:
 * - Calls {@link initGhToolsPage} with token and favorites wiring.
 * - Sets up the Release Stats form.
 * - Handles `release-stats:submit` events to fetch and render release data.
 * - Populates:
 *   - Total downloads summary and pill.
 *   - Release count.
 *   - Release list with clickable items.
 *   - Asset list for the selected release.
 * - Wires clipboard and download actions for JSON and CSV exports.
 * - Applies any pending prefill slug from {@link consumePrefill}.
 *
 * @returns {void}
 */
function initReleaseStats() {
  const page = initGhToolsPage({
    tokenControls: {
      toggleButtonId: 'releases-token-reveal',
      wrapperId: 'releases-token-wrapper',
      fieldId: 'releases-token',
      visibilityToggleId: 'releases-token-toggle',
    },
    /**
     * Change Rationale: Favor the shared favorites wiring array so Release Stats inherits
     * the same trailing-star layout and state sync behavior without bespoke handlers.
     */
    favoriteControls: [{ buttonId: 'releases-fav-btn', inputId: 'releases-url' }],
  });
  if (!page) return;

  setupReleaseStatsForm();

  const form = document.getElementById('releases-form');
  const urlField = document.getElementById('releases-url');
  const tokenField = document.getElementById('releases-token');
  const totalDownloadsEl = document.getElementById('rel-total-downloads');
  const totalDownloadsBadge = document.getElementById('rel-total-downloads-pill');
  const releaseCountEl = document.getElementById('rel-count');
  const releaseListEl = document.getElementById('rel-list');
  const assetsListEl = document.getElementById('rel-assets-list');
  const detailNameEl = document.getElementById('rel-detail-name');
  const detailTagEl = document.getElementById('rel-detail-tag');
  const detailDateEl = document.getElementById('rel-detail-date');
  const detailDownloadsEl = document.getElementById('rel-detail-downloads');
  const copyJsonBtn = document.getElementById('rel-copy-json');
  const downloadJsonBtn = document.getElementById('rel-download-json');
  const copyCsvBtn = document.getElementById('rel-copy-csv');
  const downloadCsvBtn = document.getElementById('rel-download-csv');
  const submitButton = document.getElementById('releases-submit');
  const resultEl = document.getElementById('releases-result');

  if (!form || !releaseListEl || !assetsListEl || !resultEl) return;

  /** @type {ReleaseStats | null} */
  let releaseData = null;

  /**
   * Renders the asset details panel for a single release.
   *
   * @param {ReleaseItem} release Release whose assets should be displayed.
   * @returns {void}
   */
  const renderReleaseDetail = (release) => {
    if (!release) return;
    detailNameEl.textContent = release.name || release.tagName;
    detailTagEl.textContent = release.tagName;
    detailDateEl.textContent = formatDate(release.publishedAt);
    detailDownloadsEl.textContent = release.totalDownloads.toLocaleString();

    assetsListEl.innerHTML = '';
    if (!release.assets.length) {
      assetsListEl.innerHTML = '<p class="gh-muted">No assets for this release.</p>';
      return;
    }

    release.assets.forEach((asset) => {
      const row = document.createElement('div');
      row.className = 'gh-asset-row';
      row.innerHTML = `
        <div>
          <p class="gh-asset-name">${asset.name}</p>
          <p class="gh-subtext">${asset.downloads.toLocaleString()} downloads</p>
        </div>
        <a class="gh-asset-link" href="${asset.browserDownloadUrl}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined">download</span>
          <span>Download</span>
        </a>
      `;
      assetsListEl.appendChild(row);
    });
  };

  /**
   * Renders the vertical list of releases and wires click handling to
   * update the detail panel.
   *
   * @param {string} [selectedTag] Optional tag name to preselect.
   * @returns {void}
   */
  const renderReleaseList = (selectedTag) => {
    if (!releaseData) return;
    releaseListEl.innerHTML = '';

    releaseData.releases.forEach((release) => {
      const button = document.createElement('button');
      const isActive = selectedTag ? release.tagName === selectedTag : false;
      button.className = isActive ? 'active' : '';
      button.innerHTML = `
        <div class="gh-release-bar">
          <span>${release.name || release.tagName}</span>
          <span class="gh-muted">${release.totalDownloads.toLocaleString()} downloads</span>
        </div>
      `;
      button.addEventListener('click', () => {
        releaseListEl.querySelectorAll('button').forEach((btn) =>
            btn.classList.toggle('active', btn === button),
        );
        renderReleaseDetail(release);
      });
      releaseListEl.appendChild(button);
    });

    const firstRelease = releaseData.releases[0];
    if (firstRelease) {
      renderReleaseDetail(firstRelease);
      const firstBtn = releaseListEl.querySelector('button');
      firstBtn?.classList.add('active');
    }
  };

  /**
   * Updates the entire Release Stats view with new data.
   *
   * @param {ReleaseStats} data Fresh release statistics.
   * @returns {void}
   */
  const renderResult = (data) => {
    releaseData = data;
    const totalText = data.totalDownloads.toLocaleString();
    if (totalDownloadsEl) totalDownloadsEl.textContent = totalText;
    if (totalDownloadsBadge) totalDownloadsBadge.textContent = totalText;
    if (releaseCountEl) {
      releaseCountEl.textContent = data.releases.length.toLocaleString();
    }
    renderReleaseList();
    clearError('releases-error');
    resultEl.hidden = false;
  };

  /**
   * Handles the Release Stats submission lifecycle:
   * - Clears previous result and error state.
   * - Fetches release stats via {@link fetchReleaseStats}.
   * - Updates the summary and list views.
   *
   * @param {string} slug Normalized repository slug (`owner/repo`).
   * @returns {Promise<void>}
   */
  const handleSubmit = async (slug) => {
    resultEl.hidden = true;
    clearError('releases-error');
    const [owner, repo] = slug.split('/');
    const stopLoading = setButtonBusy(
        submitButton,
        '<span class="gh-rolling material-symbols-outlined">progress_activity</span> Analyzing…',
    );

    try {
      const data = await fetchReleaseStats(
          { owner, repo },
          tokenField?.value?.trim(),
      );
      renderResult(data);
    } catch (error) {
      renderError('releases-error', error.message);
    } finally {
      stopLoading();
    }
  };

  form.addEventListener(GitHubToolsEvent.RELEASE_STATS_SUBMIT, (event) => {
    handleSubmit(event.detail.slug);
  });

  copyJsonBtn?.addEventListener('click', () => {
    if (!releaseData) return;
    copyToClipboard(JSON.stringify(formatReleaseSummary(releaseData), null, 2));
  });

  downloadJsonBtn?.addEventListener('click', () => {
    if (!releaseData) return;
    downloadJson('release-stats.json', JSON.stringify(formatReleaseSummary(releaseData), null, 2));
  });

  copyCsvBtn?.addEventListener('click', () => {
    if (!releaseData) return;
    copyToClipboard(formatReleaseCsv(releaseData));
  });

  downloadCsvBtn?.addEventListener('click', () => {
    if (!releaseData) return;
    downloadText('release-stats.csv', formatReleaseCsv(releaseData), 'text/csv');
  });

  const prefillSlug = consumePrefill('releases');
  if (prefillSlug && urlField) {
    urlField.value = prefillSlug;
    urlField.dispatchEvent(new Event('input'));
  }
}

/**
 * Bootstraps the Git Patch tool page.
 *
 * Responsibilities:
 * - Calls {@link initGhToolsPage} with token and favorites wiring.
 * - Sets up the patch form.
 * - Handles `git-patch:submit` to fetch a commit patch via {@link fetchCommitPatch}.
 * - Renders the raw patch text into a code block.
 * - Wires clipboard and download actions for the patch content.
 *
 * @returns {void}
 */
function initGitPatch() {
  const page = initGhToolsPage({
    tokenControls: {
      toggleButtonId: 'patch-token-reveal',
      wrapperId: 'patch-token-wrapper',
      fieldId: 'patch-token',
      visibilityToggleId: 'patch-token-toggle',
    },
    /**
     * Change Rationale: Align Git Patch with the shared favorites config array so the
     * trailing star follows the same Material-driven state and visibility rules as
     * Repo Mapper and Release Stats.
     */
    favoriteControls: [{ buttonId: 'patch-fav-btn', inputId: 'patch-url' }],
  });
  if (!page) return;

  setupPatchForm();

  const form = document.getElementById('patch-form');
  const codeEl = document.getElementById('patch-code');
  const resultEl = document.getElementById('patch-result');
  const tokenField = document.getElementById('patch-token');
  const copyBtn = document.getElementById('patch-copy-btn');
  const downloadBtn = document.getElementById('patch-download-btn');
  const submitButton = document.getElementById('patch-submit');

  if (!form || !codeEl || !resultEl) return;

  /**
   * Handles the Git Patch submission lifecycle:
   * - Clears previous result and error state.
   * - Fetches the patch via {@link fetchCommitPatch}.
   * - Displays the patch text.
   *
   * @param {{ owner: string, repo: string, commitSha: string }} detail Parsed commit detail.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (detail) => {
    clearError('patch-error');
    resultEl.hidden = true;
    codeEl.textContent = '';

    const stopLoading = setButtonBusy(
        submitButton,
        '<span class="gh-rolling material-symbols-outlined">progress_activity</span> Fetching…',
    );

    try {
      const patch = await fetchCommitPatch(detail, tokenField?.value?.trim());
      codeEl.textContent = patch;
      resultEl.hidden = false;
    } catch (error) {
      renderError('patch-error', error.message);
    } finally {
      stopLoading();
    }
  };

  form.addEventListener(GitHubToolsEvent.GIT_PATCH_SUBMIT, (event) => {
    handleSubmit(event.detail);
  });

  copyBtn?.addEventListener('click', () => {
    if (codeEl.textContent) {
      copyToClipboard(codeEl.textContent);
    }
  });

  downloadBtn?.addEventListener('click', () => {
    if (codeEl.textContent) {
      downloadText('commit.patch', codeEl.textContent, 'text/x-patch');
    }
  });
}

/**
 * Initializes the GitHub favorites page.
 *
 * This is a thin wrapper around {@link renderFavoritesPage} to match
 * the initialization pattern used across tools.
 *
 * @returns {void}
 */
function initFavoritesPage() {
  renderFavoritesPage();
}

export {
  buildRepoTreeModel,
  consumePrefill,
  formatReleaseCsv,
  formatReleaseSummary,
  initFavoritesPage,
  initGitPatch,
  initReleaseStats,
  initRepoMapper,
  normalizeRepoSlug,
  normalizeRepoInput,
  parseCommitInput,
  renderAsciiTree,
  renderPathList,
  savePrefill,
};
