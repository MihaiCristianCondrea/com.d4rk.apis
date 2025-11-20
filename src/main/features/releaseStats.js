import { initReleaseStats } from './githubTools.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if the current page is the release-stats page
    // This is a simplified check; a more robust router integration would be better
    if (window.location.hash === '#release-stats') {
        initReleaseStats();
    }
});

// Export the init function for direct calls if needed by the router
export { initReleaseStats };
