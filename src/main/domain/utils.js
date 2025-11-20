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

export function debounce(callback, delay = 300) { // FIXME: Unused function debounce
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}
