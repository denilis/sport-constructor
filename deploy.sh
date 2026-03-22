#!/bin/bash
# Ручной деплой на Netlify
# Запускать: bash deploy.sh

echo "Деплой Sport Constructor Pro на Netlify..."

# 1. Push изменений на GitHub
git push origin master

# 2. Триггер Netlify Build Hook
# Вставьте ваш Build Hook URL из Netlify: Site Settings → Build & deploy → Build hooks
NETLIFY_HOOK="https://api.netlify.com/build_hooks/PASTE_YOUR_HOOK_HERE"

if [[ "$NETLIFY_HOOK" == *"PASTE_YOUR_HOOK_HERE"* ]]; then
  echo ""
  echo "⚠️  Настройте Build Hook:"
  echo "  1. Откройте Netlify → sport-constructor → Site Settings"
  echo "  2. Build & deploy → Build hooks → Add build hook"
  echo "  3. Скопируйте URL и вставьте в переменную NETLIFY_HOOK в deploy.sh"
  echo ""
  echo "  Или деплойте вручную: Netlify → Deploys → Trigger deploy"
else
  curl -s -X POST "$NETLIFY_HOOK" | grep -o '"enqueued":[^,]*'
  echo "Деплой запущен! Статус: https://app.netlify.com/sites/sport-constructor/deploys"
fi
