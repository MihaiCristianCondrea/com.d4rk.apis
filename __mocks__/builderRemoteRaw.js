const fs = require('fs');
const path = require('path');

// Change Rationale: Jest needs a raw HTML string for the builder remote partial so shared controls hydrate
// consistently during DOM-based tests without relying on Vite's ?raw import handling.

module.exports = fs.readFileSync(
  path.join(__dirname, '../app/src/main/res/layout/workspaces/shared/builder-remote.html'),
  'utf8'
);
