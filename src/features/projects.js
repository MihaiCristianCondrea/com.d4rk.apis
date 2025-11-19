let markedLoadPromiseProjects;

function ensureProjectsMarkedLoaded() {
  if (window.marked) return Promise.resolve();
  if (markedLoadPromiseProjects) return markedLoadPromiseProjects;
  markedLoadPromiseProjects = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
  return markedLoadPromiseProjects;
}

function resolveProjectsEasing(preferred, fallback) {
  const animationsApi = typeof SiteAnimations !== 'undefined' && SiteAnimations ? SiteAnimations : null;
  if (animationsApi && typeof animationsApi.resolveEasing === 'function') {
    return animationsApi.resolveEasing(preferred, fallback);
  }

  const css = (typeof CSS !== 'undefined' && CSS && typeof CSS.supports === 'function')
    ? CSS
    : (typeof window !== 'undefined' && window.CSS && typeof window.CSS.supports === 'function'
      ? window.CSS
      : null);

  if (preferred && css && css.supports('animation-timing-function', 'linear(0,0.5,1)')) {
    return preferred;
  }

  return fallback;
}

function initProjectsPage() {
  return ensureProjectsMarkedLoaded().then(() => {
    document.querySelectorAll('#projectsPageContainer [data-md]').forEach(el => {
      if (window.marked) {
        el.innerHTML = marked.parse(el.textContent.trim());
      }
    });

    const tabs = document.querySelectorAll('#projectsFilterTabs md-primary-tab');
    const projects = document.querySelectorAll('.project-entry');
    const projectsList = document.querySelector('.projects-list');
    const animationsApi = typeof SiteAnimations !== 'undefined' && SiteAnimations ? SiteAnimations : null;
    const projectsListEasing = resolveProjectsEasing(
      animationsApi && animationsApi.easings ? animationsApi.easings.spring : null,
      'cubic-bezier(0.4,0,0.2,1)'
    );
    let activeTabIndex = 0;
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', async () => {
        if (tab.hasAttribute('active')) return;
        if (projectsList && projectsList.animate) {
          const dir = idx > activeTabIndex ? 1 : -1;
          try {
            await projectsList.animate(
              [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${ -20 * dir }px)` }],
              { duration: 150, easing: projectsListEasing, fill: 'forwards' }
            ).finished;
          } catch (e) {}
        }

        tabs.forEach(t => t.removeAttribute('active'));
        tab.setAttribute('active', '');
        const cat = tab.dataset.category;
        projects.forEach(p => {
          if (cat === 'all') { p.style.display = ''; return; }
          p.style.display = p.dataset.category.includes(cat) ? '' : 'none';
        });

        if (projectsList && projectsList.animate) {
          const dir = idx > activeTabIndex ? 1 : -1;
          try {
            await projectsList.animate(
              [{ opacity: 0, transform: `translateX(${20 * dir}px)` }, { opacity: 1, transform: 'translateX(0)' }],
              { duration: 150, easing: projectsListEasing, fill: 'forwards' }
            ).finished;
          } catch (e) {}
        }
        activeTabIndex = idx;

        if (typeof SiteAnimations !== 'undefined' && SiteAnimations && typeof SiteAnimations.animateProjectCards === 'function') {
          try {
            const visibleProjects = Array.from(projects).filter(p => p.style.display !== 'none');
            SiteAnimations.animateProjectCards(visibleProjects);
          } catch (animationError) {
            console.error('Projects: Failed to animate filtered project cards.', animationError);
          }
        }
      });
    });

    document.querySelectorAll('.carousel').forEach(carousel => {
      const slides = carousel.querySelectorAll('.carousel-slide');
      const prevBtn = carousel.querySelector('.prev');
      const nextBtn = carousel.querySelector('.next');
      let index = 0;

      const loading = document.createElement('div');
      loading.classList.add('carousel-loading');
      const loader = document.createElement('dotlottie-wc');
      loader.setAttribute('src', 'https://lottie.host/ed183b18-bffe-4e7f-a222-d554908e33b8/FhsNasBleM.lottie');
      loader.setAttribute('autoplay', '');
      loader.setAttribute('loop', '');
      loader.setAttribute('speed', '1');
      loader.style.width = '120px';
      loader.style.height = '120px';
      loading.appendChild(loader);
      carousel.appendChild(loading);

      const placeholder = document.createElement('div');
      placeholder.classList.add('carousel-placeholder');
      const placeholderImg = document.createElement('img');
      placeholderImg.src = 'assets/images/placeholder.png';
      placeholder.appendChild(placeholderImg);
      carousel.appendChild(placeholder);

      const startTime = Date.now();
      const minDisplay = 3000;
      const placeholderDelay = 5000;
      const hideLoadingOverlay = () => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, minDisplay - elapsed);
        setTimeout(() => {
          loading.classList.add('fade-out');
          setTimeout(() => loading.remove(), 500);
          placeholder.classList.add('fade-out');
          setTimeout(() => placeholder.remove(), 500);
          clearTimeout(placeholderTimer);
        }, delay);
      };

      const placeholderTimer = setTimeout(() => {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 500);
        placeholder.classList.add('show');
      }, placeholderDelay);

      let loadedCount = 0;
      const hideLoading = () => {
        loadedCount++;
        if (loadedCount === slides.length) {
          loadingFinished();
        }
      };

      slides.forEach(img => {
        if (img.complete) {
          hideLoading();
        } else {
          img.addEventListener('load', hideLoading);
          img.addEventListener('error', hideLoading);
        }
      });

      const dotsContainer = document.createElement('div');
      dotsContainer.classList.add('carousel-dots');
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.classList.add('carousel-dot');
        dot.addEventListener('click', () => { index = i; update(); });
        dotsContainer.appendChild(dot);
      });
      carousel.appendChild(dotsContainer);
      const dots = dotsContainer.querySelectorAll('.carousel-dot');

      const update = () => {
        slides.forEach((s,i) => s.classList.toggle('active', i===index));
        dots.forEach((d,i) => d.classList.toggle('active', i===index));
      };
      update();

      const hideControls = () => {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.style.display = 'none';
      };

      const showControls = () => {
        if (slides.length < 2) return;
        prevBtn.style.display = '';
        nextBtn.style.display = '';
        dotsContainer.style.display = '';
      };

      hideControls();

      prevBtn.addEventListener('click', () => {
        index = (index - 1 + slides.length) % slides.length; update();
      });
      nextBtn.addEventListener('click', () => {
        index = (index + 1) % slides.length; update();
      });

      const loadingFinished = () => {
        hideLoadingOverlay();
        showControls();
      };

    });

    if (typeof SiteAnimations !== 'undefined' && SiteAnimations && typeof SiteAnimations.animateProjectCards === 'function') {
      try {
        const cardsToAnimate = projectsList ? projectsList.querySelectorAll('.project-entry') : projects;
        SiteAnimations.animateProjectCards(cardsToAnimate);
      } catch (animationError) {
        console.error('Projects: Failed to animate project cards.', animationError);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('projectsPageContainer')) {
    initProjectsPage();
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ensureProjectsMarkedLoaded, initProjectsPage };
}
