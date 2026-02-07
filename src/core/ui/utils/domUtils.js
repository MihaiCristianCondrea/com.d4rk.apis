// Change Rationale: Utility helpers moved under `core/ui/utils` to align shared DOM and parsing
// logic with the UI layer while keeping pure helpers documented for reuse across features.

/**
 * Safely retrieves a nested value from an object using dot or bracket notation.
 *
 * @param {Record<string, any>} obj Target object.
 * @param {string} path Access path (e.g., "user.profile.name" or "items[0].id").
 * @param {any} [defaultValue=undefined] Fallback value when the path cannot be resolved.
 * @returns {any} The resolved value or the provided default.
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
  if (!path) {
    return defaultValue;
  }

  const travel = (regexp) =>
    String(path)
      .split(regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);

  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
}

/**
 * Extracts the first non–data URI image source from an HTML string.
 *
 * @param {string} htmlContent Raw HTML content.
 * @returns {string | null} The first usable image URL or `null` if none are found.
 */
export function extractFirstImageFromHtml(htmlContent) {
  if (!htmlContent) return null;
  const imgTagMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/);
  if (imgTagMatch && imgTagMatch[1] && !imgTagMatch[1].startsWith('data:image')) {
    return imgTagMatch[1];
  }
  const bloggerImageMatch = htmlContent.match(/(https?:\/\/[^"]+\.googleusercontent\.com\/[^"]+)/);
  if (bloggerImageMatch && bloggerImageMatch[1]) return bloggerImageMatch[1];
  return null;
}

/**
 * Looks up an element by ID, returning `null` in non-DOM environments.
 *
 * @param {string} id Element ID.
 * @returns {HTMLElement | null} The element or `null` when unavailable.
 */
