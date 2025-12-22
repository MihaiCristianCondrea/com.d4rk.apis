jest.mock('firebase/app', () => {
  const initializeApp = jest.fn(() => ({ name: 'mock-app' }));
  const getApps = jest.fn(() => []);
  return { initializeApp, getApps };
});

jest.mock('firebase/analytics', () => {
  const getAnalytics = jest.fn(() => ({ name: 'mock-analytics' }));
  const isSupported = jest.fn(() => Promise.resolve(true));
  const logEvent = jest.fn(() => Promise.resolve());
  return { getAnalytics, isSupported, logEvent };
});

const firebaseAppMocks = require('firebase/app');
const firebaseAnalyticsMocks = require('firebase/analytics');

function loadCrashReporter() {
  let module;
  jest.isolateModules(() => {
    module = require('../app/src/main/js/services/firebaseCrashReporter.js');
  });
  return module;
}

describe('firebaseCrashReporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes analytics with an existing app when available', async () => {
    const existingApp = { name: 'preexisting-app' };
    firebaseAppMocks.getApps.mockReturnValue([existingApp]);
    firebaseAnalyticsMocks.isSupported.mockResolvedValue(true);

    const { initializeFirebaseMonitoring } = loadCrashReporter();
    const analytics = await initializeFirebaseMonitoring();

    expect(firebaseAppMocks.initializeApp).not.toHaveBeenCalled();
    expect(firebaseAnalyticsMocks.getAnalytics).toHaveBeenCalledWith(existingApp);
    expect(analytics).toEqual({ name: 'mock-analytics' });
  });

  test('forwards crash details to Firebase with normalized payloads', async () => {
    firebaseAppMocks.getApps.mockReturnValue([]);
    firebaseAnalyticsMocks.isSupported.mockResolvedValue(true);

    const { forwardCrashToFirebase } = loadCrashReporter();
    const result = await forwardCrashToFirebase(new Error('kaput'), 'unit-test');

    expect(result).toBe(true);
    expect(firebaseAppMocks.initializeApp).toHaveBeenCalled();
    expect(firebaseAnalyticsMocks.logEvent).toHaveBeenCalledWith(
      { name: 'mock-analytics' },
      'exception',
      expect.objectContaining({
        description: expect.stringContaining('kaput'),
        fatal: true,
        context: 'unit-test',
      }),
    );
  });

  test('installs global listeners and forwards window errors', async () => {
    const listeners = {};
    const addEventListenerMock = jest.spyOn(window, 'addEventListener').mockImplementation((eventName, handler) => {
      listeners[eventName] = handler;
      return undefined;
    });
    firebaseAnalyticsMocks.isSupported.mockResolvedValue(true);

    const { installFirebaseCrashHandlers } = loadCrashReporter();
    installFirebaseCrashHandlers();

    expect(addEventListenerMock).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
      { capture: true },
    );
    expect(addEventListenerMock).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
      { capture: true },
    );

    listeners.error({
      error: new Error('explode'),
      filename: 'index.js',
      lineno: 10,
      colno: 20,
    });
    listeners.unhandledrejection({ reason: 'promise failed' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(firebaseAnalyticsMocks.logEvent).toHaveBeenCalledWith(
      { name: 'mock-analytics' },
      'exception',
      expect.objectContaining({ context: 'window-error' }),
    );
    expect(firebaseAnalyticsMocks.logEvent).toHaveBeenCalledWith(
      { name: 'mock-analytics' },
      'exception',
      expect.objectContaining({ context: 'unhandled-rejection' }),
    );

    addEventListenerMock.mockRestore();
  });
});
