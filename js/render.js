// ═══════════════════════════════════════════════════════
// PROMPTS & RENDER
// ═══════════════════════════════════════════════════════
function genPrompts(){
  const bs=APP.planBuildings;
  if(!bs.length){
    ['pTop','pNW','pSE','promptOut'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.value='Нет объектов на плане.';
    });
    return;
  }
  const hs=APP.planScale>0;
  const zones={};
  bs.forEach(b=>{if(!zones[b.zone])zones[b.zone]=[];zones[b.zone].push(b);});
  const ZN={sport:'СПОРТ',event:'ИВЕНТ',glamp:'ГЛЕМПИНГ',well:'WELLNESS',gastro:'ГАСТРОНОМИЯ',infra:'ИНФРАСТРУКТУРА',other:'ПРОЧЕЕ'};

  // Landscape options from checkboxes
  const lndKeepTrees = document.getElementById('lndKeepTrees')?.checked ?? true;
  const lndDesign = document.getElementById('lndDesign')?.checked ?? true;
  const lndWater = document.getElementById('lndWater')?.checked ?? false;
  const lndLighting = document.getElementById('lndLighting')?.checked ?? true;
  const hasMapImage = !!APP.planImg;

  // Build landscape description
  let landscapeDesc = '';
  if(hasMapImage){
    landscapeDesc = 'CRITICAL: The visualization MUST match the real satellite/aerial photo of the site that was loaded. ';
    landscapeDesc += 'Preserve the actual terrain, water bodies, roads, and surrounding buildings visible in the photo. ';
    if(lndKeepTrees) landscapeDesc += 'Keep ALL existing trees and vegetation where no new buildings are placed — only clear trees directly under building footprints. ';
    else landscapeDesc += 'Trees can be removed for landscaping redesign — replace with designed greenery. ';
  } else {
    landscapeDesc += 'No specific site photo loaded — create an idealized flat green site with surrounding forest. ';
  }
  if(lndDesign) landscapeDesc += 'Add professional landscape design: paved walking paths, manicured lawns, decorative plantings between buildings. ';
  if(lndWater) landscapeDesc += 'Include decorative water features: fountains, small ponds or canals between zones. ';
  if(lndLighting) landscapeDesc += 'Show elegant park lighting along paths and around buildings. ';

  // STYLE REFERENCE (photorealistic aerial architectural visualization)
  const STYLE_BASE = 'Photorealistic aerial architectural visualization, drone photography style. ' + landscapeDesc + 'Summer daytime, bright natural sunlight, soft shadows. Ultra-detailed textures: glass facades, metal roofs, wooden decks, asphalt parking. High-end resort/sports complex aesthetic. 8K render quality, architectural magazine cover shot.';

  // Helper: building description with label overlay
  function bDesc(b, withLabel){
    const ht=b.ht?`, height ${b.ht}m`:'';
    const label=withLabel?` with white text label "${b.label} ${b.w}×${b.h}m" on the roof`:'';
    return `${b.label}: ${b.w}×${b.h}m building${ht}${label}${b.note?' ('+b.note+')':''}`;
  }

  // TOP VIEW
  const topLines=[`Aerial top-down view at 70-80° angle of a premium sports and recreation complex.\n`];
  topLines.push('BUILDINGS WITH LABELS ON ROOFS:');
  Object.entries(zones).forEach(([z,zbs])=>{
    topLines.push(`\n${ZN[z]||z}:`);
    zbs.forEach((b,i)=>{
      let pos='';
      if(hs){const mx=Math.round(b.cx/APP.planScale),my=Math.round(b.cy/APP.planScale),deg=Math.round(b.angle*180/Math.PI);pos=` | position: ${mx}m from west, ${my}m from north | angle ${deg}°`;}
      topLines.push(`  ${String.fromCharCode(65+i)}. ${bDesc(b,true)}${pos}`);
    });
  });
  topLines.push('\nMATERIALS: Sport hangars — dark grey sandwich panels (RAL 7024/7016) with glass roof sections showing courts inside. Wellness/glamping/restaurant — natural wood cladding (RAL 1001) with full-height glass. Infrastructure — grey metal.');
  if(hasMapImage){
    topLines.push('ENVIRONMENT: MATCH THE REAL SITE from loaded aerial/satellite photo. Preserve existing terrain, water, roads, surrounding structures. ' + (lndKeepTrees ? 'Keep existing trees except under new buildings.' : 'Redesign vegetation with professional landscaping.'));
  } else {
    topLines.push('ENVIRONMENT: Dense green trees surrounding the complex, paved parking areas with cars, pedestrian paths, outdoor terraces with umbrellas.');
  }
  topLines.push(STYLE_BASE);
  const topPrompt=topLines.join('\n');

  // PERSPECTIVE VIEW (universal 45° angle)
  const nwLines=[`Aerial perspective view at 45° angle of a premium sports and recreation complex.\n`];
  nwLines.push('ALL BUILDINGS (from foreground to background):');
  // Sort by position if available, otherwise just list all
  const sorted=[...bs].sort((a,b)=>(a.cy||0)-(b.cy||0));
  sorted.forEach((b,i)=>{
    const ht=b.ht?`, height ${b.ht}m`:'';
    nwLines.push(`  ${i+1}. ${b.label}: ${b.w}×${b.h}m${ht}${b.note?' ('+b.note+')':''}`);
    // Include hangar contents — match by hangarId (from planner linkage) or fallback to label
    const hangar=APP.hangars.find(h=>h.layout?.length && (b.hangarId===h.id || b.sourceId===('hangar_'+h.id)));
    if(hangar && hangar.layout?.length){
      nwLines.push('     INSIDE:');
      hangar.layout.forEach(li=>{
        const it=CATALOG.find(c=>c.id===li.itemId);
        if(it) nwLines.push(`       - ${it.name} (${li.w}×${li.h}m)`);
      });
    }
  });
  nwLines.push('\nEach building visible with its architecture, materials, and surroundings.');
  nwLines.push('Dense landscaping with trees and walking paths between buildings.');
  nwLines.push('Warm golden hour lighting, summer, long shadows, premium resort aesthetic.');
  nwLines.push(STYLE_BASE);
  const nwPrompt=nwLines.join('\n');

  // CUTAWAY AXONOMETRIC — roofs partially removed/transparent to show interiors
  const seLines=[`Cutaway axonometric view (sectional axonometric / exploded roof plan) of a sports and recreation complex.\n`];
  seLines.push('ARCHITECTURAL CUTAWAY: Roofs are partially removed or rendered as semi-transparent glass, revealing the interior layout of each building from above at ~60° angle.\n');
  seLines.push('BUILDINGS WITH VISIBLE INTERIORS:');
  bs.forEach((b,i)=>{
    const ht=b.ht?`, height ${b.ht}m`:'';
    seLines.push(`\n  ${i+1}. ${b.label} (${b.w}×${b.h}m${ht}):`);
    seLines.push(`     Roof: cut away / semi-transparent, showing interior:`);
    // Match hangar by ID linkage from planner
    const matchH=APP.hangars.find(h=>{
      if(!h.layout?.length) return false;
      return b.hangarId===h.id || b.sourceId===('hangar_'+h.id);
    });
    if(matchH && matchH.layout?.length){
      matchH.layout.forEach(li=>{
        const it=CATALOG.find(c=>c.id===li.itemId);
        if(it) seLines.push(`     - ${it.name} (${li.w}×${li.h}m) — visible court markings / field layout from above`);
      });
    } else {
      seLines.push(`     - Interior visible: floor plan, equipment, activity zones`);
    }
  });
  seLines.push('\nSTYLE: Technical architectural illustration meets photorealism. Walls shown in section (cut edges), floors fully visible with actual materials and markings. Exterior landscaping visible around buildings. Slight isometric projection.');
  seLines.push('Each sport court/arena has recognizable markings visible from above (tennis lines, ice hockey circles, padel glass walls, football field markings).');
  seLines.push('Summer daylight, clean and bright, architectural magazine quality. Labels optional.');
  const sePrompt=seLines.join('\n');

  // Set outputs
  ['pTop','promptOut'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=topPrompt;});
  const pNW=document.getElementById('pNW');if(pNW)pNW.value=nwPrompt;
  const pSE=document.getElementById('pSE');if(pSE)pSE.value=sePrompt;
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

  // Show status
  statusEl.style.display='flex';
  statusEl.innerHTML='<div class="spinner"></div><span>Отправка запроса на генерацию…</span>';

  try {
    // 1. Create task
    const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method:'POST',
      headers:{'Authorization':'Bearer '+KIE_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'nano-banana-2',
        input:{
          prompt: promptEl.value.trim(),
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
      return;
    }

    const createData = await createRes.json();
    console.log('KIE createTask response:', JSON.stringify(createData));

    if(createData.code !== 200 && !createData.data?.taskId){
      statusEl.innerHTML=`<span style="color:var(--red)">Ошибка: ${createData.msg||JSON.stringify(createData)}</span>`;
      return;
    }
    const taskId = createData.data?.taskId || createData.data;
    statusEl.innerHTML='<div class="spinner"></div><span>Генерация… taskId: '+taskId+'</span>';

    // 2. Poll for result (every 5 sec, max 40 attempts = 200 sec)
    const imageUrl = await pollTaskResult(taskId, statusEl, 40);
    if(!imageUrl){
      if(!statusEl.innerHTML.includes('не удалась'))
        statusEl.innerHTML='<span style="color:var(--red)">Таймаут генерации (200 сек). Попробуйте снова.</span>';
      return;
    }

    // 3. Add to gallery
    statusEl.style.display='none';
    addToGallery(promptId, imageUrl, resolution, aspect);
  } catch(err){
    console.error('generateImage error:', err);
    statusEl.innerHTML=`<span style="color:var(--red)">Сетевая ошибка: ${err.message}</span>`;
  }
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
        // Check for completion
        if(d.successFlag===1 || d.status==='completed' || d.status==='success'){
          const url = d.response?.resultImageUrl || d.response?.imageUrl || d.resultImageUrl || d.imageUrl;
          if(url) return url;
          // Try to find URL in response object
          if(d.response && typeof d.response === 'object'){
            const vals = Object.values(d.response);
            const imgUrl = vals.find(v=>typeof v==='string' && (v.includes('http') && (v.includes('.png')||v.includes('.jpg')||v.includes('image'))));
            if(imgUrl) return imgUrl;
          }
          if(d.response && typeof d.response === 'string' && d.response.includes('http')) return d.response;
          // Completed but no URL found
          console.warn('KIE completed but no image URL in response:', JSON.stringify(d.response));
          statusEl.innerHTML=`<span style="color:var(--red)">Генерация завершена, но изображение не найдено в ответе</span>`;
          return null;
        }
        // Check for failure
        if(d.successFlag===0 || d.status==='failed' || d.status==='error'){
          statusEl.innerHTML=`<span style="color:var(--red)">Генерация не удалась: ${d.errorMessage||d.failReason||'неизвестная ошибка'}</span>`;
          return null;
        }
        // Still processing
        const progress = d.progress ? ` (${d.progress}%)` : '';
        statusEl.innerHTML=`<div class="spinner"></div><span>Генерация${progress}… (попытка ${i+1}/${maxAttempts})</span>`;
      }
    } catch(e){
      console.warn('KIE poll error:', e.message);
    }
  }
  return null;
}

