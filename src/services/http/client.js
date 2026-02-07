/** HTTP helper facade. */
export async function getJson(url) { const response = await fetch(url); return response.json(); }
