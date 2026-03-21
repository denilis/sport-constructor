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
// RENDER PROMPT SYSTEM
// ═══════════════════════════════════════════════════════
const RENDER_SYSTEM_PROMPT = `You are generating an architectural visualization for Sport Constructor Pro.

CORE RULE
You must visualize the actual project structure, not invent a new one.

SPATIAL HIERARCHY
1. Real site / terrain / reference base
2. Building placement on site
3. Building massing and form
4. Outdoor functions
5. Interior functions only if the view is cutaway

DO NOT
- redesign the masterplan,
- relocate buildings,
- rotate buildings unless instructed,
- change site geometry,
- expand the territory,
- invent roads, parking areas, or sports zones that are not part of the project,
- replace one building type with another,
- turn the project into fantasy concept art.

YOU MUST
- preserve the actual site composition,
- preserve the actual placement logic,
- preserve scale relationships,
- preserve the chosen building types,
- preserve the main open and closed functions,
- improve realism, materials, lighting, landscape readability, and presentation quality only.

BUILDING MATERIAL LOGIC
- tent_cold / tent_warm = tensile / fabric sports structure
- air = air-supported dome
- lstk = steel / sandwich panel sports building
- wood = engineered timber / warm wood architectural language
- concrete = capital masonry / concrete building
- abk = administrative and service building

FUNCTIONAL READABILITY
- Padel courts must read as padel courts with glass walls and proper turf.
- Tennis courts must reflect the selected surface.
- Ice arena must read as an ice venue, not as a generic hall.
- Pools must reflect whether they are indoor or outdoor, sport or leisure.
- Do not add functions that are absent from the project structure.

OUTPUT STYLE
Photorealistic architectural visualization. Believable materials. Natural shadows. Presentation quality suitable for commercial proposal. No fantasy exaggeration.`;

const RENDER_ICE_SUPPLEMENT = `\n\nThis project includes an indoor ice arena. It must read as a true ice facility with boards and protective glass. If hockey-oriented: show shooting zone, off-ice training halls, strength gym. Show locker rooms, coach rooms, referee room, drying rooms, technical areas, spectator zones if present. Do not reduce the complex to "ice inside a box". Show a coherent sports training environment with believable service infrastructure. Photorealistic ice arena visualization with strong functional readability.`;

