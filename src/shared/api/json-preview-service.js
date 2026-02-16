/**
 * Change Rationale: JSON utilities live under `core/domain/`, but the previous import pointed at a non-existent `core/data/core/` path, which Vite could not resolve during production builds. Correcting the relative path preserves the intended domain layering and keeps JSON previews available across Material Design 3 surfaces.
 */
import { cloneJson, formatJson } from '@/shared/lib/json/operations.js';
import { setValidationStatus } from '@/core/data/services/validation/statusService.js';
import { sharedJsonWorkerClient } from './json-worker-client.js';

/**
 * Resolves a status message, supporting lazy evaluation when a function is provided.
 *
 * @param {string | ((payload: unknown) => string)} message - Static message or message factory.
 * @param {unknown} payload - Data passed to the message factory when applicable.
 * @returns {string} The resolved message text.
 */
function resolveMessage(message, payload) {
  return typeof message === 'function' ? message(payload) : message;
}

/**
 * Formats and renders a JSON preview into the provided textarea, optionally auto-fixing and validating payloads.
 *
 * @param {Object} options - Preview configuration.
 * @param {HTMLTextAreaElement} options.previewArea - Textarea element that displays the JSON preview.
 * @param {HTMLElement} [options.statusElement] - Element used to display validation status.
 * @param {unknown} options.data - Raw data to preview.
 * @param {(data: unknown) => unknown} [options.buildPayload] - Optional transformer applied before formatting.
 * @param {(payload: unknown) => unknown} [options.autoFix] - Optional transformer used to correct payloads.
 * @param {(payload: unknown) => unknown} [options.validator] - Optional validator applied before rendering.
 * @param {string | ((payload: unknown) => string)} [options.successMessage='Valid JSON'] - Message shown on success.
 * @param {string | ((payload: unknown) => string)} [options.errorMessage='Invalid JSON output.'] - Message shown on failure.
 * @param {{ stringify?: (payload: unknown) => Promise<string> }} [options.workerClient=sharedJsonWorkerClient] - Worker client for off-thread formatting.
 * @returns {Promise<{ success: boolean, payload?: unknown, error?: Error }>} Result describing render status.
 */
export async function renderJsonPreview({
  previewArea,
  statusElement,
  data,
  buildPayload,
  autoFix,
  validator,
  successMessage = 'Valid JSON',
  errorMessage = 'Invalid JSON output.',
  workerClient = sharedJsonWorkerClient,
}) {
  if (!previewArea) {
    return { success: false };
  }

  const previousValue = previewArea.value;

  try {
    let payload = buildPayload ? buildPayload(data) : data;
    if (payload && typeof payload === 'object') {
      payload = cloneJson(payload);
    }

    if (autoFix) {
      const result = autoFix(payload);
      if (result !== undefined) {
        payload = result;
      }
    }

    if (validator) {
      const result = validator(payload);
      if (result !== undefined) {
        payload = result;
      }
    }

    let formatted;
    if (workerClient && typeof workerClient.stringify === 'function') {
      formatted = await workerClient.stringify(payload ?? {});
    } else {
      formatted = formatJson(payload ?? {});
    }

    if (previewArea.value !== formatted) {
      previewArea.value = formatted;
    }
    if (statusElement) {
      const message = resolveMessage(successMessage, payload) || 'Valid JSON';
      setValidationStatus(statusElement, { status: 'success', message });
    }

    return { success: true, payload };
  } catch (error) {
    console.error('ApiBuilderUtils: Unable to update JSON preview.', error);
    if (statusElement) {
      setValidationStatus(statusElement, {
        status: 'error',
        message: error.message || errorMessage,
      });
    }
    previewArea.value = previousValue;
    return { success: false, error };
  }
}
