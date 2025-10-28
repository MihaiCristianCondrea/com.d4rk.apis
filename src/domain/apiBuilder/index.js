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
import { copyToClipboard } from '../../services/clipboardService.js';
import { downloadJson } from '../../services/downloadService.js';
import { readFileAsText } from '../../services/fileService.js';
import { attachFilePicker } from '../../services/filePickerService.js';
import { setValidationStatus } from '../../services/validation/statusService.js';
import { renderJsonPreview } from '../../services/jsonPreviewService.js';

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
export { copyToClipboard } from '../../services/clipboardService.js';
export { downloadJson } from '../../services/downloadService.js';
export { readFileAsText } from '../../services/fileService.js';
export { attachFilePicker } from '../../services/filePickerService.js';
export { setValidationStatus } from '../../services/validation/statusService.js';
export { renderJsonPreview } from '../../services/jsonPreviewService.js';
