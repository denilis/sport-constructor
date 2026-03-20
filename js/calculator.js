// ═══════════════════════════════════════════════════════
// CALCULATOR
// ═══════════════════════════════════════════════════════
if(!APP.thumbCache) APP.thumbCache = {};
if(!APP.localThumbs) APP.localThumbs = {};

// Check which local thumbnails exist (img/thumbs/*.jpg)
// Mark all as available by default, let onerror handle missing ones
function checkLocalThumbs(){
  CATALOG.forEach(item => {
    item.options.forEach((opt, oi) => {
      const key = item.id + '_' + oi;
      // Assume local thumb exists — browser will show broken img if not,
      // but onerror on the rendered <img> will handle fallback
      APP.localThumbs[key] = true;
    });
  });
}

// Standard mode: only show core items, extended reveals all
if(APP.extendedMode===undefined) APP.extendedMode = false;
const STANDARD_ITEMS = new Set([
  'padel_std','padel_pano','padel_single',
  'tennis_hard','tennis_grass','tennis_clay',
  'ice','football_5','football_7','football_11','football_indoor',
  // infra — always shown
  'reception','cafe','locker_m','locker_f','wc','coach_room','heating','storage','light',
]);
const EXTENDED_CATS = new Set(['athletics','fun','glamping','wellness','prep']);

function toggleExtendedMode(){
  APP.extendedMode = !APP.extendedMode;
  applyExtendedMode();
}
function applyExtendedMode(){
  const ext = APP.extendedMode;
  const btn = document.getElementById('extToggleBtn');
  if(btn) btn.textContent = ext ? 'Скрыть ▲' : 'Ещё ▼';
  // Toggle extended category tabs
  document.querySelectorAll('#calcTabs .extTab').forEach(t=>{
    t.style.display = ext ? '' : 'none';
  });
  // Toggle extended items within standard categories (e.g. basketball, volleyball in team)
  document.querySelectorAll('.oCard[data-ext]').forEach(c=>{
    c.style.display = ext ? '' : 'none';
  });
}

function initCalc() {
  CATALOG.forEach(it => { APP.calcState[it.id] = {opts: it.options.map(()=>0)}; });
  checkLocalThumbs();
  renderAllGrids();
  addHangar();
  renderSettings();
  recalc();
  applyExtendedMode();
}

function switchCTab(cat, btn) {
  document.querySelectorAll('#calcTabs .cTab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.cGrid').forEach(g=>{g.classList.remove('show');});
  document.getElementById('tabSettings').style.display='none';
  const tp=document.getElementById('tabPresets'); if(tp) tp.style.display='none';
  if(cat==='settings'){
    const tse=document.getElementById('tabSettings');tse.style.display='flex';tse.style.flexDirection='column';
  } else if(cat==='presets'){
    if(tp){tp.style.display='block'; renderPresets();}
  } else {
    const g=document.getElementById('cg-'+cat);
    if(g) g.classList.add('show');
  }
}

function renderAllGrids() {
  loadThumbCache();
  const cats=['racket','team','athletics','fun','glamping','wellness','infra','prep'];
  cats.forEach(cat=>{
    const el=document.getElementById('cg-'+cat);
    if(el){el.innerHTML=''; CATALOG.filter(i=>i.cat===cat).forEach(i=>renderCard(i));}
  });
}

// Helper: total qty for item across all variants
function itemTotalQty(id){return (APP.calcState[id]?.opts||[]).reduce((a,b)=>a+b,0);}
// Helper: total cost for item
function itemTotalCost(id){
  const item=CATALOG.find(i=>i.id===id);if(!item)return 0;
  return (APP.calcState[id]?.opts||[]).reduce((sum,q,i)=>sum+q*(item.options[i]?.p||0),0);
}

function renderCard(item) {
  const el=document.getElementById('cg-'+item.cat);
  if(!el) return;
  const s=APP.calcState[item.id];
  const totalQ=itemTotalQty(item.id);
  const div=document.createElement('div');
  div.className='oCard'+(totalQ>0?' sel':'');
  div.id='card-'+item.id;
  // Mark non-standard items in standard categories as extended
  const isExtItem = !EXTENDED_CATS.has(item.cat) && !STANDARD_ITEMS.has(item.id);
  if(isExtItem) div.dataset.ext = '1';

  const step = ['м²','м.п.','м³'].includes(item.unit)?10:(item.unit==='мест'?5:1);
  const varRows = item.options.map((opt,oi)=>{
    const q=s.opts[oi]||0;
    const specsTags = opt.specs ? `<div class="oSpecs">${opt.specs.map(s=>`<span class="oSpecTag">${s}</span>`).join('')}</div>` : '';
    const imgKey = item.id+'_'+oi;
    const localThumb = 'img/thumbs/'+imgKey+'.jpg';
    const cached = APP.thumbCache?.[imgKey];
    const thumbSrc = APP.localThumbs?.[imgKey] ? localThumb : (cached || null);
    const thumbContent = thumbSrc
      ? `<img src="${thumbSrc}" alt="${opt.n}" onerror="this.parentElement.innerHTML='<div class=\\'thumbGen\\' onclick=\\'genThumb(&quot;${item.id}&quot;,${oi},event)\\'>📷<br>Фото</div>'">`
      : `<div class="thumbGen" onclick="genThumb('${item.id}',${oi},event)">📷<br>Фото</div>`;
    return `<div class="oVarRow${q>0?' active':''}">
      <div class="oVarThumb" id="thumb-${imgKey}" onmouseenter="showThumbFull(this)" onmouseleave="hideThumbFull()">${thumbContent}</div>
      <div class="oVarBody">
        <div class="oVarHead">
          <span class="oVarName">${opt.n}</span>
          <div class="oVarRight">
            <div class="qtyBox sm">
              <button class="qBtn" onclick="changeQty('${item.id}',${oi},-1)">−</button>
              <input class="qVal" id="qty-${item.id}-${oi}" value="${q}" readonly>
              <button class="qBtn" onclick="changeQty('${item.id}',${oi},1)">+</button>
            </div>
            <div class="oVarPrice" id="vp-${item.id}-${oi}">${q>0?fmt(opt.p*q):''}</div>
          </div>
        </div>
        ${specsTags}
      </div>
    </div>`;
  }).join('');

  div.innerHTML=`
    <div class="oCardTop">
      <div class="oIcon">${item.icon}</div>
      <div class="oInfo"><h4>${item.name}</h4><p>${item.desc}</p></div>
    </div>
    <div class="oVarList">${varRows}</div>
    <div class="oFooter">
      <span class="oUnit">${totalQ>0?totalQ+' '+item.unit:item.unit}</span>
      <div class="oPrice" id="price-${item.id}">${totalQ>0?fmt(itemTotalCost(item.id)):'0 ₽'}</div>
    </div>`;
  el.appendChild(div);
}

function changeQty(id, optIdx, delta) {
  const item=CATALOG.find(i=>i.id===id);
  const s=APP.calcState[id];
  const step = ['м²','м.п.','м³'].includes(item.unit)?10:(item.unit==='мест'?5:1);
  let v=s.opts[optIdx]||0;
  if(v===0 && delta>0) v=(['м²','м.п.'].includes(item.unit)?50:(item.unit==='мест'?10:1));
  else v+=delta*step;
  if(v<0) v=0;
  s.opts[optIdx]=v;
  // Update UI
  const qel=document.getElementById('qty-'+id+'-'+optIdx);
  if(qel) qel.value=v;
  const vpEl=document.getElementById('vp-'+id+'-'+optIdx);
  if(vpEl) vpEl.textContent=v>0?fmt(item.options[optIdx].p*v):'';
  const row=qel?.closest('.oVarRow');
  if(row) row.classList.toggle('active',v>0);
  // Totals
  const totalQ=itemTotalQty(id);
  const card=document.getElementById('card-'+id);
  if(card) card.classList.toggle('sel',totalQ>0);
  const priceEl=document.getElementById('price-'+id);
  if(priceEl) priceEl.textContent=totalQ>0?fmt(itemTotalCost(id)):'0 ₽';
  recalc();
  updateCalcBadge();
}

function updateCalcBadge() {
  const cnt=CATALOG.filter(i=>itemTotalQty(i.id)>0).length + APP.hangars.length;
  const b=document.getElementById('badgeCalc');
  b.textContent=cnt||'';
  b.classList.toggle('show',cnt>0);
}

// ── THUMBNAIL GENERATION (NanoBanana) ──

function buildThumbPrompt(item, opt){
  const base = item.name + ' ' + opt.n;
  const specs = (opt.specs||[]).slice(0,4).join(', ');
  const solo = 'single isolated object, 45 degree aerial view, clean white background, no surroundings, no environment, product shot style, photorealistic 3D render, studio lighting';
  const prompts = {
    racket: `${base} court, ${specs}, ${solo}`,
    team: `${base} sports field with markings, ${specs}, ${solo}`,
    athletics: `${base}, ${specs}, ${solo}`,
    fun: `${base}, ${specs}, ${solo}`,
    glamping: `${base}, single building, ${specs}, 45 degree aerial view, isolated on clean background, no surroundings, photorealistic architectural render, studio lighting`,
    wellness: `${base}, single building interior view, ${specs}, ${solo}`,
    infra: `${base}, ${specs}, ${solo}`,
    prep: `${base}, ${specs}, ${solo}`
  };
  return prompts[item.cat] || `${base}, ${solo}`;
}

async function genThumb(itemId, optIdx, event){
  if(event) event.stopPropagation();
  const item = CATALOG.find(i=>i.id===itemId);
  if(!item) return;
  const opt = item.options[optIdx];
  if(!opt) return;
  const imgKey = itemId+'_'+optIdx;
  const thumbEl = document.getElementById('thumb-'+imgKey);
  if(!thumbEl) return;

  // Show spinner
  thumbEl.innerHTML = '<div class="thumbSpin"></div>';

  try {
    const prompt = buildThumbPrompt(item, opt);
    const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method:'POST',
      headers:{'Authorization':'Bearer '+KIE_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'nano-banana-2',
        input:{prompt, image_input:[], aspect_ratio:'4:3', resolution:'1K', output_format:'png'}
      })
    });
    const createData = await createRes.json();
    const taskId = createData.data?.taskId || createData.data;
    if(!taskId){ thumbEl.innerHTML = '<div class="thumbGen" onclick="genThumb(\''+itemId+'\','+optIdx+',event)">Ошибка<br>⟳</div>'; return; }

    // Poll for result
    let imageUrl = null;
    for(let i=0; i<40; i++){
      await new Promise(r=>setTimeout(r, 3000));
      try {
        const res = await fetch('https://api.kie.ai/api/v1/jobs/recordInfo?taskId='+taskId, {headers:{'Authorization':'Bearer '+KIE_API_KEY}});
        const data = await res.json();
        const d = data.data;
        if(d?.state==='success'){
          // KIE returns resultJson as JSON string with resultUrls array
          if(d.resultJson){
            try {
              const rj = typeof d.resultJson==='string' ? JSON.parse(d.resultJson) : d.resultJson;
              imageUrl = rj.resultUrls?.[0] || rj.resultImageUrl;
            } catch(e){}
          }
          if(!imageUrl) imageUrl = d.resultImageUrl || d.imageUrl;
          break;
        }
        if(d?.state==='failed'||d?.state==='error') break;
      } catch(e){}
    }
    if(imageUrl){
      APP.thumbCache[imgKey] = imageUrl;
      thumbEl.innerHTML = `<img src="${imageUrl}" alt="${opt.n}">`;
      saveThumbCache();
    } else {
      thumbEl.innerHTML = '<div class="thumbGen" onclick="genThumb(\''+itemId+'\','+optIdx+',event)">⟳ Повтор</div>';
    }
  } catch(e){
    thumbEl.innerHTML = '<div class="thumbGen" onclick="genThumb(\''+itemId+'\','+optIdx+',event)">⟳ Ошибка</div>';
  }
}

