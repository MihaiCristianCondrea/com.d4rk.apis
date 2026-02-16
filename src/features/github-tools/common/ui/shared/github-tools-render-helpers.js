/**
 * @file Shared GitHub tools render/helper exports.
 *
 * Change Rationale: Tool-specific UI surfaces now import shared helpers from a dedicated
 * module so mapper/patch/release/favorites split can reuse orchestration without re-adding
 * duplicate DOM utility code.
 */

export {
  clearError,
  consumePrefill,
  savePrefill,
  renderError,
  setButtonBusy,
} from '../github-tools-legacy-ui.js';
