/**
 * @file Router helper module tests that rely on the canonical core router implementation.
 */
/*
 * Change Rationale:
 * - Previously, these tests imported from src/router, a partial facade that duplicated core/router.
 * - Consolidating imports to src/core/ui/router removes the duplicate surface and ensures the tests exercise the single source of truth.
 * - This alignment reduces navigation drift, keeping routing behavior predictable for Material Design 3-driven flows.
 */
const { RouterAnimation, fadeIn, fadeOut } = require('../../src/app/routes/internal/animation.js');
const { RouterHistory, updateTitle, pushState } = require('../../src/app/routes/internal/history.js');

describe('router helper modules', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('RouterAnimation', () => {
    test('fadeOut resolves after animation finished and sets opacity to 0', async () => {
      const element = document.createElement('div');
      element.style.opacity = '1';
      let resolveFinished;
      const finishedPromise = new Promise((resolve) => {
        resolveFinished = resolve;
      });

      element.animate = jest.fn(() => ({
        finished: finishedPromise,
      }));

      const fadePromise = fadeOut(element);
      const [frames, options] = element.animate.mock.calls[0];
      expect(Array.isArray(frames)).toBe(true);
      expect(frames[0]).toEqual(expect.objectContaining({ opacity: 1 }));
      expect(frames[frames.length - 1]).toEqual(expect.objectContaining({ opacity: 0 }));
      expect(options).toEqual(expect.objectContaining({ fill: 'both' }));

      resolveFinished();
      await expect(fadePromise).resolves.toBeUndefined();
      expect(element.style.opacity).toBe('0');
    });

    test('fadeIn resolves when animate is missing and sets opacity to 1', async () => {
      const element = document.createElement('div');
      delete element.animate;

      await expect(fadeIn(element)).resolves.toBeUndefined();
      expect(element.style.opacity).toBe('1');
    });

    test('fadeOut handles animate throwing and still sets opacity to 0', async () => {
      const element = document.createElement('div');
      element.animate = jest.fn(() => {
        throw new Error('animation failed');
      });

      await expect(fadeOut(element)).resolves.toBeUndefined();
      expect(element.style.opacity).toBe('0');
    });
  });

  describe('RouterHistory', () => {
    let titleSetter;
    let pushStateSpy;

    beforeEach(() => {
      titleSetter = jest.spyOn(document, 'title', 'set');
      pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    });

    afterEach(() => {
      titleSetter.mockRestore();
      pushStateSpy.mockRestore();
    });

    test('updateTitle updates headline text and document title', () => {
      const headline = document.createElement('div');
      document.body.appendChild(headline);

      updateTitle(headline, 'About');

      expect(headline.textContent).toBe('About');
      expect(titleSetter).toHaveBeenCalledWith(`About${RouterHistory.DOCUMENT_TITLE_SUFFIX}`);
    });

    test('pushState updates history when allowed', () => {
      pushState('about', 'About', 'about');

      expect(pushStateSpy).toHaveBeenCalledWith({ page: 'about' }, 'About', '#about');
    });

    test('pushState is a no-op when shouldUpdate is false', () => {
      pushState('about', 'About', 'about', false);

      expect(pushStateSpy).not.toHaveBeenCalled();
    });
  });
});
