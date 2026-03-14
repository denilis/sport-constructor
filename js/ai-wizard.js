// ═══════════════════════════════════════════════════════
// AI WIZARD — Помощник по сборке комплектации
// ═══════════════════════════════════════════════════════
const AIW = { messages:[], busy:false };

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
  addAIMessage('user', text);
  AIW.busy = true;
  document.getElementById('aiWizSend').disabled = true;
  showAITyping();

  // Build catalog summary for AI
  const catSummary = CATALOG.map(it=>{
    const opts = it.options.map(o=>`${o.n} (${fmt(o.p)})`).join(', ');
    return `${it.id}: ${it.name} [${it.cat}] — ${it.desc} | Варианты: ${opts} | Ед: ${it.unit}`;
  }).join('\n');

  // Build conversation history
  const convHistory = AIW.messages.filter(m=>m.role==='user'||m.role==='bot').map(m=>({
    role: m.role==='user'?'user':'assistant',
    content: m.text
  }));

  const pw=parseFloat(document.getElementById('plotW').value)||100;
  const pl=parseFloat(document.getElementById('plotL').value)||50;

  const systemPrompt = `Ты НейроМозг — интеллектуальный помощник Sport Constructor Pro, конфигуратора спортивных объектов.

КАТАЛОГ ОБЪЕКТОВ:
${catSummary}

УЧАСТОК: ${pw}×${pl}м (${pw*pl} м²)

ТВОЯ ЗАДАЧА:
1. Понять что хочет пользователь (какие объекты, сколько, какого уровня)
2. Подобрать оптимальную комплектацию из каталога
3. Если пользователь не уточняет уровень — выбирай средний по цене вариант
4. Добавляй необходимую инфраструктуру (раздевалки, санузлы, рецепция) если пользователь о ней не говорит
5. Когда комплектация собрана — выведи JSON-команду для применения
6. После применения — если пользователь просит разместить, расставь объекты на участке

РАЗМЕРЫ ОБЪЕКТОВ ИЗ КАТАЛОГА (для расчёта зданий):
${CATALOG.filter(i=>i.areaW>0&&i.areaL>0).map(i=>`- ${i.name}: ${i.areaW}×${i.areaL}м (${i.areaW*i.areaL} м²)`).join('\n')}

РАСЧЁТ РАЗМЕРОВ АНГАРА/ЗДАНИЯ:
Когда размещаешь крытый объект (ангар/зал), его размеры w и h ДОЛЖНЫ вмещать всё содержимое:
- Суммируй площадь всех объектов внутри (кол-во × areaW × areaL)
- Добавь 30% на проходы, коридоры, технические зоны
- Рассчитай оптимальную раскладку: сколько объектов в ряд по ширине, сколько рядов
- Пример: 6 падел-кортов (10×20м) = 6×200=1200м² + 30% = 1560м². Раскладка: 3 в ряд → ширина 3×10+проходы(4м×4)=46м, 2 ряда → глубина 2×20+проходы(4м×3)=52м. Итого ангар: 46×52м
- Пример: 2 теннисных корта (36×18м) = 2×648=1296м². Раскладка: 2 рядом → ширина 2×18+проходы=40м, глубина 36+проходы=40м. Итого ангар: 40×40м
- НИКОГДА не ставь размер ангара меньше суммы содержимого
- В LAYOUT блоке для ангара используй рассчитанные размеры w и h

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

Для КОМПЛЕКТАЦИИ — блок:
===APPLY===
{"items":[{"id":"padel_std","optIdx":0,"qty":4},{"id":"reception","optIdx":0,"qty":50}]}
===END===

Для РАЗМЕЩЕНИЯ НА УЧАСТКЕ — блок (координаты в метрах, x от 0 до ${pw}, y от 0 до ${pl}):
===LAYOUT===
{"buildings":[{"label":"Падел-корт","w":10,"h":20,"x":15,"y":25,"zone":"sport"},{"label":"Ресторан","w":40,"h":20,"x":60,"y":30,"zone":"gastro"}]}
===END===

Для ПРОМПТА ВИЗУАЛИЗАЦИИ — блок:
===RENDER===
{detailed architectural prompt in English for aerial 3D render of the complex}
===END===

Можно выводить несколько блоков в одном ответе (APPLY + LAYOUT + RENDER).
Отвечай кратко, по-русски. Задавай уточняющие вопросы если чего-то не хватает.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':CLAUDE_API_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1500,system:systemPrompt,messages:convHistory})
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
  if(!cmd.items) return;
  let applied = 0;
  cmd.items.forEach(ci=>{
    const item = CATALOG.find(i=>i.id===ci.id);
    if(!item) return;
    const oi = ci.optIdx || 0;
    if(oi >= item.options.length) return;
    const s = APP.calcState[ci.id];
    s.opts[oi] = ci.qty || 1;
    applied++;
  });
  // Re-render
  renderAllGrids();
  recalc();
  updateCalcBadge();
  // Switch to calc tab
  document.querySelectorAll('.mTab')[0].click();
  addAIMessage('system',`✅ Применено: ${applied} объектов добавлено в калькулятор`);
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
}

function applyAIRender(promptText){
  // Put the prompt into render tab
  const pTop = document.getElementById('pTop');
  const pNW = document.getElementById('pNW');
  if(pTop) pTop.value = promptText;
  if(pNW) pNW.value = promptText.replace('aerial top-down','45 degree perspective aerial');
  addAIMessage('system',`🎨 Промпт визуализации создан → вкладка "Рендер / Промпты"`);
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
