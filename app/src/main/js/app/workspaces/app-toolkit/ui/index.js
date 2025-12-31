import { createScreenshotField } from './components/screenshotField.js';

const globalScope = typeof window !== 'undefined' ? window : globalThis;

if (!globalScope.AppToolkitScreenshotField) {
  Object.defineProperty(globalScope, 'AppToolkitScreenshotField', {
    value: Object.freeze({ create: createScreenshotField }),
    writable: false,
    configurable: true,
  });
}

export { createScreenshotField };
