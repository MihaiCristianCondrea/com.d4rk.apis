'use strict';

/**
 * @file Style token audit for Android-green palette alignment.
 *
 * Change Rationale: Some style modules retained hardcoded fallback literals from the old
 * Material purple seed palette. This audit blocks those fallbacks so component and feature
 * styles consistently resolve from approved `--app-*` and `--md-sys-color-*` tokens.
 * It also flags interactive component declarations that use non-token literal colors.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STYLE_ROOTS = [
  path.join(ROOT, 'src', 'styles', 'components', 'native'),
  path.join(ROOT, 'src', 'styles', 'features'),
];

const DISALLOWED_HEX_FALLBACKS = [
  '#e6e1e5',
  '#cac4d0',
  '#b3261e',
  '#f2b8b5',
  '#1f1a24',
  '#49454f',
];

const INTERACTIVE_SELECTOR_PATTERN = /(button|input|select|textarea|a\b|dialog|overlay|nav-link|toggle|trigger|menu|chip|field|card|toolbar|floating|screenshot)/i;
const INTERACTIVE_COLOR_DECLARATION_PATTERN = /\b(color|background(?:-color)?|border(?:-color)?|box-shadow|outline(?:-color)?|fill|stroke)\s*:\s*[^;]*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:black|white|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|teal|cyan|magenta)\b)/i;

const INTERACTIVE_COLOR_ALLOWED_KEYWORD_PATTERN = /\btransparent\b|\bcurrentColor\b/i;

/** @param {string} filePath */
function toDisplayPath(filePath) {
  return filePath.split(path.sep).join('/');
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function collectCssFiles(root) {
  if (!fs.existsSync(root)) return [];
  const results = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        return;
      }
      if (entry.isFile() && entry.name.endsWith('.css')) {
        results.push(entryPath);
      }
    });
  }
  return results;
}

/**
 * @param {string} content
 * @returns {Array<{line:number,text:string}>}
 */
function findDisallowedFallbacks(content) {
  const matches = [];
  const pattern = /var\([^\n)]*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g;
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    let m;
    while ((m = pattern.exec(line)) !== null) {
      const hex = m[1].toLowerCase();
      if (DISALLOWED_HEX_FALLBACKS.includes(hex)) {
        matches.push({ line: index + 1, text: line.trim() });
      }
    }
    pattern.lastIndex = 0;
  });
  return matches;
}

/**
 * @param {string} content
 * @returns {Array<{line:number,text:string}>}
 */
function findInteractiveHardcodedColors(content) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  let selectorBuffer = '';

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('/*')) {
      return;
    }

    if (trimmed.includes('{')) {
      selectorBuffer = trimmed.split('{')[0].trim() || selectorBuffer;
    }

    if (
      INTERACTIVE_SELECTOR_PATTERN.test(selectorBuffer)
      && INTERACTIVE_COLOR_DECLARATION_PATTERN.test(trimmed)
      && !INTERACTIVE_COLOR_ALLOWED_KEYWORD_PATTERN.test(trimmed)
    ) {
      findings.push({ line: index + 1, text: trimmed });
    }

    if (trimmed.includes('}')) {
      selectorBuffer = '';
    }
  });

  return findings;
}

const errors = [];
STYLE_ROOTS.flatMap(collectCssFiles).forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fallbackFindings = findDisallowedFallbacks(content);
  fallbackFindings.forEach((finding) => {
    errors.push(`${toDisplayPath(path.relative(ROOT, filePath))}:${finding.line} -> ${finding.text}`);
  });

  const hardcodedInteractiveColors = findInteractiveHardcodedColors(content);
  hardcodedInteractiveColors.forEach((finding) => {
    errors.push(`${toDisplayPath(path.relative(ROOT, filePath))}:${finding.line} -> ${finding.text}`);
  });
});

if (errors.length) {
  console.error('Style token audit failed. Replace hardcoded style colors with approved semantic tokens:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Style token audit passed.');
