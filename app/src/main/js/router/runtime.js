import normalizePageId from './identifiers.js';

const NOOP = () => {};

export class RouterRuntime {
  constructor() {
    this.reset();
  }

  reset() {
    this.contentArea = null;
    this.appBarHeadline = null;
    this.initialHomeHTML = '';
    this.showOverlay = NOOP;
    this.hideOverlay = NOOP;
    this.closeDrawer = NOOP;
    this.onHomeLoad = null;
    this.pageHandlers = Object.create(null);
  }

  registerContentTargets(contentArea, appBarHeadline, homeHTML = '') {
    this.contentArea = contentArea || null;
    this.appBarHeadline = appBarHeadline || null;
    this.initialHomeHTML = typeof homeHTML === 'string' ? homeHTML : '';
  }

  applyOptions(options = {}) {
    const normalizedOptions = options && typeof options === 'object' ? options : {};

    this.showOverlay = this.resolveCallback(normalizedOptions.showOverlay);
    this.hideOverlay = this.resolveCallback(normalizedOptions.hideOverlay);
    this.closeDrawer = this.resolveCallback(normalizedOptions.closeDrawer);
    this.onHomeLoad = typeof normalizedOptions.onHomeLoad === 'function'
      ? normalizedOptions.onHomeLoad
      : null;

    this.pageHandlers = Object.create(null);
    this.registerPageHandlers(normalizedOptions.pageHandlers);
  }

  resolveCallback(callback) {
    return typeof callback === 'function' ? callback : NOOP;
  }

  registerPageHandlers(handlers) {
    if (!handlers || typeof handlers !== 'object') {
      return;
    }

    Object.entries(handlers).forEach(([pageId, handler]) => {
      if (typeof handler !== 'function') {
        return;
      }
      const normalizedId = typeof pageId === 'string' ? normalizePageId(pageId) : '';
      if (!normalizedId) {
        return;
      }
      this.pageHandlers[normalizedId] = handler;
    });
  }

  getContentArea() {
    return this.contentArea;
  }

  getAppBarHeadline() {
    return this.appBarHeadline;
  }

  getInitialHomeHTML() {
    return this.initialHomeHTML;
  }

  invoke(callback, description, ...args) {
    if (typeof callback !== 'function') {
      return false;
    }
    try {
      callback(...args);
      return true;
    } catch (error) {
      console.error(`Router: Error running ${description}:`, error);
      return true;
    }
  }

  callShowOverlay() {
    return this.invoke(this.showOverlay, 'showOverlay callback');
  }

  callHideOverlay() {
    return this.invoke(this.hideOverlay, 'hideOverlay callback');
  }

  callCloseDrawer() {
    return this.invoke(this.closeDrawer, 'closeDrawer callback');
  }

  runInjectedHandlers(pageId) {
    let handled = false;

    if (pageId === 'home' && this.onHomeLoad) {
      handled = this.invoke(this.onHomeLoad, 'home page load callback', pageId) || handled;
    }

    const handler = this.pageHandlers[pageId];
    if (handler) {
      handled = this.invoke(handler, `page handler for ${pageId}`, pageId) || handled;
    }

    return handled;
  }
}

export const routerRuntime = new RouterRuntime();

export default routerRuntime;
