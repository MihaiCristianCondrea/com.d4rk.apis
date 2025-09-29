// Resume builder functionality
function createInputGroupElement({
    id,
    labelText,
    value = '',
    control = 'input',
    type = 'text',
    placeholder = ' ',
    wrapperClass = 'input-group',
    inputClasses = [],
    onInput
}) {
    const wrapper = document.createElement('div');
    wrapper.className = wrapperClass;

    const inputElement = control === 'textarea'
        ? document.createElement('textarea')
        : document.createElement('input');

    if (control !== 'textarea') {
        inputElement.type = type;
    }

    inputElement.placeholder = placeholder;
    inputElement.value = value;
    inputElement.id = id;
    inputClasses.forEach(cls => inputElement.classList.add(cls));

    if (typeof onInput === 'function') {
        inputElement.addEventListener('input', onInput);
    }

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = labelText;

    wrapper.append(inputElement, label);

    return { wrapper, inputElement };
}

// Real-time updates for form inputs
function setupRealtimeUpdates() {
    const set = (id, cb) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', cb);
    };
    set('name', e => document.getElementById('resume-name').innerText = e.target.value);
    set('job-title', e => document.getElementById('resume-job-title').innerText = e.target.value);
    set('phone', e => document.getElementById('resume-phone').innerHTML = e.target.value ? `<span class="material-symbols-outlined">call</span><span>${e.target.value}</span>` : '');
    set('email', e => document.getElementById('resume-email').innerHTML = e.target.value ? `<span class="material-symbols-outlined">mail</span><span>${e.target.value}</span>` : '');
    set('address', e => document.getElementById('resume-address').innerHTML = e.target.value ? `<span class="material-symbols-outlined">location_on</span><span>${e.target.value}</span>` : '');
    set('summary', e => {
        const parsed = marked.parse(e.target.value);
        document.getElementById('resume-summary').innerHTML = DOMPurify.sanitize(parsed);
    });
    const photoInput = document.getElementById('photo');
    if (photoInput) {
        photoInput.addEventListener('change', evt => {
            if (evt.target.files && evt.target.files[0]) {
                const reader = new FileReader();
                reader.onload = e => document.getElementById('photo-preview').style.backgroundImage = `url(${e.target.result})`;
                reader.readAsDataURL(evt.target.files[0]);
            }
        });
    }
}

