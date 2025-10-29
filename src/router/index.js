import RouterRoutes from './routes.js';
import RouterAnimation from './animation.js';
import RouterContentLoader from './contentLoader.js';
import RouterHistory from './history.js';
import normalizePageId from './identifiers.js';
import updateActiveNavLink from './navigationState.js';
import routerRuntime from './runtime.js';
import PageLoader from './pageLoader.js';

const pageLoader = new PageLoader(routerRuntime, {
  routes: RouterRoutes,
  animation: RouterAnimation,
  contentLoader: RouterContentLoader,
  history: RouterHistory,
});

function initRouter(contentAreaEl, appBarHeadlineEl, homeHTML, options = {}) {
  routerRuntime.registerContentTargets(contentAreaEl, appBarHeadlineEl, homeHTML);
  routerRuntime.applyOptions(options);
}

function loadPageContent(pageId, updateHistory = true) {
  return pageLoader.load(pageId, updateHistory);
}

const Router = {
  initRouter,
  loadPageContent,
  normalizePageId,
  updateActiveNavLink,
};

export default Router;
export { Router, initRouter, loadPageContent, normalizePageId, updateActiveNavLink };
