import { initRepoMapper } from './githubTools.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if the current page is the repo-mapper page
    // This is a simplified check; a more robust router integration would be better
    if (window.location.hash === '#repo-mapper') {
        initRepoMapper();
    }
});

// Export the init function for direct calls if needed by the router
export { initRepoMapper };
