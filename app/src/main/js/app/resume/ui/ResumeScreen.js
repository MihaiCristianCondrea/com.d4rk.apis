/**
 * @file Resume screen controller for wiring form inputs and print actions.
 */

const DEFAULT_RESUME = {
  name: 'Mihai-Cristian Condrea',
  jobTitle: 'Android Developer',
  phone: '+40 000 000 000',
  email: 'mihai@example.com',
  address: 'Romania',
  summary: 'Android developer focused on Material 3 experiences and API tooling.',
};

/**
 * Safely returns an element by id from the current document.
 *
 * @param {string} id Element id.
 * @returns {HTMLElement|null} Matching element or null.
 */
function byId(id) {
  return document.getElementById(id);
}

/**
 * Binds a text input to a preview element.
 *
 * Change Rationale: The resume feature was decommissioned during a prior refactor,
 * which left a visible resume route in SEO artifacts but no runtime behavior.
 * Reintroducing lightweight field-to-preview bindings restores the existing user
 * flow without introducing new UX patterns, keeping the screen aligned with
 * Material 3's immediate feedback principle.
 *
 * @param {string} inputId Input element id.
 * @param {string} previewId Preview element id.
 * @returns {void}
 */
function bindPreviewField(inputId, previewId) {
  const input = byId(inputId);
  const preview = byId(previewId);
  if (!input || !preview) {
    return;
  }

  const update = () => {
    preview.textContent = input.value.trim();
  };

  input.addEventListener('input', update);
  update();
}

/**
 * Injects default values into the resume form.
 *
 * @returns {void}
 */
function seedDefaults() {
  const mappings = [
    ['name', DEFAULT_RESUME.name],
    ['job-title', DEFAULT_RESUME.jobTitle],
    ['phone', DEFAULT_RESUME.phone],
    ['email', DEFAULT_RESUME.email],
    ['address', DEFAULT_RESUME.address],
    ['summary', DEFAULT_RESUME.summary],
  ];

  mappings.forEach(([id, value]) => {
    const field = byId(id);
    if (field && !field.value) {
      field.value = value;
    }
  });
}

/**
 * Ensures resume and print styles are mounted once.
 *
 * @returns {void}
 */
function ensureResumeStyles() {
  const styleUrls = (typeof window !== 'undefined' && window.__APP_STYLE_URLS__) || {};
  const styleConfigs = [
    { id: 'resume', href: styleUrls.resume, media: null },
    { id: 'resume-print', href: styleUrls.print, media: 'print' },
  ];

  styleConfigs.forEach((config) => {
    if (!config.href || document.querySelector(`link[data-style="${config.id}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = config.href;
    link.dataset.style = config.id;
    if (config.media) {
      link.media = config.media;
    }
    document.head.appendChild(link);
  });
}

/**
 * Initializes the resume route once the screen is mounted.
 *
 * @returns {void}
 */
export function initResumePage() {
  ensureResumeStyles();
  seedDefaults();

  bindPreviewField('name', 'resume-name');
  bindPreviewField('job-title', 'resume-job-title');
  bindPreviewField('phone', 'resume-phone');
  bindPreviewField('email', 'resume-email');
  bindPreviewField('address', 'resume-address');
  bindPreviewField('summary', 'resume-summary');

  const downloadButton = byId('downloadResumeButton');
  if (downloadButton && !downloadButton.dataset.resumePrintBound) {
    downloadButton.addEventListener('click', () => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    });
    downloadButton.dataset.resumePrintBound = 'true';
  }
}
