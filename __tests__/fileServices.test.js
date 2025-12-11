import { attachFilePicker } from '../app/src/main/js/services/filePickerService.js';
import { readFileAsText } from '../app/src/main/js/services/fileService.js';

// Change Rationale: Added comprehensive unit tests to validate the documented file reader contracts and the new error
// reporting pathway, ensuring builders can rely on predictable behavior when integrating Material 3 validation flows.

describe('file services', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads file content successfully', async () => {
    global.FileReader = createMockFileReader({ result: 'mock content' });
    const file = new File(['mock content'], 'mock.txt', { type: 'text/plain' });

    await expect(readFileAsText(file)).resolves.toBe('mock content');
  });

  it('propagates errors when the reader fails', async () => {
    global.FileReader = createMockFileReader({ shouldError: true });
    const file = new File(['fail'], 'fail.txt', { type: 'text/plain' });

    await expect(readFileAsText(file)).rejects.toThrow('Unable to read file.');
  });

  it('invokes callback with file content when input selection succeeds', async () => {
    global.FileReader = createMockFileReader({ result: 'file body' });
    const button = document.createElement('button');
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['file body'], 'file.json', { type: 'application/json' })],
    });

    const callback = jest.fn();
    const errorReporter = jest.fn();

    attachFilePicker(button, input, callback, errorReporter);
    input.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(callback).toHaveBeenCalledWith('file body');
    expect(errorReporter).not.toHaveBeenCalled();
  });

  it('reports errors when FileReader rejects the file read', async () => {
    global.FileReader = createMockFileReader({ shouldError: true });
    const button = document.createElement('button');
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['bad'], 'bad.json', { type: 'application/json' })],
    });

    const callback = jest.fn();
    const errorReporter = jest.fn();

    attachFilePicker(button, input, callback, errorReporter);
    input.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
    expect(errorReporter).toHaveBeenCalledWith(
      'ApiBuilderUtils: Failed to import JSON.',
      expect.any(Error)
    );
  });

  it('returns undefined when button or input elements are missing', () => {
    const callback = jest.fn();

    expect(attachFilePicker(null, null, callback)).toBeUndefined();
  });
});

/**
 * Creates a mock {@link FileReader} constructor that either resolves or errors on read.
 *
 * @param {{result?: string, shouldError?: boolean}} config - Optional configuration for the mock behavior.
 * @returns {jest.Mock} A jest mock constructor that mimics {@link FileReader} lifecycle callbacks.
 */
function createMockFileReader({ result = '', shouldError = false } = {}) {
  return jest.fn().mockImplementation(() => ({
    onerror: null,
    onload: null,
    result: '',
    readAsText() {
      if (shouldError && this.onerror) {
        this.onerror(new Error('read failure'));
        return;
      }

      this.result = result;
      this.onload && this.onload({ target: this });
    },
  }));
}
