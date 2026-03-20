// ═══════════════════════════════════════════════════════
// PROMPTS & RENDER
// ═══════════════════════════════════════════════════════

// Reference satellite image for img2img
if(!APP.renderRefImage) APP.renderRefImage = null; // base64 data URL
if(!APP.renderRefUrl) APP.renderRefUrl = null;     // hosted URL (if uploaded)

// Translate Russian building labels to English for image generation
const LABEL_EN = {
  'Падел':'Padel Courts','Теннис':'Tennis Courts','Футбол':'Football Field','Баскетбол':'Basketball Court',
  'Волейбол':'Volleyball Court','Ледовая':'Ice Arena','Бассейн':'Swimming Pool','Хамам':'Hammam Spa',
  'Сауна':'Sauna','Баня':'Russian Bathhouse','Батут':'Trampoline Park','Скалодром':'Climbing Wall',
  'Воркаут':'Workout Zone','Беговая':'Running Track','Купол':'Geodesic Dome','А-фрейм':'A-frame Cabin',
  'Модуль':'Modular Cabin','Сафари':'Safari Tent','Кафе':'Cafe Restaurant','Рецепция':'Reception',
  'Ангар':'Sports Hangar','АБК':'Administrative Building','Раздевалка':'Locker Room','Склад':'Storage',
  'Трибун':'Grandstand','Универсальная':'Multi-sport Court','OCR':'Obstacle Course','Соляная':'Salt Room'
};
function labelToEn(label){
  if(!label) return 'Building';
  for(const [ru,en] of Object.entries(LABEL_EN)){
    if(label.includes(ru)) return en;
  }
  return label;
}

// Map building type to English material description
function bldMaterialEn(b){
  const typeMap = {
    'tent_cold':'white tensile fabric canopy','tent_warm':'insulated fabric canopy',
    'air':'air-supported dome structure','lstk':'dark grey sandwich panel hangar with metal roof',
    'wood':'warm wood-clad building with glass facades','concrete':'modern concrete and glass building'
  };
  const bt = BUILDING_TYPES.find(t=>t.id===b.type);
  return typeMap[b.type] || (bt ? bt.name : 'modern building');
}

// Get English descriptions of hangar contents
function hangarContentsEn(b){
  const hangar = APP.hangars.find(h=>h.layout?.length && (b.hangarId===h.id || b.sourceId===('hangar_'+h.id)));
  if(!hangar || !hangar.layout?.length) return [];
  const contents = [];
  const catMap = {
    'padel':'padel courts with glass walls','tennis':'tennis courts with white lines',
    'ice':'ice hockey rink','football':'football pitch with green turf','basketball':'basketball court',
    'volleyball':'volleyball court','pool':'swimming pool','trampoline':'trampolines','climb':'climbing walls'
  };
  hangar.layout.forEach(li=>{
    const it = CATALOG.find(c=>c.id===li.itemId);
    if(!it) return;
    for(const [key,desc] of Object.entries(catMap)){
      if(it.id.includes(key)){contents.push(desc); return;}
    }
    contents.push(it.name);
  });
  return [...new Set(contents)];
}

