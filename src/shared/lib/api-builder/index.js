import { createElement, clearElement } from '../dom/elements.js';
import { sanitizeHtml, prettifyHtmlFragment } from '../html/sanitizers.js';
import {
  formatJson,
  parseJson,
  prettifyJsonString,
  cloneJson,
} from '../json/operations.js';
import { createInputField, createTextareaField, createSelectField, createInlineButton } from '../forms/fields.js';
import { parseNumber } from '../numbers/parsers.js';
import { normalizeArray } from '../arrays/normalizers.js';
import { trimString } from '../strings/normalizers.js';
// Change Rationale: API builder utilities now pull IO helpers from `core/data/services`
// and scheduler primitives from `core/domain/scheduler` to align with the Android-style
// layer split without altering behavior or exports.
import { copyToClipboard } from '@/shared/api/clipboard-service.js';
import { downloadJson } from '@/shared/api/download-service.js';
import { readFileAsText } from '@/shared/api/file-service.js';
import { attachFilePicker } from '@/shared/api/file-picker-service.js';
import { setValidationStatus } from '@/core/data/services/validation/statusService.js';
import { renderJsonPreview } from '@/shared/api/json-preview-service.js';
import { createDeferredTask, createIdleTask } from '@/shared/lib/scheduler/deferred-task.js';

export const apiBuilderUtils = Object.freeze({
  createElement,
  clearElement,
  formatJson,
  parseJson,
  prettifyJsonString,
  sanitizeHtml,
  prettifyHtmlFragment,
  copyToClipboard,
  downloadJson,
  readFileAsText,
  createInputField,
  createTextareaField,
  createSelectField,
  createInlineButton,
  attachFilePicker,
  parseNumber,
  normalizeArray,
  trimString,
  cloneJson,
  setValidationStatus,
  renderJsonPreview,
  createDeferredTask,
  createIdleTask,
});

export function registerApiBuilderUtilsGlobal(target = typeof window !== 'undefined' ? window : undefined) {
  if (!target) {
    return;
  }
  if (!target.ApiBuilderUtils) {
    Object.defineProperty(target, 'ApiBuilderUtils', {
      value: apiBuilderUtils,
      configurable: true,
      writable: false,
    });
  }
}

export * from '../dom/elements.js';
export * from '../html/sanitizers.js';
export * from '../json/operations.js';
export * from '../forms/fields.js';
export * from '../numbers/parsers.js';
export * from '../arrays/normalizers.js';
export * from '../strings/normalizers.js';
export { copyToClipboard } from '@/shared/api/clipboard-service.js';
export { downloadJson } from '@/shared/api/download-service.js';
export { readFileAsText } from '@/shared/api/file-service.js';
export { attachFilePicker } from '@/shared/api/file-picker-service.js';
export { setValidationStatus } from '@/core/data/services/validation/statusService.js';
export { renderJsonPreview } from '@/shared/api/json-preview-service.js';
export { createDeferredTask, createIdleTask } from '@/shared/lib/scheduler/deferred-task.js';
