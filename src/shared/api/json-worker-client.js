// Change Rationale: Asset resolution now lives in the data layer (`core/data/config/appConfig`)
// to match the Android-style separation and keep worker URLs centralized.
import { resolveAssetUrl } from '@/shared/config/app-config.js';

const DEFAULT_TIMEOUT = 7000;
const DEFAULT_WORKER_PATH = resolveAssetUrl('workers/jsonWorker.js');
const FALLBACK_STRINGIFY_SPACING = 2;

const LOCAL_ACTIONS = {
  parse(payload) {
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
  },
  stringify(payload) {
    return JSON.stringify(payload, null, FALLBACK_STRINGIFY_SPACING);
  },
  diff({ baseline, candidate }) {
    if (baseline === candidate) {
      return undefined;
    }
    return { baseline, candidate };
  },
};

export class JsonWorkerClient {
  constructor(workerUrl = DEFAULT_WORKER_PATH) {
    this.workerUrl = workerUrl;
    this.worker = null;
    this.pending = new Map();
    this.workerUnavailable = false;
  }

  ensureWorker() {
    if (this.workerUnavailable || this.worker || typeof Worker === 'undefined') {
      return;
    }
    try {
      const workerSource = new URL(
        this.workerUrl,
        typeof window !== 'undefined' ? window.location.origin : undefined,
      ).toString();
      this.worker = new Worker(workerSource, { type: 'module' });
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
        this.handleWorkerFailure(error.error || error.message || 'Worker failure');
      };
    } catch (error) {
      this.handleWorkerFailure(error);
    }
  }

  flushPending(message) {
    this.pending.forEach(({ reject, timeoutId }) => {
      clearTimeout(timeoutId);
      reject(new Error(message));
    });
    this.pending.clear();
  }

  handleWorkerFailure(reason) {
    this.workerUnavailable = true;
    if (this.worker && typeof this.worker.terminate === 'function') {
      this.worker.terminate();
    }
    this.worker = null;
    const message =
      typeof reason === 'string'
        ? reason
        : reason?.message || 'Worker unavailable';
    console.warn('JsonWorkerClient: Worker unavailable, using local execution.', message);
    if (this.pending.size > 0) {
      this.flushPending(message);
    }
  }

  request(action, payload, { timeout = DEFAULT_TIMEOUT } = {}) {
    if (this.workerUnavailable || typeof Worker === 'undefined') {
      return this.executeLocally(action, payload);
    }

    this.ensureWorker();
    if (this.workerUnavailable || !this.worker) {
      return this.executeLocally(action, payload);
    }
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

  executeLocally(action, payload) {
    const handler = LOCAL_ACTIONS[action];
    if (!handler) {
      return Promise.reject(new Error(`Unknown worker action: ${action}`));
    }
    try {
      const result = handler(payload);
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  stringify(payload, options) {
    return this.request('stringify', payload, options);
  }

  diff(baseline, candidate, options) {
    return this.request('diff', { baseline, candidate }, options);
  }
}

export const sharedJsonWorkerClient = new JsonWorkerClient();
