/**
 * Reads a provided {@link File} instance as text content so upstream builders can hydrate JSON inputs.
 *
 * @param {File} file - The file selected by the user for import.
 * @returns {Promise<string>} A promise that resolves with the file's textual contents when the read succeeds.
 * @throws {Error} Rejects with an error if the {@link FileReader} cannot complete the read.
 */
// Change Rationale: The function previously lacked documentation about its asynchronous return and failure mode, making
// error handling opaque for consumers. Adding JSDoc clarifies the Promise-based contract and the circumstances that
// cause rejection so Material 3-aligned validation flows can present precise feedback.
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
  });
}
