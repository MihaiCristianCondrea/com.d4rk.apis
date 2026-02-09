const {
  readStoredTheme,
  persistTheme,
  isDarkPreferred,
  applyThemeClass,
  initThemeControls,
} = require('../../app/src/main/js/core/data/services/themeService.js');

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
    expect(htmlElement.getAttribute('data-theme')).toBe('dark');

    storage.getItem.mockReturnValue('auto');
    mediaQueryList.matches = true;
    listeners[0]();
    expect(htmlElement.classList.contains('dark')).toBe(true);
  });

  test('applyThemeClass updates class and attribute', () => {
    const html = document.documentElement;
    applyThemeClass(html, 'light', true);
    expect(html.classList.contains('dark')).toBe(false);
    applyThemeClass(html, 'auto', true);
    expect(html.classList.contains('dark')).toBe(true);
  });
});
