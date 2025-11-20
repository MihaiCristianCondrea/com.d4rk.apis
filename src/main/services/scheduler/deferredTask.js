const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

const queueMicro =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (callback) => Promise.resolve().then(callback);

const requestIdle =
  typeof globalScope.requestIdleCallback === 'function'
    ? globalScope.requestIdleCallback.bind(globalScope)
    : null;

const cancelIdle =
  typeof globalScope.cancelIdleCallback === 'function'
    ? globalScope.cancelIdleCallback.bind(globalScope)
    : null;

export function createDeferredTask(task, { delay = 0, idle = false } = {}) {
  if (typeof task !== 'function') {
    throw new TypeError('createDeferredTask requires a task function.');
  }

  let hasPendingCall = false;
  let lastArgs = []; // FIXME: Contents of collection 'lastArgs' are updated, but never queried
  let runningPromise = null;
  let timeoutId = 0;
  let idleId = 0;
  let microtaskQueued = false;

  const scheduleExecution = () => {
    if (delay > 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(runTask, delay);
      return;
    }

    if (idle && requestIdle) {
      if (idleId) {
        cancelIdle(idleId);
      }
      idleId = requestIdle(() => {
        idleId = 0;
        runTask();
      });
      return;
    }

    if (!microtaskQueued) {
      microtaskQueued = true;
      queueMicro(() => {
        microtaskQueued = false;
        runTask();
      }).then(r => ); // FIXME: { expected
    }
  };

  const resetTimers = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = 0;
    }
    if (idleId) {
      if (cancelIdle) {
        cancelIdle(idleId);
      }
      idleId = 0;
    }
    microtaskQueued = false;
  };

  const execute = async () => {
    while (hasPendingCall) {
      hasPendingCall = false;
      const args = lastArgs;
      lastArgs = [];
      // eslint-disable-next-line no-await-in-loop
      await task(...args);
    }
  };

  const runTask = () => {
    resetTimers();
    if (!hasPendingCall) {
      return;
    }
    if (!runningPromise) {
      runningPromise = (async () => {
        try {
          await execute();
        } finally {
          runningPromise = null;
          if (hasPendingCall) {
            scheduleExecution();
          }
        }
      })();
    }
  };

  return {
    schedule(...args) {
      lastArgs = args;
      hasPendingCall = true;
      scheduleExecution();
    },
    async flush() {
      if (!hasPendingCall && !runningPromise) {
        return;
      }
      resetTimers();
      if (!runningPromise) {
        hasPendingCall = true;
        runningPromise = (async () => {
          try {
            await execute();
          } finally {
            runningPromise = null;
          }
        })();
      }
      await runningPromise;
    },
    cancel() {
      hasPendingCall = false;
      lastArgs = [];
      resetTimers();
    },
  };
}

export function createIdleTask(task, options = {}) {
  return createDeferredTask(task, { ...options, idle: true });
}
