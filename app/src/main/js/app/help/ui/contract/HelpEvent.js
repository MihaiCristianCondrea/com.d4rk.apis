/**
 * @file Event definitions for the Help UI layer.
 *
 * Change Rationale: Add a dedicated HelpEvent contract so UI intent can be
 * documented independently of rendering details.
 */

/**
 * @typedef {Object} HelpEvent
 * @property {string} type - Event type string.
 * @property {object} [payload] - Optional event payload.
 */

/**
 * Creates a Help event payload.
 *
 * @param {string} type - Event type string.
 * @param {object} [payload] - Optional payload data.
 * @returns {HelpEvent} Event object.
 */
export function createHelpEvent(type, payload = {}) {
  return { type, payload };
}
