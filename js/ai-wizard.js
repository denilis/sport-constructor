// ═══════════════════════════════════════════════════════
// AI WIZARD — Помощник по сборке комплектации
// ═══════════════════════════════════════════════════════
const AIW = { messages:[], busy:false, pendingImages:[] };

// ═══════════════════════════════════════════════════════
// AI PROMPT MODES
// ═══════════════════════════════════════════════════════

function buildNeuroConfigPrompt(ctx) {
  return `Ты НейроМозг — интеллектуальный конфигуратор Sport Constructor Pro.

ТВОЯ РОЛЬ
Ты помогаешь пользователю собрать реалистичную структуру спортивного проекта для последующего расчета, планировки, визуализации и финмодели.

ТЫ НЕ РАБОТАЕШЬ КАК ПРОСТОЙ ЧАТ-БОТ
Ты должен:
- понять проектную задачу,
- уточнить критически важные параметры,
- определить правильные сущности,
- разложить их по контейнерной модели,
- автоматически добавить обязательные связанные блоки,
- сформировать структуру, пригодную для калькулятора.

КОНТЕЙНЕРНАЯ МОДЕЛЬ
Используй строго такую иерархию:
- участок,
- строения,
- этажи,
- помещения,
- объекты / функциональные элементы / оборудование.

ИСКЛЮЧЕНИЯ
- Крупные спортивные объекты могут размещаться сразу внутри строения без промежуточной комнаты.
- Уличные объекты могут размещаться прямо на участке.
- Внутренние сервисные элементы могут находиться внутри помещения.

ДОСТУПНЫЕ ТИПЫ ЗДАНИЙ
${ctx.bldTypes}

ПОМЕЩЕНИЯ АБК И ТИПОВЫЕ НОРМЫ
Используй ROOM_CATALOG и ABK_NORMS как базу для расчета сервисных помещений и АБК.

КАТАЛОГ ОБЪЕКТОВ
${ctx.catSummary}

УЧАСТОК ${ctx.pw}×${ctx.pl} м (${ctx.pw*ctx.pl} м²)

РАЗМЕРЫ ОБЪЕКТОВ ИЗ КАТАЛОГА:
${ctx.catalogSizes}

ОБЩАЯ ЛОГИКА РАБОТЫ
1. Определи, что хочет пользователь построить.
2. Пойми, какие сущности являются строениями, помещениями, крупными объектами внутри строений, уличными объектами, содержимым помещений.
3. Задай только критически важные вопросы, если без них нельзя собрать реалистичную структуру.
4. Если данных достаточно — сразу собирай проект.
5. Не растягивай диалог ради формальности.

ЧТО НУЖНО УТОЧНЯТЬ
- крытое или открытое исполнение;
- тип покрытия / спортивной поверхности;
- уровень проекта: эконом / стандарт / премиум;
- тип строения для крытых зон;
- нужен ли отдельный или встроенный АБК;
- этажность, если это капитальное здание или АБК;
- сезонность и режим работы, если это влияет на состав;
- зрительская функция, если она влияет на состав помещений.

ПРАВИЛА ПО СБОРКЕ ПРОЕКТА
- Не считай, что любой объект — это отдельное здание.
- Не считай, что любой объект обязан иметь комнату.
- Не считай, что любой объект можно поставить прямо на участок.
- Для крытых функций подбирай соответствующее строение.
- Для сервисных функций создавай помещения.
- Для внутреннего наполнения создавай объекты внутри помещений.
- Для уличных функций размещай их прямо на участке.

ПРАВИЛА ПО АБК
- Используй ROOM_CATALOG и ABK_NORMS, а не "на глаз".
- Если проект требует сервисного блока, формируй: холл, рецепцию, раздевалки, душевые, санузлы, тренерские, при необходимости кафе, медкабинет, склад, техпомещения, офис.
- Не раздувай АБК без причины.
- Если данных по потоку не хватает, используй осторожные допущения и явно отмечай их.

СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ ЛЕДОВОЙ АРЕНЫ
Если выбран ледовый объект:
- уточни сценарий: хоккей / массовое катание / тренировочная / универсальная;
- не собирай лед как "пустой каток";
- для хоккейного сценария считай обязательными: ледовую арену, бросковую зону, минимум 2 зала ОФП, небольшой тренажерный зал;
- дополнительно учитывай: 4 раздевалки, 2 комнаты тренеров, судейскую, сушильные, медпункт, хранение, техпомещения, зрительский блок и общественные зоны, если арена не purely тренировочная.

ПРАВИЛА ПО РАСЧЕТУ ГАБАРИТОВ СТРОЕНИЙ
- Используй размеры объектов из каталога.
- Крупные спортивные функции должны реально помещаться в строение.
- Добавляй резерв на проходы, сервис, отступы и техзоны.
- Ангары — обычно однообъемные.
- АБК и капитальные здания могут иметь этажи.
- Встроенный АБК внутри ангара допустим, если это рационально.

ПРАВИЛА ПО РАЗМЕЩЕНИЮ НА УЧАСТКЕ
- Входная группа, рецепция, АБК и парковка — ближе к входу/въезду.
- Крупные спортивные строения — в логичных связках.
- Тихие функции — подальше от шумных.
- Не ставь строения вплотную друг к другу и к границе.
- Не пересекай объекты.
- Не выходи за пределы участка.

ПРАВИЛА ПО ВИЗУАЛИЗАЦИИ
Если формируешь ===RENDER===:
- промт должен опираться только на фактическую структуру проекта;
- не добавляй в визуализацию сущности, которых нет в проекте;
- если проект привязан к реальной местности, не допускай перестройки мастер-плана.

ФОРМАТ ОТВЕТА

Если данных недостаточно:
- задай краткие вопросы по-русски;
- не возвращай APPLY, пока не собраны критические параметры.

Если данных достаточно:
===APPLY===
{"items":[{"id":"item_id","optIdx":0,"qty":4}],"hangars":[{"type":"lstk","w":46,"h":52,"label":"Ангар","layout":[{"itemId":"item_id","x":3,"y":3,"w":10,"h":20,"angle":0}]}]}
===END===

===LAYOUT===
{"buildings":[{"label":"Здание","w":46,"h":52,"x":15,"y":25,"zone":"sport"}]}
===END===

===RENDER===
{architectural render prompt in English}
===END===

Пиши кратко, по-русски. Когда возвращаешь блоки, не добавляй лишний текст между ними.`;
}

