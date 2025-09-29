const fs = require('fs');
const path = require('path');

const {
  getNestedValue,
  extractFirstImageFromHtml
} = require('../assets/js/utils.js');

const scriptPath = path.resolve(__dirname, '../assets/js/bloggerApi.js');

let shareBlogPost;
let fetchBlogPosts;
let displayShareFeedback;

const originalNavigator = window.navigator;
const originalPrompt = window.prompt;
const originalExecCommand = document.execCommand;
const originalFetch = global.fetch;

beforeAll(() => {
  global.getNestedValue = getNestedValue;
  global.extractFirstImageFromHtml = extractFirstImageFromHtml;
  global.getDynamicElement = (id) => document.getElementById(id);

  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  window.eval(scriptContent);

  shareBlogPost = globalThis.shareBlogPost;
  fetchBlogPosts = globalThis.fetchBlogPosts;
  displayShareFeedback = globalThis.displayShareFeedback;
});

beforeEach(() => {
  document.body.innerHTML = '';
  global.getDynamicElement = jest.fn((id) => document.getElementById(id));
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllTimers();

  if (originalFetch === undefined) {
    delete global.fetch;
  } else {
    global.fetch = originalFetch;
  }

  if (originalPrompt === undefined) {
    delete window.prompt;
  } else {
    window.prompt = originalPrompt;
  }

  if (originalExecCommand === undefined) {
    delete document.execCommand;
  } else {
    document.execCommand = originalExecCommand;
  }

  Object.defineProperty(window, 'navigator', {
    value: originalNavigator,
    configurable: true
  });
});

function mockNavigator(overrides = {}) {
  Object.defineProperty(window, 'navigator', {
    value: {
      ...overrides
    },
    configurable: true
  });
}

function createFeedbackElement() {
  const element = document.createElement('span');
  element.className = 'share-feedback';
  element.hidden = true;
  return element;
}

describe('shareBlogPost', () => {
  test('uses Web Share API when available', async () => {
    jest.useFakeTimers();
    const feedbackElement = createFeedbackElement();
    const shareMock = jest.fn().mockResolvedValue(undefined);
    const clipboardMock = jest.fn();

    mockNavigator({
      share: shareMock,
      clipboard: { writeText: clipboardMock }
    });
    window.prompt = jest.fn();

    await shareBlogPost({
      title: 'Test Title',
      text: '   Some   spaced   text   ',
      url: 'https://example.com/post'
    }, feedbackElement);

    expect(shareMock).toHaveBeenCalledWith({
      title: 'Test Title',
      url: 'https://example.com/post',
      text: 'Some spaced text'
    });
    expect(clipboardMock).not.toHaveBeenCalled();
    expect(feedbackElement.textContent).toBe('Thanks for sharing!');
    expect(feedbackElement.hidden).toBe(false);

    jest.runOnlyPendingTimers();
  });

  test('falls back to clipboard copy when share API is unavailable', async () => {
    jest.useFakeTimers();
    const feedbackElement = createFeedbackElement();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);

    mockNavigator({ clipboard: { writeText: writeTextMock } });
    window.prompt = jest.fn();

    await shareBlogPost({
      title: 'Another Post',
      text: '',
      url: 'https://example.com/another'
    }, feedbackElement);

    expect(writeTextMock).toHaveBeenCalledWith('https://example.com/another');
    expect(window.prompt).not.toHaveBeenCalled();
    expect(feedbackElement.textContent).toBe('Link copied to clipboard.');
    expect(feedbackElement.hidden).toBe(false);

    jest.runOnlyPendingTimers();
  });

  test('prompts user when clipboard fallbacks fail', async () => {
    jest.useFakeTimers();
    const feedbackElement = createFeedbackElement();
    const shareMock = jest.fn().mockRejectedValue(new Error('Share failed'));
    const writeTextMock = jest.fn().mockRejectedValue(new Error('Clipboard failed'));

    mockNavigator({
      share: shareMock,
      clipboard: { writeText: writeTextMock }
    });

    window.prompt = jest.fn();
    document.execCommand = jest.fn().mockReturnValue(false);

    await shareBlogPost({
      title: 'Fallback Post',
      text: null,
      url: 'https://example.com/fallback'
    }, feedbackElement);

    expect(shareMock).toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalled();
    expect(window.prompt).toHaveBeenCalledWith('Copy this link to share:', 'https://example.com/fallback');
    expect(feedbackElement.textContent).toBe('Copy the link shown to share this post.');
    expect(feedbackElement.hidden).toBe(false);

    jest.runOnlyPendingTimers();
  });
});

