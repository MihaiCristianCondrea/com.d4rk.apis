import { wireToolbarController } from '../../app/src/main/js/app/workspaces/app-toolkit/ui/controllers/toolbarController.js';

describe('wireToolbarController', () => {
  test('wires toolbar actions to callbacks', async () => {
    document.body.innerHTML = `
      <button id="add"></button>
      <button id="reset"></button>
      <button id="copy"></button>
      <button id="download"></button>
      <textarea id="preview">{"apps":[]}</textarea>
    `;

    const calls = [];
    wireToolbarController({
      addButton: document.getElementById('add'),
      resetButton: document.getElementById('reset'),
      copyButton: document.getElementById('copy'),
      downloadButton: document.getElementById('download'),
      previewArea: document.getElementById('preview'),
      onAddApp: () => calls.push('add'),
      onResetWorkspace: () => calls.push('reset'),
      onCopyPreview: async (jsonText) => calls.push(`copy:${jsonText}`),
      onDownloadPreview: (jsonText) => calls.push(`download:${jsonText}`)
    });

    document.getElementById('add').click();
    document.getElementById('reset').click();
    document.getElementById('copy').click();
    await Promise.resolve();
    document.getElementById('download').click();

    expect(calls).toEqual(['add', 'reset', 'copy:{"apps":[]}', 'download:{"apps":[]}']);
  });
});