function buildClientAnalysisPrompt(ctx) {
  return `Ты — AI-модуль «Анализ проекта клиента» внутри Sport Constructor Pro.

ТВОЯ РОЛЬ
Ты не фантазируешь проект с нуля, а извлекаешь структуру проекта из материалов клиента: фотографий, рендеров, планировок, схем, PDF, ТЗ, бизнес-планов, таблиц, описательных документов.

ТВОЯ ГЛАВНАЯ ЗАДАЧА
Преобразовать неструктурированные материалы клиента в структурированную модель проекта для расчета CAPEX.

КОНТЕЙНЕРНАЯ МОДЕЛЬ ПРОЕКТА
1. Участок / площадка
2. Строения
3. Этажи
4. Помещения
5. Объекты / функциональные элементы / оборудование

ВАЖНО
- Крупные спортивные функции могут размещаться прямо в строении (ледовая арена, футбольный манеж, батутный центр, крытые падел-корты, теннисные корты).
- Некоторые объекты располагаются прямо на участке (открытые поля, открытые корты, парковка, благоустройство, открытый бассейн).
- Некоторые объекты находятся внутри помещения (рецепция в холле, шкафчики в раздевалке, душевые, санузлы, мебель, тренажеры).

ИСТОЧНИКИ ИСТИНЫ
1. Текстовые указания, размеры, площади и состав помещений — приоритет.
2. Планировки и схемы приоритетнее визуальных рендеров.
3. Только фото / рендеры — допускаются только осторожные вероятностные выводы.
4. Не выдавай предположение за точный факт.

ОБЯЗАТЕЛЬНО РАЗДЕЛЯЙ РЕЗУЛЬТАТ НА 3 УРОВНЯ УВЕРЕННОСТИ
- Точно установлено
- Вероятно / предположительно
- Требует уточнения

ЛОГИКА АНАЛИЗА
Шаг 1. Определи тип предоставленных материалов.
Шаг 2. Извлеки: состав функций, строения, помещения, крупные спортивные объекты, инфраструктуру участка, размеры, этажность, типы конструкций, уровень проекта, стадию готовности.
Шаг 3. Собери предварительную структуру проекта.
Шаг 4. Сформируй вопросы только по критически недостающим данным.
Шаг 5. После получения ответов сформируй структурированную модель, допущения, предварительный CAPEX, машинную команду.

СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ ЛЕДА
Если в материалах есть ледовая арена: проверь наличие ледового поля, 4 раздевалок, 2 комнат тренеров, судейской, сушильных, медпункта, хранения, техпомещений, трибуны, ресторана/буфета, бросковой зоны, минимум 2 залов ОФП, тренажерного зала при хоккейной специализации. Если часть не видна — выноси в вопросы.

КАТАЛОГ ОБЪЕКТОВ
${ctx.catSummary}

ТИПЫ ЗДАНИЙ
${ctx.bldTypes}

ВАЖНЫЕ ПРАВИЛА
- Не утверждай нормативное соответствие.
- Не выдумывай точные размеры.
- Если данные конфликтуют — укажи конфликт.
- Если материала недостаточно — не делай вид, что расчет точный.

ФОРМАТ ОТВЕТА

1. КРАТКОЕ РЕЗЮМЕ
2. ЧТО УСТАНОВЛЕНО ТОЧНО
3. ЧТО ПРЕДПОЛОЖИТЕЛЬНО
4. ЧТО НУЖНО УТОЧНИТЬ
5. ПРЕДВАРИТЕЛЬНАЯ СТРУКТУРА ПРОЕКТА
6. ДОПУЩЕНИЯ ДЛЯ РАСЧЕТА
7. ПРЕДВАРИТЕЛЬНАЯ ОЦЕНКА НАДЕЖНОСТИ (высокая / средняя / низкая)
8. ЕСЛИ ДАННЫХ ДОСТАТОЧНО:
===APPLY===
{"items":[...],"hangars":[...]}
===END===

Пиши по-русски. Стиль: деловой, точный, без воды.`;
}

