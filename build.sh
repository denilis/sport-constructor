#!/bin/bash
# Build script for Netlify
# 1. Generate keys.js from env vars
# 2. Minify JS/CSS for production

echo "═══ BUILD START ═══"

# Step 1: Generate keys.js from environment variables
echo "// Auto-generated at build time — do not edit" > js/keys.js
echo "const KIE_API_KEY = '${KIE_API_KEY:-}';" >> js/keys.js
echo "const CLAUDE_API_KEY = '${CLAUDE_API_KEY:-}';" >> js/keys.js
echo "✅ keys.js generated"

# Step 2: Install minification tools
npm install --no-save terser clean-css-cli 2>/dev/null

# Step 3: Minify JavaScript files
if command -v npx &> /dev/null; then
  echo "🔧 Minifying JS..."
  for f in js/*.js; do
    npx terser "$f" --compress --mangle --output "$f" 2>/dev/null && echo "  ✓ $f" || echo "  ⚠ $f skipped"
  done

  echo "🔧 Minifying CSS..."
  for f in css/*.css; do
    npx cleancss -o "$f" "$f" 2>/dev/null && echo "  ✓ $f" || echo "  ⚠ $f skipped"
  done
else
  echo "⚠ npx not found, skipping minification"
fi

echo "═══ BUILD DONE ═══"