// ═══════════════════════════════════════════════════════
// REFERENCE IMAGE (satellite map)
// ═══════════════════════════════════════════════════════
function captureMapAsRef(){
  const c = document.getElementById('cv');
  if(!c || !APP.planImg){alert('Сначала загрузите карту в Планировщике');return;}
  // Render plan canvas to a temp canvas (without UI elements, just map + buildings)
  const tmp = document.createElement('canvas');
  const maxDim = 1536; // good resolution for AI
  const scale = Math.min(maxDim/APP.planImgW, maxDim/APP.planImgH, 1);
  tmp.width = Math.round(APP.planImgW * scale);
  tmp.height = Math.round(APP.planImgH * scale);
  const tctx = tmp.getContext('2d');
  tctx.drawImage(APP.planImg, 0, 0, tmp.width, tmp.height);
  // Draw buildings as semi-transparent colored rectangles with labels
  APP.planBuildings.forEach(b=>{
    const bx = b.cx * scale, by = b.cy * scale;
    const bw = b.w * (APP.planScale||1) * scale, bh = b.h * (APP.planScale||1) * scale;
    tctx.save();
    tctx.translate(bx, by);
    tctx.rotate(b.angle||0);
    tctx.fillStyle = 'rgba(59,130,246,0.35)';
    tctx.strokeStyle = '#3b82f6';
    tctx.lineWidth = 2;
    tctx.fillRect(-bw/2, -bh/2, bw, bh);
    tctx.strokeRect(-bw/2, -bh/2, bw, bh);
    // Label
    tctx.fillStyle = '#fff';
    tctx.font = `bold ${Math.max(10, Math.round(14*scale))}px Arial`;
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.fillText(labelToEn(b.label), 0, 0);
    tctx.restore();
  });
  APP.renderRefImage = tmp.toDataURL('image/jpeg', 0.85);
  APP.renderRefUrl = null;
  updateRefPreview();
}