async function genAllThumbs(){
  const items = CATALOG.filter(i=>i.options?.length);
  for(const item of items){
    for(let oi=0; oi<item.options.length; oi++){
      const key = item.id+'_'+oi;
      if(APP.thumbCache[key]) continue;
      await genThumb(item.id, oi);
      await new Promise(r=>setTimeout(r, 500)); // throttle
    }
  }
}

function saveThumbCache(){
  try { localStorage.setItem('scp_thumbs', JSON.stringify(APP.thumbCache)); } catch(e){}
}
function loadThumbCache(){
  try {
    const d = localStorage.getItem('scp_thumbs');
    if(d) APP.thumbCache = JSON.parse(d);
  } catch(e){}
}

function showThumbFull(el){
  const img = el.querySelector('img');
  if(!img) return;
  let full = document.getElementById('thumbFullPreview');
  if(!full){ full=document.createElement('div'); full.id='thumbFullPreview'; full.className='oVarThumbFull'; document.body.appendChild(full); }
  const r = el.getBoundingClientRect();
  full.innerHTML = `<img src="${img.src}">`;
  full.style.left = (r.right+8)+'px';
  full.style.top = Math.max(8, r.top-50)+'px';
  full.style.display = 'block';
}
function hideThumbFull(){
  const full = document.getElementById('thumbFullPreview');
  if(full) full.style.display='none';
}

// ── RECALC ──
function recalc() {
  let total=0, plotArea=0;
  let html='';
  const cats = [{key:'racket',label:'Ракеточные'},{key:'team',label:'Командные'},
    {key:'athletics',label:'Атлетика'},{key:'fun',label:'Развлечения'},
    {key:'glamping',label:'Глэмпинг'},{key:'wellness',label:'Велнес / СПА'},
    {key:'prep',label:'Благоустройство'}];

  cats.forEach(({key,label})=>{
    const items=CATALOG.filter(i=>i.cat===key && itemTotalQty(i.id)>0);
    if(!items.length) return;
    html+=`<div class="sumSection"><div class="sumSect">${label}</div>`;
    items.forEach(item=>{
      const s=APP.calcState[item.id];
      // Show each active variant
      s.opts.forEach((q,oi)=>{
        if(q<=0) return;
        const cost=item.options[oi].p*q;
        total+=cost;
        if(item.areaW&&item.areaL) plotArea+=item.areaW*item.areaL*q;
        html+=`<div class="sumItem">
          <div><div class="sn">${item.name}</div><span class="sm">${item.options[oi].n} × ${q} ${item.unit}</span></div>
          <div class="sp">${fmt(cost)}</div>
        </div>`;
      });
    });
    html+='</div>';
  });

  // Infra items
  const infraItems=CATALOG.filter(i=>i.cat==='infra' && itemTotalQty(i.id)>0);
  if(infraItems.length){
    html+=`<div class="sumSection"><div class="sumSect">Инфраструктура</div>`;
    infraItems.forEach(item=>{
      const s=APP.calcState[item.id];
      s.opts.forEach((q,oi)=>{
        if(q<=0) return;
        const cost=item.options[oi].p*q;
        total+=cost;
        html+=`<div class="sumItem">
          <div><div class="sn">${item.name}</div><span class="sm">${item.options[oi].n} × ${q} ${item.unit}</span></div>
          <div class="sp">${fmt(cost)}</div>
        </div>`;
      });
    });
    html+='</div>';
  }

  // Buildings: ABK + Hangars
  if(APP.hangars.length){
    const abks=APP.hangars.filter(h=>h.type==='abk');
    const hangars=APP.hangars.filter(h=>h.type!=='abk');
    // АБК
    if(abks.length){
      html+=`<div class="sumSection"><div class="sumSect">АБК</div>`;
      abks.forEach((h,i)=>{
        const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[6];
        const floors=h.floors||1;
        const totalArea=h.w*h.h*floors;
        const footprint=h.w*h.h;
        if(totalArea>0){
          const cost=totalArea*bt.price;
          total+=cost;
          plotArea+=footprint;
          html+=`<div class="sumItem">
            <div><div class="sn">АБК №${i+1}</div><span class="sm">${h.w}×${h.h}м · ${floors} эт. · ${totalArea} м²</span></div>
            <div class="sp">${fmt(cost)}</div>
          </div>`;
        }
      });
      html+='</div>';
    }
    // Ангары
    if(hangars.length){
      html+=`<div class="sumSection"><div class="sumSect">Здания / Ангары</div>`;
      hangars.forEach((h,i)=>{
        const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[0];
        const footArea=calcHangarArea(h);
        const isCapital = (h.type==='wood'||h.type==='concrete');
        const hFloors = isCapital ? (h.floors||1) : 1;
        const area = footArea * hFloors;
        if(area>0){
          const cost=area*bt.price;
          total+=cost;
          plotArea+=footArea; // plot area = footprint only
          html+=`<div class="sumItem">
            <div><div class="sn">Ангар №${i+1}</div><span class="sm">${bt.name}, ${area} м²${hFloors>1?' ('+hFloors+' эт.)':''}</span></div>
            <div class="sp">${fmt(cost)}</div>
          </div>`;
        }
      });
      html+='</div>';
    }
  }

  if(!html) html='<div class="sumEmpty">Выберите объекты</div>';

  document.getElementById('sumList').innerHTML=html;
  document.getElementById('sumTotal').innerHTML=fmt(total);
  document.getElementById('headerTotal').textContent=fmt(total)+' ₽';
  document.getElementById('sumArea').textContent=Math.ceil(plotArea);

  const pw=parseFloat(document.getElementById('plotW').value)||0;
  const pl=parseFloat(document.getElementById('plotL').value)||0;
  const totalPlot=pw*pl;
  document.getElementById('sumPlotTot').textContent=fmt2(totalPlot);
  const pct=totalPlot>0?Math.min(100,(plotArea/totalPlot)*100):0;
  document.getElementById('plotFill').style.width=pct+'%';
  document.getElementById('plotFill').style.background=pct>80?'var(--red)':'var(--gold)';
}

function calcAbkArea() {
  // Returns total ABK floor area from ABK buildings
  const abks=APP.hangars.filter(h=>h.type==='abk');
  if(abks.length){
    return abks.reduce((s,h)=>s+h.w*h.h*(h.floors||1),0);
  }
  // Fallback: legacy formula
  return calcAbkAreaFormula();
}

function calcHangarArea(h) {
  // If editor layout exists, use hangar dimensions
  if(h.w && h.h && h.layout && h.layout.length>0) return h.w * h.h;
  // Fallback: auto-calculate from items
  let area=0;
  Object.entries(h.items||{}).forEach(([itemId,d])=>{
    const it=CATALOG.find(i=>i.id===itemId);
    if(it) area+=it.areaW*it.areaL*d.count*1.3;
  });
  return Math.ceil(area);
}

// ── ABK MODULE ──
function calcAbkAreaFormula() {
  // Legacy formula for backward compat — estimates ABK area from infra items
  let net=0;
  CATALOG.filter(i=>i.cat==='infra').forEach(item=>{
    const tq=itemTotalQty(item.id);
    if(tq===0) return;
    if(item.unit==='мест') net+=Math.ceil(tq*2.5);
    else if(item.unit==='м²') net+=tq;
  });
  if(net===0) return 0;
  const pct=parseInt(document.getElementById('abk-corridor-pct')?.value||30);
  return Math.ceil(net*(1+pct/100));
}

function addABK() {
  const area = calcAbkAreaFormula() || 200;
  const w = Math.max(24, Math.ceil(Math.sqrt(area * 2)));
  const h = Math.max(12, Math.ceil(area / w));
  APP.hangars.push({
    id: Date.now(), type: 'abk', items: {}, w, h,
    floors: 1, layout: [], layout2: [], docking: [],
    wallOffset: 1, objectGap: 0.5
  });
  renderHangars(); recalc();
}

function updateABKFloors(id, floors) {
  const h = APP.hangars.find(x=>x.id===id);
  if(h) { h.floors = parseInt(floors) || 1; renderHangars(); recalc(); }
}

function updateABKDocking(id, hangarId) {
  const h = APP.hangars.find(x=>x.id===id);
  if(!h || !h.docking) return;
  if(hangarId && !h.docking.find(d=>d.hangarId===+hangarId)){
    if(h.docking.length >= 2){ alert('Максимум 2 стыковки'); return; }
    h.docking.push({hangarId: +hangarId, side: 'east'});
  }
  renderHangars(); recalc();
}

function removeABKDocking(id, hangarId) {
  const h = APP.hangars.find(x=>x.id===id);
  if(h && h.docking) { h.docking = h.docking.filter(d=>d.hangarId!==hangarId); renderHangars(); recalc(); }
}

// Sync ABK rooms back to calculator infra items
function syncAbkToCalc(abk) {
  if(!abk || abk.type !== 'abk') return;
  const allRooms = [...(abk.layout||[]), ...(abk.layout2||[])];
  ROOM_CATALOG.forEach(rm => {
    if(!rm.infraLink) return;
    const rooms = allRooms.filter(li => li.itemId === rm.id);
    const totalArea = rooms.reduce((s, r) => s + r.w * r.h, 0);
    const s = APP.calcState[rm.infraLink];
    if(!s) return;
    if(rm.areaPerUnit) {
      s.opts[0] = Math.ceil(totalArea / rm.areaPerUnit);
    } else {
      s.opts[0] = Math.ceil(totalArea);
    }
  });
}

function calcABK() {
  // Update display for any ABK buildings
  const abks = APP.hangars.filter(h=>h.type==='abk');
  if(abks.length) {
    abks.forEach(abk => syncAbkToCalc(abk));
  }
  recalc();
}

