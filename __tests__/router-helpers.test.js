const animationScriptPath = '../assets/js/router/animation.js';
const historyScriptPath = '../assets/js/router/history.js';

function loadHelpers() {
  require(animationScriptPath);
  require(historyScriptPath);
  return {
    RouterAnimation: window.RouterAnimation,
    RouterHistory: window.RouterHistory
  };
}

describe('router helper scripts', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.RouterAnimation;
    delete global.RouterAnimation;
    delete window.RouterHistory;
    delete global.RouterHistory;
    document.body.innerHTML = '';
  });

  test('loads helper scripts and exposes APIs on window', () => {
    const { RouterAnimation, RouterHistory } = loadHelpers();

    expect(RouterAnimation).toMatchObject({
      fadeIn: expect.any(Function),
      fadeOut: expect.any(Function)
    });
    expect(RouterHistory).toMatchObject({
      updateTitle: expect.any(Function),
      pushState: expect.any(Function)
    });
  });

  describe('RouterAnimation', () => {
    let RouterAnimation;

    beforeEach(() => {
      ({ RouterAnimation } = loadHelpers());
    });

    test('fadeOut resolves after animation finished and sets opacity to 0', async () => {
      const element = document.createElement('div');
      element.style.opacity = '1';
      let resolveFinished;
      const finishedPromise = new Promise((resolve) => {
        resolveFinished = resolve;
      });

      element.animate = jest.fn(() => ({
        finished: finishedPromise
      }));

      const fadePromise = RouterAnimation.fadeOut(element);
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

      await expect(RouterAnimation.fadeIn(element)).resolves.toBeUndefined();
      expect(element.style.opacity).toBe('1');
    });

    test('fadeOut handles animate throwing and still sets opacity to 0', async () => {
      const element = document.createElement('div');
      element.animate = jest.fn(() => {
        throw new Error('animation failed');
      });

      await expect(RouterAnimation.fadeOut(element)).resolves.toBeUndefined();
      expect(element.style.opacity).toBe('0');
    });

    test('fadeIn uses SiteAnimations timing and keyframes when available', async () => {
      const element = document.createElement('div');
      const customFrames = [
        { opacity: 0, transform: 'translate3d(24px, 0, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      ];

      element.animate = jest.fn(() => ({ finished: Promise.resolve() }));

      window.SiteAnimations = {
        createPageTransitionKeyframes: jest.fn(() => customFrames),
        getMotionSpec: jest.fn(() => ({
          duration: 250,
          easing: 'linear(0, 1)',
          fallbackEasing: 'ease-out',
          reducedDuration: 140
        })),
        resolveEasing: jest.fn((preferred, fallback) => preferred || fallback),
        shouldReduceMotion: jest.fn(() => false),
        canAnimate: jest.fn(() => true),
        getMotionContext: jest.fn(() => ({ windowSize: 'compact' })),
        fallbacks: {},
        easings: {}
      };

      await expect(RouterAnimation.fadeIn(element)).resolves.toBeUndefined();

      expect(window.SiteAnimations.createPageTransitionKeyframes).toHaveBeenCalledWith('in');

      const [frames, options] = element.animate.mock.calls[0];
      expect(frames).toBe(customFrames);
      expect(options).toEqual(expect.objectContaining({ duration: 250 }));

      delete window.SiteAnimations;
    });
  });

  describe('RouterHistory', () => {
    let RouterHistory;
    let titleSetter;
    let pushStateSpy;

    beforeEach(() => {
      ({ RouterHistory } = loadHelpers());
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

      RouterHistory.updateTitle(headline, 'About');

      expect(headline.textContent).toBe('About');
      expect(titleSetter).toHaveBeenCalledWith(`About${RouterHistory.DOCUMENT_TITLE_SUFFIX}`);
    });

    test('pushState updates history when allowed', () => {
      RouterHistory.pushState('about', 'About', 'about');

      expect(pushStateSpy).toHaveBeenCalledWith({ page: 'about' }, 'About', '#about');
    });

    test('pushState is a no-op when shouldUpdate is false', () => {
      RouterHistory.pushState('about', 'About', 'about', false);

      expect(pushStateSpy).not.toHaveBeenCalled();
    });
  });
});
