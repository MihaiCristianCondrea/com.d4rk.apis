const DISALLOWED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'template']);
const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|#)/i;
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

export function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return '';
  }

  const template = document.createElement('template');
  template.innerHTML = input;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const toRemove = [];

  while (walker.nextNode()) {
    const element = walker.currentNode;
    const tagName = element.tagName.toLowerCase();

    if (DISALLOWED_TAGS.has(tagName)) {
      toRemove.push(element);
      continue;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value || '';

      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        return;
      }

      if ((name === 'href' || name === 'src' || name === 'srcset') && value.trim()) {
        if (!SAFE_URL_PATTERN.test(value.trim())) {
          element.removeAttribute(attribute.name);
        }
      }
    });
  }

  toRemove.forEach((element) => element.remove());
  return template.innerHTML.trim();
}

function indent(depth) {
  return '  '.repeat(depth);
}

function serializeNode(node, depth, lines) {
  if (!node) {
    return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const trimmed = node.textContent?.replace(/\s+/g, ' ').trim();
    if (trimmed) {
      lines.push(`${indent(depth)}${trimmed}`);
    }
    return;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    const text = node.textContent?.trim();
    if (text) {
      lines.push(`${indent(depth)}<!-- ${text} -->`);
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const tag = node.tagName.toLowerCase();
  const attributes = Array.from(node.attributes)
    .map((attribute) => `${attribute.name}="${attribute.value}"`)
    .join(' ');
  const openingTag = attributes ? `<${tag} ${attributes}>` : `<${tag}>`;

  lines.push(`${indent(depth)}${openingTag}`);

  if (VOID_ELEMENTS.has(tag)) {
    return;
  }

  Array.from(node.childNodes).forEach((child) => serializeNode(child, depth + 1, lines));
  lines.push(`${indent(depth)}</${tag}>`);
}

export function prettifyHtmlFragment(input) {
  if (typeof input !== 'string') {
    return '';
  }

  const sanitized = sanitizeHtml(input);
  if (!sanitized) {
    return '';
  }

  const template = document.createElement('template');
  template.innerHTML = sanitized;

  const lines = [];
  Array.from(template.content.childNodes).forEach((child) => serializeNode(child, 0, lines));
  return lines.join('\n');
}
