(function (global) {
    const DOCUMENT_TITLE_SUFFIX = " - Mihai's Profile";

    function updateTitle(appBarHeadline, pageTitle) {
        if (appBarHeadline) {
            appBarHeadline.textContent = pageTitle;
        }
        if (typeof document !== 'undefined') {
            document.title = `${pageTitle}${DOCUMENT_TITLE_SUFFIX}`;
        }
    }

    function pushState(pageId, pageTitle, urlFragment, shouldUpdate = true) {
        if (!shouldUpdate || !global.history || typeof global.history.pushState !== 'function') {
            return;
        }
        global.history.pushState({ page: pageId }, pageTitle, `#${urlFragment}`);
    }

    global.RouterHistory = {
        DOCUMENT_TITLE_SUFFIX,
        updateTitle,
        pushState
    };
})(typeof window !== 'undefined' ? window : globalThis);
