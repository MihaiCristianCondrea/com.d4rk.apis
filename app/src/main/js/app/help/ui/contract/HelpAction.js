/**
 * @file Action definitions for the Help UI layer.
 *
 * Change Rationale: Provide a shared action contract to align Help UI state
 * transitions with the requested feature structure.
 */

/**
 * Enum-like action map for Help UI events.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const HelpAction = Object.freeze({
  LOAD_REQUESTED: 'help/load-requested',
  LOAD_SUCCEEDED: 'help/load-succeeded',
  LOAD_FAILED: 'help/load-failed',
  QUESTION_SELECTED: 'help/question-selected',
});
