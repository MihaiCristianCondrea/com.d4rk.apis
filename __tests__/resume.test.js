const fs = require('fs');
const path = require('path');

const resumeScript = fs.readFileSync(path.resolve(__dirname, '../assets/js/resume.js'), 'utf8');

const baseMarkup = `
<div id="resumePage">
  <div class="form-container">
    <div class="form-section">
      <div class="input-group"><input type="text" id="name" placeholder=" "><label for="name">Full Name</label></div>
      <div class="input-group"><input type="text" id="job-title" placeholder=" "><label for="job-title">Job Title</label></div>
      <input type="file" id="photo" accept="image/*">
      <div class="input-group"><input type="tel" id="phone" placeholder=" "><label for="phone">Phone</label></div>
      <div class="input-group"><input type="email" id="email" placeholder=" "><label for="email">Email</label></div>
      <div class="input-group"><input type="text" id="address" placeholder=" "><label for="address">Address</label></div>
      <div class="input-group"><textarea id="summary" placeholder=" "></textarea><label for="summary">Professional Summary</label></div>
    </div>
    <div class="form-section dynamic-list" id="skills-form">
      <h2><span class="material-symbols-outlined">build</span> Skills</h2>
      <button type="button" class="add-btn" data-add-list="skills">Add Skill</button>
    </div>
    <div class="form-section" id="work-form">
      <h2><span class="material-symbols-outlined">work</span> Work History</h2>
      <button type="button" class="add-btn" data-add-complex="work">Add Work Experience</button>
    </div>
    <div class="form-section" id="education-form">
      <h2><span class="material-symbols-outlined">school</span> Education</h2>
      <button type="button" class="add-btn" data-add-complex="education">Add Education</button>
    </div>
    <div class="form-section dynamic-list" id="languages-form">
      <h2><span class="material-symbols-outlined">language</span> Languages</h2>
      <button type="button" class="add-btn" data-add-list="languages">Add Language</button>
    </div>
    <div class="form-section" id="interests-form">
      <h2><span class="material-symbols-outlined">interests</span> Interests</h2>
      <button type="button" class="add-btn" data-add-interest="true">Add Interest</button>
    </div>
  </div>
  <div id="resume-preview">
    <div class="resume-content">
      <div class="resume-left">
        <div id="photo-preview"></div>
        <div class="contact-info resume-section">
          <p id="resume-phone"></p>
          <p id="resume-email"></p>
          <p id="resume-address"></p>
        </div>
        <div class="resume-section" id="resume-skills">
          <h2><span class="material-symbols-outlined">build</span> Skills</h2>
          <ul></ul>
        </div>
        <div class="resume-section" id="resume-languages">
          <h2><span class="material-symbols-outlined">language</span> Languages</h2>
          <ul></ul>
        </div>
        <div class="resume-section" id="resume-interests">
          <h2><span class="material-symbols-outlined">interests</span> Interests</h2>
          <ul></ul>
        </div>
      </div>
      <div class="resume-right">
        <h1 id="resume-name"></h1>
        <h2 id="resume-job-title"></h2>
        <div id="resume-summary"></div>
        <div class="resume-section" id="resume-work">
          <h2><span class="material-symbols-outlined">work</span>Work history</h2>
        </div>
        <div class="resume-section" id="resume-education">
          <h2><span class="material-symbols-outlined">school</span> Education</h2>
        </div>
      </div>
    </div>
  </div>
</div>
  <div class="resume-download">
    <button type="button" id="downloadResumeButton">
      <span class="material-symbols-outlined">download</span><span>Download Resume as PDF</span>
    </button>
  </div>
</div>
`;

window.marked = {
  parse: jest.fn(text => `parsed(${text})`)
};
global.marked = window.marked;
window.DOMPurify = {
  sanitize: jest.fn(html => `sanitized(${html})`)
};
global.DOMPurify = window.DOMPurify;
window.print = jest.fn();
eval(resumeScript);
Object.assign(window, {
  addListItem,
  addInterestItem,
  removeListItem,
  removeItem,
  updateList,
  updateComplexList,
  prepareAndPrintResume,
  addComplexItem,
  setupRealtimeUpdates,
  initResumePage
});
window.addWorkItem = (title, company, start, end, desc) =>
  addComplexItem('work', { title, company, start, end, desc });
