/**
 * @file Jest coverage for the shared workspace remote controls partial.
 *
 * Change Rationale: Shared remote controls now live in `app/workspaces/shared/ui` after
 * removing compatibility barrels, so tests import the canonical module path.
 */
import { initBuilderRemoteControls } from '../app/src/main/js/app/workspaces/shared/ui/remoteControls.js';

// Change Rationale: Ensure the shared remote controls partial hydrates correctly for workspaces so preset buttons and IDs
// remain aligned with existing import and publish listeners.

/**
 * Verifies preset hydration for workspace-specific remote controls.
 *
 * @returns {void}
 */
const shouldHydrateRemotePresets = () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <div
            data-partial="builder-remote"
            data-remote-prefix="english"
            data-fetch-input-id="englishFetchInput"
            data-fetch-button-id="englishFetchButton"
            data-fetch-target-id="englishFetchTarget"
            data-github-button-id="englishGithubWizardButton"
            data-home-debug-preset="https://example.com/home-debug.json"
            data-home-release-preset="https://example.com/home-release.json"
            data-lesson-debug-preset="https://example.com/lesson-debug.json"
            data-lesson-release-preset="https://example.com/lesson-release.json"
            data-home-debug-label="Debug Home"
            data-lesson-debug-label="Debug Lesson"
        ></div>
    `;

    initBuilderRemoteControls(container);

    const presets = Array.from(container.querySelectorAll('[data-english-fetch-preset]'));
    const presetUrls = presets.map((button) => button.dataset.englishFetchPreset);
    expect(presetUrls).toEqual([
        'https://example.com/home-debug.json',
        'https://example.com/home-release.json',
        'https://example.com/lesson-debug.json',
        'https://example.com/lesson-release.json'
    ]);
    expect(new Set(presets.map((button) => button.dataset.englishFetchTarget))).toEqual(new Set(['home', 'lesson']));

    const labels = container.querySelectorAll('.builder-remote-preset-label');
    expect(labels[0].textContent).toBe('Debug Home');
    expect(labels[2].textContent).toBe('Debug Lesson');

    expect(container.querySelector('#englishFetchInput')).not.toBeNull();
    expect(container.querySelector('#englishFetchButton')).not.toBeNull();
    expect(container.querySelector('#englishFetchTarget')).not.toBeNull();
    expect(container.querySelector('#englishGithubWizardButton')).not.toBeNull();
};

describe('initBuilderRemoteControls', () => {
    test('hydrates home and lesson presets with workspace-specific dataset', shouldHydrateRemotePresets);
});