describe('fetchBlogPosts', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="newsGrid"></div>
      <div id="news-status"></div>
    `;
  });

  test('renders posts and hides status on success', async () => {
    const blogInfoResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'blog-123' })
    };
    const postsResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        items: [
          { title: 'Post One', content: '<p>First content</p>', url: 'https://example.com/1' },
          { title: 'Post Two', content: '<p>Second content</p>', url: 'https://example.com/2' }
        ]
      })
    };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(blogInfoResponse)
      .mockResolvedValueOnce(postsResponse);

    await fetchBlogPosts();

    expect(global.getDynamicElement).toHaveBeenCalledWith('newsGrid');
    expect(global.getDynamicElement).toHaveBeenCalledWith('news-status');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(document.getElementById('newsGrid').children).toHaveLength(2);
    expect(document.getElementById('news-status').style.display).toBe('none');
  });

  test('shows no posts message when items array is empty', async () => {
    const blogInfoResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'blog-123' })
    };
    const postsResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [] })
    };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(blogInfoResponse)
      .mockResolvedValueOnce(postsResponse);

    await fetchBlogPosts();

    const statusElement = document.getElementById('news-status');
    expect(statusElement.innerHTML).toContain('No posts found.');
    expect(statusElement.style.display).toBe('flex');
    expect(document.getElementById('newsGrid').children).toHaveLength(0);
  });

  test('displays failure message when blog info request fails', async () => {
    const errorResponse = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: jest.fn().mockResolvedValue({ error: { message: 'Invalid key' } })
    };

    global.fetch = jest.fn().mockResolvedValueOnce(errorResponse);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await fetchBlogPosts();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const statusElement = document.getElementById('news-status');
    expect(statusElement.innerHTML).toContain('Failed to load posts. Error fetching blog info: 403 Forbidden - Invalid key.');
    expect(statusElement.style.display).toBe('flex');

    consoleErrorSpy.mockRestore();
  });
});

describe('displayShareFeedback', () => {
  test('toggles visibility and clears existing timeout', () => {
    jest.useFakeTimers();
    const feedbackElement = createFeedbackElement();
    document.body.appendChild(feedbackElement);
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    displayShareFeedback(feedbackElement, 'Initial message');
    const firstTimeoutId = feedbackElement._hideTimeoutId;

    expect(feedbackElement.hidden).toBe(false);
    expect(feedbackElement.classList.contains('is-visible')).toBe(true);
    expect(feedbackElement.classList.contains('error')).toBe(false);
    expect(feedbackElement.textContent).toBe('Initial message');

    displayShareFeedback(feedbackElement, 'Error message', true);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimeoutId);
    expect(feedbackElement.classList.contains('error')).toBe(true);
    const secondTimeoutId = feedbackElement._hideTimeoutId;
    expect(secondTimeoutId).not.toBe(firstTimeoutId);

    jest.advanceTimersByTime(4000);

    expect(feedbackElement.classList.contains('is-visible')).toBe(false);
    expect(feedbackElement.classList.contains('error')).toBe(false);
    expect(feedbackElement.hidden).toBe(true);
    expect(feedbackElement.textContent).toBe('');
    expect(feedbackElement._hideTimeoutId).toBeNull();

    clearTimeoutSpy.mockRestore();
  });
});
