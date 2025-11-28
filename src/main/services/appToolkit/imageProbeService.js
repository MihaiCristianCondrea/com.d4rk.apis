const workerUrl = new URL('../../workers/imageProbeWorker.js', import.meta.url);

let workerInstance = null;
let nextRequestId = 0;
const pendingRequests = new Map();
const cache = new Map();

function getWorker() {
  if (workerInstance) {
    return workerInstance;
  }
  if (typeof Worker === 'undefined') {
    return null;
  }
  try {
    workerInstance = new Worker(workerUrl, { type: 'module', name: 'AppToolkitImageProbe' });
    workerInstance.addEventListener('message', handleWorkerMessage);
    workerInstance.addEventListener('error', handleWorkerError);
    return workerInstance;
  } catch (error) {
    console.warn('AppToolkit: Falling back to main-thread image probing.', error);
    workerInstance = null;
    return null;
  }
}

function handleWorkerMessage(event) {
  const { id, status, width, height, error } = event.data || {};
  const entry = pendingRequests.get(id);
  if (!entry) {
    return;
  }
  pendingRequests.delete(id);
  if (status === 'success') {
    const payload = { width, height };
    cache.set(entry.url, payload);
    entry.resolve(payload);
  } else {
    entry.reject(new Error(error || 'Unable to load image.'));
  }
}

function handleWorkerError(error) {
  console.error('AppToolkit: Image probe worker error.', error);
  for (const entry of pendingRequests.values()) {
    entry.reject(new Error('Image probe worker failed.'));
  }
  pendingRequests.clear();
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  clearImageProbeCache();
}

function probeOnMainThread(url, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    let aborted = false;

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };

    if (signal) {
      if (signal.aborted) {
        aborted = true;
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          aborted = true;
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    }

    image.onload = () => {
      if (aborted) {
        return;
      }
      cleanup();
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      if (aborted) {
        return;
      }
      cleanup();
      reject(new Error('Failed to load image.'));
    };

    image.src = url;
  });
}

export function probeImage(url, { signal } = {}) {
  if (!url) {
    return Promise.reject(new Error('Missing image URL.'));
  }
  if (cache.has(url)) {
    return Promise.resolve(cache.get(url));
  }
  const worker = getWorker();
  if (!worker) {
    return probeOnMainThread(url, { signal }).then((meta) => {
      cache.set(url, meta);
      return meta;
    });
  }
  const requestId = nextRequestId++;
  worker.postMessage({ id: requestId, url });
  const workerPromise = new Promise((resolve, reject) => {
    const entry = { resolve, reject, url };
    pendingRequests.set(requestId, entry);
    if (signal) {
      if (signal.aborted) {
        pendingRequests.delete(requestId);
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          pendingRequests.delete(requestId);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    }
  });
  return workerPromise.catch((error) => {
    if (signal?.aborted) {
      throw error;
    }
    return probeOnMainThread(url, { signal }).then((meta) => {
      cache.set(url, meta);
      return meta;
    }, () => {
      throw error;
    });
  });
}

export function clearImageProbeCache() {
  cache.clear();
}