function uploadRefImage(inp){
  const f = inp.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = e => {
    const img = new Image();
    img.onload = () => {
      // Resize to max 1536px for API
      const maxDim = 1536;
      const scale = Math.min(maxDim/img.width, maxDim/img.height, 1);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width*scale);
      c.height = Math.round(img.height*scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      APP.renderRefImage = c.toDataURL('image/jpeg', 0.85);
      APP.renderRefUrl = null;
      updateRefPreview();
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(f);
}

function clearRefImage(){
  APP.renderRefImage = null;
  APP.renderRefUrl = null;
  updateRefPreview();
}

function updateRefPreview(){
  const wrap = document.getElementById('refPreview');
  if(!wrap) return;
  if(APP.renderRefImage){
    wrap.innerHTML = `<img src="${APP.renderRefImage}" style="max-height:120px;border-radius:6px;border:1px solid var(--bd);">
      <button class="pBtn" onclick="clearRefImage()" style="margin-left:8px;color:var(--red);border-color:var(--red);">Убрать</button>
      <span style="color:var(--green);font-size:11px;margin-left:8px;">Reference загружен</span>`;
  } else {
    wrap.innerHTML = `<span style="color:var(--tx4);font-size:11px;">Нет reference-изображения. Генерация будет без привязки к местности.</span>`;
  }
}

// ═══════════════════════════════════════════════════════
// PROMPT GENERATION
// ═══════════════════════════════════════════════════════
function genPrompts(){
  const bs=APP.planBuildings;
  if(!bs.length){
    ['pTop','pNW','pSE','promptOut'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.value='Нет объектов на плане.';
    });
    return;
  }

  const hasRef = !!APP.renderRefImage;

  // Landscape options
  const lndKeepTrees = document.getElementById('lndKeepTrees')?.checked ?? true;
  const lndDesign = document.getElementById('lndDesign')?.checked ?? true;
  const lndWater = document.getElementById('lndWater')?.checked ?? false;
  const lndLighting = document.getElementById('lndLighting')?.checked ?? true;

  let envDesc = '';
  if(hasRef){
    envDesc = 'Preserve the existing terrain, roads, trees, and surroundings from the reference photo.';
    if(lndDesign) envDesc += ' Add manicured lawns, decorative hedges, and paved walkways between buildings.';
    if(lndWater) envDesc += ' Add decorative water features.';
    if(lndLighting) envDesc += ' Add elegant park lighting along paths.';
  } else {
    envDesc = 'Green site surrounded by forest, paved parking lots with cars.';
    if(lndDesign) envDesc += ' Manicured lawns, decorative hedges, paved walkways between buildings.';
    if(lndWater) envDesc += ' Decorative fountains and small ponds.';
    if(lndLighting) envDesc += ' Elegant park lighting along paths.';
    if(lndKeepTrees) envDesc += ' Preserved mature trees around the complex.';
  }

  const STYLE = 'Photorealistic drone aerial photography, summer daytime, bright sunlight, soft shadows. Ultra-detailed textures. High-end sports resort aesthetic. 8K architectural visualization.';

  // Build concise building list in English
  function bldList(withContents){
    const lines = [];
    bs.forEach((b,i)=>{
      const name = labelToEn(b.label);
      const mat = bldMaterialEn(b);
      const dims = `${b.w}x${b.h}m`;
      const ht = b.ht ? `, ${b.ht}m tall` : '';
      let line = `${i+1}. ${name} — ${mat} (${dims}${ht})`;
      if(withContents){
        const contents = hangarContentsEn(b);
        if(contents.length) line += ' containing ' + contents.join(', ');
      }
      lines.push(line);
    });
    return lines.join('\n');
  }

  // Build relative position description for reference mode
  function bldPositions(){
    if(!APP.planScale) return '';
    const lines = [];
    bs.forEach((b,i)=>{
      const xm = Math.round(b.cx/APP.planScale);
      const ym = Math.round(b.cy/APP.planScale);
      lines.push(`${labelToEn(b.label)}: ${xm}m from left, ${ym}m from top`);
    });
    return '\nApproximate positions on site:\n' + lines.join('\n');
  }

  let topPrompt, nwPrompt, sePrompt;

  if(hasRef){
    // ═══ REFERENCE MODE — prompts for img2img with satellite photo ═══

    // VARIANT: Top view with reference
    topPrompt = `Transform this satellite/aerial photograph into a photorealistic architectural visualization. Replace the colored rectangular markers with realistic 3D buildings as described below. Keep the exact camera angle and all surrounding terrain from the original photo.

Buildings to place (where the blue rectangles are marked):
${bldList(false)}

${envDesc}

Each building must match its described material and dimensions. Shadows must be consistent with the sun direction visible in the original photo. ${STYLE}`;

    // VARIANT: Perspective with reference
    nwPrompt = `Using this aerial site photograph as the real environment, generate a photorealistic 45-degree perspective view of the sports complex being built on this exact location. The buildings should appear as if actually constructed on this terrain.

Buildings on site:
${bldList(true)}
${bldPositions()}

Match the lighting direction and season from the reference photo. Buildings should cast realistic shadows on the actual terrain. Dense landscaping between structures, walking paths with people.

${STYLE}`;

    // VARIANT: Cutaway with reference
    sePrompt = `Based on this satellite photo of the development site, create an architectural cutaway visualization at 60 degrees. Show the buildings placed on the real terrain with partially transparent roofs revealing interior layouts.

Buildings with visible interiors:
${bldList(true)}

Inside sport buildings: visible court markings, playing surfaces, equipment. Padel courts with glass walls. Tennis courts with white lines. The surrounding terrain and roads from the reference photo must remain visible and accurate.

Architectural magazine quality, clean daylight, section-cut walls. ${STYLE}`;

  } else {
    // ═══ ABSTRACT MODE — no reference image ═══

    topPrompt = `Aerial top-down view at 70 degrees of a premium sports and recreation complex with ${bs.length} buildings.

Buildings:
${bldList(false)}

Materials: Sport hangars have dark grey metal sandwich panel walls and roofs. Wellness and hospitality buildings have warm wood cladding with large glass windows. Each building has a clean white label sign on the roof.

Environment: ${envDesc}

${STYLE}`;

    nwPrompt = `Aerial perspective view at 45 degrees of a premium sports complex, golden hour lighting, long dramatic shadows.

${bs.length} buildings visible from foreground to background:
${bldList(true)}

Each building shows its unique architectural style: sport hangars with grey metal panels, wellness buildings with wood and glass. Dense green landscaping between buildings, walking paths, outdoor seating areas with umbrellas.

${STYLE}`;

    sePrompt = `Architectural cutaway axonometric view at 60 degrees of a sports complex. Roofs are partially transparent or removed, revealing interior layouts from above.

Buildings with visible interiors:
${bldList(true)}

Inside each sport building: visible court markings, playing surfaces, equipment. Padel courts show glass walls and artificial turf. Tennis courts show white line markings. Ice arenas show rink with boards. Football fields show green turf with white markings.

Walls shown in architectural section. Clean bright daylight. Exterior landscaping visible. Architectural magazine quality illustration.

${STYLE}`;
  }

  // Set outputs
  ['pTop','promptOut'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=topPrompt;});
  const pNW=document.getElementById('pNW');if(pNW)pNW.value=nwPrompt;
  const pSE=document.getElementById('pSE');if(pSE)pSE.value=sePrompt;

  // Update reference indicator in UI
  const refTag = document.getElementById('refModeTag');
  if(refTag) refTag.style.display = hasRef ? 'inline' : 'none';
}

