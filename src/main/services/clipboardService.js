import { createElement } from '@/domain/dom/elements';

function fallbackCopy(text) {
  const textarea = createElement('textarea', {
    classNames: 'sr-only',
    attrs: { value: text },
  });
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy'); // FIXME: Deprecated symbol used, consult docs for better alternative
  } catch (error) {
    console.error('ApiBuilderUtils: copy command failed.', error);
  }
  document.body.removeChild(textarea);
}

export async function copyToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopy(text);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.warn('ApiBuilderUtils: Clipboard API failed, falling back to execCommand.', error);
    fallbackCopy(text);
  }
}
