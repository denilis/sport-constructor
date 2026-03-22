/* ═══════════════════════════════════════════════════════════
   PROMPTS SETTINGS — view / edit / override AI prompts
   Saves overrides to localStorage key: sc_prompt_overrides
   ═══════════════════════════════════════════════════════════ */

/* ── Utility: get prompt with localStorage override ── */
function getPrompt(key, defaultPrompt) {
  try {
    var overrides = JSON.parse(localStorage.getItem('sc_prompt_overrides') || '{}');
    return (overrides[key] && overrides[key].trim()) ? overrides[key] : defaultPrompt;
  } catch (e) {
    return defaultPrompt;
  }
}

/* ── Prompt registry (populated after all modules load) ── */
var PROMPT_REGISTRY = [
  {
    key: 'neuro_config',
    label: 'НейроМозг — Конфигуратор',
    desc: 'Основной промт НейроМозга — сборка структуры проекта, контейнерная модель, размещение, рендер-блок.',
    getDefault: function() {
      if (typeof buildNeuroConfigPrompt === 'function') {
        try {
          var sampleCtx = {
            catSummary: '[каталог]',
            bldTypes: '[типы зданий]',
            pw: 100, pl: 50,
            catalogSizes: '[размеры]'
          };
          return buildNeuroConfigPrompt(sampleCtx);
        } catch(e) {}
      }
      return '(промт загружается динамически — откройте НейроМозг для инициализации)';
    }
  },
  {
    key: 'neuro_client_analysis',
    label: 'НейроМозг — Анализ клиента',
    desc: 'Промт для анализа материалов клиента (PDF, DOCX, ТЗ) и извлечения структуры проекта.',
    getDefault: function() {
      if (typeof buildClientAnalysisPrompt === 'function') {
        try {
          return buildClientAnalysisPrompt({ catSummary: '[каталог]', bldTypes: '[типы зданий]' });
        } catch(e) {}
      }
      return '(промт загружается динамически)';
    }
  },
  {
    key: 'neuro_image_analysis',
    label: 'НейроМозг — Анализ изображений',
    desc: 'Промт для анализа фотографий и рендеров проекта клиента.',
    getDefault: function() {
      if (typeof buildImageAnalysisPrompt === 'function') {
        try {
          return buildImageAnalysisPrompt({ catSummary: '[каталог]', bldTypes: '[типы зданий]' });
        } catch(e) {}
      }
      return '(промт загружается динамически)';
    }
  },
  {
    key: 'render_system',
    label: 'Рендер — Системный (RENDER_SYSTEM_PROMPT)',
    desc: 'Системный промт для AI-визуализации: правила сохранения мастер-плана, материалов, функций.',
    getDefault: function() {
      return (typeof RENDER_SYSTEM_PROMPT !== 'undefined') ? RENDER_SYSTEM_PROMPT : '(не загружен)';
    }
  },
  {
    key: 'render_ice_supplement',
    label: 'Рендер — Дополнение для льда (RENDER_ICE_SUPPLEMENT)',
    desc: 'Дополнительный блок к рендер-промту для ледовых арен.',
    getDefault: function() {
      return (typeof RENDER_ICE_SUPPLEMENT !== 'undefined') ? RENDER_ICE_SUPPLEMENT : '(не загружен)';
    }
  },
  {
    key: 'planner_ai',
    label: 'Планировщик — AI-анализ генплана',
    desc: 'Промт архитектурного консультанта: анализ расстановки зданий, потоки, зонирование.',
    getDefault: function() {
      return 'Ты архитектурный консультант по мастер-плану спортивно-рекреационных комплексов.\n\nПРОЕКТ\nУчасток: ${r?r+"×"+i+"м":"размер не задан"}\nСуммарное пятно: ${t} м²\n\nРАССТАНОВКА\n${a}\n\nЗАДАЧА\nДай короткий, прикладной анализ расстановки с точки зрения: логики зон, потоков посетителей, эксплуатационной удобности, плотности, конфликтов функций, возможных улучшений.\n\nВАЖНЫЕ ПРАВИЛА\n- Не выдумывай внешние данные.\n- Если по входу нельзя уверенно судить об инсоляции, сторонах света, реальном ландшафте — так и напиши коротко.\n- Не пересказывай входные данные.\n- Пиши только то, что помогает реально поправить генплан.\n\nФОРМАТ\nМаксимум 180 слов.';
    }
  },
  {
    key: 'render_commercial',
    label: 'Рендер — Коммерческий анализ концепции',
    desc: 'Промт для оценки коммерческой логики проекта (функциональность, риски, доходность).',
    getDefault: function() {
      return 'Ты опытный девелопер спортивной инфраструктуры и консультант по функционально-коммерческой логике объектов.\n\nОБЪЕКТЫ НА ПЛАНЕ\nСуммарное пятно: ${t} м²\n${a}\n\nБЮДЖЕТ\nИтого: ${fmt(i)}\n${r.join("\\n")}\n\nЗАДАЧА\nОцени концепцию проекта с точки зрения: функциональной логики, коммерческого потенциала, рисков реализации, устойчивости эксплуатации, точек улучшения.\n\nФОРМАТ\nМаксимум 400 слов.';
    }
  },
  {
    key: 'calc_market_research',
    label: 'Калькулятор — Исследование рынка',
    desc: 'Промт для AI-исследования рыночных цен по позициям каталога (раздел ⚙ Цены).',
    getDefault: function() {
      return 'Ты аналитик рынка спортивных сооружений и оборудования.\n\nЗАДАЧА\nПроведи исследование рыночных цен для следующих позиций каталога. Найди актуальные цены на российском рынке (2024-2026).\n\nКАТАЛОГ ДЛЯ ИССЛЕДОВАНИЯ:\n${items}\n\nДля каждой позиции укажи:\n- актуальную рыночную цену в рублях\n- диапазон цен (мин-макс)\n- источники / основание для оценки\n- рекомендацию: оставить текущую цену / пересмотреть\n\nФОРМАТ ОТВЕТА: JSON-массив с полями id, name, currentPrice, marketMin, marketMax, recommendation, source.';
    }
  },
  {
    key: 'calc_catalog_analysis',
    label: 'Калькулятор — Анализ каталога по исследованию',
    desc: 'Промт сопоставления результатов рыночного исследования с позициями каталога.',
    getDefault: function() {
      return 'Ты аналитик рынка спортивных сооружений, оборудования и инфраструктурных решений.\n\nТЕБЕ ДАНЫ\n\n1. КАТАЛОГ ПРОЕКТА (id | Название — Вариант | Категория | Текущая цена):\n${catalog}\n\n2. РЕЗУЛЬТАТЫ РЫНОЧНОГО ИССЛЕДОВАНИЯ:\n${research}\n\nЗАДАЧА\nСопоставить позиции исследования с каталогом максимально аккуратно, без ложных совпадений.\n\nФОРМАТ ОТВЕТА: JSON-массив с полями id, optIdx, newPrice, delta (%), confidence, comment.';
    }
  }
];

