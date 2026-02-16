const fs = require('fs');
const path = require('path');

// Change Rationale: Jest needs a raw HTML string for the builder remote partial so shared controls hydrate
// consistently during DOM-based tests without relying on Vite's ?raw import handling.

module.exports = fs.readFileSync(
  // Change Rationale: Builder remote partials moved into the shared workspace UI views
  // folder, so tests should load the canonical template source.
  path.join(__dirname, '../../src/shared/workspaces/ui/views/BuilderRemoteView.html'),
  'utf8'
);
