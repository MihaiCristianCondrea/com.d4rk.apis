const {
  getNestedValue,
  extractFirstImageFromHtml,
  getDynamicElement,
  showPageLoadingOverlay,
  hidePageLoadingOverlay
} = require('../assets/js/utils.js');

describe('getNestedValue', () => {
  test('retrieves nested values with dot notation', () => {
    const data = { user: { profile: { name: 'Mihai' } } };
    expect(getNestedValue(data, 'user.profile.name')).toBe('Mihai');
  });

  test('retrieves nested values with array notation', () => {
    const data = { posts: [{ title: 'First', meta: { views: 10 } }] };
    expect(getNestedValue(data, 'posts[0].meta.views')).toBe(10);
  });

  test('returns default when path is missing', () => {
    const data = { user: {} };
    expect(getNestedValue(data, 'user.profile.name', 'Unknown')).toBe('Unknown');
  });
});

describe('extractFirstImageFromHtml', () => {
  test('returns the first non-data image source', () => {
    const html = `
      <div>
        <img src="https://example.com/image-a.jpg" alt="a" />
        <img src="https://example.com/image-b.jpg" alt="b" />
      </div>
    `;
    expect(extractFirstImageFromHtml(html)).toBe('https://example.com/image-a.jpg');
  });

  test('skips data URIs and returns googleusercontent image', () => {
    const html = `
      <div>
        <img src="data:image/png;base64,AAAA" alt="inline" />
        <img src="https://lh3.googleusercontent.com/someimage" alt="cover" />
      </div>
    `;
    expect(extractFirstImageFromHtml(html)).toBe('https://lh3.googleusercontent.com/someimage');
  });

  test('returns null when no image exists', () => {
    expect(extractFirstImageFromHtml('<p>No images here</p>')).toBeNull();
  });
});

describe('DOM utility helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-element"></div>
      <div id="pageLoadingOverlay" class="overlay"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('getDynamicElement returns the element if it exists', () => {
    const element = getDynamicElement('test-element');
    expect(element).not.toBeNull();
    expect(element.id).toBe('test-element');
  });

  test('getDynamicElement returns null for missing element', () => {
    expect(getDynamicElement('missing-element')).toBeNull();
  });

  test('showPageLoadingOverlay adds the active class', () => {
    const overlay = document.getElementById('pageLoadingOverlay');
    expect(overlay.classList.contains('active')).toBe(false);
    showPageLoadingOverlay();
    expect(overlay.classList.contains('active')).toBe(true);
  });

  test('hidePageLoadingOverlay removes the active class', () => {
    const overlay = document.getElementById('pageLoadingOverlay');
    overlay.classList.add('active');
    hidePageLoadingOverlay();
    expect(overlay.classList.contains('active')).toBe(false);
  });
});
