/**
 * Safely retrieves a nested value from an object using a path string.
 * @param {object} obj - The object to traverse.
 * @param {string} path - The path string (e.g., 'a.b.c' or 'a[0].b').
 * @param {*} [defaultValue=undefined] - The value to return if the path is not found.
 * @returns {*} The value at the path or the default value.
 */
function getNestedValue(obj, path, defaultValue = undefined) {
    const travel = regexp => String(path).split(regexp).filter(Boolean).reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
    const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
    return result === undefined || result === obj ? defaultValue : result;
}

/**
 * Extracts the first image URL from HTML content.
 * Prioritizes non-data URI src attributes, then Google User Content URLs.
 * @param {string} htmlContent - The HTML content to parse.
 * @returns {string|null} The image URL or null if not found.
 */
function extractFirstImageFromHtml(htmlContent) {
    if (!htmlContent) return null;
    const imgTagMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/);
    if (imgTagMatch && imgTagMatch[1] && !imgTagMatch[1].startsWith('data:image')) return imgTagMatch[1];
    const bloggerImageMatch = htmlContent.match(/(https?:\/\/[^"]+\.googleusercontent\.com\/[^"]+)/);
    if (bloggerImageMatch && bloggerImageMatch[1]) return bloggerImageMatch[1];
    return null;
}

/**
 * Helper to safely get an element by ID, especially for dynamically loaded content.
 * @param {string} id - The ID of the element.
 * @returns {HTMLElement|null} The element or null if not found.
 */
function getDynamicElement(id) {
    return document.getElementById(id);
}

/**
 * Sets the copyright year in the footer.
 */
function setCopyrightYear() {
    const copyrightElement = document.getElementById('copyright-message');
    if (copyrightElement) {
        const currentYear = new Date().getFullYear();
        const yearText = currentYear === 2025 ? '2025' : `2025-${currentYear}`;
        copyrightElement.textContent = `Copyright © ${yearText}, Mihai-Cristian Condrea`;
    }
}


/** Show page loading overlay */
function showPageLoadingOverlay() {
    const overlay = document.getElementById("pageLoadingOverlay");
    if (overlay) overlay.classList.add("active");
}

/** Hide page loading overlay */
function hidePageLoadingOverlay() {
    const overlay = document.getElementById("pageLoadingOverlay");
    if (overlay) overlay.classList.remove("active");
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getNestedValue,
        extractFirstImageFromHtml,
        getDynamicElement,
        setCopyrightYear,
        showPageLoadingOverlay,
        hidePageLoadingOverlay
    };
}