/* ── Open prompts modal ── */
function openPromptsSettings() {
  var modal = document.getElementById('promptsSettingsModal');
  if (!modal) {
    modal = buildPromptsModal();
    document.body.appendChild(modal);
  }
  renderPromptsUI();
  modal.classList.add('show');
}

function closePromptsSettings() {
  var modal = document.getElementById('promptsSettingsModal');
  if (modal) modal.classList.remove('show');
}

/* ── Build modal DOM ── */
function buildPromptsModal() {
  var modal = document.createElement('div');
  modal.id = 'promptsSettingsModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:none;align-items:center;justify-content:center;';
  modal.innerHTML = [
    '<div style="background:var(--bg1,#1a1a2e);border:1px solid var(--bd,rgba(255,255,255,.12));border-radius:16px;width:860px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6);">',
      '<div style="padding:16px 20px;border-bottom:1px solid var(--bd,rgba(255,255,255,.12));display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">',
        '<div>',
          '<h3 style="margin:0;font-size:16px;color:var(--tx,#e0e0e0);">⚙ Настройки промтов</h3>',
          '<p style="margin:4px 0 0;font-size:11px;color:var(--tx3,#666);">Просматривайте и редактируйте AI-промты. Изменения сохраняются в браузере и применяются вместо встроенных.</p>',
        '</div>',
        '<button onclick="closePromptsSettings()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--tx2,#aaa);padding:4px 8px;">✕</button>',
      '</div>',
      '<div id="promptsSettingsBody" style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:20px;">',
        '<div style="color:var(--tx3,#666);font-size:12px;">Загрузка...</div>',
      '</div>',
      '<div style="padding:12px 20px;border-top:1px solid var(--bd,rgba(255,255,255,.12));display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;">',
        '<button onclick="resetAllPrompts()" style="padding:8px 16px;background:rgba(248,113,113,.1);color:#f87171;border:1px solid rgba(248,113,113,.3);border-radius:8px;font-size:12px;cursor:pointer;">Сбросить все</button>',
        '<button onclick="saveAllPrompts()" style="padding:8px 20px;background:var(--purple,#9B6DFF);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Сохранить все</button>',
      '</div>',
    '</div>'
  ].join('');
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closePromptsSettings();
  });
  // Make it use flex
  modal.style.display = 'none';
  modal.classList_show = false;
  // Override class behavior
  var origAdd = modal.classList.add.bind(modal.classList);
  var origRemove = modal.classList.remove.bind(modal.classList);
  modal.classList.add = function(cls) {
    if (cls === 'show') modal.style.display = 'flex';
    origAdd(cls);
  };
  modal.classList.remove = function(cls) {
    if (cls === 'show') modal.style.display = 'none';
    origRemove(cls);
  };
  return modal;
}

