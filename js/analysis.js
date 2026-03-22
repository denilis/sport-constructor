/* ═══════════════════════════════════════════════════════════
   MODULE 00: CLIENT PROJECT ANALYSIS
   Upload client materials → AI extracts project structure
   ═══════════════════════════════════════════════════════════ */

var ANALYSIS = {
  files: [],
  fileData: [],
  messages: [],
  result: null,
  busy: false,
  lastApplyData: null
};

/* ── File handling ── */

function handleAnalysisFiles(files) {
  if (!files || !files.length) return;
  for (var i = 0; i < files.length; i++) {
    ANALYSIS.files.push(files[i]);
  }
  renderAnalysisFileList();
  document.getElementById('analysisRunBtn').style.display = 'inline-block';
  document.getElementById('analysisFileInput').value = '';
}

function handleAnalysisDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  var zone = document.getElementById('analysisDropZone');
  if (zone) zone.style.borderColor = 'var(--bd2)';
  var files = event.dataTransfer && event.dataTransfer.files;
  if (files && files.length) handleAnalysisFiles(files);
}

function renderAnalysisFileList() {
  var el = document.getElementById('analysisFilesList');
  if (!el) return;
  if (!ANALYSIS.files.length) { el.innerHTML = ''; return; }
  var html = '<div style="font-size:11px;color:var(--tx3);margin-bottom:6px;">Загруженные файлы:</div>';
  for (var i = 0; i < ANALYSIS.files.length; i++) {
    var f = ANALYSIS.files[i];
    var icon = '📄';
    if (f.type && f.type.startsWith('image/')) icon = '🖼️';
    else if (f.name && f.name.match(/\.pdf$/i)) icon = '📕';
    else if (f.name && f.name.match(/\.docx?$/i)) icon = '📝';
    var sizeMB = (f.size / 1024 / 1024).toFixed(1);
    html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg2);border-radius:6px;margin-bottom:4px;font-size:12px;">';
    html += '<span>' + icon + '</span>';
    html += '<span style="flex:1;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + f.name + '</span>';
    html += '<span style="color:var(--tx3);font-size:10px;">' + sizeMB + ' MB</span>';
    html += '<button onclick="removeAnalysisFile(' + i + ')" style="background:none;border:none;color:var(--red,#f87171);cursor:pointer;font-size:14px;padding:0 4px;">×</button>';
    html += '</div>';
  }
  el.innerHTML = html;
}

function removeAnalysisFile(idx) {
  ANALYSIS.files.splice(idx, 1);
  renderAnalysisFileList();
  if (!ANALYSIS.files.length) {
    document.getElementById('analysisRunBtn').style.display = 'none';
  }
}

/* ── Read files into fileData ── */

function readAnalysisFilesAsync(callback) {
  ANALYSIS.fileData = [];
  var pending = ANALYSIS.files.length;
  if (!pending) { callback(); return; }

  for (var i = 0; i < ANALYSIS.files.length; i++) {
    (function(file) {
      var entry = { name: file.name, type: file.type, text: null, base64: null };

      if (file.type && file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function(e) {
          entry.base64 = e.target.result.split(',')[1];
          entry.mediaType = file.type;
          ANALYSIS.fileData.push(entry);
          if (--pending === 0) callback();
        };
        reader.readAsDataURL(file);
      } else if (file.name && file.name.match(/\.pdf$/i) && typeof pdfjsLib !== 'undefined') {
        var reader2 = new FileReader();
        reader2.onload = function(e) {
          var arr = new Uint8Array(e.target.result);
          pdfjsLib.getDocument({ data: arr }).promise.then(function(pdf) {
            var pages = [];
            var total = pdf.numPages;
            var done = 0;
            for (var p = 1; p <= total; p++) {
              (function(pageNum) {
                pdf.getPage(pageNum).then(function(page) {
                  page.getTextContent().then(function(tc) {
                    var txt = tc.items.map(function(it) { return it.str; }).join(' ');
                    pages[pageNum - 1] = txt;
                    if (++done === total) {
                      entry.text = pages.join('\n\n--- Страница ---\n\n');
                      ANALYSIS.fileData.push(entry);
                      if (--pending === 0) callback();
                    }
                  });
                });
              })(p);
            }
          }).catch(function() {
            entry.text = '[Не удалось прочитать PDF]';
            ANALYSIS.fileData.push(entry);
            if (--pending === 0) callback();
          });
        };
        reader2.readAsArrayBuffer(file);
      } else if (file.name && file.name.match(/\.docx$/i) && typeof mammoth !== 'undefined') {
        var reader3 = new FileReader();
        reader3.onload = function(e) {
          mammoth.extractRawText({ arrayBuffer: e.target.result }).then(function(res) {
            entry.text = res.value || '[Пустой документ]';
            ANALYSIS.fileData.push(entry);
            if (--pending === 0) callback();
          }).catch(function() {
            entry.text = '[Не удалось прочитать DOCX]';
            ANALYSIS.fileData.push(entry);
            if (--pending === 0) callback();
          });
        };
        reader3.readAsArrayBuffer(file);
      } else {
        var reader4 = new FileReader();
        reader4.onload = function(e) {
          entry.text = e.target.result;
          ANALYSIS.fileData.push(entry);
          if (--pending === 0) callback();
        };
        reader4.onerror = function() {
          entry.text = '[Ошибка чтения файла]';
          ANALYSIS.fileData.push(entry);
          if (--pending === 0) callback();
        };
        reader4.readAsText(file);
      }
    })(ANALYSIS.files[i]);
  }
}

