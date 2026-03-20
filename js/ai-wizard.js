// ═══════════════════════════════════════════════════════
// AI WIZARD — Помощник по сборке комплектации
// ═══════════════════════════════════════════════════════
const AIW = { messages:[], busy:false, pendingImages:[] };

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

  const systemPrompt = `Ты НейроМозг — интеллектуальный помощник Sport Constructor Pro, конфигуратора спортивных объектов.

КАТАЛОГ ОБЪЕКТОВ:
${catSummary}

ТИПЫ ЗДАНИЙ (для ангаров):
${bldTypes}

УЧАСТОК: ${pw}×${pl}м (${pw*pl} м²)

ТВОЯ ЗАДАЧА:
1. Понять что хочет пользователь (какие объекты, сколько, какого уровня)
2. **ОБЯЗАТЕЛЬНО задай уточняющие вопросы ПО КАЖДОМУ типу объекта**, если пользователь не указал:

   КРЫТОЕ / ОТКРЫТОЕ — спроси для КАЖДОГО объекта, где это принципиально:
   - Падел-корты: крытые (ангар) или открытые?
   - Теннисные корты: крытые или открытые? Грунт, хард, трава?
   - Футбольное поле: крытый манеж или открытое поле?
   - Ледовая арена: крытая (обязательно ангар) или открытый каток?
   - Бассейн: крытый или открытый? Спортивный (25/50м) или рекреационный?
   - Баскетбол/волейбол: крытый зал или открытая площадка?
   - Беговые дорожки: крытый манеж или открытый стадион?
   - Скалодром: крытый (обязательно ангар) или открытая стена?

   ТИП ЗДАНИЯ (если крытое):
   - Какой тип конструкции? (тент холодный, тент утеплённый, ВОК, ЛСТК, дерево, монолит)
   - Климат/регион? (холодный → ЛСТК/утеплённый тент, тёплый → холодный тент/ВОК)

   УРОВЕНЬ:
   - Уровень отделки/оборудования? (эконом, стандарт, премиум)

3. Подобрать оптимальную комплектацию из каталога
4. Если пользователь не уточняет уровень — выбирай средний по цене вариант
5. Добавляй необходимую инфраструктуру (раздевалки, санузлы, рецепция) если пользователь о ней не говорит
6. **Для КАЖДОГО крытого объекта — ОБЯЗАТЕЛЬНО создавай ангар** с правильными размерами и размещай объекты внутри. Разные типы спорта обычно в РАЗНЫХ ангарах (ледовая арена отдельно от падел-кортов)
7. Когда комплектация собрана — выведи JSON-команду для применения
8. После применения — если пользователь просит разместить, расставь объекты на участке

УТОЧНЯЮЩИЕ ВОПРОСЫ — КРИТИЧЕСКИ ВАЖНО:
- НЕ собирай комплектацию сразу при первом сообщении
- Пройдись по КАЖДОМУ упомянутому типу объекта и задай вопросы
- Группируй вопросы логично: «Вы упомянули падел-корты, теннис и бассейн. Уточню по каждому:»
- Только после получения ответов — формируй APPLY
- Если пользователь сам всё указал подробно (крытые/открытые, тип здания) — можно сразу APPLY

РАЗМЕРЫ ОБЪЕКТОВ ИЗ КАТАЛОГА (для расчёта зданий):
${CATALOG.filter(i=>i.areaW>0&&i.areaL>0).map(i=>`- ${i.id}: ${i.name}: ${i.areaW}×${i.areaL}м (${i.areaW*i.areaL} м²)`).join('\n')}

РАСЧЁТ РАЗМЕРОВ АНГАРА/ЗДАНИЯ:
Когда размещаешь крытый объект (ангар/зал), его размеры w и h ДОЛЖНЫ вмещать всё содержимое:
- Суммируй площадь всех объектов внутри (кол-во × areaW × areaL)
- Добавь 30% на проходы, коридоры, технические зоны
- Рассчитай оптимальную раскладку: сколько объектов в ряд по ширине, сколько рядов
- Определи оптимальную ориентацию каждого объекта (вдоль или поперёк) для минимизации площади ангара
- Пример: 6 падел-кортов (10×20м). Раскладка: 3 в ряд по ширине (10м) → ширина 3×10+проходы(4м×4)=46м, 2 ряда по длине (20м) → глубина 2×20+проходы(4м×3)=52м. Итого ангар: 46×52м
- Пример: 2 теннисных корта (36×18м). Раскладка: 2 рядом по ширине (18м) → ширина 2×18+проходы=40м, глубина 36+проходы=40м. Итого ангар: 40×40м
- НИКОГДА не ставь размер ангара меньше суммы содержимого

РАЗМЕЩЕНИЕ ОБЪЕКТОВ ВНУТРИ АНГАРА (layout):
- Каждый объект размещается по координатам x, y (метры от верхнего левого угла ангара)
- Отступ от стен: минимум 3м (wallOffset)
- Зазор между объектами: минимум 2м
- angle: 0 = без поворота, 1.5708 = поворот на 90° (π/2 радиан)
- При повороте на 90° ширина и высота меняются местами визуально
- Рассчитай x, y каждого объекта так, чтобы они НЕ пересекались

ПРАВИЛА ЗОНИРОВАНИЯ (при размещении на участке):
- Парковка — у входа/въезда (край участка, x близко к 0)
- Спортивные корты — ближе к парковке (зона активности, удобный подход)
- Ангары/залы — центральная часть участка
- Ресторан/кафе — между спортзоной и зоной отдыха (обслуживает оба потока)
- Глэмпинг/домики — дальняя часть участка (тишина, уединение, подальше от спорта)
- СПА/велнес — рядом с глэмпингом или зоной отдыха
- Инфраструктура (раздевалки, АБК) — при входе или примыкает к спортзоне
- Детская зона — видимость от ресторана/кафе
- Минимальные отступы: от края участка 5м, между зданиями 4-6м
- Дорожки и проходы: 3-4м между объектами

ФОРМАТ ОТВЕТА:
Сначала текстовое описание что подобрал/разместил и почему.

Для КОМПЛЕКТАЦИИ — блок (items = объекты в калькулятор, hangars = ангары с содержимым):
===APPLY===
{"items":[{"id":"padel_std","optIdx":0,"qty":4},{"id":"reception","optIdx":0,"qty":50}],"hangars":[{"type":"lstk","w":46,"h":52,"label":"Спортивный ангар","layout":[{"itemId":"padel_std","x":3,"y":3,"w":10,"h":20,"angle":0},{"itemId":"padel_std","x":15,"y":3,"w":10,"h":20,"angle":0}]}]}
===END===

Правила для hangars в APPLY:
- type: один из типов зданий (tent_cold, tent_warm, air, lstk, wood, concrete)
- w, h: размеры ангара в метрах (рассчитай по формулам выше!)
- label: название ангара для отображения
- layout: массив объектов внутри с координатами x, y (метры от угла), w, h (размер объекта из каталога areaW, areaL), angle (0 или 1.5708)
- Один ангар может содержать объекты ОДНОГО или РАЗНЫХ типов
- НЕ дублируй в items то, что уже в hangars.layout — ангарные объекты учитываются автоматически

Для РАЗМЕЩЕНИЯ НА УЧАСТКЕ — блок (координаты в метрах, x от 0 до ${pw}, y от 0 до ${pl}):
===LAYOUT===
{"buildings":[{"label":"Падел-корт","w":10,"h":20,"x":15,"y":25,"zone":"sport"},{"label":"Ресторан","w":40,"h":20,"x":60,"y":30,"zone":"gastro"}]}
===END===

Для ПРОМПТА ВИЗУАЛИЗАЦИИ — блок:
===RENDER===
{detailed architectural prompt in English for aerial 3D render of the complex}
===END===

Можно выводить несколько блоков в одном ответе (APPLY + LAYOUT + RENDER).

АНАЛИЗ ИЗОБРАЖЕНИЙ ПРОЕКТА:
Если пользователь загружает фото/рендер/план — проанализируй:
1. Определи тип здания (ангар, капитальное, тент) и примерные размеры
2. Посчитай кол-во спортивных объектов (корты, поля, дорожки, залы)
3. Определи тип каждого объекта (падел, теннис, футбол, баскетбол, лёд и т.д.)
4. Отметь наличие инфраструктуры (АБК, парковка, благоустройство, кафе)
5. Если есть кадастровая карта — извлеки размеры участка, кадастровый номер
6. Задай уточняющие вопросы по неясным деталям
7. После уточнений — сформируй APPLY с полной комплектацией и расчётом

При анализе фото будь конкретен: «Вижу здание ~60×40м с деревянным фасадом, внутри предположительно 4-5 кортов. Рядом открытая площадка (возможно теннис). Уточните:...»

Отвечай кратко, по-русски. Задавай уточняющие вопросы если чего-то не хватает.`;

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
