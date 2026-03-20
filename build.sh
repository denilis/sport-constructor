#!/bin/bash
# Build script for Netlify — generates keys.js from environment variables
# API keys are stored in Netlify Dashboard → Site settings → Environment variables

echo "// Auto-generated at build time — do not edit" > js/keys.js
echo "const KIE_API_KEY = '${KIE_API_KEY:-}';" >> js/keys.js
echo "const CLAUDE_API_KEY = '${CLAUDE_API_KEY:-}';" >> js/keys.js

echo "✅ keys.js generated"