function copyPrompt(){
  const el=document.getElementById('promptOut');
  if(!el)return;
  navigator.clipboard.writeText(el.value).catch(()=>{el.select();document.execCommand('copy');});
}
function copyEl(id){
  const el=document.getElementById(id);
  if(!el)return;
  navigator.clipboard.writeText(el.value).catch(()=>{el.select();document.execCommand('copy');});
}

// ═══════════════════════════════════════════════════════
// NANO BANANA IMAGE GENERATION (kie.ai)
// ═══════════════════════════════════════════════════════
const PROMPT_MAP = {pTop:'Top', pNW:'NW', pSE:'SE'};

async function generateImage(promptId){
  const promptEl = document.getElementById(promptId);
  if(!promptEl || !promptEl.value.trim()){alert('Сначала сгенерируйте промпт (обновите данные)');return;}
  if(!KIE_API_KEY){alert('API-ключ NanoBanana (kie.ai) не задан.\nДобавьте KIE_API_KEY в js/keys.js');return;}

  const suffix = PROMPT_MAP[promptId];
  const statusEl = document.getElementById('status'+suffix);
  const galleryEl = document.getElementById('gallery'+suffix);
  const resEl = document.getElementById('res'+suffix);
  const arEl = document.getElementById('ar'+suffix);
  const resolution = resEl ? resEl.value : '1K';
  const aspect = arEl ? arEl.value : '16:9';

  // Check for reference image
  const useRef = document.getElementById('refEnabled')?.checked && APP.renderRefImage;

  // Show status
  statusEl.style.display='flex';
  statusEl.innerHTML='<div class="spinner"></div><span>Отправка запроса на генерацию…</span>';

  try {
    let imageUrl = null;

    if(useRef){
      // img2img mode: try GPT-Image-1 (4o) which supports image editing via filesUrl
      statusEl.innerHTML='<div class="spinner"></div><span>Загрузка reference + генерация (img2img)…</span>';
      imageUrl = await generateImg2Img(promptEl.value.trim(), resolution, aspect, statusEl);
    } else {
      // Standard text-to-image via NanoBanana 2
      imageUrl = await generateText2Img(promptEl.value.trim(), resolution, aspect, statusEl);
    }

    if(!imageUrl){
      if(!statusEl.innerHTML.includes('не удалась') && !statusEl.innerHTML.includes('Таймаут'))
        statusEl.innerHTML='<span style="color:var(--red)">Не удалось получить изображение.</span>';
      return;
    }

    // Add to gallery
    statusEl.style.display='none';
    addToGallery(promptId, imageUrl, resolution, aspect);
  } catch(err){
    console.error('generateImage error:', err);
    statusEl.innerHTML=`<span style="color:var(--red)">Сетевая ошибка: ${err.message}</span>`;
  }
}

// Standard text-to-image
async function generateText2Img(prompt, resolution, aspect, statusEl){
  const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method:'POST',
    headers:{'Authorization':'Bearer '+KIE_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'nano-banana-2',
      input:{
        prompt: prompt,
        image_input:[],
        aspect_ratio: aspect,
        resolution: resolution,
        output_format:'png'
      }
    })
  });
  if(!createRes.ok){
    const errText = await createRes.text();
    statusEl.innerHTML=`<span style="color:var(--red)">API ошибка ${createRes.status}: ${errText.substring(0,200)}</span>`;
    return null;
  }
  const createData = await createRes.json();
  console.log('KIE createTask response:', JSON.stringify(createData));
  if(createData.code !== 200 && !createData.data?.taskId){
    statusEl.innerHTML=`<span style="color:var(--red)">Ошибка: ${createData.msg||JSON.stringify(createData)}</span>`;
    return null;
  }
  const taskId = createData.data?.taskId || createData.data;
  statusEl.innerHTML='<div class="spinner"></div><span>Генерация… taskId: '+taskId+'</span>';
  return await pollTaskResult(taskId, statusEl, 40);
}