function buildImageAnalysisPrompt(ctx) {
  return `Ты анализируешь изображение или набор изображений для Sport Constructor Pro.

ТВОЯ ЗАДАЧА
Определить, какие проектные сущности можно извлечь из изображения, а какие нельзя определить надежно.

ОПРЕДЕЛЯЙ СЛЕДУЮЩЕЕ
1. Видно ли: участок, строение, помещение, крупный спортивный объект, сервисную зону, уличную инфраструктуру.
2. Какие функции можно уверенно распознать: ледовая арена, падел, теннис, футбол, батуты, бассейн, wellness/spa, reception, locker rooms, café, parking, landscaping и т.д.
3. Какие признаки можно извлечь: крытое/открытое, примерный тип конструкции, примерная вместимость/масштаб, стадия готовности, наличие сервисных помещений, наличие зрительской функции.

ВАЖНЫЕ ПРАВИЛА
- Не выдумывай точные размеры, если их нельзя надежно оценить.
- Не выдумывай помещения, которых не видно.
- Обязательно разделяй: точно видно, вероятно, не определяется.
- Если ледовая функция распознана, отдельно проверь наличие признаков: раздевалок, тренерских, зрительской зоны, бросковой зоны, тренировочных залов, техблока.

КАТАЛОГ ОБЪЕКТОВ
${ctx.catSummary}

ТИПЫ ЗДАНИЙ
${ctx.bldTypes}

ФОРМАТ ОТВЕТА
1. Что видно точно
2. Что определяется вероятно
3. Что не определяется по изображению
4. Какие вопросы нужно задать пользователю
5. Если данных достаточно — предварительная структура проекта с командой:
===APPLY===
{"items":[...],"hangars":[...]}
===END===

Пиши по-русски, кратко, точно, без художественных описаний.`;
}

function openAIWizard(){
  document.getElementById('aiWizModal').classList.add('show');
  if(!AIW.messages.length){
    addAIMessage('bot','Привет! Я НейроМозг — ваш интеллектуальный конструктор спортивных объектов.\n\nРасскажите что хотите построить — текстом или голосом 🎙️\n\nНапример:\n• «4 падел-корта панорамных и 2 теннисных корта»\n• «Глэмпинг на 20 домиков с СПА-зоной»\n• «Спортивный комплекс с футболом, баскетболом и раздевалками»\n\nЯ подберу оптимальную комплектацию и цены.');
  }
}

function closeAIWizard(){
  document.getElementById('aiWizModal').classList.remove('show');
}

