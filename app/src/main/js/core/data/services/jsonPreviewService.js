import { cloneJson, formatJson } from '../core/domain/json/operations.js';
import { setValidationStatus } from './validation/statusService.js';
import { sharedJsonWorkerClient } from './jsonWorkerClient.js';

function resolveMessage(message, payload) {
  return typeof message === 'function' ? message(payload) : message;
}

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
