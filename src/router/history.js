/** History helper for route transitions. */
export function pushRoute(routeId) { window.history.pushState({ page: `#${routeId}` }, '', `#${routeId}`); }