window.addEducationItem = (degree, school, start, end) =>
  addComplexItem('education', { degree, school, start, end });

describe('resume.js browser integration', () => {
  let dateNowSpy;

  const runInitResumePage = async () => {
    const readyPromise = document.fonts.ready;
    initResumePage();
    await Promise.resolve();
    await readyPromise;
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
  };

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = baseMarkup;
    window.marked.parse.mockClear();
    window.DOMPurify.sanitize.mockClear();
    window.print.mockClear();
    let counter = 0;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => ++counter);
    document.fonts = { ready: Promise.resolve() };
    window.history.replaceState({}, '', 'http://localhost/');
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  test('initializes default data when fonts are ready and hides the form without edit mode', async () => {
    await runInitResumePage();

    ['name', 'job-title', 'phone', 'email', 'address', 'summary'].forEach(id => {
      const input = document.getElementById(id);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(document.getElementById('name').value).toBe('Mihai-Cristian Condrea');
    expect(document.getElementById('job-title').value).toBe('Android Developer');
    expect(document.getElementById('resume-name').innerText).toBe('Mihai-Cristian Condrea');
    expect(document.getElementById('resume-job-title').innerText).toBe('Android Developer');
    expect(document.getElementById('resume-phone').innerHTML).toContain('call');
    expect(document.getElementById('resume-email').innerHTML).toContain('mail');
    expect(document.getElementById('resume-address').innerHTML).toContain('location_on');

    const summaryValue = document.getElementById('summary').value;
    expect(document.getElementById('resume-summary').innerHTML).toBe(`sanitized(parsed(${summaryValue}))`);

    const skillTexts = Array.from(document.querySelectorAll('#resume-skills li')).map(li => li.innerText);
    expect(skillTexts).toEqual([
      'Languages: Kotlin, Java, HTML, Markdown, JSON',
      'Android: Jetpack Compose, ViewModels, LiveData, Room, Navigation',
      'Tools: Android Studio, GitHub, Git, Firebase Console, Play Console',
      'Design: Material 3, Figma, SVG, Adobe Illustrator, Photoshop'
    ]);

    const languageTexts = Array.from(document.querySelectorAll('#resume-languages li')).map(li => li.innerText);
    expect(languageTexts).toEqual(['Romanian (Native)', 'English (Advanced)']);

    const interestTexts = Array.from(document.querySelectorAll('#resume-interests li')).map(li => li.innerHTML);
    expect(interestTexts).toEqual([
      'Technology, AI, UX optimization',
      'Electronic Music Production',
      'Creating educational and promotional digital content'
    ]);

    const workItems = document.querySelectorAll('#resume-work .resume-item');
    expect(workItems).toHaveLength(2);
    expect(workItems[0].querySelector('h3').textContent).toBe('Android Developer');

    const educationItems = document.querySelectorAll('#resume-education .resume-item');
    expect(educationItems).toHaveLength(2);

    expect(document.querySelector('#resumePage .form-container').style.display).toBe('none');
    expect(window.DOMPurify.sanitize).toHaveBeenCalled();
    expect(window.marked.parse).toHaveBeenCalled();
  });

  test('reacts to simulated user input for fields, lists, and complex work items', async () => {
    window.history.replaceState({}, '', 'http://localhost/?edit=true');
    await runInitResumePage();

    const form = document.querySelector('#resumePage .form-container');
    expect(form.style.display).not.toBe('none');

    const nameInput = document.getElementById('name');
    nameInput.value = 'Jane Doe';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.getElementById('resume-name').innerText).toBe('Jane Doe');

    window.marked.parse.mockClear();
    window.DOMPurify.sanitize.mockClear();
    const summaryInput = document.getElementById('summary');
    summaryInput.value = '**Bold** text';
    summaryInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(window.marked.parse).toHaveBeenCalledWith('**Bold** text');
    expect(window.DOMPurify.sanitize).toHaveBeenCalledWith('parsed(**Bold** text)');
    expect(document.getElementById('resume-summary').innerHTML).toBe('sanitized(parsed(**Bold** text))');

    document.querySelector('#skills-form .add-btn').click();
    const skillInputs = document.querySelectorAll('#skills-form .list-item input[type="text"]');
    const newSkillInput = skillInputs[skillInputs.length - 1];
    newSkillInput.value = 'Unit Testing';
    newSkillInput.dispatchEvent(new Event('input', { bubbles: true }));
    const updatedSkills = Array.from(document.querySelectorAll('#resume-skills li')).map(li => li.innerText);
    expect(updatedSkills).toContain('Unit Testing');

    document.querySelector('#work-form .add-btn').click();
    window.marked.parse.mockClear();
    window.DOMPurify.sanitize.mockClear();
    const workForms = document.querySelectorAll('#work-form .complex-item-form');
    const newWorkForm = workForms[workForms.length - 1];
    newWorkForm.querySelector('.work-title').value = 'QA Engineer';
    newWorkForm.querySelector('.work-title').dispatchEvent(new Event('input', { bubbles: true }));
    newWorkForm.querySelector('.work-company').value = 'Quality Corp';
    newWorkForm.querySelector('.work-company').dispatchEvent(new Event('input', { bubbles: true }));
    newWorkForm.querySelector('.work-start').value = '2021';
    newWorkForm.querySelector('.work-start').dispatchEvent(new Event('input', { bubbles: true }));
    newWorkForm.querySelector('.work-end').value = '2023';
    newWorkForm.querySelector('.work-end').dispatchEvent(new Event('input', { bubbles: true }));
    const description = 'Improved coverage\n- Built regression suite';
    newWorkForm.querySelector('.work-desc').value = description;
    newWorkForm.querySelector('.work-desc').dispatchEvent(new Event('input', { bubbles: true }));

    expect(window.marked.parse).toHaveBeenCalledWith(description);
    expect(window.DOMPurify.sanitize).toHaveBeenCalledWith(`parsed(${description})`);

    const workPreviewItems = document.querySelectorAll('#resume-work .resume-item');
    const latestWork = workPreviewItems[workPreviewItems.length - 1];
    expect(latestWork.querySelector('h3').textContent).toBe('QA Engineer');
    expect(latestWork.querySelector('.date').textContent).toBe('2021 - 2023');
    expect(latestWork.querySelector('.description').innerHTML).toBe(`sanitized(parsed(${description}))`);
  });

  test('ensures resume styles are appended once and reused on subsequent initialization', async () => {
    await runInitResumePage();
    expect(document.querySelectorAll('link[href="assets/css/resume.css"]').length).toBe(1);
    expect(document.querySelectorAll('link[href="assets/css/print.css"]').length).toBe(1);

    document.fonts = { ready: Promise.resolve() };
    await runInitResumePage();
    expect(document.querySelectorAll('link[href="assets/css/resume.css"]').length).toBe(1);
    expect(document.querySelectorAll('link[href="assets/css/print.css"]').length).toBe(1);
  });

  test('toggles edit mode visibility based on the edit query parameter', async () => {
    window.history.replaceState({}, '', 'http://localhost/?edit=true');
    await runInitResumePage();
    expect(document.querySelector('#resumePage .form-container').style.display).not.toBe('none');

    document.head.innerHTML = '';
    document.body.innerHTML = baseMarkup;
    document.fonts = { ready: Promise.resolve() };
    window.history.replaceState({}, '', 'http://localhost/?edit=false');
    await runInitResumePage();
    expect(document.querySelector('#resumePage .form-container').style.display).toBe('none');
  });

  test('respects edit query parameter provided inside the hash fragment', async () => {
    window.history.replaceState({}, '', 'http://localhost/#resume?edit=true');
    await runInitResumePage();
    expect(document.querySelector('#resumePage .form-container').style.display).not.toBe('none');

    document.head.innerHTML = '';
    document.body.innerHTML = baseMarkup;
    document.fonts = { ready: Promise.resolve() };
    window.marked.parse.mockClear();
    window.DOMPurify.sanitize.mockClear();
    window.history.replaceState({}, '', 'http://localhost/#resume?edit=false');
    await runInitResumePage();
    expect(document.querySelector('#resumePage .form-container').style.display).toBe('none');
  });
});
