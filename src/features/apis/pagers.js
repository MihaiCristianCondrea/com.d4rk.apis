(function (global) {
    function initPagerControls(pagerId) {
        const pager = typeof pagerId === 'string' ? document.getElementById(pagerId) : pagerId;
        if (!pager) {
            return;
        }
        if (pager.dataset.initialized === 'true') {
            return;
        }

        const tabs = Array.from(pager.querySelectorAll('.pager-tab'));
        const pages = Array.from(pager.querySelectorAll('.pager-page'));
        if (!tabs.length || !pages.length) {
            return;
        }

        function showPage(pageName) {
            tabs.forEach((tab) => {
                const isActive = tab.dataset.page === pageName;
                tab.classList.toggle('active', isActive);
                tab.setAttribute('aria-selected', String(isActive));
                tab.setAttribute('tabindex', isActive ? '0' : '-1');
            });
            pages.forEach((page) => {
                const isActive = page.dataset.page === pageName;
                page.classList.toggle('active', isActive);
                page.setAttribute('aria-hidden', String(!isActive));
            });
        }

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => showPage(tab.dataset.page));
            tab.addEventListener('keydown', (event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                    return;
                }
                const currentIndex = tabs.indexOf(tab);
                if (currentIndex === -1) {
                    return;
                }
                const delta = event.key === 'ArrowLeft' ? -1 : 1;
                let nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
                const nextTab = tabs[nextIndex];
                if (nextTab) {
                    nextTab.focus();
                    showPage(nextTab.dataset.page);
                }
            });
        });

        const activeTab = tabs.find((tab) => tab.classList.contains('active')) || tabs[0];
        showPage(activeTab.dataset.page);
        pager.dataset.initialized = 'true';
    }

    global.initPagerControls = initPagerControls;
})(typeof window !== 'undefined' ? window : globalThis);
