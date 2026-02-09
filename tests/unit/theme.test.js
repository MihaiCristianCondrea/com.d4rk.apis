const fs = require('fs');
const path = require('path');
const { initThemeControls, applyTheme } = require('../../app/src/main/js/core/data/services/themeService.js');

function createLocalStorageMock(initial = {}) {
  let store = Object.keys(initial).reduce((acc, key) => {
    acc[key] = String(initial[key]);
    return acc;
  }, {});

  return {
    getItem: jest.fn((key) =>
      Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    ),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    peek: (key) =>
      Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
  };
}

function createMatchMediaMock(initialMatches = false) {
  let matches = initialMatches;
  const listeners = new Set();

  const mediaQueryList = {
    media: '(prefers-color-scheme: dark)',
    get matches() {
      return matches;
    },
    addEventListener: jest.fn((event, listener) => {
      if (event === 'change') listeners.add(listener);
    }),
    removeEventListener: jest.fn((event, listener) => {
      if (event === 'change') listeners.delete(listener);
    }),
  };

  const matchMedia = jest.fn(() => mediaQueryList);

  matchMedia.setMatches = (value) => {
    matches = value;
    listeners.forEach((listener) =>
      listener({ matches: value, media: mediaQueryList.media })
    );
  };

  matchMedia.getListenerCount = () => listeners.size;
  matchMedia.mediaQueryList = mediaQueryList;

  return matchMedia;
}

function setupThemeTest({ savedTheme, mediaMatches = false } = {}) {
  document.body.innerHTML = `
    <button id="lightThemeButton" data-theme="light"></button>
    <button id="darkThemeButton" data-theme="dark"></button>
    <button id="autoThemeButton" data-theme="auto"></button>
  `;
  document.documentElement.className = '';

  const initialStore = {};
  if (savedTheme !== undefined) {
    initialStore.theme = savedTheme;
  }

  const localStorageMock = createLocalStorageMock(initialStore);
  const matchMediaMock = createMatchMediaMock(mediaMatches);

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });

  Object.defineProperty(window, 'matchMedia', {
    value: matchMediaMock,
    configurable: true,
  });

  return {
    localStorageMock,
    matchMediaMock,
    buttons: {
      light: document.getElementById('lightThemeButton'),
      dark: document.getElementById('darkThemeButton'),
      auto: document.getElementById('autoThemeButton'),
    },
  };
}

describe('themeService', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
    Reflect.deleteProperty(window, 'localStorage');
    Reflect.deleteProperty(window, 'matchMedia');
  });

  test('initThemeControls applies the saved preference and wires up the buttons', () => {
    const { localStorageMock, matchMediaMock, buttons } = setupThemeTest({
      savedTheme: 'dark',
      mediaMatches: false,
    });

    initThemeControls();

    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    // Change Rationale: Validate ARIA pressed states so theme toggles keep
    // keyboard users aligned with the active theme selection.
    expect(buttons.dark.classList.contains('selected')).toBe(true);
    expect(buttons.light.classList.contains('selected')).toBe(false);
    expect(buttons.auto.classList.contains('selected')).toBe(false);
    expect(buttons.dark.getAttribute('aria-pressed')).toBe('');
    expect(buttons.light.getAttribute('aria-pressed')).toBe(null);
    expect(buttons.auto.getAttribute('aria-pressed')).toBe(null);
    expect(matchMediaMock.mediaQueryList.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
    expect(localStorageMock.setItem).not.toHaveBeenCalled();

    buttons.light.dispatchEvent(new Event('click', { bubbles: true }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(buttons.light.classList.contains('selected')).toBe(true);
    expect(buttons.dark.classList.contains('selected')).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith('theme', 'light');
    expect(localStorageMock.peek('theme')).toBe('light');
    expect(buttons.light.getAttribute('aria-pressed')).toBe('');
    expect(buttons.dark.getAttribute('aria-pressed')).toBe(null);
  });

  test('auto theme tracks media preference changes and keeps storage in sync', () => {
    const { localStorageMock, matchMediaMock, buttons } = setupThemeTest({
      savedTheme: 'auto',
      mediaMatches: false,
    });

    initThemeControls();

    expect(buttons.auto.classList.contains('selected')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    matchMediaMock.setMatches(true);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorageMock.peek('theme')).toBe('auto');

    matchMediaMock.setMatches(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('applyTheme persists the new theme and toggles the class on the html element', () => {
    const localStorageMock = createLocalStorageMock({ theme: 'light' });
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    document.documentElement.classList.add('dark');

    applyTheme('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});


describe('theme palette tokens', () => {
  /**
   * Returns the `src/styles/variables.css` content for token assertions.
   *
   * @returns {string} Raw variables stylesheet text.
   */
  function readThemeVariablesCss() {
    const repoRoot = path.join(__dirname, '..', '..');
    const variablesPath = path.join(repoRoot, 'src', 'styles', 'variables.css');
    return fs.readFileSync(variablesPath, 'utf8');
  }

  test('light mode keeps Android-green brand token mapping for BeerCSS variables', () => {
    const css = readThemeVariablesCss();

    expect(css).toMatch(/:root\s*\{[\s\S]*--md-sys-color-primary:\s*#3ddc84;/);
    expect(css).toMatch(/:root\s*\{[\s\S]*--app-primary:\s*var\(--md-sys-color-primary\);/);
    expect(css).toMatch(/:root\s*\{[\s\S]*--primary:\s*var\(--app-primary\);/);
    expect(css).toMatch(/:root\s*\{[\s\S]*--surface:\s*var\(--app-surface\);/);
  });

  test('dark mode keeps Android-green brand token mapping for BeerCSS variables', () => {
    const css = readThemeVariablesCss();

    expect(css).toMatch(/html\.dark\s*\{[\s\S]*--md-sys-color-primary:\s*#96dea1;/);
    expect(css).toMatch(/html\.dark\s*\{[\s\S]*--app-primary:\s*var\(--md-sys-color-primary\);/);
    expect(css).toMatch(/html\.dark\s*\{[\s\S]*--primary:\s*var\(--app-primary\);/);
    expect(css).toMatch(/html\.dark\s*\{[\s\S]*--surface:\s*var\(--app-surface\);/);
  });
});
