import { initGitPatch } from './githubTools.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if the current page is the git-patch page
    // This is a simplified check; a more robust router integration would be better
    if (window.location.hash === '#git-patch') {
        initGitPatch();
    }
});

// Export the init function for direct calls if needed by the router
export { initGitPatch };
