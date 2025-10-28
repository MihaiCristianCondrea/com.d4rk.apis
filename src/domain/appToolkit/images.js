export function formatAspectRatio(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!w || !h) {
    return '';
  }
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(Math.abs(w)), Math.round(Math.abs(h))) || 1;
  const ratioW = Math.round(Math.abs(w) / divisor);
  const ratioH = Math.round(Math.abs(h) / divisor);
  if (!ratioW || !ratioH) {
    return '';
  }
  return `${ratioW}:${ratioH}`;
}

export function formatDimensionLabel(meta) {
  if (!meta || !meta.width || !meta.height) {
    return '';
  }
  const ratio = formatAspectRatio(meta.width, meta.height);
  const ratioText = ratio ? ` · ${ratio}` : '';
  return `${meta.width}×${meta.height}${ratioText}`;
}

export function normalizeImageUrl(value) {
  if (!value) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  try {
    const url = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : undefined);
    return url.href;
  } catch (error) {
    if (trimmed.startsWith('data:image/')) {
      return trimmed;
    }
    return trimmed;
  }
}
