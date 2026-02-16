/**
 * @file UI controller for App Toolkit toolbar actions.
 */

/**
 * Change Rationale:
 * - Toolbar click wiring previously lived inline in the route module, mixing interaction mapping
 *   with high-level composition.
 * - Extracting this controller keeps route ownership focused on composition while making toolbar
 *   transitions explicit and reusable in tests.
 * - The split improves responsiveness and predictability, aligning with Material 3's clear action
 *   hierarchy for primary/secondary controls.
 */

/**
 * Wires toolbar actions for app creation, reset, copy, and export.
 *
 * @param {{
 *   addButton: HTMLElement | null,
 *   resetButton: HTMLElement | null,
 *   copyButton: HTMLElement | null,
 *   downloadButton: HTMLElement | null,
 *   previewArea: HTMLTextAreaElement | null,
 *   onAddApp: () => void,
 *   onResetWorkspace: () => void,
 *   onCopyPreview: (jsonText: string) => Promise<void> | void,
 *   onDownloadPreview: (jsonText: string) => void
 * }} deps Controller dependencies.
 * @returns {void}
 */
export function wireToolbarController(deps) {
  const {
    addButton,
    resetButton,
    copyButton,
    downloadButton,
    previewArea,
    onAddApp,
    onResetWorkspace,
    onCopyPreview,
    onDownloadPreview
  } = deps;

  if (addButton) {
    addButton.addEventListener('click', () => onAddApp());
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => onResetWorkspace());
  }

  if (copyButton && previewArea) {
    copyButton.addEventListener('click', async () => {
      await onCopyPreview(previewArea.value);
    });
  }

  if (downloadButton && previewArea) {
    downloadButton.addEventListener('click', () => {
      onDownloadPreview(previewArea.value);
    });
  }
}
