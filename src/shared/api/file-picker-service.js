import { readFileAsText } from './file-service.js';

/**
 * Registers a click-driven file picker workflow that reads the selected file and forwards its contents to a consumer.
 *
 * @param {HTMLButtonElement} button - The trigger element that opens the native file picker.
 * @param {HTMLInputElement} input - The hidden file input used to capture the user's selection.
 * @param {(content: string) => void} callback - Invoked with the file's text content after a successful read.
 * @param {(message: string, error: Error) => void} [errorReporter=defaultErrorReporter] - Optional reporter to surface
 * errors to custom validation/status components; defaults to logging via {@link console#error}.
 * @returns {() => void | undefined} A teardown function that removes the attached listeners, or `undefined` when
 * provided elements are missing.
 */
// Change Rationale: The previous implementation surfaced errors with a blocking alert, limiting flexibility for Material
// 3 validation components and lacking documentation around parameters and return values. Introducing a configurable error
// reporter keeps errors routed through builder-specific UI while JSDoc clarifies the interaction contract and cleanup
// behavior.
export function attachFilePicker(button, input, callback, errorReporter = defaultErrorReporter) {
  if (!button || !input) {
    return;
  }

  const handleClick = () => input.click();
  const handleChange = async () => {
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    try {
      const content = await readFileAsText(file);
      callback(content);
    } catch (error) {
      errorReporter('ApiBuilderUtils: Failed to import JSON.', error);
    } finally {
      input.value = '';
    }
  };

  button.addEventListener('click', handleClick);
  input.addEventListener('change', handleChange);

  return () => {
    button.removeEventListener('click', handleClick);
    input.removeEventListener('change', handleChange);
  };
}

/**
 * Reports file import errors to the console when no custom reporter is supplied.
 *
 * @param {string} message - The contextual message describing the failure.
 * @param {Error} error - The originating error thrown during file parsing.
 */
function defaultErrorReporter(message, error) {
  console.error(message, error);
}