function addAIMessage(role, text){
  AIW.messages.push({role, text});
  const chat = document.getElementById('aiWizChat');
  const div = document.createElement('div');
  div.className = 'aiMsg ' + role;
  div.innerHTML = text.replace(/\n/g,'<br>');
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function showAITyping(){
  const chat = document.getElementById('aiWizChat');
  const div = document.createElement('div');
  div.className = 'aiTyping';
  div.id = 'aiTypingEl';
  div.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}
function hideAITyping(){
  document.getElementById('aiTypingEl')?.remove();
}

async function sendAIMessage(){
  const input = document.getElementById('aiWizInput');
  const text = input.value.trim();
  if(!text || AIW.busy) return;
  input.value = '';

  // Capture pending images for this message
  const images = [...AIW.pendingImages];
  AIW.pendingImages = [];
  renderImagePreview();

  // Show user message with image thumbnails
  let userHtml = text;
  if(images.length){
    userHtml += '<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">' +
      images.map(img => `<img src="data:${img.mediaType};base64,${img.data}" style="height:50px;border-radius:4px;border:1px solid rgba(255,255,255,.15)">`).join('') +
      '</div>';
  }
  addAIMessage('user', userHtml);

  // Store images in last message for conversation context
  AIW.messages[AIW.messages.length-1]._images = images;

  AIW.busy = true;
  document.getElementById('aiWizSend').disabled = true;
  showAITyping();

  // Build catalog summary for AI
  const catSummary = CATALOG.map(it=>{
    const opts = it.options.map(o=>`${o.n} (${fmt(o.p)})`).join(', ');
    return `${it.id}: ${it.name} [${it.cat}] — ${it.desc} | Варианты: ${opts} | Ед: ${it.unit}`;
  }).join('\n');

  // Build conversation history (with vision support)
  const convHistory = AIW.messages.filter(m=>m.role==='user'||m.role==='bot').map(m=>{
    const role = m.role==='user'?'user':'assistant';
    // Check if this message has images
    if(m._images && m._images.length){
      const content = [];
      m._images.forEach(img => {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.data }
        });
      });
      // Extract plain text (strip HTML image tags)
      const plainText = m.text.replace(/<div[\s\S]*?<\/div>/g,'').trim();
      if(plainText) content.push({ type: 'text', text: plainText });
      return { role, content };
    }
    // Strip any HTML from text for API
    const cleanText = m.text.replace(/<[^>]+>/g,'').trim();
    return { role, content: cleanText || '...' };
  });

  const pw=parseFloat(document.getElementById('plotW').value)||100;
  const pl=parseFloat(document.getElementById('plotL').value)||50;

  const bldTypes = typeof BUILDING_TYPES!=='undefined' ? BUILDING_TYPES.map(b=>`${b.id}: ${b.name} (${fmtPrice(b.price)} ₽/м²)`).join(', ') : '';

  // Build context for prompts
  const promptCtx = {
    catSummary,
    bldTypes,
    pw, pl,
    catalogSizes: CATALOG.filter(i=>i.areaW>0&&i.areaL>0).map(i=>`- ${i.id}: ${i.name}: ${i.areaW}×${i.areaL}м (${i.areaW*i.areaL} м²)`).join('\n')
  };

  // Select prompt based on scenario
  const hasImages = images.length > 0;
  const hasDocKeywords = text.match(/анализ|проект клиента|разбери|ТЗ|бизнес-план|документ|смета|PDF/i);

  let systemPrompt;
  if(hasImages && !text.match(/собери|построй|хочу|нужен комплекс/i)) {
    // Photo/image analysis mode
    systemPrompt = buildImageAnalysisPrompt(promptCtx);
  } else if(hasDocKeywords && !hasImages) {
    // Client project analysis mode (documents, TZ, business plans)
    systemPrompt = buildClientAnalysisPrompt(promptCtx);
  } else {
    // Default: project configurator mode
    systemPrompt = buildNeuroConfigPrompt(promptCtx);
  }

  // Проверить API-ключ
  const apiKey = getClaudeKey();
  if(!apiKey) {
    hideAITyping();
    AIW.busy = false;
    document.getElementById('aiWizSend').disabled = false;
    addAIMessage('bot','⚠️ API-ключ Claude не настроен. Обратитесь к администратору.');
    return;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:3000,system:systemPrompt,messages:convHistory})
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || 'Ошибка ответа';

    hideAITyping();

    // Strip all command blocks and show clean reply
    let cleanReply = reply
      .replace(/===APPLY===[\s\S]*?===END===/g, '')
      .replace(/===LAYOUT===[\s\S]*?===END===/g, '')
      .replace(/===RENDER===[\s\S]*?===END===/g, '')
      .trim();
    addAIMessage('bot', cleanReply);

    // Process APPLY block
    const applyMatch = reply.match(/===APPLY===\s*([\s\S]*?)\s*===END===/);
    if(applyMatch){
      try { applyAIConfig(JSON.parse(applyMatch[1])); }
      catch(e){ addAIMessage('system','⚠️ Ошибка парсинга конфигурации'); }
    }

    // Process LAYOUT block (site plan placement)
    const layoutMatch = reply.match(/===LAYOUT===\s*([\s\S]*?)\s*===END===/);
    if(layoutMatch){
      try { applyAILayout(JSON.parse(layoutMatch[1])); }
      catch(e){ addAIMessage('system','⚠️ Ошибка парсинга размещения'); }
    }

    // Process RENDER block (visualization prompt)
    const renderMatch = reply.match(/===RENDER===\s*([\s\S]*?)\s*===END===/);
    if(renderMatch){
      applyAIRender(renderMatch[1].trim());
    }
  } catch(e){
    hideAITyping();
    addAIMessage('bot','Ошибка связи с AI: '+e.message);
  }

  AIW.busy = false;
  document.getElementById('aiWizSend').disabled = false;
  document.getElementById('aiWizInput').focus();
}

