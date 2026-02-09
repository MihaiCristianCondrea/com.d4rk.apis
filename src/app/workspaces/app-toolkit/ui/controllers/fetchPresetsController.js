/**
 * @file UI controller for App Toolkit quick-fetch preset buttons.
 */

/**
 * Wires preset buttons for remote JSON fetch actions.
 *
 * @param {{presetButtons: HTMLElement[], trimString: (value: string) => string, fetchRemoteJson: (url: string, options: {fromPreset: boolean, sourceButton: HTMLElement}) => void}} deps Dependencies.
 * @returns {void}
 */
export function wireFetchPresetsController({ presetButtons, trimString, fetchRemoteJson }) {
  if (!presetButtons.length) return;
  presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const presetUrl = trimString(button.dataset.appToolkitPreset || '');
      if (!presetUrl) return;
      fetchRemoteJson(presetUrl, { fromPreset: true, sourceButton: button });
    });
  });
}
