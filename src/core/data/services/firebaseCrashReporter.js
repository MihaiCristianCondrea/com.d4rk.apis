import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';

/**
 * @module firebaseCrashReporter
 * Bridges runtime errors to Firebase Analytics so crashes are visible in telemetry dashboards.
 */
// Change Rationale: This module centralizes crash forwarding to Firebase because the app previously logged failures only locally.
// Centralized telemetry validates the new Firebase SDK integration and supports Material Design 3's guidance to surface rapid, reliable feedback.

const firebaseConfig = {
  apiKey: 'AIzaSyAujoGWqHHGVnb8zyvCPGKZrdj79LTBPT0',
  authDomain: 'apis-workspace-console.firebaseapp.com',
  projectId: 'apis-workspace-console',
  storageBucket: 'apis-workspace-console.firebasestorage.app',
  messagingSenderId: '729570642328',
  appId: '1:729570642328:web:a9ff129e62ba0dd31803ed',
  measurementId: 'G-RZELH2VCP5',
};

const pendingCrashEvents = [];
let analyticsInitPromise = null;
let analyticsInstance = null;
let analyticsUnavailablePermanently = false;
let crashHandlersRegistered = false;

/**
 * Ensures a Firebase app instance exists so analytics can be configured.
 * @returns {import('firebase/app').FirebaseApp|null} Firebase app instance when the window object is available; otherwise null.
 */
function getOrCreateFirebaseApp() {
  if (typeof window === 'undefined') {
    return null;
  }
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  return initializeApp(firebaseConfig);
}

/**
 * Converts any error-like input into a normalized crash payload that Firebase Analytics accepts.
 * @param {unknown} errorLike - Error instance, rejection reason, or message string.
 * @param {string} context - High-level context that describes where the error originated.
 * @returns {{description: string, fatal: boolean, context: string}} Normalized crash payload.
 */
function normalizeCrashPayload(errorLike, context) {
  const defaultDescription = 'Unknown runtime error';
  if (!errorLike) {
    return {
      description: defaultDescription,
      fatal: true,
      context,
    };
  }

  if (errorLike instanceof Error) {
    const stack = errorLike.stack ? ` | stack: ${errorLike.stack}` : '';
    return {
      description: `${errorLike.name}: ${errorLike.message}${stack}`,
      fatal: true,
      context,
    };
  }

  if (typeof errorLike === 'string') {
    return { description: errorLike, fatal: true, context };
  }

  try {
    return { description: JSON.stringify(errorLike), fatal: true, context };
  } catch (serializationError) {
    return {
      description: `${defaultDescription} | non-serializable reason: ${serializationError}`,
      fatal: true,
      context,
    };
  }
}

/**
 * Forwards a crash payload to Firebase Analytics using the standardized `exception` event name.
 * @param {import('firebase/analytics').Analytics} analytics - Active Firebase Analytics instance.
 * @param {{description: string, fatal: boolean, context: string}} crashPayload - Normalized crash payload produced by {@link normalizeCrashPayload}.
 * @returns {Promise<void>} Promise that resolves once Firebase records the crash event.
 */
function sendCrashToFirebase(analytics, crashPayload) {
  return logEvent(analytics, 'exception', crashPayload);
}

/**
 * Flushes any queued crash payloads after analytics initializes successfully.
 * @param {import('firebase/analytics').Analytics} analytics - Active Firebase Analytics instance.
 * @returns {Promise<void>} Promise that resolves once all queued events are sent.
 */
async function flushPendingCrashes(analytics) {
  if (!pendingCrashEvents.length) {
    return;
  }
  const eventsToSend = [...pendingCrashEvents];
  pendingCrashEvents.length = 0;
  await Promise.all(eventsToSend.map((payload) => sendCrashToFirebase(analytics, payload)));
}

/**
 * Initializes Firebase Analytics once and stores the instance for reuse.
 * @returns {Promise<import('firebase/analytics').Analytics|null>} Analytics instance when supported; otherwise null.
 */
export function initializeFirebaseMonitoring() {
  if (analyticsInitPromise) {
    return analyticsInitPromise;
  }

  analyticsInitPromise = (async () => {
    const app = getOrCreateFirebaseApp();
    if (!app) {
      analyticsUnavailablePermanently = true;
      return null;
    }

    const analyticsSupported = await isSupported().catch(() => false);
    if (!analyticsSupported) {
      analyticsUnavailablePermanently = true;
      return null;
    }

    analyticsInstance = getAnalytics(app);
    await flushPendingCrashes(analyticsInstance);
    return analyticsInstance;
  })();

  return analyticsInitPromise;
}

/**
 * Records an error or rejection so crashes are visible inside Firebase Analytics.
 * @param {unknown} errorLike - Error instance, rejection reason, or descriptive string.
 * @param {string} [context='global'] - High-level context that describes where the error originated.
 * @returns {Promise<boolean>} Resolves true when the crash event reaches Firebase; false when analytics is unavailable.
 */
export async function forwardCrashToFirebase(errorLike, context = 'global') {
  if (analyticsUnavailablePermanently) {
    return false;
  }

  const payload = normalizeCrashPayload(errorLike, context);

  if (!analyticsInitPromise) {
    void initializeFirebaseMonitoring();
  }

  const analytics = await analyticsInitPromise;
  if (!analytics) {
    if (!analyticsUnavailablePermanently) {
      pendingCrashEvents.push(payload);
    }
    return false;
  }

  await sendCrashToFirebase(analytics, payload);
  return true;
}

/**
 * Installs global listeners that capture uncaught errors and unhandled promise rejections.
 * @returns {void}
 */
export function installFirebaseCrashHandlers() {
  if (crashHandlersRegistered || typeof window === 'undefined') {
    return;
  }

  crashHandlersRegistered = true;
  void initializeFirebaseMonitoring();

  window.addEventListener(
    'error',
    (event) => {
      const { error, message, filename, lineno, colno } = event;
      const description = error || message || `Unhandled error at ${filename}:${lineno}:${colno}`;
      void forwardCrashToFirebase(description, 'window-error');
    },
    { capture: true },
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event?.reason || 'Unhandled promise rejection';
      void forwardCrashToFirebase(reason, 'unhandled-rejection');
    },
    { capture: true },
  );
}