function applyAIConfig(cmd){
  let applied = 0;
  // Apply items to calculator
  if(cmd.items){
    cmd.items.forEach(ci=>{
      const item = CATALOG.find(i=>i.id===ci.id);
      if(!item) return;
      const oi = ci.optIdx || 0;
      if(oi >= item.options.length) return;
      const s = APP.calcState[ci.id];
      s.opts[oi] = ci.qty || 1;
      applied++;
    });
  }
  // Create hangars with layout
  let hangarsCreated = 0;
  if(cmd.hangars && cmd.hangars.length){
    cmd.hangars.forEach(h=>{
      const hangar = {
        id: Date.now() + Math.random(),
        type: h.type || 'lstk',
        w: h.w || 60,
        h: h.h || 40,
        items: {},
        layout: [],
        wallOffset: 3,
        objectGap: 2
      };
      // Place objects inside hangar
      if(h.layout && h.layout.length){
        h.layout.forEach(li=>{
          const catItem = CATALOG.find(i=>i.id===li.itemId);
          if(!catItem) return;
          hangar.layout.push({
            itemId: li.itemId,
            x: li.x || 3,
            y: li.y || 3,
            w: li.w || catItem.areaW || 10,
            h: li.h || catItem.areaL || 10,
            angle: li.angle || 0
          });
          // Count in items
          if(!hangar.items[li.itemId]) hangar.items[li.itemId] = {count:0};
          hangar.items[li.itemId].count++;
          // Also count in calcState for pricing
          const s = APP.calcState[li.itemId];
          if(s){
            const oi = li.optIdx || 0;
            s.opts[oi] = (s.opts[oi]||0) + 1;
          }
        });
      }
      APP.hangars.push(hangar);
      hangarsCreated++;
    });
  }
  // Re-render
  renderAllGrids();
  recalc();
  updateCalcBadge();
  if(hangarsCreated > 0){
    renderHangars();
    calcABK();
  }
  // Switch to calc tab
  document.querySelectorAll('.mTab')[0].click();
  let msg = `✅ Применено: ${applied} объектов добавлено в калькулятор`;
  if(hangarsCreated > 0) msg += `\n🏗️ Создано ангаров: ${hangarsCreated} (с размещением объектов внутри)`;
  addAIMessage('system', msg);
  showGoProjectBtn(hangarsCreated > 0 ? 'building' : null);
}

function applyAILayout(cmd){
  if(!cmd.buildings || !cmd.buildings.length) return;
  // Ensure we have scale — set default if not set
  if(!APP.planScale) APP.planScale = 15; // 15 px per meter default
  // Clear existing buildings
  APP.planBuildings = [];
  const zoneMap = {sport:'sport',gastro:'gastro',glamp:'glamp',well:'well',infra:'infra',event:'event',parking:'infra'};
  let count = 0;
  cmd.buildings.forEach(b=>{
    const zone = zoneMap[b.zone] || b.zone || 'other';
    const bld = {
      id: Date.now()+Math.random(),
      label: b.label,
      w: b.w || 20,
      h: b.h || 20,
      ht: b.ht || 0,
      cx: (b.x || 0) * APP.planScale,
      cy: (b.y || 0) * APP.planScale,
      angle: (b.angle || 0) * Math.PI / 180,
      zone: zone,
      note: b.note || ''
    };
    APP.planBuildings.push(bld);
    count++;
  });
  drawPlan();
  updatePlanBadge();
  buildLibrary();
  addAIMessage('system',`📐 Размещено: ${count} объектов на плане участка`);
  showGoProjectBtn();
}

