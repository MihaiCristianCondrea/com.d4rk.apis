const DEFAULT_BASE = '/';

function ensureTrailingSlash(path = '/') {
  if (!path.endsWith('/')) {
    return `${path}/`;
  }
  return path;
}

function deriveBasePath() {
  if (typeof window === 'undefined') {
    return ensureTrailingSlash(DEFAULT_BASE);
  }

  const { pathname } = window.location;
  const distIndex = pathname.indexOf('/assets/dist');
  if (distIndex >= 0) {
    return ensureTrailingSlash(pathname.slice(0, distIndex));
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    return ensureTrailingSlash(`/${segments[0]}`);
  }

  return '/';
}

const assetBasePath = deriveBasePath();

function buildBaseUrl() {
  if (typeof window === 'undefined') {
    return ensureTrailingSlash(assetBasePath);
  }
  try {
    return new URL(assetBasePath, window.location.origin).toString();
  } catch (error) {
    console.warn('AppConfig: Failed to build base URL, falling back to path.', error);
    return ensureTrailingSlash(assetBasePath);
  }
}

const assetBaseUrl = buildBaseUrl();

export function resolveAssetUrl(path = '') {
  const sanitized = String(path || '').replace(/^\//, '');
  try {
    return new URL(sanitized, assetBaseUrl).toString();
  } catch (error) {
    console.warn('AppConfig: Failed to resolve asset URL.', path, error);
    return `${assetBaseUrl}${sanitized}`;
  }
}

export const appConfig = {
  assetBasePath,
  assetBaseUrl,
  iconCatalogSources: [
    resolveAssetUrl('data/material-symbols.json'),
    'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRA%2Copsz%2Cwght%5D.codepoints',
  ],
  jsonWorkerUrl: resolveAssetUrl('workers/jsonWorker.js'),
  manifestIconsBase: resolveAssetUrl('icons/'),
};

function exposeConfig() {
  if (typeof window === 'undefined') {
    return;
  }
  if (!window.__APP_CONFIG__) {
    Object.defineProperty(window, '__APP_CONFIG__', {
      value: appConfig,
      writable: false,
      configurable: false,
    });
  }
}

exposeConfig();

export default appConfig;