// img2img with reference image via NanoBanana 2 image_input
async function generateImg2Img(prompt, resolution, aspect, statusEl){
  // Primary approach: pass base64 data URL in image_input array for NanoBanana 2
  const refData = APP.renderRefImage;

  const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method:'POST',
    headers:{'Authorization':'Bearer '+KIE_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'nano-banana-2',
      input:{
        prompt: prompt,
        image_input: [refData],
        aspect_ratio: aspect,
        resolution: resolution,
        output_format:'png'
      }
    })
  });

  if(!createRes.ok){
    const errText = await createRes.text();
    console.warn('img2img NanoBanana failed, trying GPT-4o fallback:', errText);
    // Fallback: try GPT-4o image model
    return await generateImg2ImgGpt4o(prompt, resolution, aspect, statusEl);
  }

  const createData = await createRes.json();
  console.log('KIE img2img response:', JSON.stringify(createData));

  if(createData.code !== 200 && !createData.data?.taskId){
    console.warn('img2img NanoBanana rejected, trying GPT-4o:', createData.msg);
    return await generateImg2ImgGpt4o(prompt, resolution, aspect, statusEl);
  }

  const taskId = createData.data?.taskId || createData.data;
  statusEl.innerHTML='<div class="spinner"></div><span>img2img генерация… taskId: '+taskId+'</span>';
  return await pollTaskResult(taskId, statusEl, 40);
}