/* ── Run analysis ── */

function runClientAnalysis() {
  if (ANALYSIS.busy || !ANALYSIS.files.length) return;
  ANALYSIS.busy = true;
  var btn = document.getElementById('analysisRunBtn');
  btn.textContent = '⏳ Читаю файлы...';
  btn.disabled = true;

  readAnalysisFilesAsync(function() {
    btn.textContent = '⏳ Анализирую...';
    addAnalysisMessage('user', 'Запущен анализ ' + ANALYSIS.fileData.length + ' файлов...');
    sendAnalysisToAI(null);
  });
}

function sendAnalysisToAI(userText) {
  var catSummary = typeof CATALOG !== 'undefined' ? CATALOG.map(function(c) {
    var opts = c.options.map(function(o) { return o.n + ' (' + (typeof fmt === 'function' ? fmt(o.p) : o.p) + ')'; }).join(', ');
    return c.id + ': ' + c.name + ' [' + c.cat + '] — ' + c.desc + ' | ' + opts;
  }).join('\n') : '';

  var bldTypes = typeof BUILDING_TYPES !== 'undefined' ? BUILDING_TYPES.map(function(b) {
    return b.id + ': ' + b.name + ' (' + (typeof fmtPrice === 'function' ? fmtPrice(b.price) : b.price) + ' р/м²)';
  }).join(', ') : '';

  var systemPrompt = typeof buildClientAnalysisPrompt === 'function'
    ? buildClientAnalysisPrompt({ catSummary: catSummary, bldTypes: bldTypes })
    : 'Ты AI-аналитик проектов. Извлеки структуру спортивного проекта из материалов клиента. Пиши по-русски.';

  /* Build messages array */
  var messages = [];
  /* First message: all file contents */
  var contentParts = [];
  var hasImages = false;

  for (var i = 0; i < ANALYSIS.fileData.length; i++) {
    var fd = ANALYSIS.fileData[i];
    if (fd.base64) {
      hasImages = true;
      contentParts.push({
        type: 'image',
        source: { type: 'base64', media_type: fd.mediaType, data: fd.base64 }
      });
      contentParts.push({ type: 'text', text: 'Файл: ' + fd.name });
    } else if (fd.text) {
      contentParts.push({ type: 'text', text: '=== Файл: ' + fd.name + ' ===\n' + fd.text });
    }
  }

  if (userText) {
    contentParts.push({ type: 'text', text: userText });
  } else {
    contentParts.push({ type: 'text', text: 'Проанализируй все загруженные материалы. Извлеки структуру проекта, определи что установлено точно, что предположительно, что требует уточнения.' });
  }

  /* Add initial file message */
  messages.push({ role: 'user', content: contentParts });

  /* Add conversation history (skip first system greeting) */
  for (var j = 0; j < ANALYSIS.messages.length; j++) {
    var m = ANALYSIS.messages[j];
    if (m.role === 'user' || m.role === 'bot') {
      messages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
      });
    }
  }

  /* If follow-up user text, add it */
  if (userText && ANALYSIS.messages.length > 0) {
    messages.push({ role: 'user', content: userText });
  }

  var key = typeof getClaudeKey === 'function' ? getClaudeKey() : null;
  if (!key) {
    addAnalysisMessage('bot', '⚠️ API-ключ Claude не настроен. Перейдите в ⚙ Цены → API ключ.');
    ANALYSIS.busy = false;
    resetAnalysisBtn();
    return;
  }

  showAnalysisTyping();

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: messages
    })
  }).then(function(r) { return r.json(); }).then(function(data) {
    hideAnalysisTyping();
    var text = data.content && data.content[0] && data.content[0].text || 'Ошибка ответа AI';

    /* Check for APPLY block */
    var applyMatch = text.match(/===APPLY===\s*([\s\S]*?)\s*===END===/);
    if (applyMatch) {
      try {
        ANALYSIS.lastApplyData = JSON.parse(applyMatch[1]);
        document.getElementById('analysisApplyBtn').style.display = 'block';
      } catch (e) {
        /* ignore parse error */
      }
    }

    /* Show clean text */
    var cleanText = text
      .replace(/===APPLY===[\s\S]*?===END===/g, '')
      .replace(/===LAYOUT===[\s\S]*?===END===/g, '')
      .replace(/===RENDER===[\s\S]*?===END===/g, '')
      .trim();

    addAnalysisMessage('bot', cleanText);
    renderAnalysisResults(cleanText);

    ANALYSIS.busy = false;
    resetAnalysisBtn();
  }).catch(function(err) {
    hideAnalysisTyping();
    addAnalysisMessage('bot', '⚠️ Ошибка связи с AI: ' + err.message);
    ANALYSIS.busy = false;
    resetAnalysisBtn();
  });
}