function addToGallery(promptId, imageUrl, resolution, aspect){
  const suffix = PROMPT_MAP[promptId];
  const galleryEl = document.getElementById('gallery'+suffix);
  if(!APP.generatedImages[promptId]) APP.generatedImages[promptId]=[];
  const idx = APP.generatedImages[promptId].length;
  APP.generatedImages[promptId].push({url:imageUrl, resolution, aspect, selected:false, ts:Date.now()});

  const thumb = document.createElement('div');
  thumb.className='imgThumb';
  thumb.dataset.idx=idx;
  thumb.dataset.prompt=promptId;
  thumb.onclick = function(){ toggleSelectImage(promptId, idx, this); };
  thumb.innerHTML=`
    <img src="${imageUrl}" alt="Render ${idx+1}" loading="lazy">
    <div class="imgLabel">
      <span>#${idx+1} · ${resolution} · ${aspect}</span>
      <button onclick="event.stopPropagation();window.open('${imageUrl}','_blank')">Открыть</button>
    </div>
  `;
  galleryEl.appendChild(thumb);
}

function toggleSelectImage(promptId, idx, el){
  // Deselect all in this gallery
  const suffix = PROMPT_MAP[promptId];
  document.querySelectorAll('#gallery'+suffix+' .imgThumb').forEach(t=>t.classList.remove('selected'));
  // Select this one
  el.classList.add('selected');
  APP.generatedImages[promptId].forEach((img,i)=>img.selected=(i===idx));
}

// ── CLAUDE AI (PLANNER) ──
async function runAI(){
  const key=CLAUDE_API_KEY;
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
  const key=CLAUDE_API_KEY;
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
