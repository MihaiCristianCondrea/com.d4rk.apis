'use strict';

/**
 * @file Validates canonical path references in architecture documentation.
 *
 * Change Rationale:
 * - Architecture guidance can drift when directories are moved during migrations.
 * - Broken path references reduce trust in router/shell docs and slow contributor onboarding.
 * - This validator enforces that canonical, backticked repo paths in architecture docs
 *   resolve to real files/directories, keeping documentation aligned with the codebase.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const architectureDocs = [
  path.join(repoRoot, 'docs', 'architecture', 'app-architecture.md'),
];

const REPO_PATH_PREFIX = /^(src|app|public|docs|tests|scripts|api|index\.html|package\.json)(\/|$)/;

/**
 * Normalizes a documented path token by removing markdown/glob decorations.
 *
 * @param {string} token Raw token captured from backticks.
 * @returns {string} Normalized repository-relative path token.
 */
function normalizePathToken(token) {
  return token
    .trim()
    .replace(/^\.\//, '')
    .replace(/[),.;:]+$/g, '')
    .replace(/\/\*\*$/g, '')
    .replace(/\/\*$/g, '');
}

/**
 * Extracts candidate path references from markdown backticks.
 *
 * @param {string} fileContents Markdown source text.
 * @returns {string[]} Candidate repository-relative paths.
 */
function extractPathCandidates(fileContents) {
  const markdownWithoutComments = fileContents.replace(/<!--[\s\S]*?-->/g, "");
  const matches = [...markdownWithoutComments.matchAll(/`([^`]+)`/g)].map((match) => normalizePathToken(match[1]));
  return matches.filter((token) => REPO_PATH_PREFIX.test(token) && !/[<>*]/.test(token));
}

/**
 * Verifies all canonical path references in a markdown document.
 *
 * @param {string} absoluteDocPath Absolute markdown path.
 * @returns {string[]} Validation failures.
 */
function validateDocPaths(absoluteDocPath) {
  const contents = fs.readFileSync(absoluteDocPath, 'utf8');
  const uniqueCandidates = Array.from(new Set(extractPathCandidates(contents)));

  return uniqueCandidates
    .filter((relativePath) => !fs.existsSync(path.join(repoRoot, relativePath)))
    .map((relativePath) => {
      const docRelative = path.relative(repoRoot, absoluteDocPath).split(path.sep).join('/');
      return `${docRelative} references missing path: ${relativePath}`;
    });
}

const errors = architectureDocs.flatMap(validateDocPaths);

if (errors.length) {
  console.error('Architecture doc path validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Architecture doc path validation passed.');