function buildRenderPrompt(angle, hasRef, bldListStr, envDesc, bldPosStr, hasIce) {
  let p = RENDER_SYSTEM_PROMPT + '\n\n';

  if(hasRef && angle === 'top') {
    p += `Use the reference image as the exact spatial and environmental base. Transform this satellite/aerial image into a photorealistic architectural visualization. Replace only the project markers with realistic buildings. Preserve exact site geometry, terrain, roads, parking, vegetation, neighboring context. Do not redesign the site.

Project structures and functions:
${bldListStr}

Environment: ${envDesc}

Photorealistic aerial architectural visualization, high-end development presentation, natural daylight, realistic shadows, ultra-detailed but believable materials, clear sports facility identity, 8K quality.`;
  }

  if(hasRef && angle === '45') {
    p += `Use the reference image and site layout as the exact project base. Create a photorealistic 45-degree aerial perspective. Site composition, building placement, spacing, road logic must remain consistent with reference.

Buildings and structures:
${bldListStr}
${bldPosStr}

Environment: ${envDesc}

Photorealistic sports development visualization, premium but realistic, natural light consistent with reference, clear circulation, believable landscaping, commercial proposal quality.`;
  }

  if(hasRef && angle === 'cutaway') {
    p += `Use the reference image as the exact site base. Create a photorealistic 60-degree cutaway visualization. Preserve real site context, building placement, external geometry. Roof transparency only to reveal actual interior functions.

Visible interior functions:
${bldListStr}

If present, show: padel courts with glass walls and turf, tennis courts with correct surface, ice arena as true ice venue, training halls, service zones only where they exist.

Surrounding terrain from reference must remain visible. Photorealistic cutaway, premium presentation quality, realistic materials, no fantasy elements.`;
  }

  if(!hasRef && angle === 'top') {
    p += `Generate a photorealistic aerial visualization from 70-degree top-down angle. Use only actual project structure. Do not invent additional buildings.

Project structures:
${bldListStr}

Environment: ${envDesc}

Realistic scale, natural daylight, believable materials, clear sports identity, high-end but practical architectural presentation.`;
  }

  if(!hasRef && angle === '45') {
    p += `Generate a photorealistic 45-degree aerial perspective. Use only actual project structure. Do not invent new buildings or circulation logic.

Project structures:
${bldListStr}

Environment: ${envDesc}

Each building must reflect its construction type and function. Premium commercial architectural visualization, realistic proportions, believable atmosphere.`;
  }

  if(!hasRef && angle === 'cutaway') {
    p += `Generate a photorealistic 60-degree cutaway visualization. Use only real project composition. Do not add zones that don't exist.

Project structures:
${bldListStr}

Show partial roof transparency only for actual internal functions: sports halls, courts, ice arena, training zones, admin areas if present.

Photorealistic cutaway axonometric, magazine-quality but realistic, clean spatial clarity, believable materials, no fantasy exaggeration.`;
  }

  if(hasIce) p += RENDER_ICE_SUPPLEMENT;
  return p;
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

  // Check if project has ice
  const hasIce = APP.planBuildings.some(b => (b.label||'').includes('Лед')) ||
                 APP.hangars.some(h => h.layout?.some(l => l.itemId?.includes('ice')));

  let topPrompt, nwPrompt, sePrompt;

  topPrompt = buildRenderPrompt('top', hasRef, bldList(false), envDesc, '', hasIce);
  nwPrompt = buildRenderPrompt('45', hasRef, bldList(true), envDesc, bldPositions(), hasIce);
  sePrompt = buildRenderPrompt('cutaway', hasRef, bldList(true), envDesc, '', hasIce);

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

ПРОЕКТ
Участок: ${pw?pw+'×'+pl+'м':'размер не задан'}
Суммарное пятно: ${totalArea} м²

РАССТАНОВКА
${desc}

ЗАДАЧА
Дай короткий, прикладной анализ расстановки с точки зрения: логики зон, потоков посетителей, эксплуатационной удобности, плотности, конфликтов функций, возможных улучшений.

ВАЖНЫЕ ПРАВИЛА
- Не выдумывай внешние данные.
- Если по входу нельзя уверенно судить об инсоляции, сторонах света, реальном ландшафте — так и напиши коротко.
- Не пересказывай входные данные.
- Пиши только то, что помогает реально поправить генплан.

ФОРМАТ
Максимум 180 слов.

Структура:
1. Сильные стороны зонирования
2. Конфликты и слабые места
3. Потоки и логистика
4. Плотность и использование участка
5. 3-5 конкретных рекомендаций, сформулированных как действия

Стиль: коротко, профессионально, без воды.`;

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

  const prompt=`Ты опытный девелопер спортивной инфраструктуры и консультант по функционально-коммерческой логике объектов.

ОБЪЕКТЫ НА ПЛАНЕ
Суммарное пятно: ${totalArea} м²
${desc}

БЮДЖЕТ
Итого: ${fmt(totalBudget)}
${budgets.join('\\n')}

ЗАДАЧА
Оцени концепцию проекта с точки зрения: функциональной логики, коммерческого потенциала, рисков реализации, устойчивости эксплуатации, точек улучшения.

ПРАВИЛА
- Не выдумывай рынок, трафик, продажи, если этих данных нет.
- Если говоришь о выручке, опирайся только на типовую бизнес-логику состава комплекса.
- Если вывод вероятностный, так и обозначай его.
- Не пересказывай бюджет и состав объектов.
- Давай конкретику.

ФОРМАТ
Максимум 400 слов.

Структура:
1. Функциональная логика комплекса
2. Потенциал доходных зон
3. Ключевые риски
4. Топ-3 изменения с максимальным эффектом
5. Итоговая оценка концепции по шкале 1-10 с кратким объяснением

Стиль: деловой, прямой, профессиональный.`;

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
