/**
 * @file Export validation helpers for App Toolkit payloads.
 */

/**
 * Reverse-domain package name format.
 * @type {RegExp}
 */
export const PACKAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;

/**
 * @param {string} value Candidate package name.
 * @param {(value: string) => string} trimString Shared string utility.
 * @returns {boolean} True when package name is valid.
 */
export function isValidPackageName(value, trimString) {
  return PACKAGE_NAME_PATTERN.test(trimString(value || ''));
}
