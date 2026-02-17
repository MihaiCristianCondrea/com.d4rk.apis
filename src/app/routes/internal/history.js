const DOCUMENT_TITLE_SUFFIX = ' - API Console';

function updateTitle(appBarHeadline, pageTitle) {
    if (appBarHeadline) {
        appBarHeadline.textContent = pageTitle;
    }
    if (typeof document !== 'undefined') {
        document.title = `${pageTitle}${DOCUMENT_TITLE_SUFFIX}`;
    }
}

function pushState(pageId, pageTitle, urlFragment, shouldUpdate = true) {
const historyApi = typeof window !== 'undefined' ? window.history : globalThis.history;
if (!shouldUpdate || !historyApi || typeof historyApi.pushState !== 'function') {
        return;
    }
historyApi.pushState({ page: pageId }, pageTitle, `#${urlFragment}`);
}

const RouterHistory = {
    DOCUMENT_TITLE_SUFFIX,
    updateTitle,
    pushState
};

export default RouterHistory;
export { RouterHistory, DOCUMENT_TITLE_SUFFIX, updateTitle, pushState };