// Fallback: GPT-Image-1 (4o) via KIE — supports filesUrl for reference images
async function generateImg2ImgGpt4o(prompt, resolution, aspect, statusEl){
  statusEl.innerHTML='<div class="spinner"></div><span>Попытка через GPT-4o Image… (img2img)</span>';

  const refData = APP.renderRefImage;

  const createRes = await fetch('https://api.kie.ai/api/v1/gpt4o-image/generate', {
    method:'POST',
    headers:{'Authorization':'Bearer '+KIE_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({
      prompt: prompt,
      filesUrl: [refData],
      size: aspect === '1:1' ? '1024x1024' : (aspect === '16:9' ? '1536x1024' : '1024x1536'),
      quality: 'high'
    })
  });

  if(!createRes.ok){
    const errText = await createRes.text();
    console.warn('GPT-4o image failed, falling back to text2img:', errText);
    statusEl.innerHTML='<div class="spinner"></div><span>img2img недоступен, генерация без reference…</span>';
    return await generateText2Img(prompt, resolution, aspect, statusEl);
  }

  const data = await createRes.json();
  console.log('GPT-4o image response:', JSON.stringify(data).substring(0,500));

  // GPT-4o may return taskId for async or direct result
  if(data.data?.taskId){
    statusEl.innerHTML='<div class="spinner"></div><span>GPT-4o генерация… taskId: '+data.data.taskId+'</span>';
    return await pollTaskResult(data.data.taskId, statusEl, 40);
  }
  // Direct result
  if(data.data?.url) return data.data.url;
  if(data.data?.resultUrl) return data.data.resultUrl;

  // If all else fails, fall back to text2img
  statusEl.innerHTML='<div class="spinner"></div><span>img2img не вернул результат, генерация без reference…</span>';
  return await generateText2Img(prompt, resolution, aspect, statusEl);
}

async function pollTaskResult(taskId, statusEl, maxAttempts=40){
  for(let i=0; i<maxAttempts; i++){
    await new Promise(r=>setTimeout(r, 5000)); // 5 sec interval
    try {
      const res = await fetch('https://api.kie.ai/api/v1/jobs/recordInfo?taskId='+taskId, {
        headers:{'Authorization':'Bearer '+KIE_API_KEY}
      });
      if(!res.ok){
        console.warn('KIE poll HTTP '+res.status);
        statusEl.innerHTML=`<div class="spinner"></div><span>Ожидание… (попытка ${i+1}/${maxAttempts})</span>`;
        continue;
      }
      const data = await res.json();
      console.log('KIE poll #'+(i+1)+':', JSON.stringify(data).substring(0,500));

      if(data.code===200 && data.data){
        const d = data.data;
        if(d.state==='success'){
          let url = null;
          if(d.resultJson){
            try {
              const rj = typeof d.resultJson==='string' ? JSON.parse(d.resultJson) : d.resultJson;
              url = rj.resultUrls?.[0] || rj.resultImageUrl || rj.imageUrl;
            } catch(e){ console.warn('KIE resultJson parse error:', e); }
          }
          if(!url) url = d.resultImageUrl || d.imageUrl;
          if(url) return url;
          console.warn('KIE success but no image URL:', JSON.stringify(d));
          statusEl.innerHTML=`<span style="color:var(--red)">Генерация завершена, но изображение не найдено в ответе</span>`;
          return null;
        }
        if(d.state==='failed' || d.state==='error'){
          statusEl.innerHTML=`<span style="color:var(--red)">Генерация не удалась: ${d.failMsg||d.failCode||'неизвестная ошибка'}</span>`;
          return null;
        }
        statusEl.innerHTML=`<div class="spinner"></div><span>Генерация… (попытка ${i+1}/${maxAttempts})</span>`;
      }
    } catch(e){
      console.warn('KIE poll error:', e.message);
    }
  }
  statusEl.innerHTML='<span style="color:var(--red)">Таймаут генерации (200 сек). Попробуйте снова.</span>';
  return null;
}

function addToGallery(promptId, imageUrl, resolution, aspect){
  const suffix = PROMPT_MAP[promptId];
  const galleryEl = document.getElementById('gallery'+suffix);
  if(!APP.generatedImages[promptId]) APP.generatedImages[promptId]=[];
  const idx = APP.generatedImages[promptId].length;
  const hasRef = !!APP.renderRefImage;
  APP.generatedImages[promptId].push({url:imageUrl, resolution, aspect, selected:false, ts:Date.now(), ref:hasRef});

  const thumb = document.createElement('div');
  thumb.className='imgThumb';
  thumb.dataset.idx=idx;
  thumb.dataset.prompt=promptId;
  thumb.onclick = function(){ toggleSelectImage(promptId, idx, this); };
  thumb.innerHTML=`
    <img src="${imageUrl}" alt="Render ${idx+1}" loading="lazy">
    <div class="imgLabel">
      <span>#${idx+1} · ${resolution} · ${aspect}${hasRef?' · REF':''}</span>
      <button onclick="event.stopPropagation();window.open('${imageUrl}','_blank')">Открыть</button>
    </div>
  `;
  galleryEl.appendChild(thumb);
}

function toggleSelectImage(promptId, idx, el){
  const suffix = PROMPT_MAP[promptId];
  document.querySelectorAll('#gallery'+suffix+' .imgThumb').forEach(t=>t.classList.remove('selected'));
  el.classList.add('selected');
  APP.generatedImages[promptId].forEach((img,i)=>img.selected=(i===idx));
}

// ── CLAUDE AI (PLANNER) ──
async function runAI(){
  const key=getClaudeKey();
  if(!key){alert('API-ключ Claude не задан');return;}
  if(!APP.planBuildings.length){document.getElementById('aiOut').value='Нет объектов.';return;}
  const out=document.getElementById('aiOut');
  out.value='Запрос…';
  const totalArea=APP.planBuildings.reduce((s,b)=>s+b.w*b.h,0);
  const desc=APP.planBuildings.map(b=>{
    let pos='';
    if(APP.planScale) pos=`, поз. ${Math.round(b.cx/APP.planScale)}м от З / ${Math.round(b.cy/APP.planScale)}м от С, угол ${Math.round(b.angle*180/Math.PI)}°`;
    return `• ${b.label}: ${b.w}×${b.h}м (пятно ${b.w*b.h}м²)${b.ht?', h='+b.ht+'м':''}${pos}`;
  }).join('\n');

  const pw=parseFloat(document.getElementById('plotW')?.value)||0;
  const pl=parseFloat(document.getElementById('plotL')?.value)||0;

  const prompt=`Ты архитектурный консультант по мастер-плану спортивно-рекреационных комплексов.

ПРОЕКТ: Спортивный комплекс. Участок ${pw?pw+'×'+pl+'м':'размер не задан'}.

РАССТАНОВКА (суммарное пятно: ${totalArea} м²):
${desc}

Дай краткий анализ (максимум 180 слов, по пунктам):
1. Зонирование — конфликты «шумная/тихая» зона
2. Потоки посетителей — логика маршрутов
3. Инсоляция и виды — ориентация зданий
4. КПЗ — плотность застройки
5. Конкретные рекомендации по перемещению или повороту объектов`;

  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:700,messages:[{role:'user',content:prompt}]})
    });
    const data=await res.json();
    if(data.error){out.value='Ошибка: '+data.error.message;return;}
    out.value=data.content?.find(c=>c.type==='text')?.text||'Нет ответа';
  }catch(err){out.value='Сетевая ошибка: '+err.message;}
}

