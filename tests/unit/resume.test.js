/**
 * @file Resume feature tests.
 */

const { initResumePage } = require('../../app/src/main/js/app/resume/ui/ResumeScreen.js');

jest.mock(
  '../../app/src/main/js/app/resume/ui/ResumeScreen.html?raw',
  () => '<section id="resumePage"></section>',
  { virtual: true }
);

/**
 * Creates a minimal resume DOM fixture for route initialization tests.
 *
 * @returns {void}
 */
function seedResumeDom() {
  document.head.innerHTML = '';
  document.body.innerHTML = `
    <section id="resumePage">
      <input id="name" value="" />
      <input id="job-title" value="" />
      <input id="phone" value="" />
      <input id="email" value="" />
      <input id="address" value="" />
      <textarea id="summary"></textarea>
      <h1 id="resume-name"></h1>
      <h2 id="resume-job-title"></h2>
      <p id="resume-phone"></p>
      <p id="resume-email"></p>
      <p id="resume-address"></p>
      <div id="resume-summary"></div>
      <button id="downloadResumeButton" type="button">Download</button>
    </section>
  `;
}

describe('resume route', () => {
  beforeEach(() => {
    seedResumeDom();
    window.__APP_STYLE_URLS__ = {
      resume: 'assets/css/resume.css',
      print: 'assets/css/print.css',
    };
    window.print = jest.fn();
  });

  test('registers resume route', () => {
    jest.isolateModules(() => {
      require('../../app/src/main/js/app/resume/ui/ResumeRoute.js');
      const { RouterRoutes } = require('../../app/src/main/js/core/ui/router/routes.js');
      const route = RouterRoutes.getRoute('resume');
      expect(route).not.toBeNull();
      expect(route.id).toBe('resume');
    });

  });

  test('initializes preview bindings and print action', () => {
    initResumePage();

    const nameInput = document.getElementById('name');
    nameInput.value = 'Jane Doe';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.getElementById('resume-name').textContent).toBe('Jane Doe');

    document.getElementById('downloadResumeButton').click();
    expect(window.print).toHaveBeenCalledTimes(1);

    expect(document.querySelectorAll('link[data-style="resume"]').length).toBe(1);
    expect(document.querySelectorAll('link[data-style="resume-print"]').length).toBe(1);
  });
});
