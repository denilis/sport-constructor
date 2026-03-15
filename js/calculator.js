// ═══════════════════════════════════════════════════════
// CALCULATOR
// ═══════════════════════════════════════════════════════
if(!APP.thumbCache) APP.thumbCache = {};
if(!APP.localThumbs) APP.localThumbs = {};

// Check which local thumbnails exist (img/thumbs/*.jpg)
function checkLocalThumbs(){
  CATALOG.forEach(item => {
    item.options.forEach((opt, oi) => {
      const key = item.id + '_' + oi;
      const img = new Image();
      img.onload = () => { APP.localThumbs[key] = true; };
      img.src = 'img/thumbs/' + key + '.jpg';
    });
  });
}

function initCalc() {
  CATALOG.forEach(it => { APP.calcState[it.id] = {opts: it.options.map(()=>0)}; });
  checkLocalThumbs();
  // Small delay to let local thumb checks complete, then render
  setTimeout(() => {
    renderAllGrids();
    addHangar();
    renderSettings();
    recalc();
  }, 300);
}

function switchCTab(cat, btn) {
  document.querySelectorAll('#calcTabs .cTab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  // hide all
  document.querySelectorAll('.cGrid').forEach(g=>{g.classList.remove('show');});
  document.getElementById('tabBuilding').style.display='none';
  document.getElementById('tabSettings').style.display='none';
  if(cat==='building'){
    document.getElementById('tabBuilding').style.display='flex';
    renderHangars(); calcABK();
  } else if(cat==='settings'){
    document.getElementById('tabSettings').style.display='flex';
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

  const step = ['м²','м.п.','м³'].includes(item.unit)?10:(item.unit==='мест'?5:1);
  const varRows = item.options.map((opt,oi)=>{
    const q=s.opts[oi]||0;
    const specsTags = opt.specs ? `<div class="oSpecs">${opt.specs.map(s=>`<span class="oSpecTag">${s}</span>`).join('')}</div>` : '';
    const imgKey = item.id+'_'+oi;
    const localThumb = 'img/thumbs/'+imgKey+'.jpg';
    const cached = APP.thumbCache?.[imgKey];
    const thumbSrc = APP.localThumbs?.[imgKey] ? localThumb : (cached || null);
    const thumbContent = thumbSrc
      ? `<img src="${thumbSrc}" alt="${opt.n}">`
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
        if(d?.state==='success' || d?.successFlag===1 || d?.status==='completed' || d?.status==='success'){
          // Extract URL from various response formats
          if(d.resultJson){ try { const rj=JSON.parse(d.resultJson); imageUrl=rj.resultUrls?.[0]||rj.resultImageUrl; } catch(e){} }
          if(!imageUrl) imageUrl = d.response?.resultImageUrl || d.response?.imageUrl || d.resultImageUrl;
          if(!imageUrl && d.response && typeof d.response==='object'){ const v=Object.values(d.response).find(x=>typeof x==='string'&&x.includes('http')); if(v)imageUrl=v; }
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
    // ABK shell cost
    const abkArea=calcAbkArea();
    if(abkArea>0){
      const shellCost=abkArea*45000;
      total+=shellCost;
      plotArea+=abkArea;
      html+=`<div class="sumItem">
        <div><div class="sn">АБК — строительство</div><span class="sm">${abkArea} м² (вкл. коридоры)</span></div>
        <div class="sp">${fmt(shellCost)}</div>
      </div>`;
    }
    html+='</div>';
  }

  // Hangars
  if(APP.hangars.length){
    html+=`<div class="sumSection"><div class="sumSect">Здания / Ангары</div>`;
    APP.hangars.forEach((h,i)=>{
      const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[0];
      const area=calcHangarArea(h);
      if(area>0){
        const cost=area*bt.price;
        total+=cost;
        plotArea+=area;
        html+=`<div class="sumItem">
          <div><div class="sn">Ангар №${i+1}</div><span class="sm">${bt.name}, ${area} м²</span></div>
          <div class="sp">${fmt(cost)}</div>
        </div>`;
      }
    });
    html+='</div>';
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
function calcABK() {
  const infraItems=CATALOG.filter(i=>i.cat==='infra' && itemTotalQty(i.id)>0);
  let net=0, listH='';
  infraItems.forEach(item=>{
    const tq=itemTotalQty(item.id);
    let area=0;
    if(item.unit==='мест'){area=Math.ceil(tq*2.5);listH+=`<div style="display:flex;justify-content:space-between"><span>${item.name}</span><span style="color:var(--gold2)">${tq} мест ≈ ${area} м²</span></div>`;}
    else if(item.unit==='м²'){area=tq;listH+=`<div style="display:flex;justify-content:space-between"><span>${item.name}</span><span style="color:var(--gold2)">${area} м²</span></div>`;}
    else {listH+=`<div style="display:flex;justify-content:space-between"><span>${item.name}</span><span style="color:var(--gold2)">${tq} ед.</span></div>`;}
    if(['м²','мест'].includes(item.unit)) net+=area;
  });
  const pct=parseInt(document.getElementById('abk-corridor-pct')?.value||30);
  const circulation=Math.ceil(net*(pct/100));
  const gross=net+circulation;
  listH+=`<div style="border-top:1px solid #333;margin-top:4px;padding-top:4px;color:var(--tx3)">+ Коридоры ${pct}%: ${circulation} м²</div>`;
  const abkEl=document.getElementById('abk-list-mini');
  if(abkEl) abkEl.innerHTML=listH||'<span style="color:var(--tx4)">Пусто</span>';
  const areaEl=document.getElementById('abk-area-disp');
  const costEl=document.getElementById('abk-cost-disp');
  if(areaEl) areaEl.textContent=gross+' м²';
  if(costEl) costEl.textContent=fmt(gross*45000);
  if(document.getElementById('abk-corridor-val')) document.getElementById('abk-corridor-val').textContent=pct+'%';
  recalc();
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
  APP.hangars.forEach((h,idx)=>{
    const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[0];
    const area=calcHangarArea(h);
    const cost=area*bt.price;
    const itemsInCat=['racket','team','athletics','fun'].flatMap(c=>CATALOG.filter(i=>i.cat===c));
    let selectedH='';
    Object.entries(h.items||{}).forEach(([id,d])=>{
      const it=CATALOG.find(i=>i.id===id);
      if(it) selectedH+=`<div class="hSel"><span>${it.name} × ${d.count}</span><em>${it.areaW*it.areaL*d.count} м²</em><button class="rmBtn" onclick="removeFromHangar(${h.id},'${id}')">×</button></div>`;
    });
    // Split picker: selected in calculator vs others
    const calcSelected = itemsInCat.filter(it => itemTotalQty(it.id) > 0);
    const calcOthers = itemsInCat.filter(it => itemTotalQty(it.id) <= 0);
    let pickerH = '';
    if(calcSelected.length) pickerH += '<div class="hPickerLabel">Выбранные:</div>' + calcSelected.map(it=>`<div class="hItem hItemSel" onclick="addToHangar(${h.id},'${it.id}')">${it.icon} ${it.name} <span class="hItemQty">×${itemTotalQty(it.id)}</span></div>`).join('');
    if(calcOthers.length) pickerH += '<div class="hPickerLabel">Другие:</div>' + calcOthers.map(it=>`<div class="hItem" onclick="addToHangar(${h.id},'${it.id}')">${it.icon} ${it.name}</div>`).join('');
    cont.innerHTML+=`
    <div class="bCard">
      <div class="bCardHead">
        <div><h4 style="color:var(--gold2)">Ангар №${idx+1}</h4><div class="bMeta">${bt.name} · ${area} м² · ${fmt(cost)}${h.layout?.length?' · '+h.layout.length+' объектов':''}</div></div>
        <div style="display:flex;gap:4px;">
          <button class="pBtn" style="color:var(--cyan);border-color:rgba(34,211,238,.3);" onclick="openHangarEditor(${h.id})">Редактор</button>
          <button class="pBtn red" onclick="removeHangar(${h.id})">✕</button>
        </div>
      </div>
      <div class="bCardBody">
        <div class="bRow">
          <div class="bField"><label>Тип здания</label>
            <select onchange="updateHangar(${h.id},'type',this.value)">
              ${BUILDING_TYPES.map(b=>`<option value="${b.id}"${b.id===h.type?' selected':''}>${b.name} — ${fmt2(b.price)} ₽/м²</option>`).join('')}
            </select>
          </div>
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
function renderSettings() {
  const el=document.getElementById('tabSettings');
  if(!el) return;
  const cats=['racket','team','athletics','fun','glamping','wellness','infra','prep'];
  const catNames={racket:'Ракеточные',team:'Командные',athletics:'Атлетика',fun:'Развлечения',glamping:'Глэмпинг',wellness:'Велнес / СПА',infra:'Инфраструктура',prep:'Благоустройство'};
  let html=`<div style="overflow-y:auto;flex:1;"><table class="priceTable"><colgroup><col style="width:18%"><col style="width:15%"><col style="width:37%"><col style="width:22%"><col style="width:8%"></colgroup><thead><tr><th>Объект</th><th>Вариант</th><th>Комплектация</th><th style="text-align:right">Цена</th><th>Ед.</th></tr></thead><tbody>`;
  cats.forEach(cat=>{
    html+=`<tr><td colspan="5" class="priceCat">${catNames[cat]||cat}</td></tr>`;
    CATALOG.filter(i=>i.cat===cat).forEach(item=>{
      item.options.forEach((opt,oi)=>{
        const specs = opt.specs ? `<div class="priceSpecs"><span>${opt.specs.join(', ')}</span></div>` : '';
        html+=`<tr>
          <td style="color:var(--tx)">${item.name}</td>
          <td style="color:var(--tx3);white-space:nowrap;">${opt.n}</td>
          <td>${specs}</td>
          <td style="text-align:right;white-space:nowrap;"><input class="priceInput" type="number" value="${opt.p}" min="0" step="1000" onchange="updatePrice('${item.id}',${oi},this.value)" onblur="recalc()"></td>
          <td style="color:var(--tx3);white-space:nowrap;">${item.unit}</td>
        </tr>`;
      });
    });
    if(cat==='infra'){
      html+=`<tr><td colspan="5" class="priceCat">Типы зданий (₽/м²)</td></tr>`;
      BUILDING_TYPES.forEach((bt,bi)=>{
        html+=`<tr><td style="color:var(--tx)">${bt.name}</td><td style="color:var(--tx3)">за м²</td><td></td>
          <td style="text-align:right"><input class="priceInput" type="number" value="${bt.price}" min="0" step="500" onchange="BUILDING_TYPES[${bi}].price=+this.value;recalc()"></td>
          <td style="color:var(--tx3)">₽/м²</td></tr>`;
      });
    }
  });
  html+='</tbody></table></div>';
  el.innerHTML=html;
}
function updatePrice(id,oi,val){const item=CATALOG.find(i=>i.id===id);if(item)item.options[oi].p=+val;}

function resetCalc(){if(!confirm('Сбросить все выбранные объекты?'))return;APP.hangars=[];initCalc();}
function goToPlanner(){switchModule('plan',document.querySelectorAll('.mTab')[1]);buildLibrary();}
