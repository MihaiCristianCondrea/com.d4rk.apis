const {
  readStoredTheme,
  persistTheme,
  isDarkPreferred,
  applyThemeClass,
  initThemeControls,
} = require('../../src/core/data/services/themeService.js');

describe('themeService pure/value behavior', () => {
  test('readStoredTheme falls back to auto', () => {
    expect(readStoredTheme(null)).toBe('auto');
    expect(readStoredTheme({ getItem: () => 'invalid' })).toBe('auto');
  });

  test('persistTheme writes valid values only', () => {
    const setItem = jest.fn();
    persistTheme('dark', { setItem });
    persistTheme('invalid', { setItem });
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  test('isDarkPreferred resolves explicit and auto modes', () => {
    expect(isDarkPreferred('dark', false)).toBe(true);
    expect(isDarkPreferred('light', true)).toBe(false);
    expect(isDarkPreferred('auto', true)).toBe(true);
  });
});

describe('themeService wiring', () => {
  test('initThemeControls uses provided element references', () => {
    document.body.innerHTML = '<button id="l" data-theme="light"></button><button id="d" data-theme="dark"></button><button id="a" data-theme="auto"></button>';
    const htmlElement = document.documentElement;
    const buttons = [
      document.getElementById('l'),
      document.getElementById('d'),
      document.getElementById('a'),
    ];

    const storage = {
      value: 'auto',
      getItem: jest.fn(() => 'auto'),
      setItem: jest.fn((k, v) => { storage.value = v; }),
    };

    const listeners = [];
    const mediaQueryList = {
      matches: false,
      addEventListener: jest.fn((event, handler) => {
        listeners.push(handler);
      }),
    };

    initThemeControls({ htmlElement, buttons, storage, mediaQueryList });
    buttons[1].click();
    expect(storage.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(htmlElement.classList.contains('dark')).toBe(true);

    storage.getItem.mockReturnValue('auto');
    mediaQueryList.matches = true;
    listeners[0]();
    expect(htmlElement.classList.contains('dark')).toBe(true);
  });

  test('initThemeControls supports DOM hydration defaults and keeps aria state synchronized', () => {
    document.body.innerHTML = `
      <button id="lightThemeButton" data-theme="light"></button>
      <button id="darkThemeButton" data-theme="dark"></button>
      <button id="autoThemeButton" data-theme="auto"></button>
    `;

    const storage = {
      getItem: jest.fn(() => 'light'),
      setItem: jest.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    const mediaQueryList = {
      matches: true,
      addEventListener: jest.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => mediaQueryList),
      configurable: true,
    });

    initThemeControls();

    const lightButton = document.getElementById('lightThemeButton');
    const darkButton = document.getElementById('darkThemeButton');
    const autoButton = document.getElementById('autoThemeButton');

    expect(lightButton.getAttribute('aria-pressed')).toBe('true');
    expect(darkButton.getAttribute('aria-pressed')).toBe('false');
    expect(autoButton.getAttribute('aria-pressed')).toBe('false');
    expect(lightButton.classList.contains('selected')).toBe(true);
  });

  test('auto mode reacts to system preference transitions', () => {
    document.body.innerHTML = '<button id="l" data-theme="light"></button><button id="d" data-theme="dark"></button><button id="a" data-theme="auto"></button>';
    const htmlElement = document.documentElement;
    const buttons = [
      document.getElementById('l'),
      document.getElementById('d'),
      document.getElementById('a'),
    ];

    const storage = {
      getItem: jest.fn(() => 'auto'),
      setItem: jest.fn(),
    };

    let listener = null;
    const mediaQueryList = {
      matches: false,
      addEventListener: jest.fn((_event, handler) => {
        listener = handler;
      }),
    };

    initThemeControls({ htmlElement, buttons, storage, mediaQueryList });
    expect(htmlElement.classList.contains('dark')).toBe(false);

    mediaQueryList.matches = true;
    listener?.({ matches: true });
    expect(htmlElement.classList.contains('dark')).toBe(true);

    mediaQueryList.matches = false;
    listener?.({ matches: false });
    expect(htmlElement.classList.contains('dark')).toBe(false);
  });

  test('applyThemeClass updates canonical dark class only', () => {
    const html = document.documentElement;
    applyThemeClass(html, 'light', true);
    expect(html.classList.contains('dark')).toBe(false);
    applyThemeClass(html, 'auto', true);
    expect(html.classList.contains('dark')).toBe(true);
  });
});