// ── ABK AUTO-CALC ── нормы из СП 31-112-2004, СП 31-112-2007
// Рассчитывает рекомендованные площади помещений АБК
// на основе выбранных кортов/площадок и загрузки
function abkAutoCalcRooms() {
  const N = window.ABK_NORMS || ABK_NORMS_DEFAULT;

  // 1. Собрать все спортивные объекты из калькулятора
  const sportCats = ['racket','team','athletics','fun'];
  let totalPlaces = 0;
  let teamSports = false;
  let hasIce = false;
  const courts = [];

  sportCats.forEach(cat => {
    CATALOG.filter(i => i.cat === cat).forEach(item => {
      const qty = itemTotalQty(item.id);
      if(qty <= 0) return;
      let ppu = 4;
      if(item.id.startsWith('padel_std') || item.id.startsWith('padel_pano')) ppu = 4;
      else if(item.id === 'padel_single') ppu = 2;
      else if(item.id.startsWith('tennis')) ppu = 4;
      else if(item.id === 'football_5') { ppu = 12; teamSports = true; }
      else if(item.id === 'football_7') { ppu = 16; teamSports = true; }
      else if(item.id === 'football_11') { ppu = 24; teamSports = true; }
      else if(item.id === 'football_indoor') { ppu = 12; teamSports = true; }
      else if(item.id === 'basketball') { ppu = 12; teamSports = true; }
      else if(item.id === 'volleyball') { ppu = 14; teamSports = true; }
      else if(item.id === 'universal') { ppu = 14; teamSports = true; }
      else if(item.id === 'ice') { ppu = 30; teamSports = true; hasIce = true; }
      else if(item.id.startsWith('workout')) ppu = 10;
      else if(item.id.startsWith('climb')) ppu = 8;
      else if(item.id.startsWith('trampoline')) ppu = 15;
      else if(item.id.startsWith('ocr')) ppu = 10;
      courts.push({ id: item.id, name: item.name, qty, ppu });
      totalPlaces += qty * ppu;
    });
  });

  if(totalPlaces === 0) return null;

  // 2. Загрузка и шкафчики — из ABK_NORMS
  const shift = Math.ceil(totalPlaces * N.loadFactor);
  const lockersTotal = Math.ceil(shift * N.lockerMultiplier);

  // 3. Разделение М/Ж/Дет — из ABK_NORMS
  const lockersM = Math.ceil(lockersTotal * N.malePct);
  const lockersF = Math.ceil(lockersTotal * N.femalePct);
  const lockersK = Math.ceil(lockersTotal * N.childPct);

  // 4. Площади по нормам ABK_NORMS
  const lockerAreaPerPlace = (n) => n > 50 ? N.lockerAreaOver50 : (n >= 30 ? N.lockerArea30to50 : N.lockerAreaUnder30);
  const lockerMArea = Math.max(N.lockerMMin, Math.ceil(lockersM * (lockerAreaPerPlace(lockersM) + N.lockerExtra)));
  const lockerFArea = Math.max(N.lockerFMin, Math.ceil(lockersF * (lockerAreaPerPlace(lockersF) + N.lockerExtra)));
  const lockerKArea = Math.max(N.lockerKMin, Math.ceil(lockersK * (lockerAreaPerPlace(lockersK) + N.lockerExtra)));

  // Душевые
  const showersM = Math.max(N.showerMin, Math.ceil(Math.ceil(lockersM / N.showerPersonsPer) * N.showerAreaPerHead));
  const showersF = Math.max(N.showerMin, Math.ceil(Math.ceil(lockersF / N.showerPersonsPer) * N.showerAreaPerHead));

  // Санузлы
  const wcM = Math.max(N.wcMin, Math.ceil((Math.ceil(lockersM / N.wcMalePerPersons) * 2) * N.wcAreaPerUnit));
  const wcF = Math.max(N.wcMin, Math.ceil((Math.ceil(lockersF / N.wcFemalePerPersons) + Math.ceil(lockersF / 20)) * N.wcAreaPerUnit));

  // Вестибюль / Рецепция
  const receptionArea = Math.max(N.receptionMin, Math.ceil(shift * N.receptionPerPerson));

  // Тренерская
  const totalCourts = courts.reduce((s, c) => s + c.qty, 0);
  const numCoaches = Math.max(1, Math.ceil(totalCourts * N.coachRatioPerCourt));
  const coachArea = Math.max(N.coachBase, N.coachBase + (numCoaches - 1) * N.coachPerExtra);

  // Медкабинет
  const medArea = N.medicalArea;

  // Кафе
  const cafeSeats = Math.max(10, Math.ceil(shift * N.cafePctOfShift));
  const cafeArea = Math.max(N.cafeMin, Math.ceil(cafeSeats * N.cafeAreaPerSeat));

  // Офис
  const officeWP = Math.max(N.officeMinWorkplaces, Math.ceil(totalCourts / N.officeCourtsPerWP));
  const officeArea = Math.max(N.officeMin, Math.ceil(officeWP * N.officePerWorkplace));

  // Склад
  const storageArea = Math.max(N.storageMin, Math.ceil(shift * N.storagePerPerson));

  // Технические
  const heatingArea = N.heatingArea;
  const electricalArea = N.electricalArea;
  const serverArea = N.serverArea;

  // Коридоры
  const usefulArea = lockerMArea + lockerFArea + lockerKArea + showersM + showersF +
    wcM + wcF + receptionArea + coachArea + medArea + cafeArea + officeArea +
    storageArea + heatingArea + electricalArea + serverArea;
  const corridorArea = Math.ceil(usefulArea * N.corridorPct);

  // 5. Сформировать рекомендации
  const rooms = [
    { id: 'rm_reception', area: receptionArea, w: 0, h: 0, note: `Вестибюль/рецепция (0.5 м²×${shift} чел.)` },
    { id: 'rm_cafe', area: cafeArea, w: 0, h: 0, note: `Кафе (${cafeSeats} мест × 1.8 м²)` },
    { id: 'rm_office', area: officeArea, w: 0, h: 0, note: `Офис (${Math.max(2, Math.ceil(courts.reduce((s,c)=>s+c.qty,0)/4))} раб. мест)` },
    { id: 'rm_coach', area: coachArea, w: 0, h: 0, note: `Тренерская (${numCoaches} тренеров)` },
    { id: 'rm_medical', area: medArea, w: 0, h: 0, note: 'Медкабинет (СП 31-112 табл.11)' },
    { id: 'rm_locker_m', area: lockerMArea, w: 0, h: 0, note: `Раздевалка М (${lockersM} шкафчиков)` },
    { id: 'rm_locker_f', area: lockerFArea, w: 0, h: 0, note: `Раздевалка Ж (${lockersF} шкафчиков)` },
    { id: 'rm_locker_k', area: lockerKArea, w: 0, h: 0, note: `Раздевалка Дет. (${lockersK} шкафчиков)` },
    { id: 'rm_shower', area: showersM + showersF, w: 0, h: 0, note: `Душевые М+Ж (${Math.ceil(lockersM/5)+Math.ceil(lockersF/5)} рожков)`, split: [{area: showersM, suffix:'(М)'}, {area: showersF, suffix:'(Ж)'}] },
    { id: 'rm_wc', area: wcM + wcF, w: 0, h: 0, note: `Санузлы М+Ж`, split: [{area: wcM, suffix:'(М)'}, {area: wcF, suffix:'(Ж)'}] },
    { id: 'rm_heating', area: heatingArea, w: 0, h: 0, note: 'Котельная / ИТП' },
    { id: 'rm_electrical', area: electricalArea, w: 0, h: 0, note: 'Щитовая' },
    { id: 'rm_server', area: serverArea, w: 0, h: 0, note: 'Серверная / ИТ' },
    { id: 'rm_storage', area: storageArea, w: 0, h: 0, note: `Склад (0.15 м²×${shift} чел.)` },
    { id: 'rm_corridor', area: corridorArea, w: 0, h: 0, note: 'Коридоры (~28% от полезной)' },
  ];

  // Рассчитать W×H для каждой комнаты
  rooms.forEach(r => {
    if(r.split) {
      // Will be split into separate rooms
      r.split.forEach(s => {
        const ratio = 1.4;
        s.w = Math.max(3, Math.round(Math.sqrt(s.area * ratio)));
        s.h = Math.max(3, Math.ceil(s.area / s.w));
      });
    }
    const ratio = r.id === 'rm_corridor' ? 5.0 : 1.4;
    r.w = Math.max(3, Math.round(Math.sqrt(r.area * ratio)));
    r.h = Math.max(2, Math.ceil(r.area / r.w));
  });

  const totalArea = usefulArea + corridorArea;

  return {
    shift,
    totalPlaces,
    lockersTotal,
    rooms,
    usefulArea,
    corridorArea,
    totalArea,
    courts,
    // Рекомендованный размер АБК
    recW: Math.max(24, Math.ceil(Math.sqrt(totalArea * 2.5))),
    recH: Math.max(12, Math.ceil(totalArea / Math.max(24, Math.ceil(Math.sqrt(totalArea * 2.5))))),
    recFloors: totalArea > 300 ? 2 : 1,
  };
}