function addListItem(sectionId, value = '') {
    const container = document.getElementById(`${sectionId}-form`);
    if (!container) return;
    const capitalName = sectionId.charAt(0).toUpperCase() + sectionId.slice(1, -1);
    const itemId = `${sectionId}-${Date.now()}`;
    const listItem = document.createElement('div');
    listItem.className = 'list-item';
    listItem.id = itemId;

    const { wrapper } = createInputGroupElement({
        id: `input-${itemId}`,
        labelText: capitalName,
        value,
        wrapperClass: 'input-group resume-inline-group',
        onInput: () => updateList(sectionId)
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-btn';
    removeButton.setAttribute('aria-label', 'Remove item');
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => removeListItem(itemId, sectionId));

    listItem.append(wrapper, removeButton);
    container.insertBefore(listItem, container.querySelector('.add-btn'));
    updateList(sectionId);
}

function addInterestItem(value = '', isProject = false) {
    const container = document.getElementById('interests-form');
    const itemId = `interests-${Date.now()}`;
    const listItem = document.createElement('div');
    listItem.className = 'list-item';
    listItem.id = itemId;

    const { wrapper } = createInputGroupElement({
        id: `input-${itemId}`,
        labelText: 'Interest or Project',
        value,
        wrapperClass: 'input-group resume-inline-group',
        onInput: () => updateList('interests')
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `check-${itemId}`;
    checkbox.className = 'resume-checkbox';
    checkbox.checked = isProject;
    checkbox.addEventListener('change', () => updateList('interests'));

    const checkboxLabel = document.createElement('label');
    checkboxLabel.setAttribute('for', checkbox.id);
    checkboxLabel.className = 'resume-checkbox-label';
    checkboxLabel.textContent = 'Is Project?';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-btn';
    removeButton.setAttribute('aria-label', 'Remove interest');
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => removeListItem(itemId, 'interests'));

    listItem.append(wrapper, checkbox, checkboxLabel, removeButton);
    container.insertBefore(listItem, container.querySelector('.add-btn'));
    updateList('interests');
}

function removeListItem(itemId, sectionId) {
    document.getElementById(itemId).remove();
    updateList(sectionId);
}

function updateList(sectionId) {
    const listElement = document.querySelector(`#resume-${sectionId} ul`);
    listElement.innerHTML = '';
    if (sectionId === 'interests') {
        document.querySelectorAll(`#interests-form .list-item`).forEach(item => {
            const input = item.querySelector('input[type="text"]');
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (input.value.trim()) {
                const li = document.createElement('li');
                li.innerHTML = checkbox.checked ? `<strong>Project:</strong> ${input.value}` : input.value;
                listElement.appendChild(li);
            }
        });
    } else {
        document.querySelectorAll(`#${sectionId}-form input[type='text']`).forEach(input => {
            if (input.value.trim()) {
                const li = document.createElement('li');
                li.innerText = input.value;
                listElement.appendChild(li);
            }
        });
    }
}

function addComplexItem(sectionId, data = {}) {
    const container = document.getElementById(`${sectionId}-form`);
    const itemId = `${sectionId}-${Date.now()}`;
    const formWrapper = document.createElement('div');
    formWrapper.className = 'complex-item-form';
    formWrapper.id = itemId;

    const innerContainer = document.createElement('div');
    innerContainer.className = 'complex-item-fields';
    formWrapper.appendChild(innerContainer);

    const handleInput = () => updateComplexList(sectionId);

    if (sectionId === 'work') {
        const titleGroup = createInputGroupElement({
            id: `${itemId}-title`,
            labelText: 'Job Title',
            value: data.title || '',
            inputClasses: ['work-title'],
            onInput: handleInput
        });
        const companyGroup = createInputGroupElement({
            id: `${itemId}-company`,
            labelText: 'Company & Location',
            value: data.company || '',
            inputClasses: ['work-company'],
            onInput: handleInput
        });
        const startGroup = createInputGroupElement({
            id: `${itemId}-start`,
            labelText: 'Start Year',
            value: data.start || '',
            inputClasses: ['work-start'],
            onInput: handleInput
        });
        const endGroup = createInputGroupElement({
            id: `${itemId}-end`,
            labelText: 'End Year',
            value: data.end || '',
            inputClasses: ['work-end'],
            onInput: handleInput
        });
        const descriptionGroup = createInputGroupElement({
            id: `${itemId}-desc`,
            labelText: 'Description (Markdown supported)',
            value: data.desc || '',
            control: 'textarea',
            inputClasses: ['work-desc'],
            onInput: handleInput
        });

        innerContainer.append(
            titleGroup.wrapper,
            companyGroup.wrapper,
            startGroup.wrapper,
            endGroup.wrapper,
            descriptionGroup.wrapper
        );
    } else if (sectionId === 'education') {
        const degreeGroup = createInputGroupElement({
            id: `${itemId}-degree`,
            labelText: 'Degree / Certificate',
            value: data.degree || '',
            inputClasses: ['edu-degree'],
            onInput: handleInput
        });
        const schoolGroup = createInputGroupElement({
            id: `${itemId}-school`,
            labelText: 'School / University',
            value: data.school || '',
            inputClasses: ['edu-school'],
            onInput: handleInput
        });
        const startGroup = createInputGroupElement({
            id: `${itemId}-start`,
            labelText: 'Start Year',
            value: data.start || '',
            inputClasses: ['edu-start'],
            onInput: handleInput
        });
        const endGroup = createInputGroupElement({
            id: `${itemId}-end`,
            labelText: 'End Year',
            value: data.end || '',
            inputClasses: ['edu-end'],
            onInput: handleInput
        });

        innerContainer.append(
            degreeGroup.wrapper,
            schoolGroup.wrapper,
            startGroup.wrapper,
            endGroup.wrapper
        );
    }

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-btn';
    removeButton.setAttribute('aria-label', 'Remove entry');
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => removeItem(itemId, sectionId));

    innerContainer.appendChild(removeButton);

    container.insertBefore(formWrapper, container.querySelector('.add-btn'));
    updateComplexList(sectionId);
}

const addWorkItem = (t,c,s,e,d) => addComplexItem('work',{title:t,company:c,start:s,end:e,desc:d});
const addEducationItem = (d,s,st,e) => addComplexItem('education',{degree:d,school:s,start:st,end:e});

function removeItem(itemId, sectionId) {
    document.getElementById(itemId).remove();
    updateComplexList(sectionId);
}

function updateComplexList(sectionId) {
    const container = document.getElementById(`resume-${sectionId}`);
    const h2 = container.querySelector('h2');
    container.innerHTML = '';
    container.appendChild(h2);
    document.querySelectorAll(`.complex-item-form[id^="${sectionId}-"]`).forEach(item => {
        const div = document.createElement('div');
        div.className = 'resume-item';
        if (sectionId === 'work') {
            const data = {
                title: item.querySelector('.work-title').value,
                company: item.querySelector('.work-company').value,
                start: item.querySelector('.work-start').value,
                end: item.querySelector('.work-end').value,
                desc: item.querySelector('.work-desc').value.trim()
            };
            if (data.title || data.company) {
                const descHtml = DOMPurify.sanitize(marked.parse(data.desc));
                div.innerHTML = `<div class="resume-item-header"><h3>${data.title}</h3><span class="date">${data.start} - ${data.end || 'Current'}</span></div><p><strong>${data.company}</strong></p><div class="description">${descHtml}</div>`;
                container.appendChild(div);
            }
        } else if (sectionId === 'education') {
            const data = {
                degree: item.querySelector('.edu-degree').value,
                school: item.querySelector('.edu-school').value,
                start: item.querySelector('.edu-start').value,
                end: item.querySelector('.edu-end').value
            };
            if (data.degree || data.school) {
                div.innerHTML = `<div class="resume-item-header"><h3>${data.degree}</h3><span class="date">${data.start} - ${data.end || 'Current'}</span></div><p><strong>${data.school}</strong></p>`;
                container.appendChild(div);
            }
        }
    });
}


function initialize() {
    document.getElementById('name').value = 'Mihai-Cristian Condrea';
    document.getElementById('job-title').value = 'Android Developer';
    document.getElementById('phone').value = '+40751029091';
    document.getElementById('email').value = 'condreamihaicristian10@gmail.com';
    document.getElementById('address').value = 'Bucharest, Romania';
    document.getElementById('summary').value = `Android Developer specializing in the full app lifecycle, from UI/UX design to Google Play publishing, utilizing Jetpack Compose, Kotlin, and Firebase. As a music producer, I bring a creative and user-centric approach to development.`;
    ['name','job-title','phone','email','address','summary'].forEach(id=>document.getElementById(id).dispatchEvent(new Event('input')));
    addListItem('skills','Languages: Kotlin, Java, HTML, Markdown, JSON');
    addListItem('skills','Android: Jetpack Compose, ViewModels, LiveData, Room, Navigation');
    addListItem('skills','Tools: Android Studio, GitHub, Git, Firebase Console, Play Console');
    addListItem('skills','Design: Material 3, Figma, SVG, Adobe Illustrator, Photoshop');
    addListItem('languages','Romanian (Native)');
    addListItem('languages','English (Advanced)');
    addInterestItem('Technology, AI, UX optimization');
    addInterestItem('Electronic Music Production');
    addInterestItem('Creating educational and promotional digital content');
    addComplexItem('work',{title:'Android Developer',company:'Digi Romania S.A., Bucharest',start:'2024',end:'Current',desc:`- Engineered Android applications for live TV and video streaming platforms.\n- Built bespoke Android applications for promotional campaigns and internal operational use.\n- Orchestrated full lifecycle management of the Google Play Console for Digi Romania, Digi Spain, and Digi Portugal.`});
    addComplexItem('work',{title:'Android Developer',company:'Personal Projects, Bucharest',start:'2020',end:'Current',desc:`- Android Developer specializing in the full app lifecycle, from UI/UX design to Google Play publishing, utilizing Jetpack Compose, Kotlin, and Firebase. As a music producer, I bring a creative and user-centric approach to development.\n- Launched over 10 Android apps, managing everything from UI/UX design to development and publishing.\n- Focused on a Google-centric design, using Material Design principles for intuitive and consistent apps.`});
    addComplexItem('education',{degree:'University',school:'Faculty of Industrial and Robotics Engineering',start:'2020',end:'Current'});
    addComplexItem('education',{degree:'High School',school:'Hristo Botev Bulgarian Theoretical High School',start:'2016',end:'2020'});
    document.getElementById('photo-preview').style.backgroundImage = "url('assets/images/profile/cv_profile_pic.png')";
}

function getResumeEditParam() {
    if (typeof window === 'undefined' || !window.location) {
        return null;
    }

    const parseParams = (paramString) => {
        if (typeof paramString !== 'string' || paramString.length === 0) {
            return null;
        }
        const params = new URLSearchParams(paramString);
        return params.has('edit') ? params.get('edit') : null;
    };

    const searchValue = parseParams(window.location.search);
    if (searchValue !== null) {
        return searchValue;
    }

    const hash = window.location.hash;
    if (typeof hash === 'string' && hash.length > 0) {
        const queryStart = hash.search(/[?&]/);
        if (queryStart !== -1) {
            const hashParams = hash.slice(queryStart + 1);
            const hashValue = parseParams(hashParams);
            if (hashValue !== null) {
                return hashValue;
            }
        }
    }

    return null;
}

function setupMode() {
    const editValue = getResumeEditParam();
    const editMode = typeof editValue === 'string' && editValue.toLowerCase() === 'true';
    const form = document.querySelector('#resumePage .form-container');
    if (form) {
        form.style.display = editMode ? '' : 'none';
    }
}

function setupResumeControls() {
    document.querySelectorAll('[data-add-list]').forEach(button => {
        if (button.dataset.resumeBound === 'true') return;
        const sectionId = button.dataset.addList;
        if (!sectionId) return;
        button.addEventListener('click', () => addListItem(sectionId));
        button.dataset.resumeBound = 'true';
    });

    document.querySelectorAll('[data-add-complex]').forEach(button => {
        if (button.dataset.resumeBound === 'true') return;
        const sectionId = button.dataset.addComplex;
        if (!sectionId) return;
        button.addEventListener('click', () => addComplexItem(sectionId));
        button.dataset.resumeBound = 'true';
    });

    document.querySelectorAll('[data-add-interest]').forEach(button => {
        if (button.dataset.resumeBound === 'true') return;
        button.addEventListener('click', () => addInterestItem());
        button.dataset.resumeBound = 'true';
    });

    const downloadButton = document.getElementById('downloadResumeButton');
    if (downloadButton && downloadButton.dataset.resumeBound !== 'true') {
        downloadButton.addEventListener('click', prepareAndPrintResume);
        downloadButton.dataset.resumeBound = 'true';
    }
}

function prepareAndPrintResume() {
    const cvElement = document.getElementById('resume-preview');
    if (!cvElement) {
        window.print();
        return;
    }

    const originalTransform = cvElement.style.transform;
    const originalOrigin = cvElement.style.transformOrigin;

    const contentHeight = cvElement.scrollHeight;
    const targetHeight = 1080; // approximate printable height of an A4 page

    if (contentHeight > targetHeight) {
        const scale = targetHeight / contentHeight;
        cvElement.style.transformOrigin = 'top left';
        cvElement.style.transform = `scale(${scale})`;
    } else {
        cvElement.style.transform = '';
    }

    window.onafterprint = () => {
        cvElement.style.transform = originalTransform;
        cvElement.style.transformOrigin = originalOrigin;
        window.onafterprint = null;
    };

    window.print();
}


let markedLoadPromise;

function ensureMarkedLoaded() {
    if (window.marked) return Promise.resolve();
    if (markedLoadPromise) return markedLoadPromise;
    markedLoadPromise = new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
    return markedLoadPromise;
}

function ensureResumeStyles() {
    const head = document.head;
    if (!document.querySelector('link[href="assets/css/resume.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'assets/css/resume.css';
        head.appendChild(link);
    }
    if (!document.querySelector('link[href="assets/css/print.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'assets/css/print.css';
        link.media = 'print';
        head.appendChild(link);
    }
}

function initResumePage() {
    ensureResumeStyles();
    ensureMarkedLoaded().then(() => {
        setupResumeControls();
        setupRealtimeUpdates();
        setupMode();
        document.fonts.ready.then(initialize);
    });
}