/* ── Render all prompts UI ── */
function renderPromptsUI() {
  var body = document.getElementById('promptsSettingsBody');
  if (!body) return;

  var overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('sc_prompt_overrides') || '{}'); } catch(e) {}

  var html = '';
  PROMPT_REGISTRY.forEach(function(entry) {
    var defaultVal = entry.getDefault();
    var currentVal = overrides[entry.key] || '';
    var isOverridden = !!(currentVal && currentVal.trim());
    var displayVal = isOverridden ? currentVal : defaultVal;

    html += '<div style="background:var(--bg2,rgba(255,255,255,.04));border:1px solid ' + (isOverridden ? 'rgba(155,109,255,.4)' : 'var(--bd,rgba(255,255,255,.12))') + ';border-radius:10px;padding:14px 16px;">';
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">';
    html += '<div>';
    html += '<div style="font-size:13px;font-weight:600;color:var(--tx,#e0e0e0);">' + entry.label + (isOverridden ? ' <span style="font-size:10px;color:#9B6DFF;font-weight:400;">● изменён</span>' : '') + '</div>';
    html += '<div style="font-size:11px;color:var(--tx3,#666);margin-top:2px;">' + entry.desc + '</div>';
    html += '</div>';
    html += '<button onclick="resetPrompt(\'' + entry.key + '\')" title="Сбросить к встроенному" style="background:none;border:1px solid var(--bd,rgba(255,255,255,.12));color:var(--tx3,#666);border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;white-space:nowrap;margin-left:12px;flex-shrink:0;">Сбросить</button>';
    html += '</div>';
    html += '<textarea id="prompt_ta_' + entry.key + '" rows="6" style="width:100%;background:var(--bg3,rgba(0,0,0,.3));border:1px solid var(--bd,rgba(255,255,255,.12));border-radius:6px;padding:10px;color:var(--tx,#e0e0e0);font-size:11px;font-family:monospace;line-height:1.5;resize:vertical;outline:none;box-sizing:border-box;">' + escapeHtml(displayVal) + '</textarea>';
    html += '<div style="display:flex;gap:8px;margin-top:6px;align-items:center;">';
    html += '<button onclick="saveOnePrompt(\'' + entry.key + '\')" style="padding:5px 14px;background:var(--purple,#9B6DFF);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">Сохранить</button>';
    html += '<span id="prompt_status_' + entry.key + '" style="font-size:10px;color:var(--green,#4ade80);"></span>';
    html += '</div>';
    html += '</div>';
  });

  body.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Save one prompt ── */
function saveOnePrompt(key) {
  var ta = document.getElementById('prompt_ta_' + key);
  if (!ta) return;
  var val = ta.value.trim();
  var overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('sc_prompt_overrides') || '{}'); } catch(e) {}

  if (val) {
    overrides[key] = val;
  } else {
    delete overrides[key];
  }
  localStorage.setItem('sc_prompt_overrides', JSON.stringify(overrides));

  var status = document.getElementById('prompt_status_' + key);
  if (status) {
    status.textContent = '✓ Сохранено';
    setTimeout(function() { status.textContent = ''; }, 2000);
  }
  // Refresh UI to update override indicator
  renderPromptsUI();
}

/* ── Save all prompts ── */
function saveAllPrompts() {
  var overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('sc_prompt_overrides') || '{}'); } catch(e) {}
  PROMPT_REGISTRY.forEach(function(entry) {
    var ta = document.getElementById('prompt_ta_' + entry.key);
    if (!ta) return;
    var val = ta.value.trim();
    if (val) {
      overrides[entry.key] = val;
    } else {
      delete overrides[entry.key];
    }
  });
  localStorage.setItem('sc_prompt_overrides', JSON.stringify(overrides));
  renderPromptsUI();
  // Brief feedback
  var btn = document.querySelector('#promptsSettingsModal button[onclick="saveAllPrompts()"]');
  if (btn) {
    var orig = btn.textContent;
    btn.textContent = '✓ Сохранено!';
    setTimeout(function() { btn.textContent = orig; }, 2000);
  }
}

/* ── Reset one prompt ── */
function resetPrompt(key) {
  var overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('sc_prompt_overrides') || '{}'); } catch(e) {}
  delete overrides[key];
  localStorage.setItem('sc_prompt_overrides', JSON.stringify(overrides));
  renderPromptsUI();
}

/* ── Reset all prompts ── */
function resetAllPrompts() {
  if (!confirm('Сбросить все изменённые промты к встроенным значениям?')) return;
  localStorage.removeItem('sc_prompt_overrides');
  renderPromptsUI();
}
