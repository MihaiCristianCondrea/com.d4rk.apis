const ACTIONS = {
  PARSE: 'parse',
  STRINGIFY: 'stringify',
  DIFF: 'diff',
};

function safeParse(payload) {
  if (payload == null) {
    throw new Error('JSON input is empty.');
  }
  if (typeof payload === 'object') {
    return payload;
  }
  const text = String(payload).trim();
  if (!text) {
    throw new Error('JSON input is empty.');
  }
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

function safeStringify(payload) {
  return JSON.stringify(payload, null, 2);
}

async function computeDiff({ baseline, candidate }) {
  if (typeof self.jsondiffpatch === 'undefined') {
    if (typeof importScripts === 'function') {
      importScripts('https://cdn.jsdelivr.net/npm/jsondiffpatch@0.7.3/dist/jsondiffpatch.umd.min.js');
    }
  }
  if (typeof self.jsondiffpatch === 'undefined') {
    throw new Error('jsondiffpatch is not available.');
  }
  return self.jsondiffpatch.diff(baseline, candidate);
}

self.onmessage = async (event) => {
  const { action, requestId, payload } = event.data || {};
  try {
    let result;
    switch (action) {
      case ACTIONS.PARSE:
        result = safeParse(payload);
        break;
      case ACTIONS.STRINGIFY:
        result = safeStringify(payload);
        break;
      case ACTIONS.DIFF:
        result = await computeDiff(payload);
        break;
      default:
        throw new Error(`Unknown worker action: ${action}`);
    }
    self.postMessage({ requestId, status: 'success', result });
  } catch (error) {
    self.postMessage({ requestId, status: 'error', message: error?.message || 'Worker error' });
  }
};
