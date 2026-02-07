// Change Rationale: JSON worker clients now originate from the core data services layer,
// keeping worker access within the data boundary while preserving the same global API.
import { sharedJsonWorkerClient, JsonWorkerClient } from '@/core/data/services/jsonWorkerClient.js';

function exposeGlobal(name, value) {
  if (typeof window === 'undefined') {
    return;
  }
  Object.defineProperty(window, name, {
    value,
    configurable: true,
    writable: false,
  });
}

export function registerGlobalUtilities() {
  exposeGlobal('JsonWorkerClient', JsonWorkerClient);
  exposeGlobal('jsonWorkerClient', sharedJsonWorkerClient);
}

export function registerCompatibilityGlobals(entries = {}) {
  if (typeof window === 'undefined' || !entries || typeof entries !== 'object') {
    return;
  }

  Object.entries(entries).forEach(([key, value]) => {
    if (!key || value === undefined) {
      return;
    }
    if (typeof window[key] === 'undefined') {
      exposeGlobal(key, value);
    }
  });
}
