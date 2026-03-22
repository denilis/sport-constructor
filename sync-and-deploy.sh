#!/bin/bash
# Ручной деплой: коммит с C: диска + push на GitHub → Netlify (ручной)
# Запуск: bash sync-and-deploy.sh "Описание изменений"
MSG="${1:-update}"
cd "/c/Проекты Cloud/Калькулятор/sport-constructor"
git add -A
git commit -m "$MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
echo "Готово! Для деплоя зайдите в Netlify → Trigger deploy"