// ── CLAUDE AI (RENDER PAGE) ──
async function runRenderAI(){
  const key=getClaudeKey();
  if(!key){alert('API-ключ Claude не задан');return;}
  const out=document.getElementById('renderAIOut');
  out.value='Запрос…';
  const totalArea=APP.planBuildings.reduce((s,b)=>s+b.w*b.h,0);
  const desc=APP.planBuildings.map(b=>{
    let pos='';
    if(APP.planScale) pos=` [${Math.round(b.cx/APP.planScale)}м, ${Math.round(b.cy/APP.planScale)}м, ${Math.round(b.angle*180/Math.PI)}°]`;
    return `${b.label}: ${b.w}×${b.h}м${b.ht?' h='+b.ht+'м':''}${pos}`;
  }).join('\n');

  const budgets=[];
  let totalBudget=0;
  CATALOG.filter(i=>itemTotalQty(i.id)>0).forEach(item=>{
    const s=APP.calcState[item.id];
    s.opts.forEach((q,oi)=>{
      if(q<=0) return;
      const cost=item.options[oi].p*q;
      totalBudget+=cost;
      budgets.push(`${item.name} (${item.options[oi].n}): ${q} ${item.unit} = ${fmt(cost)}`);
    });
  });
  APP.hangars.forEach((h,i)=>{
    const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[0];
    const area=calcHangarArea(h);
    const cost=area*bt.price;
    totalBudget+=cost;
    budgets.push(`Ангар ${i+1} (${bt.name}): ${area} м² = ${fmt(cost)}`);
  });

  const prompt=`Ты опытный девелопер и архитектурный консультант. Проведи развёрнутый анализ спортивного комплекса.

ОБЪЕКТЫ НА ПЛАНЕ (пятно: ${totalArea} м²):
${desc}

БЮДЖЕТ (итого ${fmt(totalBudget)}):
${budgets.join('\n')}

Структура ответа (max 400 слов):
1. Функциональная логика комплекса — сильные стороны и слабые места текущей расстановки
2. Коммерческий потенциал — какие зоны дают основную выручку, на что делать ставку
3. Риски — что может не сработать на практике
4. Топ-3 конкретных изменения которые повысят доходность или удобство
5. Итоговая оценка концепции`;

  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1200,messages:[{role:'user',content:prompt}]})
    });
    const data=await res.json();
    if(data.error){out.value='Ошибка: '+data.error.message;return;}
    out.value=data.content?.find(c=>c.type==='text')?.text||'Нет ответа';
  }catch(err){out.value='Сетевая ошибка: '+err.message;}
}
