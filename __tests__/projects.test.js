beforeEach(() => {
  jest.resetModules();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete window.marked;
});

describe('ensureProjectsMarkedLoaded', () => {
  test('appends the marked script at most once', async () => {
    const appendSpy = jest.spyOn(document.head, 'appendChild');
    let appendedScript;
    appendSpy.mockImplementation(node => {
      appendedScript = node;
      return node;
    });

    const { ensureProjectsMarkedLoaded } = require('../assets/js/projects.js');

    const firstCall = ensureProjectsMarkedLoaded();
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(appendedScript).toBeTruthy();

    const secondCall = ensureProjectsMarkedLoaded();
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(secondCall).toBe(firstCall);

    appendedScript.onload();
    await firstCall;

    const thirdCall = ensureProjectsMarkedLoaded();
    expect(appendSpy).toHaveBeenCalledTimes(1);
    await thirdCall;

    appendSpy.mockRestore();
  });
});

describe('initProjectsPage interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="projectsPageContainer">
        <div id="projectsFilterTabs">
          <md-primary-tab data-category="all" active>All</md-primary-tab>
          <md-primary-tab data-category="web">Web</md-primary-tab>
        </div>
        <div class="projects-list">
          <div id="projectA" class="project-entry" data-category="web,app">
            <div class="carousel">
              <button class="prev">Prev</button>
              <div class="carousel-slide" data-name="one"></div>
              <div class="carousel-slide" data-name="two"></div>
              <button class="next">Next</button>
            </div>
          </div>
          <div id="projectB" class="project-entry" data-category="mobile">
            <div class="carousel">
              <button class="prev">Prev</button>
              <div class="carousel-slide" data-name="single"></div>
              <button class="next">Next</button>
            </div>
          </div>
        </div>
        <div data-md>Sample **markdown**</div>
      </div>
    `;
    window.marked = { parse: jest.fn(text => `<p>${text}</p>`) };
  });

  afterEach(() => {
    delete window.marked;
    jest.useRealTimers();
  });

  test('filters projects, awaits animations, and toggles carousel controls after images load', async () => {
    jest.useFakeTimers();

    const projectsList = document.querySelector('.projects-list');
    const animationResolvers = [];
    projectsList.animate = jest.fn(() => {
      let resolver;
      const finished = new Promise(resolve => {
        resolver = resolve;
      });
      animationResolvers.push(resolver);
      return { finished };
    });

    const { initProjectsPage } = require('../assets/js/projects.js');
    await initProjectsPage();

    const markdownElement = document.querySelector('[data-md]');
    expect(window.marked.parse).toHaveBeenCalledWith('Sample **markdown**');
    expect(markdownElement.innerHTML).toBe('<p>Sample **markdown**</p>');

    const firstCarousel = document.querySelector('#projectA .carousel');
    const firstPrev = firstCarousel.querySelector('.prev');
    const firstNext = firstCarousel.querySelector('.next');
    const firstDots = firstCarousel.querySelector('.carousel-dots');

    expect(firstPrev.style.display).toBe('none');
    expect(firstNext.style.display).toBe('none');
    expect(firstDots.style.display).toBe('none');

    const tabs = document.querySelectorAll('#projectsFilterTabs md-primary-tab');
    const allTab = tabs[0];
    const webTab = tabs[1];
    const [matchingProject, otherProject] = document.querySelectorAll('.project-entry');

    webTab.dispatchEvent(new window.Event('click'));

    expect(projectsList.animate).toHaveBeenCalledTimes(1);
    expect(otherProject.style.display).toBe('');

    const resolveFirstAnimation = animationResolvers.shift();
    resolveFirstAnimation();
    await Promise.resolve();

    expect(projectsList.animate).toHaveBeenCalledTimes(2);
    expect(projectsList.animate.mock.calls[0][0][1].transform).toBe('translateX(-20px)');
    expect(projectsList.animate.mock.calls[1][0][0].transform).toBe('translateX(20px)');
    expect(allTab.hasAttribute('active')).toBe(false);
    expect(webTab.hasAttribute('active')).toBe(true);
    expect(matchingProject.style.display).toBe('');
    expect(otherProject.style.display).toBe('none');

    const resolveSecondAnimation = animationResolvers.shift();
    resolveSecondAnimation();
    await Promise.resolve();

    expect(projectsList.animate).toHaveBeenCalledTimes(2);

    const firstSlides = firstCarousel.querySelectorAll('.carousel-slide');
    firstSlides.forEach(slide => {
      slide.dispatchEvent(new window.Event('load'));
    });
    await Promise.resolve();

    expect(firstPrev.style.display).toBe('');
    expect(firstNext.style.display).toBe('');
    expect(firstDots.style.display).toBe('');

    const secondCarousel = document.querySelector('#projectB .carousel');
    const secondPrev = secondCarousel.querySelector('.prev');
    const secondNext = secondCarousel.querySelector('.next');
    const secondDots = secondCarousel.querySelector('.carousel-dots');
    const singleSlide = secondCarousel.querySelector('.carousel-slide');

    singleSlide.dispatchEvent(new window.Event('load'));
    await Promise.resolve();

    expect(secondPrev.style.display).toBe('none');
    expect(secondNext.style.display).toBe('none');
    expect(secondDots.style.display).toBe('none');

    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
  });
});