function resetAnalysisBtn() {
  var btn = document.getElementById('analysisRunBtn');
  if (btn) {
    btn.textContent = '🔍 Анализировать материалы';
    btn.disabled = false;
  }
}

/* ── Chat ── */

function addAnalysisMessage(role, text) {
  ANALYSIS.messages.push({ role: role, text: text });
  var area = document.getElementById('analysisChatArea');
  if (!area) return;
  var div = document.createElement('div');
  div.className = 'aiMsg ' + role;
  var isUser = role === 'user';
  div.style.cssText = 'max-width:85%;padding:10px 14px;border-radius:12px;font-size:12px;line-height:1.5;' +
    (isUser
      ? 'background:var(--purple);color:#fff;align-self:flex-end;border-bottom-right-radius:4px;'
      : 'background:var(--bg3);color:var(--tx);align-self:flex-start;border-bottom-left-radius:4px;');
  div.innerHTML = text.replace(/\n/g, '<br>');
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function showAnalysisTyping() {
  var area = document.getElementById('analysisChatArea');
  if (!area) return;
  var el = document.createElement('div');
  el.id = 'analysisTypingEl';
  el.style.cssText = 'align-self:flex-start;padding:10px 14px;background:var(--bg3);border-radius:12px;font-size:12px;color:var(--tx3);';
  el.textContent = 'Анализирую...';
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

function hideAnalysisTyping() {
  var el = document.getElementById('analysisTypingEl');
  if (el) el.remove();
}

function sendAnalysisMessage() {
  var input = document.getElementById('analysisChatInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text || ANALYSIS.busy) return;
  input.value = '';
  addAnalysisMessage('user', text);
  ANALYSIS.busy = true;
  sendAnalysisToAI(text);
}

/* ── Results rendering ── */

function renderAnalysisResults(text) {
  var el = document.getElementById('analysisResults');
  if (!el) return;

  /* Parse sections from AI response */
  var sections = [];
  var lines = text.split('\n');
  var current = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.match(/^#+\s/) || line.match(/^\d+\.\s+[А-ЯA-Z]/) || line.match(/^[А-ЯA-Z][А-ЯA-Z\s]{4,}/)) {
      if (current) sections.push(current);
      current = { title: line.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, ''), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      if (!current) current = { title: 'Результат анализа', lines: [] };
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  var html = '';
  for (var s = 0; s < sections.length; s++) {
    var sec = sections[s];
    var color = 'var(--tx2)';
    if (sec.title.match(/точно|установлено/i)) color = 'var(--green,#4ade80)';
    else if (sec.title.match(/предположительно|вероятно/i)) color = 'var(--gold2,#f59e0b)';
    else if (sec.title.match(/уточн|вопрос/i)) color = 'var(--red,#f87171)';
    else if (sec.title.match(/резюме|структура/i)) color = 'var(--cyan)';

    html += '<div style="margin-bottom:12px;padding:12px;background:var(--bg2);border-radius:8px;border-left:3px solid ' + color + ';">';
    html += '<div style="font-size:12px;font-weight:600;color:' + color + ';margin-bottom:6px;">' + sec.title + '</div>';
    html += '<div style="font-size:11px;color:var(--tx2);line-height:1.6;white-space:pre-wrap;">' + sec.lines.join('\n') + '</div>';
    html += '</div>';
  }

  if (!html) {
    html = '<div style="padding:12px;background:var(--bg2);border-radius:8px;font-size:11px;color:var(--tx2);line-height:1.6;white-space:pre-wrap;">' + text + '</div>';
  }

  el.innerHTML = html;
}

/* ── Apply to calculator ── */

function applyAnalysisToCalc() {
  if (!ANALYSIS.lastApplyData) {
    addAnalysisMessage('bot', 'Нет данных для переноса. Сначала выполните анализ.');
    return;
  }

  if (typeof applyAIConfig === 'function') {
    applyAIConfig(ANALYSIS.lastApplyData);
    addAnalysisMessage('bot', '✅ Данные перенесены в калькулятор! Переключаюсь...');

    /* Switch to calculator tab */
    setTimeout(function() {
      var tabs = document.querySelectorAll('.mTab');
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].textContent.indexOf('Калькулятор') !== -1) {
          switchModule('calc', tabs[i]);
          break;
        }
      }
    }, 500);
  } else {
    addAnalysisMessage('bot', '⚠️ Функция переноса недоступна.');
  }
}
