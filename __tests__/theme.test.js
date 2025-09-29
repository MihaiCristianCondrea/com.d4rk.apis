const fs = require('fs');
const path = require('path');
const vm = require('vm');

const themeSource = fs.readFileSync(
  path.resolve(__dirname, '../assets/js/theme.js'),
  'utf-8'
);
const themeScript = new vm.Script(themeSource, { filename: 'theme.js' });

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

  const windowMock = {
    document,
    matchMedia: matchMediaMock,
    localStorage: localStorageMock,
  };

  const context = {
    window: windowMock,
    document,
    localStorage: localStorageMock,
    getDynamicElement: (id) => document.getElementById(id),
    console,
  };

  windowMock.getDynamicElement = context.getDynamicElement;

  const vmContext = vm.createContext(context);
  themeScript.runInContext(vmContext);

  const buttons = {
    light: document.getElementById('lightThemeButton'),
    dark: document.getElementById('darkThemeButton'),
    auto: document.getElementById('autoThemeButton'),
  };

  return {
    context: vmContext,
    localStorageMock,
    matchMediaMock,
    buttons,
  };
}

describe('theme.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
  });

  test('initTheme applies the saved preference and wires up the buttons', () => {
    const { context, localStorageMock, matchMediaMock, buttons } = setupThemeTest({
      savedTheme: 'dark',
      mediaMatches: false,
    });

    context.initTheme();

    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(buttons.dark.classList.contains('selected')).toBe(true);
    expect(buttons.light.classList.contains('selected')).toBe(false);
    expect(buttons.auto.classList.contains('selected')).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(matchMediaMock.mediaQueryList.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );

    buttons.light.dispatchEvent(new global.window.Event('click', { bubbles: true }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(buttons.light.classList.contains('selected')).toBe(true);
    expect(buttons.dark.classList.contains('selected')).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith('theme', 'light');
    expect(localStorageMock.peek('theme')).toBe('light');
  });

  test('applyTheme("auto") tracks media preference changes and keeps storage in sync', () => {
    const { context, localStorageMock, matchMediaMock, buttons } = setupThemeTest({
      savedTheme: 'auto',
      mediaMatches: false,
    });

    context.initTheme();

    expect(buttons.auto.classList.contains('selected')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorageMock.peek('theme')).toBe('auto');

    const baselineSetCalls = localStorageMock.setItem.mock.calls.length;
    const baselineGetCalls = localStorageMock.getItem.mock.calls.length;

    matchMediaMock.setMatches(true);

    expect(localStorageMock.getItem.mock.calls.length).toBe(baselineGetCalls + 1);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(buttons.auto.classList.contains('selected')).toBe(true);
    expect(localStorageMock.setItem.mock.calls.length).toBe(baselineSetCalls + 1);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith('theme', 'auto');
    expect(localStorageMock.peek('theme')).toBe('auto');

    matchMediaMock.setMatches(false);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(buttons.auto.classList.contains('selected')).toBe(true);
    expect(localStorageMock.setItem.mock.calls.length).toBe(baselineSetCalls + 2);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith('theme', 'auto');
    expect(localStorageMock.peek('theme')).toBe('auto');
  });
});
