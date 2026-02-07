export function formatJson(data) {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('ApiBuilderUtils: Failed to stringify JSON.', error);
    throw new Error('Unable to stringify JSON.');
  }
}

export function parseJson(input) {
  if (input === undefined || input === null) {
    throw new Error('JSON input is empty.');
  }

  if (typeof input === 'object') {
    return input;
  }

  const text = String(input).trim();
  if (!text) {
    throw new Error('JSON input is empty.');
  }

  const sanitized = text.replace(/^\uFEFF/, '');
  try {
    return JSON.parse(sanitized);
  } catch (error) {
    console.error('ApiBuilderUtils: Invalid JSON provided.', error);
    throw new Error('Invalid JSON format.');
  }
}

export function prettifyJsonString(input) {
  const parsed = parseJson(input);
  const formatted = formatJson(parsed);
  if (!formatted) {
    throw new Error('Unable to format JSON string.');
  }
  return formatted;
}

export function cloneJson(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      console.warn('ApiBuilderUtils: structuredClone failed, falling back to JSON clone.', error);
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.error('ApiBuilderUtils: Failed to clone JSON value.', error);
    return value;
  }
}