function showGoProjectBtn(targetTab){
  const btn = document.getElementById('aiWizGoProject');
  if(!btn) return;
  btn.style.display = 'inline-block';
  // Store which tab to navigate to
  if(targetTab) btn.dataset.target = targetTab;
}

function goToProject(){
  const btn = document.getElementById('aiWizGoProject');
  const target = btn?.dataset.target || null;
  closeAIWizard();
  if(target === 'building'){
    // Navigate to Buildings tab
    const tabs = document.querySelectorAll('.cTab');
    tabs.forEach(t=>{ if(t.textContent.trim()==='Здания') t.click(); });
  }
}

function applyAIRender(promptText){
  // Put the prompt into render tab
  const pTop = document.getElementById('pTop');
  const pNW = document.getElementById('pNW');
  if(pTop) pTop.value = promptText;
  if(pNW) pNW.value = promptText.replace('aerial top-down','45 degree perspective aerial');
  addAIMessage('system',`🎨 Промпт визуализации создан → вкладка "Рендер / Промпты"`);
  showGoProjectBtn();
}

/* ─── VOICE INPUT (Web Speech API) ─── */
let voiceRecog = null;
let voiceActive = false;

function toggleVoice(){
  if(voiceActive){ stopVoice(); return; }
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)){
    alert('Голосовой ввод не поддерживается в этом браузере. Используйте Chrome.');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRecog = new SR();
  voiceRecog.lang = 'ru-RU';
  voiceRecog.continuous = true;
  voiceRecog.interimResults = true;
  const input = document.getElementById('aiWizInput');
  const btn = document.getElementById('aiVoiceBtn');
  let finalText = input.value;
  voiceRecog.onstart = ()=>{
    voiceActive = true;
    btn.classList.add('recording');
    input.placeholder = 'Говорите...';
  };
  voiceRecog.onresult = (e)=>{
    let interim = '';
    for(let i = e.resultIndex; i < e.results.length; i++){
      if(e.results[i].isFinal){
        finalText += (finalText?' ':'') + e.results[i][0].transcript;
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    input.value = finalText + (interim?' '+interim:'');
  };
  voiceRecog.onerror = (e)=>{ if(e.error!=='no-speech') stopVoice(); };
  voiceRecog.onend = ()=>{
    if(voiceActive){ stopVoice(); }
  };
  voiceRecog.start();
}

function stopVoice(){
  voiceActive = false;
  const btn = document.getElementById('aiVoiceBtn');
  btn.classList.remove('recording');
  document.getElementById('aiWizInput').placeholder = 'Опишите что хотите построить...';
  if(voiceRecog){ try{voiceRecog.stop();}catch(e){} voiceRecog=null; }
}

/* ─── PHOTO UPLOAD FOR VISION ─── */
function handleAIPhotos(input){
  const files = Array.from(input.files);
  if(!files.length) return;
  files.forEach(file => {
    if(!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result; // data:image/...;base64,...
      AIW.pendingImages.push({
        data: base64.split(',')[1],
        mediaType: file.type,
        name: file.name
      });
      renderImagePreview();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
  // If input is empty, suggest text
  const textInput = document.getElementById('aiWizInput');
  if(!textInput.value.trim()){
    textInput.value = 'Проанализируй эти изображения проекта клиента. Определи какие спортивные объекты здесь есть, их количество, и собери комплектацию с расчётом стоимости.';
  }
}

function renderImagePreview(){
  const cont = document.getElementById('aiImagePreview');
  if(!AIW.pendingImages.length){
    cont.style.display = 'none';
    cont.innerHTML = '';
    return;
  }
  cont.style.display = 'flex';
  cont.innerHTML = AIW.pendingImages.map((img,i) => `
    <div style="position:relative;display:inline-block">
      <img src="data:${img.mediaType};base64,${img.data}" style="height:60px;border-radius:6px;border:1px solid rgba(155,109,255,.3)">
      <button onclick="removeAIImage(${i})" style="position:absolute;top:-6px;right:-6px;background:#f87171;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:18px;padding:0">×</button>
      <div style="font-size:9px;color:#888;text-align:center;margin-top:2px">${img.name.substring(0,15)}</div>
    </div>
  `).join('');
}

function removeAIImage(idx){
  AIW.pendingImages.splice(idx, 1);
  renderImagePreview();
}
