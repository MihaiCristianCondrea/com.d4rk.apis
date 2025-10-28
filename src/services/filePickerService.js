import { readFileAsText } from './fileService.js';

export function attachFilePicker(button, input, callback) {
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
      console.error('ApiBuilderUtils: Failed to import JSON.', error);
      alert('Could not read the selected file.');
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
