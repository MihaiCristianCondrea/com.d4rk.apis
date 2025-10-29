export function normalizePageId(pageId) {
  if (typeof pageId !== 'string') {
    return 'home';
  }
  let normalizedId = pageId;
  if (normalizedId.startsWith('#')) {
    normalizedId = normalizedId.substring(1);
  }
  if (normalizedId === '' || normalizedId === 'index.html') {
    normalizedId = 'home';
  }
  return normalizedId;
}

export default normalizePageId;