// Показать модальное окно авто-расчёта АБК
function showAbkAutoCalcModal(abkId) {
  const result = abkAutoCalcRooms();
  if(!result) {
    alert('Добавьте спортивные объекты в калькулятор для расчёта');
    return;
  }

  // Создать модалку
  let modal = document.getElementById('abkAutoCalcModal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'abkAutoCalcModal';
    document.body.appendChild(modal);
  }

  let roomsHtml = '';
  result.rooms.forEach(r => {
    const rm = ROOM_CATALOG.find(x => x.id === r.id);
    if(!rm) return;
    if(r.split && r.split.length > 1) {
      r.split.forEach((s, si) => {
        roomsHtml += `<tr>
          <td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06)">${rm.icon} ${rm.name} ${s.suffix}</td>
          <td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:right;color:var(--cyan)">${s.area} м²</td>
          <td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:center;color:#888">${s.w}×${s.h}м</td>
        </tr>`;
      });
    } else {
      roomsHtml += `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06)">${rm.icon} ${rm.name}</td>
        <td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:right;color:var(--cyan)">${r.area} м²</td>
        <td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:center;color:#888">${r.w}×${r.h}м</td>
      </tr>`;
    }
  });

  // Спорт-объекты сводка
  let courtsHtml = result.courts.map(c =>
    `<span style="font-size:11px;background:rgba(59,130,246,.1);color:#93c5fd;padding:2px 8px;border-radius:4px">${c.name} ×${c.qty} (${c.qty*c.ppu} чел.)</span>`
  ).join(' ');

  modal.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);';
  modal.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--bd);border-radius:12px;max-width:600px;width:90%;max-height:85vh;overflow:auto;padding:24px;color:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;color:var(--cyan);font-size:16px;">📐 Авто-расчёт помещений АБК</h3>
        <button onclick="document.getElementById('abkAutoCalcModal').style.display='none'" style="background:none;border:none;color:#888;font-size:18px;cursor:pointer">✕</button>
      </div>

      <div style="background:rgba(34,211,238,.05);border:1px solid rgba(34,211,238,.15);border-radius:8px;padding:12px;margin-bottom:16px;">
        <div style="font-size:12px;color:var(--cyan);margin-bottom:8px;font-weight:600">Исходные данные (СП 31-112-2004)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${courtsHtml}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;color:#ccc;">
          <div>Всего мест: <b style="color:#fff">${result.totalPlaces}</b></div>
          <div>Загрузка: <b style="color:#fff">80%</b></div>
          <div>В смену: <b style="color:#fff">${result.shift} чел.</b></div>
          <div>Шкафчиков (×1.5): <b style="color:#fff">${result.lockersTotal}</b></div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
        <thead>
          <tr style="color:var(--tx3);font-size:11px;">
            <th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--bd)">Помещение</th>
            <th style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--bd)">Площадь</th>
            <th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--bd)">Размер</th>
          </tr>
        </thead>
        <tbody>${roomsHtml}</tbody>
        <tfoot>
          <tr style="font-weight:700;color:var(--cyan);">
            <td style="padding:8px">ИТОГО</td>
            <td style="padding:8px;text-align:right">${result.totalArea} м²</td>
            <td style="padding:8px;text-align:center">${result.recW}×${result.recH}м${result.recFloors>1?' (2 эт.)':''}</td>
          </tr>
        </tfoot>
      </table>

      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="document.getElementById('abkAutoCalcModal').style.display='none'" style="padding:8px 16px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:6px;cursor:pointer;font-size:12px">Закрыть</button>
        <button onclick="applyAbkAutoCalc(${abkId})" style="padding:8px 16px;background:rgba(34,211,238,.2);color:var(--cyan);border:1px solid rgba(34,211,238,.4);border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">✅ Применить к АБК</button>
      </div>
    </div>
  `;
}

// Применить авто-расчёт: задать размеры АБК и разместить комнаты
function applyAbkAutoCalc(abkId) {
  const h = APP.hangars.find(x => x.id === abkId);
  if(!h || h.type !== 'abk') return;
  const result = abkAutoCalcRooms();
  if(!result) return;

  // Обновить размеры АБК
  h.w = result.recW;
  h.h = result.recH;
  h.floors = result.recFloors;
  h.layout = [];
  h.layout2 = [];

  // Авторазмещение комнат на этаже 1 (простое последовательное, с учётом wallOffset)
  const wo = h.wallOffset || 1;
  const gap = h.objectGap || 0.5;
  let curX = wo, curY = wo;
  let rowH = 0;

  const placeRoom = (itemId, w, rh, floor) => {
    const layout = floor === 2 ? (h.layout2 || (h.layout2 = [])) : h.layout;
    // Check if fits in current row
    if(curX + w > h.w - wo) {
      // Next row
      curX = wo;
      curY += rowH + gap;
      rowH = 0;
    }
    // Check if fits vertically
    if(curY + rh > h.h - wo) return false; // doesn't fit

    layout.push({ itemId, x: curX, y: curY, w, h: rh, angle: 0 });
    curX += w + gap;
    rowH = Math.max(rowH, rh);
    return true;
  };

  let currentFloor = 1;
  result.rooms.forEach(r => {
    const rm = ROOM_CATALOG.find(x => x.id === r.id);
    if(!rm) return;

    if(r.split && r.split.length > 1) {
      // Place split rooms separately
      r.split.forEach(s => {
        if(!placeRoom(r.id, s.w, s.h, currentFloor)) {
          if(result.recFloors >= 2 && currentFloor === 1) {
            currentFloor = 2;
            curX = wo; curY = wo; rowH = 0;
            placeRoom(r.id, s.w, s.h, currentFloor);
          }
        }
      });
    } else {
      if(!placeRoom(r.id, r.w, r.h, currentFloor)) {
        if(result.recFloors >= 2 && currentFloor === 1) {
          currentFloor = 2;
          curX = wo; curY = wo; rowH = 0;
          placeRoom(r.id, r.w, r.h, currentFloor);
        }
      }
    }
  });

  // Если 2 этажа — добавить лестницу на оба этажа
  if(h.floors >= 2) {
    const stairRm = ROOM_CATALOG.find(r => r.isStaircase);
    if(stairRm) {
      const sw = stairRm.defaultW, sh = stairRm.defaultH;
      // Разместить у входа (нижний правый угол этажа 1)
      const sx = h.w - wo - sw, sy = h.h - wo - sh;
      h.layout.push({ itemId: stairRm.id, x: sx, y: sy, w: sw, h: sh, angle: 0 });
      h.layout2.push({ itemId: stairRm.id, x: sx, y: sy, w: sw, h: sh, angle: 0 });
    }
  }

  syncAbkToCalc(h);
  document.getElementById('abkAutoCalcModal').style.display = 'none';
  renderHangars();
  recalc();
}

// ── ABK NORMS UI ──
function renderAbkNormsUI(){
  const cont = document.getElementById('abkNormsSection');
  if(!cont) return;
  const N = window.ABK_NORMS || ABK_NORMS_DEFAULT;
  const isOpen = window._abkNormsOpen || false;

  const nf = (key, label, unit, step) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04)">
      <span style="font-size:11px;color:#ccc">${label}</span>
      <div style="display:flex;align-items:center;gap:4px">
        <input type="number" value="${N[key]}" step="${step||0.1}" min="0" style="width:60px;padding:3px 4px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:4px;text-align:center;font-size:11px" onchange="window.ABK_NORMS['${key}']=+this.value">
        <span style="font-size:10px;color:#666;width:30px">${unit}</span>
      </div>
    </div>`;

  const grp = (title, fields) =>
    `<div style="margin-bottom:8px">
      <div style="font-size:11px;color:var(--cyan);font-weight:600;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid rgba(34,211,238,.15)">${title}</div>
      ${fields}
    </div>`;

  cont.innerHTML = `
  <div style="margin-top:16px;border:1px solid rgba(34,211,238,.15);border-radius:8px;overflow:hidden">
    <div onclick="window._abkNormsOpen=!window._abkNormsOpen;renderAbkNormsUI();" style="cursor:pointer;padding:10px 14px;background:rgba(34,211,238,.04);display:flex;justify-content:space-between;align-items:center;user-select:none">
      <span style="color:var(--cyan);font-size:13px;font-weight:600">📏 Нормативы СП 31-112-2004</span>
      <span style="color:#666;font-size:18px;transform:rotate(${isOpen?'180':'0'}deg);transition:transform .2s">▼</span>
    </div>
    ${isOpen ? `<div style="padding:12px 14px">
      ${grp('⚙️ Загрузка и распределение',
        nf('loadFactor','Коэфф. загрузки','','0.05') +
        nf('lockerMultiplier','Множитель шкафчиков','×','0.1') +
        nf('malePct','Доля мужчин','%','0.05') +
        nf('femalePct','Доля женщин','%','0.05') +
        nf('childPct','Доля детей','%','0.05')
      )}
      ${grp('🚹 Раздевалки',
        nf('lockerAreaOver50','Площадь/место (>50 мест)','м²','0.1') +
        nf('lockerArea30to50','Площадь/место (30-50 мест)','м²','0.1') +
        nf('lockerAreaUnder30','Площадь/место (<30 мест)','м²','0.1') +
        nf('lockerExtra','Доп. на шкаф','м²','0.05') +
        nf('lockerMMin','Мин. раздевалка (М)','м²','1') +
        nf('lockerFMin','Мин. раздевалка (Ж)','м²','1') +
        nf('lockerKMin','Мин. раздевалка (Дет.)','м²','1')
      )}
      ${grp('🚿 Душевые',
        nf('showerPersonsPer','Человек на 1 рожок','чел.','1') +
        nf('showerAreaPerHead','Площадь на рожок','м²','0.5') +
        nf('showerMin','Мин. площадь душевой','м²','1')
      )}
      ${grp('🚻 Санузлы',
        nf('wcMalePerPersons','Чел. на 1 унитаз (М)','чел.','5') +
        nf('wcFemalePerPersons','Чел. на 1 унитаз (Ж)','чел.','5') +
        nf('wcAreaPerUnit','Площадь на единицу','м²','0.5') +
        nf('wcMin','Мин. площадь санузла','м²','1')
      )}
      ${grp('💁 Вестибюль / Рецепция',
        nf('receptionPerPerson','Площадь на занимающегося','м²/чел','0.1') +
        nf('receptionMin','Мин. площадь','м²','5')
      )}
      ${grp('☕ Кафе',
        nf('cafePctOfShift','Доля от смены (посадка)','','0.05') +
        nf('cafeAreaPerSeat','Площадь на место','м²','0.1') +
        nf('cafeMin','Мин. площадь','м²','5')
      )}
      ${grp('📋 Тренерская',
        nf('coachBase','Базовая площадь','м²','1') +
        nf('coachPerExtra','На доп. тренера','м²','1') +
        nf('coachRatioPerCourt','Тренеров на корт','','0.1')
      )}
      ${grp('🏢 Офис / Медкабинет',
        nf('officePerWorkplace','Площадь на раб. место','м²','1') +
        nf('officeMinWorkplaces','Мин. рабочих мест','шт','1') +
        nf('officeCourtsPerWP','Кортов на 1 раб. место','','1') +
        nf('officeMin','Мин. площадь офиса','м²','5') +
        nf('medicalArea','Медкабинет','м²','1')
      )}
      ${grp('📦 Склад / Техника',
        nf('storagePerPerson','Склад на занимающегося','м²/чел','0.05') +
        nf('storageMin','Мин. площадь склада','м²','1') +
        nf('heatingArea','Котельная / ИТП','м²','1') +
        nf('electricalArea','Щитовая','м²','1') +
        nf('serverArea','Серверная','м²','1')
      )}
      ${grp('🚪 Коридоры',
        nf('corridorPct','Доля от полезной площади','','0.01')
      )}
      <div style="display:flex;gap:8px;margin-top:10px">
        <button onclick="window.ABK_NORMS=JSON.parse(JSON.stringify(ABK_NORMS_DEFAULT));renderAbkNormsUI();" style="padding:6px 12px;background:var(--bg3);color:#f87171;border:1px solid rgba(248,113,113,.3);border-radius:6px;cursor:pointer;font-size:11px">Сбросить по умолчанию</button>
      </div>
    </div>` : ''}
  </div>`;
}

