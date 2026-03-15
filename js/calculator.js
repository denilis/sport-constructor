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

function initCalc() {
  CATALOG.forEach(it => { APP.calcState[it.id] = {opts: it.options.map(()=>0)}; });
  checkLocalThumbs();
  renderAllGrids();
  addHangar();
  renderSettings();
  recalc();
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
  const filteredCats=f==='all'?cats:cats.filter(c=>c===f);
  // Filter bar
  let html='<div style="display:flex;gap:6px;padding:10px 16px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--bd);flex-shrink:0">';
  html+=`<button onclick="window._settingsFilter='all';renderSettings()" style="padding:4px 10px;border-radius:4px;border:1px solid ${f==='all'?'var(--gold)':'var(--bd)'};background:${f==='all'?'rgba(197,160,89,.15)':'transparent'};color:${f==='all'?'var(--gold2)':'#aaa'};font-size:11px;cursor:pointer">Все</button>`;
  cats.forEach(cat=>{
    const active=f===cat;
    html+=`<button onclick="window._settingsFilter='${cat}';renderSettings()" style="padding:4px 10px;border-radius:4px;border:1px solid ${active?'var(--gold)':'var(--bd)'};background:${active?'rgba(197,160,89,.15)':'transparent'};color:${active?'var(--gold2)':'#aaa'};font-size:11px;cursor:pointer">${catNames[cat]}</button>`;
  });
  html+=`<div style="flex:1"></div><button onclick="applyMarketPrices('${f}')" style="padding:5px 14px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">Рыночные цены${f!=='all'?' ('+catNames[f]+')':' (все)'}</button>`;
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
