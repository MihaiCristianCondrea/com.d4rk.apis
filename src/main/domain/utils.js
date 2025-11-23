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

export function getDynamicElement(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

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

export function showPageLoadingOverlay(targetId = 'pageLoadingOverlay') {
  const overlay = getDynamicElement(targetId);
  if (overlay) {
    overlay.classList.add('active');
  }
}

export function hidePageLoadingOverlay(targetId = 'pageLoadingOverlay') {
  const overlay = getDynamicElement(targetId);
  if (overlay) {
    overlay.classList.remove('active');
  }
}

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

export const parseGithubUrl = (inputUrl) => {
  try {
    const cleanUrl = inputUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    const pattern = /github\.com\/([^/]+)\/([^/]+)/;
    const match = cleanUrl.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const parseGithubCommitUrl = (inputUrl) => {
  try {
    const cleanUrl = inputUrl.trim().replace(/\/$/, '');
    // Matches .../owner/repo/commit/sha
    const pattern = /github\.com\/([^/]+)\/([^/]+)\/commit\/([a-fA-F0-9]+)/;
    const match = cleanUrl.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2], commitSha: match[3] };
    }
    return null;
  } catch (e) {
    return null;
  }
};

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
