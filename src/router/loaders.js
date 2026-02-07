/** Executes optional route loaders. */
export async function runLoader(route) { return typeof route.loader === 'function' ? route.loader() : null; }