export function getDynamicElement(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

/**
 * Updates the copyright text to reflect the current year span.
 *
 * @param {string} [elementId='copyright-message'] Target element ID.
 * @returns {void}
 */
export function updateCopyrightYear(elementId = 'copyright-message') {
  if (typeof document === 'undefined') {
    return;
  }

  const copyrightElement = document.getElementById(elementId);
  if (!copyrightElement) {
    return;
  }

  const currentYear = new Date().getFullYear();
  const yearText = currentYear === 2025 ? '2025' : `2025-${currentYear}`;
  copyrightElement.textContent = `Copyright © ${yearText}, API Console`;
}

/**
 * Shows the global page loading overlay by toggling the `active` class.
 *
 * @param {string} [targetId='pageLoadingOverlay'] Overlay element ID.
 * @returns {void}
 */
export function showPageLoadingOverlay(targetId = 'pageLoadingOverlay') {
  const overlay = getDynamicElement(targetId);
  if (overlay) {
    overlay.classList.add('active');
  }
}

/**
 * Hides the global page loading overlay by removing the `active` class.
 *
 * @param {string} [targetId='pageLoadingOverlay'] Overlay element ID.
 * @returns {void}
 */
export function hidePageLoadingOverlay(targetId = 'pageLoadingOverlay') {
  const overlay = getDynamicElement(targetId);
  if (overlay) {
    overlay.classList.remove('active');
  }
}

/**
 * Creates a requestAnimationFrame-throttled wrapper around a callback.
 *
 * @template {(...args: any[]) => void} T
 * @param {T} callback Function to throttle.
 * @returns {T} Wrapped callback that executes at most once per frame.
 */
export function rafThrottle(callback) {
  let frameId = 0;
  return (...args) => {
    if (frameId) {
      return;
    }
    frameId = requestAnimationFrame(() => {
      frameId = 0;
      callback(...args);
    });
  };
}

/**
 * Parses a GitHub repository URL or slug and extracts owner/repo components.
 *
 * @param {string} inputUrl Raw user input.
 * @returns {{ owner: string, repo: string } | null} Parsed slug or `null` when invalid.
 */
export const parseGithubUrl = (inputUrl) => {
  try {
    const cleanUrl = inputUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    const normalized = cleanUrl
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/^github\.com\//i, 'github.com/');
    const normalizedLower = normalized.toLowerCase();

    const urlPattern = /github\.com\/([^/]+)\/([^/?#]+)/i;
    const slugPattern = /^([^/\s]+)\/([^/\s]+)$/i;

    const urlMatch = normalizedLower.match(urlPattern);
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2] };
    }

    const slugMatch = normalizedLower.match(slugPattern);
    if (slugMatch) {
      return { owner: slugMatch[1], repo: slugMatch[2] };
    }

    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Parses a GitHub commit URL or slug and extracts owner, repo, and commit SHA.
 *
 * @param {string} inputUrl Raw user input.
 * @returns {{ owner: string, repo: string, commitSha: string } | null} Parsed commit parts or `null`.
 */
export const parseGithubCommitUrl = (inputUrl) => {
  try {
    const cleanUrl = inputUrl.trim().replace(/\/$/, '');
    const normalized = cleanUrl
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/^github\.com\//i, 'github.com/');
    const normalizedLower = normalized.toLowerCase();

    // Matches .../owner/repo/commit/sha or owner/repo/commit/sha
    const pattern = /github\.com\/([^/]+)\/([^/]+)\/commit\/([a-fA-F0-9]+)/i;
    const slugPattern = /^([^/]+)\/([^/]+)\/commit\/([a-fA-F0-9]+)/i;

    const urlMatch = normalizedLower.match(pattern);
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2], commitSha: urlMatch[3] };
    }

    const slugMatch = normalizedLower.match(slugPattern);
    if (slugMatch) {
      return { owner: slugMatch[1], repo: slugMatch[2], commitSha: slugMatch[3] };
    }

    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Generates an ASCII directory tree from a GitHub tree listing.
 *
 * @param {{ path: string, type: 'blob' | 'tree' }[]} paths Tree entries.
 * @param {(stats: { files: number, folders: number }) => void} setStats Callback receiving counts.
 * @returns {string} Rendered ASCII tree.
 */
export const generateAsciiTree = (paths, setStats) => {
  const structure = {};
  let fileCount = 0;
  let folderCount = 0;

  // Build nested object structure
  paths.forEach(item => {
    if (item.type === 'blob') fileCount++;
    if (item.type === 'tree') folderCount++;
    
    const parts = item.path.split('/');
    let current = structure;
    
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? (item.type === 'blob' ? null : {}) : {};
      }
      const next = current[part];
      if (next !== null) {
        current = next;
      }
    });
  });

  setStats({ files: fileCount, folders: folderCount });

  const lines = [];
  
  const buildString = (obj, prefix = '') => {
    const keys = Object.keys(obj).sort((a, b) => {
      const aIsFolder = obj[a] !== null;
      const bIsFolder = obj[b] !== null;
      
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      return a.localeCompare(b);
    });

    keys.forEach((key, index) => {
      const isLast = index === keys.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      
      lines.push(`${prefix}${connector}${key}`);
      
      const child = obj[key];
      if (child !== null) {
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        buildString(child, childPrefix);
      }
    });
  };

  buildString(structure);
  return lines.join('\n');
};

/**
 * Generates a newline-delimited list of paths from a GitHub tree listing.
 *
 * @param {{ path: string, type: 'blob' | 'tree' }[]} paths Tree entries.
 * @param {(stats: { files: number, folders: number }) => void} setStats Callback receiving counts.
 * @returns {string} Newline-joined path list.
 */
export const generatePathList = (paths, setStats) => {
  let fileCount = 0;
  let folderCount = 0;
  const lines = paths.map(p => {
    if (p.type === 'blob') fileCount++;
    if (p.type === 'tree') folderCount++;
    return p.path;
  });
  setStats({ files: fileCount, folders: folderCount });
  return lines.join('\n');
};
