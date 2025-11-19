#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/src"
ASSETS_DIR="$ROOT_DIR/assets"

STYLES_DIR="$SRC_DIR/styles"
FEATURES_DIR="$SRC_DIR/features"

mkdir -p "$STYLES_DIR"
mkdir -p "$FEATURES_DIR"

move_css() {
  local css_dir="$ASSETS_DIR/css"
  if [[ -d "$css_dir" ]]; then
    shopt -s nullglob
    for css_file in "$css_dir"/*.css; do
      file_name="$(basename "$css_file")"
      if [[ "$file_name" == 'tailwind.css' ]]; then
        rm -f "$css_file"
        continue
      fi
      if [[ "$file_name" == 'tailwind.input.css' ]]; then
        target="$STYLES_DIR/tailwind.css"
      else
        target="$STYLES_DIR/$file_name"
      fi
      mv "$css_file" "$target"
    done
    shopt -u nullglob
    rmdir "$css_dir" 2>/dev/null || true
  fi
}

move_js() {
  local js_dir="$ASSETS_DIR/js"
  if [[ -d "$js_dir" ]]; then
    if [[ -d "$js_dir/apis" ]]; then
      mv "$js_dir/apis" "$FEATURES_DIR/"
    fi
    shopt -s nullglob
    for js_file in "$js_dir"/*.js; do
      mv "$js_file" "$FEATURES_DIR/"
    done
    shopt -u nullglob
    rmdir "$js_dir" 2>/dev/null || true
  fi
}

move_css
move_js

echo "Assets migrated. CSS now in $STYLES_DIR and JS logic in $FEATURES_DIR."
