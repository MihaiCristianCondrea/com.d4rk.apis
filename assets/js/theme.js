let lightThemeButton, darkThemeButton, autoThemeButton, themeButtons, htmlElement;

/**
 * Initializes theme switching functionality.
 * Must be called after DOM is ready.
 */
function initTheme() {
    lightThemeButton = getDynamicElement('lightThemeButton');
    darkThemeButton = getDynamicElement('darkThemeButton');
    autoThemeButton = getDynamicElement('autoThemeButton');
    themeButtons = [lightThemeButton, darkThemeButton, autoThemeButton].filter(Boolean);
    htmlElement = document.documentElement;

    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            applyTheme(button.dataset.theme);
        });
    });

    const savedTheme = localStorage.getItem('theme') || 'auto';
    applyTheme(savedTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('theme') === 'auto') {
            applyTheme('auto');
        }
    });
}

/**
 * Applies the selected theme to the document.
 * @param {string} theme - The theme to apply ('light', 'dark', or 'auto').
 */
function applyTheme(theme) {
    if (!htmlElement) return; // Guard if not initialized
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    htmlElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme === 'auto' ? 'auto' : (isDark ? 'dark' : 'light'));
    updateThemeButtonSelection(theme);
}

/**
 * Updates the visual selection state of theme buttons.
 * @param {string} selectedTheme - The currently selected theme.
 */
function updateThemeButtonSelection(selectedTheme) {
    themeButtons.forEach(button => {
        button.classList.toggle('selected', button.dataset.theme === selectedTheme);
    });
}
