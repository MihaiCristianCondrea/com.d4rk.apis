const DEFAULT_TIMEOUT = 7000;

const defaultWorkerUrl = new URL('../workers/jsonWorker.js', import.meta.url);

export class JsonWorkerClient {
  constructor(workerUrl = defaultWorkerUrl) {
    this.workerUrl = workerUrl;
    this.worker = null;
    this.pending = new Map();
  }

  ensureWorker() {
    if (this.worker) {
      return;
    }
    this.worker = new Worker(this.workerUrl, { type: 'module' });
    this.worker.onmessage = (event) => {
      const { requestId, status, result, message } = event.data || {};
      const entry = this.pending.get(requestId);
      if (!entry) {
        return;
      }
      const { resolve, reject, timeoutId } = entry;
      clearTimeout(timeoutId);
      this.pending.delete(requestId);
      if (status === 'success') {
        resolve(result);
      } else {
        reject(new Error(message || 'Worker error'));
      }
    };
    this.worker.onerror = (error) => {
      this.flushPending(error.error || error.message || 'Worker failure');
    };
  }

  flushPending(message) {
    this.pending.forEach(({ reject, timeoutId }) => {
      clearTimeout(timeoutId);
      reject(new Error(message));
    });
    this.pending.clear();
  }

  request(action, payload, { timeout = DEFAULT_TIMEOUT } = {}) {
    this.ensureWorker();
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Worker timed out for action ${action}`));
      }, timeout);

      this.pending.set(requestId, { resolve, reject, timeoutId });
      this.worker.postMessage({ action, requestId, payload });
    });
  }

  parse(payload, options) {
    return this.request('parse', payload, options);
  }

  stringify(payload, options) {
    return this.request('stringify', payload, options);
  }

  diff(baseline, candidate, options) {
    return this.request('diff', { baseline, candidate }, options);
  }
}

export const sharedJsonWorkerClient = new JsonWorkerClient();