// ── HANGARS ──
function addHangar() {
  APP.hangars.push({id:Date.now(), type:'tent_cold', items:{}, w:60, h:40, layout:[]});
  renderHangars(); recalc();
}
function removeHangar(id) {
  if(!confirm('Удалить ангар?')) return;
  APP.hangars=APP.hangars.filter(h=>h.id!==id);
  renderHangars(); recalc();
}
function renderHangars() {
  const cont=document.getElementById('hangars-container');
  if(!cont) return;
  cont.innerHTML='';

  const abks = APP.hangars.filter(h=>h.type==='abk');
  const hangars = APP.hangars.filter(h=>h.type!=='abk');

  // ── АБК СЕКЦИЯ ──
  if(abks.length){
    cont.innerHTML+=`<div style="margin-bottom:8px"><h4 style="color:var(--cyan);font-size:13px;margin:0">🏢 Административно-бытовые корпуса</h4></div>`;
  }
  abks.forEach((h,idx)=>{
    const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[6];
    const floors=h.floors||1;
    const totalArea=h.w*h.h*floors;
    const cost=totalArea*bt.price;
    const roomCount=[...(h.layout||[]),...(h.layout2||[])].length;
    // Docking info
    let dockingH='';
    (h.docking||[]).forEach(d=>{
      const dh=APP.hangars.find(x=>x.id===d.hangarId);
      if(dh){
        const dIdx=hangars.indexOf(dh)+1;
        dockingH+=`<span style="font-size:11px;background:rgba(34,211,238,.1);color:var(--cyan);padding:2px 8px;border-radius:4px;display:inline-flex;align-items:center;gap:4px">Ангар №${dIdx} <button style="background:none;border:none;color:#f87171;cursor:pointer;font-size:12px" onclick="removeABKDocking(${h.id},${d.hangarId})">×</button></span>`;
      }
    });
    // Room summary
    let roomSummary='';
    const allRooms=[...(h.layout||[]),...(h.layout2||[])];
    if(allRooms.length){
      const grouped={};
      allRooms.forEach(r=>{if(!grouped[r.itemId])grouped[r.itemId]=0;grouped[r.itemId]++;});
      roomSummary=Object.entries(grouped).map(([id,cnt])=>{
        const rm=ROOM_CATALOG.find(r=>r.id===id);
        return rm?`<span style="font-size:10px;color:#ccc;background:rgba(255,255,255,.06);padding:2px 6px;border-radius:3px">${rm.icon} ${rm.name} ×${cnt}</span>`:'';
      }).join('');
    }
    // Docking picker (hangars only)
    let dockPickerH='';
    if(hangars.length){
      dockPickerH=`<select onchange="if(this.value)updateABKDocking(${h.id},this.value);this.value=''" style="font-size:11px;padding:3px 6px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:4px"><option value="">+ Пристыковать ангар…</option>${hangars.map((hh,i)=>`<option value="${hh.id}">Ангар №${i+1} (${hh.w}×${hh.h}м)</option>`).join('')}</select>`;
    }
    cont.innerHTML+=`
    <div class="bCard" style="border-color:rgba(34,211,238,.3)">
      <div class="bCardHead">
        <div><h4 style="color:var(--cyan)">АБК №${idx+1}</h4><div class="bMeta">${h.w}×${h.h}м · ${floors} эт. · ${totalArea} м² · ${fmt(cost)} · ${roomCount} помещений</div></div>
        <div style="display:flex;gap:4px;">
          <button class="pBtn" style="color:#4ade80;border-color:rgba(74,222,128,.3);" onclick="showAbkAutoCalcModal(${h.id})" title="Авто-расчёт помещений по нормам СП">📐 Авто</button>
          <button class="pBtn" style="color:var(--cyan);border-color:rgba(34,211,238,.3);" onclick="openHangarEditor(${h.id})">Редактор</button>
          <button class="pBtn red" onclick="removeHangar(${h.id})">✕</button>
        </div>
      </div>
      <div class="bCardBody">
        <div class="bRow">
          <div class="bField"><label>Размеры (м)</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="number" value="${h.w}" min="10" max="100" style="width:60px;padding:4px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:4px;text-align:center" onchange="updateHangar(${h.id},'w',+this.value)">
              <span style="color:#888">×</span>
              <input type="number" value="${h.h}" min="8" max="80" style="width:60px;padding:4px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:4px;text-align:center" onchange="updateHangar(${h.id},'h',+this.value)">
            </div>
          </div>
          <div class="bField"><label>Этажность</label>
            <select onchange="updateABKFloors(${h.id},this.value)" style="padding:4px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:4px">
              <option value="1"${floors===1?' selected':''}>1 этаж</option>
              <option value="2"${floors===2?' selected':''}>2 этажа</option>
            </select>
          </div>
        </div>
        ${hangars.length?`<div class="bField" style="margin-top:6px"><label>Стыковка к ангарам</label><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${dockingH}${(h.docking||[]).length<2?dockPickerH:''}</div></div>`:''}
        ${roomSummary?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${roomSummary}</div>`:'<div style="color:var(--tx4);font-size:11px;margin-top:6px">Откройте редактор для размещения помещений</div>'}
      </div>
    </div>`;
  });

  // ── АНГАРЫ СЕКЦИЯ ──
  if(hangars.length){
    cont.innerHTML+=`<div style="margin:12px 0 8px"><h4 style="color:var(--gold2);font-size:13px;margin:0">🏗️ Спортивные ангары</h4></div>`;
  }
  hangars.forEach((h,idx)=>{
    const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[0];
    const area=calcHangarArea(h);
    const cost=area*bt.price;
    const itemsInCat=['racket','team','athletics','fun'].flatMap(c=>CATALOG.filter(i=>i.cat===c));
    let selectedH='';
    Object.entries(h.items||{}).forEach(([id,d])=>{
      const it=CATALOG.find(i=>i.id===id);
      if(it) selectedH+=`<div class="hSel"><span>${it.name} × ${d.count}</span><em>${it.areaW*it.areaL*d.count} м²</em><button class="rmBtn" onclick="removeFromHangar(${h.id},'${id}')">×</button></div>`;
    });
    const calcSelected = itemsInCat.filter(it => itemTotalQty(it.id) > 0);
    const calcOthers = itemsInCat.filter(it => itemTotalQty(it.id) <= 0);
    let pickerH = '';
    if(calcSelected.length) pickerH += '<div class="hPickerLabel">Выбранные:</div>' + calcSelected.map(it=>`<div class="hItem hItemSel" onclick="addToHangar(${h.id},'${it.id}')">${it.icon} ${it.name} <span class="hItemQty">×${itemTotalQty(it.id)}</span></div>`).join('');
    if(calcOthers.length) pickerH += '<div class="hPickerLabel">Другие:</div>' + calcOthers.map(it=>`<div class="hItem" onclick="addToHangar(${h.id},'${it.id}')">${it.icon} ${it.name}</div>`).join('');
    // Filter out ABK type from the building type selector
    const hangarTypes = BUILDING_TYPES.filter(b=>!b.isAbk);
    // Capital buildings (wood, concrete) support floors
    const isCapital = (h.type==='wood'||h.type==='concrete');
    const floors = isCapital ? (h.floors||1) : 1;
    const totalArea = isCapital ? area * floors : area;
    const totalCost = totalArea * bt.price;
    const floorHtml = isCapital ? `
          <div class="bField"><label>Этажность</label>
            <select onchange="updateHangar(${h.id},'floors',+this.value)" style="padding:4px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:4px">
              <option value="1"${floors===1?' selected':''}>1 этаж</option>
              <option value="2"${floors===2?' selected':''}>2 этажа</option>
              <option value="3"${floors===3?' selected':''}>3 этажа</option>
            </select>
          </div>` : '';
    cont.innerHTML+=`
    <div class="bCard">
      <div class="bCardHead">
        <div><h4 style="color:var(--gold2)">Ангар №${idx+1}</h4><div class="bMeta">${bt.name} · ${totalArea} м²${isCapital&&floors>1?' ('+floors+' эт.)':''} · ${fmt(totalCost)}${h.layout?.length?' · '+h.layout.length+' объектов':''}</div></div>
        <div style="display:flex;gap:4px;">
          <button class="pBtn" style="color:var(--cyan);border-color:rgba(34,211,238,.3);" onclick="openHangarEditor(${h.id})">Редактор</button>
          <button class="pBtn red" onclick="removeHangar(${h.id})">✕</button>
        </div>
      </div>
      <div class="bCardBody">
        <div class="bRow">
          <div class="bField"><label>Тип здания</label>
            <select onchange="updateHangar(${h.id},'type',this.value)">
              ${hangarTypes.map(b=>`<option value="${b.id}"${b.id===h.type?' selected':''}>${b.name} — ${fmt2(b.price)} ₽/м²</option>`).join('')}
            </select>
          </div>
          ${floorHtml}
        </div>
        <div class="bField" style="margin-bottom:8px"><label>Добавить объект внутрь</label>
          <div class="hPicker">${pickerH}</div>
        </div>
        <div class="hSelected">${selectedH||'<div style="color:var(--tx4);font-size:11px;">Нет объектов</div>'}</div>
      </div>
    </div>`;
  });
}
function updateHangar(id,prop,val){const h=APP.hangars.find(x=>x.id===id);if(h){h[prop]=val;renderHangars();recalc();}}
function addToHangar(hId,itemId){
  const h=APP.hangars.find(x=>x.id===hId);
  if(!h) return;
  // Calculate current items area
  let usedArea = 0;
  Object.entries(h.items||{}).forEach(([id,d])=>{
    const it=CATALOG.find(i=>i.id===id);
    if(it) usedArea += it.areaW * it.areaL * d.count;
  });
  // Add new item area
  const newItem = CATALOG.find(i=>i.id===itemId);
  const newArea = newItem ? newItem.areaW * newItem.areaL : 0;
  const hangarArea = h.w * h.h;
  // Warn if exceeds 85% of hangar area (15% for circulation)
  if(newArea > 0 && (usedArea + newArea) > hangarArea * 0.85){
    if(!confirm(`Внимание: площадь объектов (${usedArea + newArea} м²) превышает 85% площади ангара (${hangarArea} м²).\n\nПосле учёта проходов и зазоров объекты могут не поместиться.\nВсё равно добавить?`)) return;
  }
  if(!h.items[itemId]) h.items[itemId]={count:0};
  h.items[itemId].count++;
  renderHangars(); recalc();
}
function removeFromHangar(hId,itemId){const h=APP.hangars.find(x=>x.id===hId);if(h.items[itemId]){h.items[itemId].count--;if(h.items[itemId].count<=0)delete h.items[itemId];}renderHangars();recalc();}

// ── SETTINGS / PRICE EDITOR ──
function mktCell(key,price){
  const md=typeof MARKET_DATA!=='undefined'&&MARKET_DATA[key];
  if(!md) return '<td style="color:#555;text-align:right">—</td>';
  const avg=md.avg;
  if(!avg) return '<td style="color:#555;text-align:right">—</td>';
  const diff=price?Math.round((price-avg)/avg*100):0;
  const clr=diff>15?'#f87171':diff<-15?'#4ade80':'#fff';
  const arrow=diff>15?'▲':diff<-15?'▼':'';
  const diffTxt=diff!==0?` <span style="font-size:9px;color:${clr}">${arrow}${diff>0?'+':''}${diff}%</span>`:'';
  const hasC=md.c&&md.c.length>0;
  const rid='mr_'+key.replace(/\W/g,'_');
  let html=`<td style="text-align:right;white-space:nowrap;color:#fff;cursor:${hasC?'pointer':'default'}" ${hasC?`onclick="document.getElementById('${rid}').style.display=document.getElementById('${rid}').style.display==='none'?'table-row':'none'"`:''}>`;
  html+=`<span style="font-weight:600;font-family:var(--fm)">${fmtPrice(avg)}</span>${diffTxt}`;
  if(hasC) html+=` <span style="font-size:9px;color:#888">▾${md.c.length}</span>`;
  html+='</td>';
  // competitor rows (hidden by default)
  if(hasC){
    html+=`</tr><tr id="${rid}" style="display:none"><td colspan="5" style="padding:4px 8px 8px 20px;background:rgba(255,255,255,.03)"><div style="display:flex;flex-wrap:wrap;gap:4px">`;
    md.c.forEach(c=>{
      const pTxt=c.p?fmtPrice(c.p):(c.t||'—');
      html+=`<span style="font-size:10px;color:#ccc;background:rgba(255,255,255,.06);padding:2px 6px;border-radius:3px;white-space:nowrap">${c.n}: <b style="color:#e5c585">${pTxt}</b></span>`;
    });
    html+='</div></td>';
  }
  return html;
}
if(!window._settingsFilter) window._settingsFilter='all';
function renderSettings() {
  const el=document.getElementById('tabSettings');
  if(!el) return;
  const cats=['racket','team','athletics','fun','glamping','wellness','infra','prep'];
  const catNames={racket:'Ракеточные',team:'Командные',athletics:'Атлетика',fun:'Развлечения',glamping:'Глэмпинг',wellness:'Велнес / СПА',infra:'Инфраструктура',prep:'Благоустройство'};
  const f=window._settingsFilter;
  const baseCats = APP.extendedMode ? cats : cats.filter(c => !EXTENDED_CATS.has(c));
  const filteredCats=f==='all'?baseCats:baseCats.filter(c=>c===f);
  // Filter bar — respect extended mode
  const visibleCats = APP.extendedMode ? cats : cats.filter(c => !EXTENDED_CATS.has(c));
  let html='<div style="display:flex;gap:6px;padding:10px 16px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--bd);flex-shrink:0">';
  html+=`<button onclick="window._settingsFilter='all';renderSettings()" style="padding:4px 10px;border-radius:4px;border:1px solid ${f==='all'?'var(--gold)':'var(--bd)'};background:${f==='all'?'rgba(197,160,89,.15)':'transparent'};color:${f==='all'?'var(--gold2)':'#aaa'};font-size:11px;cursor:pointer">Все</button>`;
  visibleCats.forEach(cat=>{
    const active=f===cat;
    html+=`<button onclick="window._settingsFilter='${cat}';renderSettings()" style="padding:4px 10px;border-radius:4px;border:1px solid ${active?'var(--gold)':'var(--bd)'};background:${active?'rgba(197,160,89,.15)':'transparent'};color:${active?'var(--gold2)':'#aaa'};font-size:11px;cursor:pointer">${catNames[cat]}</button>`;
  });
  html+=`<div style="flex:1"></div>`;
  html+=`<button onclick="openResearchImport()" style="padding:5px 14px;background:linear-gradient(135deg,#7c3aed,#9b6dff);color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;margin-right:6px">Импорт исследования</button>`;
  html+=`<button onclick="applyMarketPrices('${f}')" style="padding:5px 14px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">Рыночные цены${f!=='all'?' ('+catNames[f]+')':' (все)'}</button>`;
  html+='</div>';
  // Table
  html+=`<div style="overflow-y:auto;flex:1;"><table class="priceTable"><colgroup><col style="width:15%"><col style="width:12%"><col style="width:28%"><col style="width:17%"><col style="width:6%"><col style="width:22%"></colgroup><thead><tr><th style="color:#fff">Объект</th><th style="color:#fff">Вариант</th><th style="color:#fff">Комплектация</th><th style="text-align:right;color:#fff">Наша цена</th><th style="color:#fff">Ед.</th><th style="text-align:right;color:#fff">Рынок (средн.) ▾</th></tr></thead><tbody>`;
  filteredCats.forEach(cat=>{
    html+=`<tr><td colspan="6" class="priceCat">${catNames[cat]||cat}</td></tr>`;
    CATALOG.filter(i=>i.cat===cat).forEach(item=>{
      item.options.forEach((opt,oi)=>{
        const key=item.id+'_'+oi;
        const specs = opt.specs ? `<div style="font-size:10px;color:#ccc;line-height:1.4;margin-top:2px">${opt.specs.join(', ')}</div>` : '';
        html+=`<tr>
          <td style="font-weight:600;color:#fff">${item.name}</td>
          <td style="white-space:nowrap;color:#fff">${opt.n}</td>
          <td style="color:#fff">${specs}</td>
          <td style="text-align:right;white-space:nowrap;"><input class="priceInput" type="text" value="${fmtPrice(opt.p)}" onfocus="this.value=this.value.replace(/\\s/g,'')" onblur="this.value=fmtPrice(this.value);updatePrice('${item.id}',${oi},this.value);recalc()"></td>
          <td style="white-space:nowrap;color:#fff">${item.unit}</td>
          ${mktCell(key,opt.p)}
        </tr>`;
      });
    });
    if(filteredCats.includes('infra')&&cat==='infra'){
      html+=`<tr><td colspan="6" class="priceCat">Типы зданий (₽/м²)</td></tr>`;
      const bldKeys=['tent_cold','tent_warm','air','lstk','wood','concrete'];
      BUILDING_TYPES.forEach((bt,bi)=>{
        const bKey='bld_'+bldKeys[bi];
        html+=`<tr><td style="font-weight:600;color:#fff">${bt.name}</td><td style="color:#fff">за м²</td><td></td>
          <td style="text-align:right"><input class="priceInput" type="text" value="${fmtPrice(bt.price)}" onfocus="this.value=this.value.replace(/\\s/g,'')" onblur="this.value=fmtPrice(this.value);BUILDING_TYPES[${bi}].price=+this.value.replace(/\\s/g,'');recalc()"></td>
          <td style="color:#fff">₽/м²</td>
          ${mktCell(bKey,bt.price)}
        </tr>`;
      });
    }
  });
  html+='</tbody></table></div>';
  el.innerHTML=html;
}
function applyMarketPrices(scope){
  const cats=scope==='all'?['racket','team','athletics','fun','glamping','wellness','infra','prep']:[scope];
  const catNames={racket:'Ракеточные',team:'Командные',athletics:'Атлетика',fun:'Развлечения',glamping:'Глэмпинг',wellness:'Велнес / СПА',infra:'Инфраструктура',prep:'Благоустройство'};
  const label=scope==='all'?'ВСЕ категории':catNames[scope]||scope;
  if(!confirm('Заменить наши цены на средние рыночные?\nБлок: '+label+'\n\nЦены будут изменены только там, где есть данные рынка.')) return;
  let changed=0;
  cats.forEach(cat=>{
    CATALOG.filter(i=>i.cat===cat).forEach(item=>{
      item.options.forEach((opt,oi)=>{
        const md=MARKET_DATA[item.id+'_'+oi];
        if(md&&md.avg){opt.p=md.avg;changed++;}
      });
    });
  });
  if(scope==='all'||scope==='infra'){
    const bldKeys=['tent_cold','tent_warm','air','lstk','wood','concrete'];
    BUILDING_TYPES.forEach((bt,bi)=>{
      const md=MARKET_DATA['bld_'+bldKeys[bi]];
      if(md&&md.avg){bt.price=md.avg;changed++;}
    });
  }
  renderSettings();renderAllGrids();recalc();
  alert('Обновлено '+changed+' позиций на рыночные цены.');
}
function updatePrice(id,oi,val){const item=CATALOG.find(i=>i.id===id);if(item)item.options[oi].p=+String(val).replace(/\s/g,'');}

// ═══════════════════════════════════════════════════════
// RESEARCH IMPORT — AI-powered price matching
// ═══════════════════════════════════════════════════════
let _researchMatches = []; // parsed AI results

function openResearchImport(){
  document.getElementById('researchModal').classList.add('show');
  document.getElementById('researchResults').innerHTML = '';
  document.getElementById('researchApplyBtn').style.display = 'none';
  document.getElementById('researchStatus').textContent = '';
  _researchMatches = [];
}

function loadResearchFile(inp){
  const f = inp.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('researchRaw').value = e.target.result;
    document.getElementById('researchStatus').textContent = `Файл загружен: ${f.name} (${(f.size/1024).toFixed(1)} КБ)`;
  };
  reader.readAsText(f, 'utf-8');
}

async function analyzeResearch(){
  const key = CLAUDE_API_KEY;
  if(!key){alert('API-ключ Claude не задан');return;}
  const raw = document.getElementById('researchRaw').value.trim();
  if(!raw){alert('Вставьте данные исследования');return;}

  const statusEl = document.getElementById('researchStatus');
  const resultsEl = document.getElementById('researchResults');
  const btn = document.getElementById('researchAnalyzeBtn');
  btn.disabled = true;
  statusEl.innerHTML = '<div class="spinner" style="display:inline-block;width:14px;height:14px;margin-right:6px;vertical-align:middle;"></div>Анализ данных (Claude AI)…';

  // Build catalog summary for AI
  const catalogSummary = CATALOG.map(item =>
    item.options.map((opt,oi) => `${item.id}_${oi} | ${item.name} — ${opt.n} | ${item.cat} | ${fmtPrice(opt.p)} ₽/${item.unit}`).join('\n')
  ).join('\n');
  const bldSummary = BUILDING_TYPES.filter(b=>!b.isAbk).map(bt =>
    `bld_${bt.id} | ${bt.name} | infra | ${fmtPrice(bt.price)} ₽/м²`
  ).join('\n');

  const prompt = `Ты аналитик рынка спортивного оборудования. Тебе даны:

1. КАТАЛОГ ТОВАРОВ (id | Название — Вариант | Категория | Текущая цена):
${catalogSummary}
${bldSummary}

2. ДАННЫЕ ИССЛЕДОВАНИЯ РЫНКА:
${raw.substring(0, 8000)}

ЗАДАЧА: Сопоставь каждую позицию из исследования с позицией каталога. Для каждого совпадения верни JSON-массив объектов:

[
  {
    "catalogKey": "padel_std_0",
    "researchName": "название из исследования",
    "researchPrice": 1500000,
    "competitor": "название поставщика/конкурента",
    "confidence": "high|medium|low",
    "note": "краткий комментарий о сопоставлении"
  }
]

ПРАВИЛА:
- catalogKey = id из каталога (например "padel_std_0", "tennis_hard_1", "bld_lstk")
- Если в исследовании цена указана за м² — приведи к цене за единицу, умножив на площадь из каталога
- Если одна позиция исследования подходит к нескольким вариантам — выбери наиболее близкий
- confidence: high = точное совпадение, medium = похоже но не точно, low = только примерное соответствие
- Если позиция из исследования не соответствует ничему — пропусти
- Верни ТОЛЬКО JSON-массив, без маркдауна и пояснений`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514', max_tokens:4000, messages:[{role:'user',content:prompt}]})
    });
    const data = await res.json();
    if(data.error){
      statusEl.innerHTML = `<span style="color:var(--red)">Ошибка AI: ${data.error.message}</span>`;
      btn.disabled = false;
      return;
    }
    const text = data.content?.find(c=>c.type==='text')?.text || '';

    // Parse JSON from response (handle markdown code blocks)
    let json;
    try {
      const cleaned = text.replace(/```json?\s*/g,'').replace(/```/g,'').trim();
      json = JSON.parse(cleaned);
    } catch(e){
      // Try to find JSON array in response
      const m = text.match(/\[[\s\S]*\]/);
      if(m) json = JSON.parse(m[0]);
      else throw new Error('Не удалось распарсить ответ AI');
    }

    if(!Array.isArray(json) || !json.length){
      statusEl.innerHTML = '<span style="color:var(--red)">AI не нашёл совпадений в данных исследования.</span>';
      btn.disabled = false;
      return;
    }

    _researchMatches = json;
    renderResearchResults(json);
    statusEl.innerHTML = `<span style="color:var(--green)">Найдено ${json.length} совпадений</span>`;
    document.getElementById('researchApplyBtn').style.display = '';
  } catch(err){
    statusEl.innerHTML = `<span style="color:var(--red)">Ошибка: ${err.message}</span>`;
  }
  btn.disabled = false;
}

function renderResearchResults(matches){
  const el = document.getElementById('researchResults');
  const confColors = {high:'#4ade80', medium:'#fbbf24', low:'#f87171'};
  const confLabels = {high:'Точно', medium:'Похоже', low:'Примерно'};

  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr style="border-bottom:1px solid var(--bd);color:var(--tx2);">
      <th style="padding:6px;text-align:left;width:30px;"><input type="checkbox" checked onchange="toggleAllResearch(this.checked)"></th>
      <th style="padding:6px;text-align:left;">Из исследования</th>
      <th style="padding:6px;text-align:left;">Сопоставлено с каталогом</th>
      <th style="padding:6px;text-align:right;">Текущая цена</th>
      <th style="padding:6px;text-align:right;">Цена исследования</th>
      <th style="padding:6px;text-align:right;">Δ</th>
      <th style="padding:6px;text-align:center;">Точность</th>
    </tr></thead><tbody>`;

  matches.forEach((m, i) => {
    // Find current price
    let currentPrice = 0, catalogName = m.catalogKey;
    if(m.catalogKey.startsWith('bld_')){
      const btId = m.catalogKey.replace('bld_','');
      const bt = BUILDING_TYPES.find(b=>b.id===btId);
      if(bt){currentPrice = bt.price; catalogName = bt.name + ' (за м²)';}
    } else {
      const parts = m.catalogKey.split('_');
      const oi = parseInt(parts.pop());
      const itemId = parts.join('_');
      const item = CATALOG.find(c=>c.id===itemId);
      if(item && item.options[oi]){
        currentPrice = item.options[oi].p;
        catalogName = `${item.name} — ${item.options[oi].n}`;
      }
    }
    const diff = currentPrice ? Math.round((m.researchPrice - currentPrice)/currentPrice*100) : 0;
    const diffClr = diff > 10 ? '#f87171' : diff < -10 ? '#4ade80' : '#fff';
    const diffSign = diff > 0 ? '+' : '';

    html += `<tr style="border-bottom:1px solid rgba(255,255,255,.05);">
      <td style="padding:6px;"><input type="checkbox" checked data-idx="${i}" class="researchCheck"></td>
      <td style="padding:6px;color:#fff;"><b>${m.researchName||''}</b><br><span style="color:var(--tx3);font-size:10px;">${m.competitor||''}</span></td>
      <td style="padding:6px;color:var(--cyan);">${catalogName}<br><span style="color:var(--tx4);font-size:10px;">${m.catalogKey}</span></td>
      <td style="padding:6px;text-align:right;color:#fff;">${fmtPrice(currentPrice)}</td>
      <td style="padding:6px;text-align:right;color:#fff;font-weight:600;">${fmtPrice(m.researchPrice)}</td>
      <td style="padding:6px;text-align:right;color:${diffClr};font-weight:600;">${diffSign}${diff}%</td>
      <td style="padding:6px;text-align:center;"><span style="color:${confColors[m.confidence]||'#aaa'};font-size:10px;font-weight:600;">${confLabels[m.confidence]||m.confidence}</span></td>
    </tr>`;
    if(m.note){
      html += `<tr><td></td><td colspan="6" style="padding:2px 6px 6px;font-size:10px;color:var(--tx4);">${m.note}</td></tr>`;
    }
  });

  html += '</tbody></table>';
  el.innerHTML = html;
}

function toggleAllResearch(checked){
  document.querySelectorAll('.researchCheck').forEach(cb => cb.checked = checked);
}

function applyResearchPrices(){
  const checked = document.querySelectorAll('.researchCheck:checked');
  if(!checked.length){alert('Выберите хотя бы одну позицию');return;}

  let updated = 0, addedCompetitors = 0;

  checked.forEach(cb => {
    const idx = parseInt(cb.dataset.idx);
    const m = _researchMatches[idx];
    if(!m) return;

    if(m.catalogKey.startsWith('bld_')){
      // Building type
      const btId = m.catalogKey.replace('bld_','');
      const bt = BUILDING_TYPES.find(b=>b.id===btId);
      if(bt){
        // Update MARKET_DATA competitor list
        if(!MARKET_DATA[m.catalogKey]) MARKET_DATA[m.catalogKey] = {avg:null, c:[]};
        MARKET_DATA[m.catalogKey].c.push({n:m.competitor||'Исследование', p:m.researchPrice});
        // Recalc average
        const prices = MARKET_DATA[m.catalogKey].c.filter(c=>c.p).map(c=>c.p);
        if(prices.length) MARKET_DATA[m.catalogKey].avg = Math.round(prices.reduce((a,b)=>a+b,0)/prices.length);
        addedCompetitors++;
      }
    } else {
      // Catalog item
      const parts = m.catalogKey.split('_');
      const oi = parseInt(parts.pop());
      const itemId = parts.join('_');
      const mdKey = itemId + '_' + oi;

      // Update MARKET_DATA
      if(!MARKET_DATA[mdKey]) MARKET_DATA[mdKey] = {avg:null, c:[]};
      MARKET_DATA[mdKey].c.push({n:m.competitor||'Исследование', p:m.researchPrice});
      // Recalc average
      const prices = MARKET_DATA[mdKey].c.filter(c=>c.p).map(c=>c.p);
      if(prices.length) MARKET_DATA[mdKey].avg = Math.round(prices.reduce((a,b)=>a+b,0)/prices.length);
      addedCompetitors++;
    }
    updated++;
  });

  renderSettings();
  renderAllGrids();
  recalc();
  closeModal('researchModal');
  alert(`Обновлено конкурентов: ${addedCompetitors}\nРыночные средние пересчитаны.\n\nЧтобы применить рыночные цены к вашему каталогу — нажмите "Рыночные цены" в настройках.`);
}

function resetCalc(){if(!confirm('Сбросить все выбранные объекты?'))return;APP.hangars=[];initCalc();}
function goToPlanner(){switchModule('plan',document.querySelectorAll('.mTab')[2]);buildLibrary();}

// ═══════════════════════════════════════════════════════
// PRESETS — типовые сценарии
// ═══════════════════════════════════════════════════════
const PRESETS = [
  {
    id:'padel_club_6',
    name:'Падел-клуб 6 кортов',
    icon:'🎾',
    desc:'6 крытых падел-кортов + АБК с полной инфраструктурой',
    tags:['Крытый','6 кортов','АБК'],
    items:[
      {id:'padel_std',oi:1,qty:6},
      {id:'locker_m',oi:1,qty:50},{id:'locker_f',oi:1,qty:50},
      {id:'wc',oi:0,qty:40},{id:'heating',oi:0,qty:1},
      {id:'coach_room',oi:0,qty:20},{id:'reception',oi:0,qty:30},
      {id:'cafe',oi:0,qty:50},{id:'light',oi:1,qty:6}
    ],
    buildings:[{type:3,area:2400}] // ЛСТК
  },
  {
    id:'padel_tennis_mix',
    name:'Падел + Теннис клуб',
    icon:'🏸',
    desc:'5 падел-кортов + 2 теннисных корта под одной крышей + АБК',
    tags:['Крытый','5 падел','2 теннис','АБК'],
    items:[
      {id:'padel_std',oi:1,qty:5},
      {id:'tennis_hard',oi:1,qty:2},
      {id:'locker_m',oi:1,qty:60},{id:'locker_f',oi:1,qty:60},
      {id:'wc',oi:0,qty:50},{id:'heating',oi:0,qty:1},
      {id:'coach_room',oi:0,qty:25},{id:'reception',oi:0,qty:40},
      {id:'cafe',oi:0,qty:60},{id:'light',oi:1,qty:7}
    ],
    buildings:[{type:3,area:3500}]
  },
  {
    id:'ice_football',
    name:'Ледовая арена + Футбол',
    icon:'⛸',
    desc:'Ледовая арена олимпийский размер + футбольное поле 11×11 + АБК',
    tags:['Крытый','Лёд','Футбол','АБК'],
    items:[
      {id:'ice',oi:0,qty:1},
      {id:'football_11',oi:1,qty:1},
      {id:'locker_m',oi:1,qty:100},{id:'locker_f',oi:1,qty:100},
      {id:'wc',oi:0,qty:80},{id:'heating',oi:0,qty:1},
      {id:'coach_room',oi:0,qty:40},{id:'reception',oi:0,qty:50},
      {id:'cafe',oi:0,qty:80},{id:'tribune',oi:1,qty:4},
      {id:'light',oi:1,qty:1},{id:'storage',oi:0,qty:50}
    ],
    buildings:[{type:3,area:3000}]
  },
  {
    id:'ice_padel',
    name:'Ледовая арена + Падел',
    icon:'🏒',
    desc:'Ледовая арена + 5 падел-кортов + АБК',
    tags:['Крытый','Лёд','5 падел','АБК'],
    items:[
      {id:'ice',oi:0,qty:1},
      {id:'padel_std',oi:1,qty:5},
      {id:'locker_m',oi:1,qty:80},{id:'locker_f',oi:1,qty:80},
      {id:'wc',oi:0,qty:60},{id:'heating',oi:0,qty:1},
      {id:'coach_room',oi:0,qty:30},{id:'reception',oi:0,qty:40},
      {id:'cafe',oi:0,qty:70},{id:'tribune',oi:1,qty:2},
      {id:'light',oi:1,qty:5},{id:'storage',oi:0,qty:40}
    ],
    buildings:[{type:3,area:3200}]
  },
  {
    id:'resort_mega',
    name:'Спортивный курорт «Всё включено»',
    icon:'🏖',
    desc:'Падел (5) + Теннис (2) + Глэмпинг (16 домов) + Баня + Ресторан + Батуты',
    tags:['Курорт','Падел','Теннис','Глэмпинг','Велнес','Батуты'],
    items:[
      {id:'padel_std',oi:1,qty:5},
      {id:'tennis_hard',oi:1,qty:2},
      // Глэмпинг: 10 домов на 4 чел
      {id:'glamp_aframe',oi:1,qty:5},{id:'glamp_modular',oi:1,qty:5},
      // 5 домов на 6-8 чел
      {id:'glamp_aframe',oi:2,qty:3},{id:'glamp_modular',oi:2,qty:2},
      // 1 большой купол
      {id:'glamp_dome_m',oi:1,qty:1},
      // Велнес
      {id:'banya',oi:1,qty:1},{id:'sauna',oi:1,qty:1},{id:'hammam',oi:1,qty:1},
      // Батутный центр
      {id:'trampoline',oi:1,qty:1},
      // Инфра
      {id:'locker_m',oi:1,qty:80},{id:'locker_f',oi:1,qty:80},
      {id:'wc',oi:0,qty:60},{id:'heating',oi:0,qty:1},
      {id:'reception',oi:0,qty:60},{id:'cafe',oi:0,qty:150},
      {id:'coach_room',oi:0,qty:30},{id:'light',oi:1,qty:7},
      {id:'storage',oi:0,qty:40}
    ],
    buildings:[{type:3,area:2000},{type:4,area:600}] // ЛСТК + Дерево
  },
  {
    id:'kids_sport',
    name:'Детский спортивный центр',
    icon:'🧒',
    desc:'Батуты + Скалодром + Универсальная площадка + Бассейн детский',
    tags:['Детский','Батуты','Скалодром','Бассейн'],
    items:[
      {id:'trampoline',oi:1,qty:1},
      {id:'climb',oi:0,qty:1},{id:'climb',oi:1,qty:1},
      {id:'universal',oi:2,qty:1},
      {id:'pool_indoor',oi:2,qty:1},
      {id:'locker_m',oi:0,qty:40},{id:'locker_f',oi:0,qty:40},
      {id:'wc',oi:0,qty:40},{id:'reception',oi:0,qty:30},
      {id:'cafe',oi:0,qty:40},{id:'heating',oi:0,qty:1}
    ],
    buildings:[{type:3,area:2000}]
  },
  {
    id:'school_stadium',
    name:'Школьный стадион',
    icon:'🏫',
    desc:'Беговая 200м + Футбол 7×7 + Баскетбол + Воркаут + Трибуны',
    tags:['Открытый','Школа','Беговая','Футбол'],
    items:[
      {id:'run_200',oi:0,qty:1},
      {id:'football_7',oi:0,qty:1},
      {id:'basketball',oi:0,qty:1},
      {id:'volleyball',oi:1,qty:1},
      {id:'workout_m',oi:0,qty:1},
      {id:'tribune',oi:0,qty:4},
      {id:'light',oi:0,qty:1},
      {id:'fencing',oi:0,qty:400},
      {id:'paving',oi:1,qty:500},
      {id:'greenery',oi:0,qty:2000}
    ],
    buildings:[]
  },
  {
    id:'wellness_spa',
    name:'Велнес-центр «СПА»',
    icon:'♨',
    desc:'Бассейн 25м + Хамам + Сауна + Соляная комната + Баня',
    tags:['Крытый','Бассейн','Хамам','Сауна','Баня'],
    items:[
      {id:'pool_indoor',oi:0,qty:1},
      {id:'pool_indoor',oi:1,qty:1},
      {id:'hammam',oi:1,qty:1},{id:'sauna',oi:1,qty:1},
      {id:'salt_room',oi:0,qty:1},{id:'banya',oi:1,qty:1},
      {id:'locker_m',oi:1,qty:60},{id:'locker_f',oi:1,qty:60},
      {id:'wc',oi:0,qty:50},{id:'reception',oi:0,qty:40},
      {id:'cafe',oi:0,qty:60},{id:'heating',oi:0,qty:1}
    ],
    buildings:[{type:5,area:1500}] // Монолит
  },
  {
    id:'glamping_resort',
    name:'Глэмпинг-парк на 20 домов',
    icon:'🏕',
    desc:'А-фреймы + Модульные + Купола + Сафари-тенты + Баня',
    tags:['Глэмпинг','20 домов','Баня','Природа'],
    items:[
      {id:'glamp_aframe',oi:1,qty:6},
      {id:'glamp_modular',oi:1,qty:6},
      {id:'glamp_dome_s',oi:1,qty:4},
      {id:'glamp_safari',oi:1,qty:4},
      {id:'banya',oi:1,qty:1},{id:'sauna',oi:0,qty:1},
      {id:'reception',oi:0,qty:30},{id:'cafe',oi:0,qty:80},
      {id:'wc',oi:0,qty:30},{id:'light',oi:0,qty:1},
      {id:'paving',oi:1,qty:800},{id:'greenery',oi:1,qty:3000},
      {id:'fencing',oi:0,qty:600},{id:'drainage',oi:0,qty:200}
    ],
    buildings:[]
  },
  {
    id:'multisport',
    name:'Мультиспорт комплекс',
    icon:'🏅',
    desc:'Беговая 400м + Футбол 11×11 + Баскетбол + Волейбол + Воркаут + Трибуны',
    tags:['Открытый','Стадион','Футбол','Лёгкая атлетика'],
    items:[
      {id:'run_400',oi:0,qty:1},
      {id:'football_11',oi:1,qty:1},
      {id:'basketball',oi:0,qty:2},
      {id:'volleyball',oi:1,qty:2},
      {id:'workout_l',oi:0,qty:1},
      {id:'tribune',oi:1,qty:6},
      {id:'light',oi:1,qty:1},
      {id:'locker_m',oi:1,qty:100},{id:'locker_f',oi:1,qty:100},
      {id:'wc',oi:0,qty:80},{id:'reception',oi:0,qty:50},
      {id:'cafe',oi:0,qty:100},{id:'coach_room',oi:0,qty:40},
      {id:'heating',oi:0,qty:1},{id:'storage',oi:0,qty:60}
    ],
    buildings:[{type:3,area:1500}]
  }
];

function presetTotal(preset){
  let sum=0;
  preset.items.forEach(pi=>{
    const item=CATALOG.find(c=>c.id===pi.id);
    if(item&&item.options[pi.oi]) sum+=item.options[pi.oi].p*pi.qty;
  });
  (preset.buildings||[]).forEach(b=>{
    const bt=BUILDING_TYPES[b.type];
    if(bt) sum+=bt.price*b.area;
  });
  return sum;
}

function renderPresets(){
  const el=document.getElementById('tabPresets');
  if(!el) return;
  let html='<div style="padding:20px"><h3 style="color:#fff;font-size:16px;margin-bottom:4px">Типовые проекты</h3><p style="color:#aaa;font-size:12px;margin-bottom:16px">Выберите шаблон — объекты загрузятся в калькулятор. Потом можно менять количество и состав.</p>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px">';
  PRESETS.forEach((p,pi)=>{
    const total=presetTotal(p);
    const itemCount=p.items.length;
    const tags=p.tags.map(t=>`<span style="font-size:9px;color:#fff;background:rgba(255,255,255,.1);padding:2px 6px;border-radius:3px">${t}</span>`).join('');
    // Item summary (group by category)
    const summary=[];
    const seen={};
    p.items.forEach(pi2=>{
      const item=CATALOG.find(c=>c.id===pi2.id);
      if(!item) return;
      const key=item.id+'_'+pi2.oi;
      if(seen[key]){seen[key].qty+=pi2.qty;return;}
      seen[key]={name:item.name,opt:item.options[pi2.oi]?.n||'',qty:pi2.qty,unit:item.unit,price:item.options[pi2.oi]?.p||0};
      summary.push(seen[key]);
    });
    const rows=summary.map(s=>{
      const cost=s.price*s.qty;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="font-size:11px;color:#ccc">${s.name} <span style="color:#888">${s.opt}</span> ×${s.qty}</span>
        <span style="font-size:11px;color:#e5c585;font-family:var(--fm)">${fmtPrice(cost)} ₽</span>
      </div>`;
    }).join('');
    const bldRows=(p.buildings||[]).map(b=>{
      const bt=BUILDING_TYPES[b.type];
      if(!bt) return '';
      return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="font-size:11px;color:#ccc">Здание: ${bt.name} ${fmtPrice(b.area)} м²</span>
        <span style="font-size:11px;color:#e5c585;font-family:var(--fm)">${fmtPrice(bt.price*b.area)} ₽</span>
      </div>`;
    }).join('');

    html+=`<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;transition:border-color .15s" onmouseenter="this.style.borderColor='var(--gold)'" onmouseleave="this.style.borderColor='var(--bd)'">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div style="font-size:28px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:var(--bg3);border-radius:10px;flex-shrink:0">${p.icon}</div>
        <div><h4 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:2px">${p.name}</h4><p style="font-size:11px;color:#aaa;line-height:1.4">${p.desc}</p></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${tags}</div>
      <div id="presetDetail_${pi}" style="display:none;max-height:200px;overflow-y:auto;background:rgba(0,0,0,.2);border-radius:6px;padding:8px">
        ${rows}${bldRows}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto">
        <div>
          <div style="font-size:18px;font-weight:700;color:#e5c585;font-family:var(--fm)">${fmtPrice(total)} <span style="font-size:12px;color:#aaa">₽</span></div>
          <div style="font-size:10px;color:#888">${itemCount} позиций</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="document.getElementById('presetDetail_${pi}').style.display=document.getElementById('presetDetail_${pi}').style.display==='none'?'block':'none'" style="padding:6px 12px;background:transparent;border:1px solid var(--bd2);color:#aaa;border-radius:6px;font-size:11px;cursor:pointer">Состав</button>
          <button onclick="loadPreset(${pi})" style="padding:6px 16px;background:linear-gradient(135deg,#c5a059,#e5c585);color:#000;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">Загрузить</button>
        </div>
      </div>
    </div>`;
  });
  html+='</div></div>';
  el.innerHTML=html;
}

function loadPreset(idx){
  const preset=PRESETS[idx];
  if(!preset) return;
  if(!confirm('Загрузить шаблон «'+preset.name+'»?\nТекущий выбор будет сброшен.')) return;
  // Reset all
  CATALOG.forEach(it=>{APP.calcState[it.id]={opts:it.options.map(()=>0)};});
  APP.hangars=[];
  // Apply preset items
  preset.items.forEach(pi=>{
    const s=APP.calcState[pi.id];
    if(s) s.opts[pi.oi]=(s.opts[pi.oi]||0)+pi.qty;
  });
  // Create buildings/hangars from preset
  if(preset.buildings && preset.buildings.length){
    const btIds = BUILDING_TYPES.map(b=>b.id); // ['tent_cold','tent_warm','air','lstk','wood','concrete']
    preset.buildings.forEach(bld=>{
      const typeId = typeof bld.type==='number' ? (btIds[bld.type]||'lstk') : (bld.type||'lstk');
      const area = bld.area || 2400;
      // Calculate optimal w×h from area (prefer wider: ratio ~1.5:1)
      const h = Math.round(Math.sqrt(area / 1.5));
      const w = Math.round(area / h);
      const hangar = {id:Date.now()+Math.random()*1000|0, type:typeId, items:{}, w:w, h:h, layout:[]};
      // Auto-assign sport items to this hangar
      const sportCats = ['racket','team','athletics','fun'];
      preset.items.forEach(pi=>{
        const cat = CATALOG.find(c=>c.id===pi.id);
        if(cat && sportCats.includes(cat.cat)){
          hangar.items[pi.id] = {count:pi.qty, optIdx:pi.oi};
        }
      });
      APP.hangars.push(hangar);
    });
  }
  // Re-render
  renderAllGrids();
  renderHangars();
  renderSettings();
  recalc();
  updateCalcBadge();
  // Switch to Buildings module to show the result
  const bldModBtn = document.querySelectorAll('.mTab')[1]; // 02 Здания
  if(bldModBtn) switchModule('building', bldModBtn);
}
