import './styles/tailwind.css';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/fonts.css';
import './styles/layered-panels.css';
import './styles/viewport-optimizations.css';

import resumeStylesAsset from './styles/resume.css?url';
import resumePrintStylesAsset from './styles/print.css?url';

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const existingStyleUrls = globalScope.__APP_STYLE_URLS__ || {};
globalScope.__APP_STYLE_URLS__ = {
  ...existingStyleUrls,
  resume: resumeStylesAsset,
  print: resumePrintStylesAsset,
};

import './features/dialogs.js';
import './features/animations.js';
import './features/metadataManager.js';
import './features/projects.js';
import './features/bloggerApi.js';
import './features/committers.js';
import './features/contact.js';
import './features/songs.js';
import './features/resume.js';

import './app/legacyBridge.js';

import './features/apis/appToolkit.js';
import './features/apis/faq.js';
import './features/apis/englishWithLidia.js';
import './features/apis/androidStudioTutorials.js';
import './features/apis/pagers.js';

import './workspaces/appToolkit/index.js';
import './app/app.js';
