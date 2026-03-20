// ═══════════════════════════════════════════════════════
// HANGAR INTERIOR EDITOR
// ═══════════════════════════════════════════════════════
const HE = { // Hangar Editor state
  active: false,
  hangarId: null,
  canvas: null, ctx: null,
  zoom: 1, panX: 20, panY: 20,
  ppm: 8,         // pixels per meter
  selected: null,  // index in layout
  dragging: false, dRelX:0, dRelY:0,
  placing: null,   // itemId being placed
  panning: false, panStartX:0, panStartY:0,
  mouse:{x:0,y:0},
  currentFloor: 1, // 1 or 2 (ABK only)
  resizing: false, resizeEdge: null, // edge resize state
  snapDist: 0.5, // snap threshold in meters
};

function openHangarEditor(hangarId){
  const h = APP.hangars.find(x=>x.id===hangarId);
  if(!h) return;
  if(!h.w) h.w = 60;  // default hangar width
  if(!h.h) h.h = 40;  // default hangar height
  if(!h.layout) h.layout = [];
  if(h.wallOffset===undefined) h.wallOffset = 3;
  if(h.objectGap===undefined) h.objectGap = 2;
  HE.hangarId = hangarId;
  HE.active = true;
  HE.selected = null;
  HE.placing = null;
  HE.dragging = false;
  HE.resizing = false;
  HE.currentFloor = 1;

  // Auto-fit zoom
  const modal = document.getElementById('hangarEditorModal');
  modal.classList.add('show');
  const cvEl = document.getElementById('heCv');
  const cont = cvEl.parentElement;
  cvEl.width = cont.clientWidth;
  cvEl.height = cont.clientHeight;
  HE.canvas = cvEl;
  HE.ctx = cvEl.getContext('2d');
  HE.ppm = Math.min((cvEl.width-80)/h.w, (cvEl.height-80)/h.h);
  HE.panX = (cvEl.width - h.w*HE.ppm)/2;
  HE.panY = (cvEl.height - h.h*HE.ppm)/2;
  HE.zoom = 1;

  // Update header: title + floor tabs for ABK
  const isAbk = h.type === 'abk';
  const floors = h.floors || 1;
  document.querySelector('#hangarEditorModal .heHeader h3').textContent =
    isAbk ? 'КОНСТРУКТОР АБК' : 'КОНСТРУКТОР АНГАРА';

  // Floor tabs (ABK with 2+ floors)
  let floorTabsEl = document.getElementById('heFloorTabs');
  if(!floorTabsEl){
    floorTabsEl = document.createElement('div');
    floorTabsEl.id = 'heFloorTabs';
    floorTabsEl.style.cssText = 'display:flex;gap:4px;margin-left:12px;';
    // Insert after the title h3
    const h3 = document.querySelector('#hangarEditorModal .heHeader h3');
    h3.after(floorTabsEl);
  }
  if(isAbk && floors >= 2){
    floorTabsEl.innerHTML = `
      <button class="heFloorTab active" onclick="heSwitchFloor(1)" id="heFloor1Btn" style="padding:3px 10px;font-size:11px;border:1px solid var(--cyan);background:rgba(34,211,238,.2);color:var(--cyan);border-radius:4px;cursor:pointer;font-weight:600;">Этаж 1</button>
      <button class="heFloorTab" onclick="heSwitchFloor(2)" id="heFloor2Btn" style="padding:3px 10px;font-size:11px;border:1px solid var(--bd);background:transparent;color:var(--tx3);border-radius:4px;cursor:pointer;">Этаж 2</button>
    `;
    floorTabsEl.style.display = 'flex';
  } else {
    floorTabsEl.style.display = 'none';
    floorTabsEl.innerHTML = '';
  }

  // Populate palette
  buildHEPalette(h);
  // Update dimension inputs
  document.getElementById('heW').value = h.w;
  document.getElementById('heH').value = h.h;
  document.getElementById('heWallOff').value = h.wallOffset;
  document.getElementById('heObjGap').value = h.objectGap;
  drawHangarInterior();
}

function closeHangarEditor(){
  HE.active = false;
  document.getElementById('hangarEditorModal').classList.remove('show');
  renderHangars(); recalc();
}

// Get current floor's layout array (returns reference)
function heGetLayout(h){
  if(!h) h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h) return [];
  if(h.type === 'abk' && HE.currentFloor === 2){
    if(!h.layout2) h.layout2 = [];
    return h.layout2;
  }
  if(!h.layout) h.layout = [];
  return h.layout;
}

function heSwitchFloor(f){
  HE.currentFloor = f;
  HE.selected = null;
  HE.placing = null;
  HE.dragging = false;
  HE.resizing = false;
  // Update tab styling
  const b1 = document.getElementById('heFloor1Btn');
  const b2 = document.getElementById('heFloor2Btn');
  if(b1 && b2){
    [b1,b2].forEach(b=>{b.style.background='transparent';b.style.borderColor='var(--bd)';b.style.color='var(--tx3)';b.style.fontWeight='400';});
    const active = f===1 ? b1 : b2;
    active.style.background='rgba(34,211,238,.2)';active.style.borderColor='var(--cyan)';active.style.color='var(--cyan)';active.style.fontWeight='600';
  }
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  buildHEPalette(h);
  drawHangarInterior();
  updateHEProps();
}

function buildHEPalette(h){
  const pal = document.getElementById('hePalette');
  const isAbk = h && h.type === 'abk';

  if(isAbk){
    // ABK mode: show ROOM_CATALOG items grouped by type
    const curLayout = heGetLayout(h);
    const allRooms = [...(h.layout||[]), ...(h.layout2||[])];
    const groupLabels = {common:'💁 Общие', sanitary:'🚿 Раздевалки / Санузлы', tech:'⚡ Технические', service:'🚪 Служебные'};
    const groupOrder = ['common','sanitary','tech','service'];
    const grouped = {};
    ROOM_CATALOG.forEach(rm => {
      const g = rm.group || 'common';
      if(!grouped[g]) grouped[g] = [];
      grouped[g].push(rm);
    });
    let html = `<div onclick="showAbkAutoCalcModal(${h.id})" style="cursor:pointer;padding:8px;margin:6px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);border-radius:6px;text-align:center;color:#4ade80;font-size:12px;font-weight:600;">📐 Авто-расчёт по нормам СП</div>`;
    for(const g of groupOrder){
      if(!grouped[g]) continue;
      const items = grouped[g];
      const placedInGroup = items.reduce((s,rm)=>s+curLayout.filter(li=>li.itemId===rm.id).length, 0);
      const isOpen = HE['_grp_abk_'+g] !== undefined ? HE['_grp_abk_'+g] : true;
      let badge = placedInGroup > 0 ? `<span style="background:rgba(74,222,128,.2);color:#4ade80;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:auto;">${placedInGroup} разм.</span>` : '';
      html += `<div class="hePalGroup" onclick="HE['_grp_abk_${g}']=${isOpen?'false':'true'};buildHEPalette(APP.hangars.find(x=>x.id===HE.hangarId));" style="cursor:pointer;padding:7px 8px;color:var(--cyan);font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;border-bottom:1px solid rgba(255,255,255,.06);user-select:none;">
        <span style="font-size:10px;transition:transform .2s;transform:rotate(${isOpen?'90':'0'}deg)">▶</span> ${groupLabels[g]} <span style="color:#555;font-weight:400;font-size:10px">(${items.length})</span>${badge}
      </div>`;
      if(isOpen){
        items.forEach(rm => {
          const placed = allRooms.filter(li=>li.itemId===rm.id).length;
          const placedArea = allRooms.filter(li=>li.itemId===rm.id).reduce((s,li)=>s+li.w*li.h, 0);
          let countHtml = placed > 0 ? `<span class="hePalCount">${placed} шт · ${placedArea} м²</span>` : '';
          html += `
          <div class="hePalItem${HE.placing===rm.id?' active':''}" onclick="heStartPlace('${rm.id}')" title="${rm.name} (${rm.defaultW}×${rm.defaultH}м)">
            <span>${rm.icon}</span>
            <div class="hePalInfo"><b>${rm.name}</b><span class="hePalDims">${rm.defaultW}×${rm.defaultH}м</span>${countHtml}</div>
          </div>`;
        });
      }
    }
    pal.innerHTML = html;
    return;
  }

  // Sport hangar mode: show CATALOG items grouped by category with collapsible sections
  const sportItems = ['racket','team','athletics','fun','wellness'].flatMap(c=>CATALOG.filter(i=>i.cat===c && i.areaW>0 && i.areaL>0));
  const infra = CATALOG.filter(i=>i.cat==='infra' && i.areaW>0);
  const all = [...sportItems, ...infra];

  const curLayout = heGetLayout(h);
  const renderItem = it => {
    const totalQty = itemTotalQty(it.id);
    const placed = curLayout ? curLayout.filter(li=>li.itemId===it.id).length : 0;
    let countHtml = '';
    if(totalQty > 0){
      const cls = placed >= totalQty ? 'done' : (placed > 0 ? '' : 'none');
      countHtml = `<span class="hePalCount ${cls}">${placed} из ${totalQty}</span>`;
    }
    const selectedCls = totalQty > 0 ? ' hePalSel' : '';
    return `
    <div class="hePalItem${HE.placing===it.id?' active':''}${selectedCls}" onclick="heStartPlace('${it.id}')" title="${it.name} (${it.areaW}×${it.areaL}м)">
      <span>${it.icon}</span>
      <div class="hePalInfo"><b>${it.name}</b><span class="hePalDims">${it.areaW}×${it.areaL}м</span>${countHtml}</div>
    </div>`;
  };

  const catLabels = {racket:'🎾 Ракеточные', team:'⚽ Командные', athletics:'🏃 Атлетика', fun:'🎪 Развлечения', wellness:'🧖 Велнес', infra:'🏢 Инфраструктура'};
  const catOrder = ['racket','team','athletics','fun','wellness','infra'];

  // Group all items by category
  const grouped = {};
  all.forEach(it => {
    const cat = it.cat || 'other';
    if(!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  });

  let html = '';

  for(const cat of catOrder){
    if(!grouped[cat] || !grouped[cat].length) continue;
    const items = grouped[cat];
    const selectedCount = items.filter(it => itemTotalQty(it.id) > 0).length;
    const placedCount = items.filter(it => curLayout?.some(li => li.itemId === it.id)).length;
    const label = catLabels[cat] || cat;

    // Auto-open categories that have selected items, or that user manually toggled
    const hasSelected = selectedCount > 0;
    const userToggled = HE['_grp_' + cat];
    const isOpen = userToggled !== undefined ? userToggled : hasSelected;

    // Category badge
    let badge = '';
    if(selectedCount > 0) badge = `<span style="background:rgba(34,211,238,.2);color:var(--cyan);font-size:9px;padding:1px 5px;border-radius:3px;margin-left:auto;">${selectedCount} выбр.</span>`;
    if(placedCount > 0) badge = `<span style="background:rgba(74,222,128,.2);color:#4ade80;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:auto;">${placedCount} размещ.</span>`;

    html += `<div class="hePalGroup" onclick="HE['_grp_${cat}']=${isOpen?'false':'true'};buildHEPalette(APP.hangars.find(x=>x.id===HE.hangarId));" style="cursor:pointer;padding:7px 8px;color:#c5a059;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;border-bottom:1px solid rgba(255,255,255,.06);user-select:none;">
      <span style="font-size:10px;transition:transform .2s;transform:rotate(${isOpen?'90':'0'}deg)">▶</span> ${label} <span style="color:#555;font-weight:400;font-size:10px">(${items.length})</span>${badge}
    </div>`;
    if(isOpen){
      html += items.map(renderItem).join('');
    }
  }

  pal.innerHTML = html;
}

function heAutoPlace(){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h) return;
  const wo = h.wallOffset||3;
  const gap = h.objectGap||2;
  const usableW = h.w - 2*wo;
  const usableH = h.h - 2*wo;

  // Collect items to place from calculator selection
  const toPlace = [];
  CATALOG.forEach(it=>{
    if(it.areaW<=0||it.areaL<=0) return;
    const qty = itemTotalQty(it.id);
    if(qty<=0) return;
    const layout = heGetLayout(h);
    const alreadyPlaced = layout.filter(li=>li.itemId===it.id).length;
    for(let i=alreadyPlaced; i<qty; i++){
      toPlace.push({itemId:it.id, w:it.areaW, h:it.areaL, name:it.name});
    }
  });

  if(!toPlace.length){ alert('Нет объектов для расстановки. Выберите объекты в калькуляторе.'); return; }

  // Clear existing layout for clean auto-placement
  h.layout = [];

  // Group identical items together for uniform rows
  const groups = {};
  toPlace.forEach(obj=>{
    if(!groups[obj.itemId]) groups[obj.itemId]={...obj, count:0};
    groups[obj.itemId].count++;
  });

  // Sort groups: largest area first
  const sortedGroups = Object.values(groups).sort((a,b)=>(b.w*b.h)-(a.w*a.h));

  // Smart orientation: for each group, pick orientation that fits more items per row
  // and aligns long side with long side of hangar for efficiency
  let placed = [];
  let notFit = [];
  let curY = wo;

  for(const grp of sortedGroups){
    const bw = grp.w, bh = grp.h;

    // Try both orientations: pick the one that fits more items per row
    // Orientation 0: w along X, h along Y (original)
    // Orientation 1: h along X, w along Y (rotated 90°)
    const perRow0 = Math.floor((usableW + gap) / (bw + gap));
    const perRow1 = Math.floor((usableW + gap) / (bh + gap));

    // Choose orientation that places more per row; if equal, prefer shorter row height
    let useRot = 0;
    let tw, th, perRow;
    if(perRow0 >= perRow1 && perRow0 > 0){
      useRot = 0; tw = bw; th = bh; perRow = perRow0;
    } else if(perRow1 > 0){
      useRot = 1; tw = bh; th = bw; perRow = perRow1;
    } else {
      // Neither fits — try individual placement
      for(let i=0; i<grp.count; i++) notFit.push(grp);
      continue;
    }

    // Place items in uniform rows
    let count = grp.count;
    let curX = wo;
    let rowPlaced = 0;

    while(count > 0){
      // Check if new row fits vertically
      if(curY + th > h.h - wo){
        for(let i=0; i<count; i++) notFit.push(grp);
        break;
      }

      // Place one item
      if(curX + tw <= h.w - wo){
        placed.push({itemId:grp.itemId, x:curX, y:curY, w:tw, h:th, angle:useRot===1?Math.PI/2:0});
        curX += tw + gap;
        rowPlaced++;
        count--;
      } else {
        // Next row for same group
        curX = wo;
        curY += th + gap;
        rowPlaced = 0;
      }
    }

    // Move to next row for next group (add passage gap between different sport types)
    if(rowPlaced > 0){
      curY += th + gap;
    }
  }

  // Apply placement
  for(const p of placed){
    h.layout.push({itemId:p.itemId, x:p.x, y:p.y, w:p.w, h:p.h, angle:p.angle||0});
  }
  syncHangarItems(h);
  buildHEPalette(h);
  drawHangarInterior();

  // Report
  let msg = `✅ Расставлено: ${placed.length} объектов.`;
  if(notFit.length){
    msg += `\n\n❌ Не поместились (${notFit.length}):`;
    const nfGroups = {};
    notFit.forEach(o=>{ nfGroups[o.name]=(nfGroups[o.name]||0)+1; });
    for(const [name,cnt] of Object.entries(nfGroups)) msg += `\n  • ${name} × ${cnt}`;

    const extraArea = notFit.reduce((s,o)=>s+((o.w+gap)*(o.h+gap)),0);
    const extraLen = Math.ceil(extraArea / usableW);
    msg += `\n\n💡 Рекомендация: увеличьте глубину ангара на ~${extraLen}м (до ${h.h+extraLen}м)`;
    msg += `\nили создайте второй ангар для оставшихся объектов.`;
  }
  alert(msg);
}

function heStartPlace(itemId){
  HE.placing = itemId;
  HE.selected = null;
  HE.canvas.style.cursor='crosshair';
  buildHEPalette(APP.hangars.find(x=>x.id===HE.hangarId));
}

function heAddItem(itemId, cx, cy){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h) return;

  // Check if it's a room (ROOM_CATALOG) or sport item (CATALOG)
  const rm = (typeof ROOM_CATALOG!=='undefined') ? ROOM_CATALOG.find(r=>r.id===itemId) : null;
  const it = rm ? null : CATALOG.find(i=>i.id===itemId);
  if(!rm && !it) return;

  const w = rm ? rm.defaultW : it.areaW;
  const hh = rm ? rm.defaultH : it.areaL;

  // Snap to walls and other objects
  let sx = cx - w/2, sy = cy - hh/2;
  const snapped = heSnapPosition(h, sx, sy, w, hh, -1);
  sx = snapped.x; sy = snapped.y;

  const layout = heGetLayout(h);
  layout.push({itemId, x: sx, y: sy, w, h: hh, angle:0});
  syncHangarItems(h);
  HE.selected = layout.length-1;

  // If staircase on ABK with 2 floors, mirror to other floor
  if(h.type==='abk' && (h.floors||1)>=2 && rm && rm.isStaircase){
    const otherLayout = HE.currentFloor===1 ? (h.layout2||(h.layout2=[])) : h.layout;
    // Only add if not already there at same position
    const exists = otherLayout.some(li=>li.itemId===itemId && Math.abs(li.x-sx)<0.5 && Math.abs(li.y-sy)<0.5);
    if(!exists) otherLayout.push({itemId, x: sx, y: sy, w, h: hh, angle:0});
  }

  // If ABK, sync rooms to calculator
  if(h.type==='abk' && typeof syncAbkToCalc==='function') syncAbkToCalc(h);

  drawHangarInterior();
  updateHEProps();
}

function heDeleteSelected(){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h||HE.selected===null) return;
  const layout = heGetLayout(h);
  layout.splice(HE.selected,1);
  HE.selected=null;
  syncHangarItems(h);
  if(h.type==='abk' && typeof syncAbkToCalc==='function') syncAbkToCalc(h);
  drawHangarInterior();
  updateHEProps();
}

function syncHangarItems(h){
  // Rebuild h.items from all floors
  h.items={};
  (h.layout||[]).forEach(li=>{
    if(!h.items[li.itemId]) h.items[li.itemId]={count:0};
    h.items[li.itemId].count++;
  });
  (h.layout2||[]).forEach(li=>{
    if(!h.items[li.itemId]) h.items[li.itemId]={count:0};
    h.items[li.itemId].count++;
  });
}

function heUpdateDimensions(){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h) return;
  h.w = +document.getElementById('heW').value || 60;
  h.h = +document.getElementById('heH').value || 40;
  HE.ppm = Math.min((HE.canvas.width-80)/h.w, (HE.canvas.height-80)/h.h);
  HE.panX = (HE.canvas.width - h.w*HE.ppm)/2;
  HE.panY = (HE.canvas.height - h.h*HE.ppm)/2;
  drawHangarInterior();
}

function heUpdateSpacing(){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h) return;
  h.wallOffset = +document.getElementById('heWallOff').value || 3;
  h.objectGap = +document.getElementById('heObjGap').value || 2;
  drawHangarInterior();
}

function drawHangarInterior(){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h||!HE.ctx) return;
  const ctx=HE.ctx, cv=HE.canvas;
  const ppm=HE.ppm, px=HE.panX, py=HE.panY;

  // Clear
  ctx.fillStyle='#080b12'; ctx.fillRect(0,0,cv.width,cv.height);

  // Hangar floor
  const hx=px, hy=py, hw=h.w*ppm, hh=h.h*ppm;
  ctx.fillStyle='#1a1f2e'; ctx.fillRect(hx,hy,hw,hh);
  ctx.strokeStyle='#354a6a'; ctx.lineWidth=2; ctx.strokeRect(hx,hy,hw,hh);

  // Wall offset zone
  const wo = h.wallOffset||0;
  if(wo > 0){
    ctx.fillStyle='rgba(255,80,80,.08)';
    // top strip
    ctx.fillRect(hx, hy, hw, wo*ppm);
    // bottom strip
    ctx.fillRect(hx, hy+hh-wo*ppm, hw, wo*ppm);
    // left strip (between top/bottom)
    ctx.fillRect(hx, hy+wo*ppm, wo*ppm, hh-2*wo*ppm);
    // right strip
    ctx.fillRect(hx+hw-wo*ppm, hy+wo*ppm, wo*ppm, hh-2*wo*ppm);
    // dashed border for usable area
    ctx.strokeStyle='rgba(255,100,100,.35)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
    ctx.strokeRect(hx+wo*ppm, hy+wo*ppm, hw-2*wo*ppm, hh-2*wo*ppm);
    ctx.setLineDash([]);
  }

  // Grid (5m)
  ctx.strokeStyle='rgba(60,80,120,.25)'; ctx.lineWidth=0.5;
  const step=5;
  for(let mx=step;mx<h.w;mx+=step){
    const lx=hx+mx*ppm;
    ctx.beginPath(); ctx.moveTo(lx,hy); ctx.lineTo(lx,hy+hh); ctx.stroke();
  }
  for(let my=step;my<h.h;my+=step){
    const ly=hy+my*ppm;
    ctx.beginPath(); ctx.moveTo(hx,ly); ctx.lineTo(hx+hw,ly); ctx.stroke();
  }

  // Dimension labels
  ctx.fillStyle='#7a90c0'; ctx.font='10px monospace'; ctx.textAlign='center';
  ctx.fillText(`${h.w}м`, hx+hw/2, hy-6);
  ctx.save(); ctx.translate(hx-6, hy+hh/2); ctx.rotate(-Math.PI/2);
  ctx.fillText(`${h.h}м`, 0, 0); ctx.restore();

  // Get current floor layout
  const layout = heGetLayout(h);

  // For ABK with 2 floors: draw ghost of other floor first
  if(h.type==='abk' && (h.floors||1)>=2){
    const otherLayout = HE.currentFloor===1 ? (h.layout2||[]) : (h.layout||[]);
    ctx.globalAlpha = 0.15;
    otherLayout.forEach(li=>{
      const ix=hx+li.x*ppm, iy=hy+li.y*ppm, iw=li.w*ppm, ih=li.h*ppm;
      ctx.fillStyle='rgba(100,100,150,.3)'; ctx.fillRect(ix,iy,iw,ih);
      ctx.strokeStyle='rgba(100,100,150,.4)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.strokeRect(ix,iy,iw,ih); ctx.setLineDash([]);
      const rm = (typeof ROOM_CATALOG!=='undefined') ? ROOM_CATALOG.find(r=>r.id===li.itemId) : null;
      if(rm){ctx.fillStyle='#888'; ctx.font='8px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(rm.name, ix+iw/2, iy+ih/2);}
    });
    ctx.globalAlpha = 1;
  }

  // Fix legacy angles stored in degrees (>2π means it was degrees, not radians)
  layout.forEach(li=>{
    if(li.angle && Math.abs(li.angle) > 2*Math.PI) li.angle = li.angle * Math.PI / 180;
  });

  // Draw placed items
  layout.forEach((li,idx)=>{
    const ix=hx+li.x*ppm, iy=hy+li.y*ppm, iw=li.w*ppm, ih=li.h*ppm;
    ctx.save();
    if(li.angle){
      ctx.translate(ix+iw/2, iy+ih/2);
      ctx.rotate(li.angle);
      ctx.translate(-(ix+iw/2), -(iy+ih/2));
    }
    // Draw sport-specific or room view
    const rm = (typeof ROOM_CATALOG!=='undefined') ? ROOM_CATALOG.find(r=>r.id===li.itemId) : null;
    if(rm){
      // Room rendering
      const colors = {
        rm_reception:'rgba(197,160,89,.3)', rm_cafe:'rgba(249,115,22,.3)', rm_locker_m:'rgba(59,130,246,.3)',
        rm_locker_f:'rgba(236,72,153,.3)', rm_locker_k:'rgba(74,222,128,.3)', rm_shower:'rgba(34,211,238,.3)',
        rm_wc:'rgba(6,182,212,.3)', rm_coach:'rgba(139,92,246,.3)',
        rm_storage:'rgba(100,116,139,.3)', rm_office:'rgba(234,179,8,.3)', rm_server:'rgba(75,85,99,.3)',
        rm_medical:'rgba(239,68,68,.3)', rm_corridor:'rgba(156,163,175,.15)', rm_staircase:'rgba(168,85,247,.35)',
        rm_heating:'rgba(239,68,68,.25)', rm_electrical:'rgba(245,158,11,.3)'
      };
      ctx.fillStyle=colors[li.itemId]||'rgba(34,211,238,.2)';
      ctx.fillRect(ix,iy,iw,ih);
      ctx.strokeStyle='rgba(34,211,238,.5)'; ctx.lineWidth=1; ctx.strokeRect(ix,iy,iw,ih);
      ctx.fillStyle='#fff'; ctx.font=`${Math.min(12,ih/3)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(rm.icon, ix+iw/2, iy+ih/2-6);
      ctx.font=`${Math.min(9,ih/5)}px sans-serif`; ctx.fillStyle='#ccc';
      ctx.fillText(rm.name, ix+iw/2, iy+ih/2+6);
      ctx.font='8px monospace'; ctx.fillStyle='#888';
      ctx.fillText(`${li.w}×${li.h}м`, ix+iw/2, iy+ih-4);
    } else {
      const drawFn = getDrawFunc(li.itemId);
      if(drawFn) drawFn(ctx, ix, iy, iw, ih);
      else SPORT_DRAW.default(ctx, ix, iy, iw, ih, CATALOG.find(c=>c.id===li.itemId)?.name||li.itemId);
    }

    // Selection highlight + rotation handles
    if(idx===HE.selected){
      ctx.strokeStyle='#c5a059'; ctx.lineWidth=2; ctx.setLineDash([4,3]);
      ctx.strokeRect(ix-2,iy-2,iw+4,ih+4);
      ctx.setLineDash([]);
    }
    ctx.restore();
  });

  // Draw resize handles for selected room
  if(HE.selected!==null && layout[HE.selected]){
    const li=layout[HE.selected];
    const rm = (typeof ROOM_CATALOG!=='undefined') ? ROOM_CATALOG.find(r=>r.id===li.itemId) : null;
    if(rm){
      const ix=hx+li.x*ppm, iy=hy+li.y*ppm, iw=li.w*ppm, ih=li.h*ppm;
      const hs=5; // handle size
      const handles=[
        {edge:'right', x:ix+iw-hs/2, y:iy+ih/2-hs, w:hs, h:hs*2},
        {edge:'bottom', x:ix+iw/2-hs, y:iy+ih-hs/2, w:hs*2, h:hs},
        {edge:'left', x:ix-hs/2, y:iy+ih/2-hs, w:hs, h:hs*2},
        {edge:'top', x:ix+iw/2-hs, y:iy-hs/2, w:hs*2, h:hs},
        {edge:'br', x:ix+iw-hs, y:iy+ih-hs, w:hs*2, h:hs*2},
      ];
      handles.forEach(hd=>{
        ctx.fillStyle='rgba(197,160,89,.7)'; ctx.fillRect(hd.x, hd.y, hd.w, hd.h);
      });
      HE._resizeHandles = handles;
    } else { HE._resizeHandles = null; }
  } else { HE._resizeHandles = null; }

  // Draw rotation & delete controls for selected object (AFTER all objects, on top)
  if(HE.selected!==null && layout[HE.selected]){
    const li=layout[HE.selected];
    const ix=hx+li.x*ppm, iy=hy+li.y*ppm, iw=li.w*ppm, ih=li.h*ppm;
    const cx=ix+iw/2, topY=iy-30;
    const btnR=14;

    // Store button positions for hit testing
    HE._rotBtns = {
      ccw: {x:cx-38, y:topY, r:btnR},
      cw:  {x:cx+38, y:topY, r:btnR},
      r90: {x:cx, y:topY, r:btnR},
      del: {x:ix+iw+4, y:iy-4, r:10}
    };

    // Background bar
    ctx.fillStyle='rgba(0,0,0,.7)';
    ctx.beginPath(); ctx.roundRect(cx-58, topY-btnR-2, 116, btnR*2+4, 6); ctx.fill();

    // CCW button (↺ -15°)
    ctx.fillStyle='#3a6ea5'; ctx.beginPath(); ctx.arc(cx-38, topY, btnR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('↺', cx-38, topY);

    // 90° snap button
    ctx.fillStyle='#c5a059'; ctx.beginPath(); ctx.arc(cx, topY, btnR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.font='bold 10px sans-serif';
    ctx.fillText('90°', cx, topY);

    // CW button (↻ +15°)
    ctx.fillStyle='#3a6ea5'; ctx.beginPath(); ctx.arc(cx+38, topY, btnR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 14px sans-serif';
    ctx.fillText('↻', cx+38, topY);

    // Delete button (top-right corner)
    ctx.fillStyle='rgba(220,50,50,.85)'; ctx.beginPath(); ctx.arc(ix+iw+4, iy-4, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 12px sans-serif';
    ctx.fillText('✕', ix+iw+4, iy-4);
  } else {
    HE._rotBtns = null;
  }

  // Distance indicators for selected/dragging object
  if(HE.selected!==null && layout[HE.selected]){
    heDrawDistancesFL(ctx, h, layout, HE.selected, hx, hy, ppm);
  }

  // Ghost (placing mode)
  if(HE.placing){
    const rm = (typeof ROOM_CATALOG!=='undefined') ? ROOM_CATALOG.find(r=>r.id===HE.placing) : null;
    const it = rm ? null : CATALOG.find(i=>i.id===HE.placing);
    const gw_ = rm ? rm.defaultW : (it ? it.areaW : 0);
    const gh_ = rm ? rm.defaultH : (it ? it.areaL : 0);
    if(gw_ && gh_){
      const mx=(HE.mouse.x-px)/ppm, my=(HE.mouse.y-py)/ppm;
      const gx=hx+(mx-gw_/2)*ppm, gy=hy+(my-gh_/2)*ppm;
      const gw=gw_*ppm, gh=gh_*ppm;
      ctx.globalAlpha=0.5;
      if(rm){
        // Draw room ghost
        ctx.fillStyle='rgba(34,211,238,.25)'; ctx.fillRect(gx,gy,gw,gh);
        ctx.strokeStyle='rgba(34,211,238,.6)'; ctx.lineWidth=1; ctx.strokeRect(gx,gy,gw,gh);
        ctx.fillStyle='#fff'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(rm.icon+' '+rm.name, gx+gw/2, gy+gh/2);
      } else {
        const drawFn=getDrawFunc(HE.placing);
        if(drawFn) drawFn(ctx, gx, gy, gw, gh);
        else SPORT_DRAW.default(ctx, gx, gy, gw, gh, it.name);
      }
      ctx.globalAlpha=1;
      const ghostLi = {x: mx-gw_/2, y: my-gh_/2, w: gw_, h: gh_};
      heDrawDistancesForRect(ctx, h, ghostLi, -1, hx, hy, ppm);
    }
  }

  // Info bar
  const wm=(HE.mouse.x-px)/ppm, hm=(HE.mouse.y-py)/ppm;
  ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,cv.height-22,cv.width,22);
  ctx.fillStyle='#7a90c0'; ctx.font='10px monospace'; ctx.textAlign='left';
  const floorLabel = (h.type==='abk' && (h.floors||1)>=2) ? `Этаж ${HE.currentFloor}  |  ` : '';
  ctx.fillText(`${floorLabel}${wm.toFixed(1)}м, ${hm.toFixed(1)}м  |  Объектов: ${layout.length}  |  ${HE.placing?'Размещение: '+HE.placing:''}`,6,cv.height-7);
}

function heDrawDistancesFL(ctx, h, layout, selIdx, hx, hy, ppm){
  const li = layout[selIdx];
  heDrawDistancesForRectFL(ctx, h, layout, li, selIdx, hx, hy, ppm);
}

function heDrawDistancesForRect(ctx, h, li, skipIdx, hx, hy, ppm){
  heDrawDistancesForRectFL(ctx, h, heGetLayout(h), li, skipIdx, hx, hy, ppm);
}

function heDrawDistancesForRectFL(ctx, h, layout, li, skipIdx, hx, hy, ppm){
  const gap = h.objectGap||0;
  // Edges of selected rect in meters
  const L=li.x, R=li.x+li.w, T=li.y, B=li.y+li.h;
  const cx=li.x+li.w/2, cy=li.y+li.h/2;

  // Distances to walls
  const dLeft=L, dRight=h.w-R, dTop=T, dBottom=h.h-B;

  // Find nearest object edges in each direction
  let nearL=dLeft, nearR=dRight, nearT=dTop, nearB=dBottom;
  (layout||[]).forEach((o,i)=>{
    if(i===skipIdx) return;
    const oL=o.x, oR=o.x+o.w, oT=o.y, oB=o.y+o.h;
    // Check vertical overlap for left/right
    if(oB > T && oT < B){
      if(oR<=L) nearL = Math.min(nearL, L-oR);
      if(oL>=R) nearR = Math.min(nearR, oL-R);
    }
    // Check horizontal overlap for top/bottom
    if(oR > L && oL < R){
      if(oB<=T) nearT = Math.min(nearT, T-oB);
      if(oT>=B) nearB = Math.min(nearB, oT-B);
    }
  });

  const wo = h.wallOffset||0;
  ctx.save();
  ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';

  // Helper: draw distance line with label
  function drawDist(x1,y1,x2,y2,dist,isWarn){
    const px1=hx+x1*ppm, py1=hy+y1*ppm, px2=hx+x2*ppm, py2=hy+y2*ppm;
    if(dist < 0.1) return;
    const col = isWarn ? 'rgba(255,80,80,.9)' : 'rgba(100,200,255,.7)';
    ctx.strokeStyle=col; ctx.lineWidth=1; ctx.setLineDash([3,2]);
    ctx.beginPath(); ctx.moveTo(px1,py1); ctx.lineTo(px2,py2); ctx.stroke();
    ctx.setLineDash([]);
    // Label
    const lx=(px1+px2)/2, ly=(py1+py2)/2;
    const txt=dist.toFixed(1)+'м';
    const tw=ctx.measureText(txt).width+6;
    ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(lx-tw/2,ly-7,tw,14);
    ctx.fillStyle=isWarn?'#ff6666':'#66ccff';
    ctx.fillText(txt,lx,ly);
  }

  // Left
  const warnL = (nearL===dLeft && dLeft<wo) || (nearL!==dLeft && nearL<gap);
  drawDist(L,cy, L-nearL,cy, nearL, warnL);
  // Right
  const warnR = (nearR===dRight && dRight<wo) || (nearR!==dRight && nearR<gap);
  drawDist(R,cy, R+nearR,cy, nearR, warnR);
  // Top
  const warnT = (nearT===dTop && dTop<wo) || (nearT!==dTop && nearT<gap);
  drawDist(cx,T, cx,T-nearT, nearT, warnT);
  // Bottom
  const warnB = (nearB===dBottom && dBottom<wo) || (nearB!==dBottom && nearB<gap);
  drawDist(cx,B, cx,B+nearB, nearB, warnB);

  ctx.restore();
}

function updateHEProps(){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  const el = document.getElementById('heProps');
  const layout = heGetLayout(h);
  if(!h||HE.selected===null||!layout[HE.selected]){
    el.innerHTML='<div style="color:var(--tx4);font-size:10px;">Выберите объект</div>';
    return;
  }
  const li=layout[HE.selected];
  const rm = (typeof ROOM_CATALOG!=='undefined') ? ROOM_CATALOG.find(r=>r.id===li.itemId) : null;
  const it = rm ? null : CATALOG.find(c=>c.id===li.itemId);
  const name = rm ? rm.name : (it?.name || li.itemId);
  const nameColor = rm ? 'var(--cyan)' : 'var(--gold2)';
  const deg=Math.round((li.angle||0)*180/Math.PI);

  // For rooms, allow resizing
  const resizeHtml = rm ? `
    <div style="display:flex;gap:4px;align-items:center;margin-bottom:4px;">
      <label style="font-size:9px;color:var(--tx3);">Размер:</label>
      <input type="number" value="${li.w}" min="2" max="30" step="1" style="width:40px;padding:2px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:3px;font-size:10px;text-align:center"
        onchange="heResizeSelected(+this.value,null)">
      <span style="color:#888;font-size:9px">×</span>
      <input type="number" value="${li.h}" min="2" max="30" step="1" style="width:40px;padding:2px;background:var(--bg3);color:#fff;border:1px solid var(--bd);border-radius:3px;font-size:10px;text-align:center"
        onchange="heResizeSelected(null,+this.value)">
      <span style="font-size:9px;color:var(--tx3)">м</span>
    </div>` : '';

  el.innerHTML=`
    <div style="font-size:11px;font-weight:600;color:${nameColor};margin-bottom:6px;">${name}</div>
    <div style="font-size:10px;color:var(--tx3);margin-bottom:4px;">${li.w}×${li.h}м = ${li.w*li.h} м²</div>
    ${resizeHtml}
    <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px;">
      <label style="font-size:9px;color:var(--tx3);">Угол:</label>
      <input type="range" min="-180" max="180" value="${deg}" style="flex:1;accent-color:var(--gold);"
        oninput="heRotateSelected(+this.value)">
      <span style="font-size:9px;color:var(--tx2);min-width:30px;">${deg}°</span>
    </div>
    <div style="display:flex;gap:4px;">
      <button class="pBtn" onclick="heRotateSelected(0)">0°</button>
      <button class="pBtn" onclick="heRotateSelected(90)">90°</button>
      <button class="pBtn red" onclick="heDeleteSelected()">Удалить</button>
    </div>
  `;
}

function heResizeSelected(w, hVal){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h||HE.selected===null) return;
  const layout = heGetLayout(h);
  const li = layout[HE.selected];
  if(w!==null) li.w = Math.max(1, w);
  if(hVal!==null) li.h = Math.max(1, hVal);
  if(h.type==='abk' && typeof syncAbkToCalc==='function') syncAbkToCalc(h);
  drawHangarInterior();
  updateHEProps();
}

function heRotateSelected(deg){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h||HE.selected===null) return;
  heGetLayout(h)[HE.selected].angle = deg*Math.PI/180;
  drawHangarInterior();
  updateHEProps();
}

// Canvas event handlers (attached after DOM ready, see init)
function initHangarEditorEvents(){
  const cv = document.getElementById('heCv');
  if(!cv) return;

  cv.addEventListener('mousemove', e=>{
    if(!HE.active) return;
    const r=cv.getBoundingClientRect();
    HE.mouse.x=e.clientX-r.left; HE.mouse.y=e.clientY-r.top;

    // Resize mode
    if(HE.resizing && HE.selected!==null && HE.resizeEdge){
      const h=APP.hangars.find(x=>x.id===HE.hangarId);
      if(!h) return;
      const layout=heGetLayout(h);
      const li=layout[HE.selected];
      const mx=(HE.mouse.x-HE.panX)/HE.ppm, my=(HE.mouse.y-HE.panY)/HE.ppm;
      const edge=HE.resizeEdge;
      if(edge==='right'||edge==='br'){li.w=Math.max(1,Math.round((mx-li.x)*2)/2);}
      if(edge==='bottom'||edge==='br'){li.h=Math.max(1,Math.round((my-li.y)*2)/2);}
      if(edge==='left'){const newX=Math.round(mx*2)/2;const dx=li.x-newX;li.x=newX;li.w=Math.max(1,li.w+dx);}
      if(edge==='top'){const newY=Math.round(my*2)/2;const dy=li.y-newY;li.y=newY;li.h=Math.max(1,li.h+dy);}
      if(h.type==='abk'&&typeof syncAbkToCalc==='function') syncAbkToCalc(h);
      drawHangarInterior(); updateHEProps(); return;
    }

    if(HE.dragging && HE.selected!==null){
      const h=APP.hangars.find(x=>x.id===HE.hangarId);
      if(!h) return;
      const layout=heGetLayout(h);
      const li=layout[HE.selected];
      let nx = (HE.mouse.x-HE.panX)/HE.ppm - HE.dRelX;
      let ny = (HE.mouse.y-HE.panY)/HE.ppm - HE.dRelY;
      // Snap
      const snapped = heSnapPosition(h, nx, ny, li.w, li.h, HE.selected);
      li.x = snapped.x; li.y = snapped.y;
      drawHangarInterior(); updateHEProps();
      return;
    }
    if(HE.panning){
      HE.panX += e.movementX; HE.panY += e.movementY;
      drawHangarInterior(); return;
    }
    // Update cursor for resize handles
    if(HE._resizeHandles && HE.selected!==null && !HE.placing){
      const mx=HE.mouse.x, my=HE.mouse.y;
      const hit=HE._resizeHandles.find(hd=>mx>=hd.x&&mx<=hd.x+hd.w&&my>=hd.y&&my<=hd.y+hd.h);
      if(hit){
        const cursors={right:'ew-resize',left:'ew-resize',top:'ns-resize',bottom:'ns-resize',br:'nwse-resize'};
        cv.style.cursor=cursors[hit.edge]||'default';
      } else if(!HE.placing){cv.style.cursor='default';}
    }
    if(HE.placing) drawHangarInterior();
  });

  cv.addEventListener('mousedown', e=>{
    if(!HE.active) return;
    const r=cv.getBoundingClientRect();
    const mx=e.clientX-r.left, my=e.clientY-r.top;
    // Middle button = pan
    if(e.button===1||e.altKey){HE.panning=true;return;}
    const h=APP.hangars.find(x=>x.id===HE.hangarId);
    if(!h) return;
    const layout=heGetLayout(h);

    // Check resize handle hits
    if(HE._resizeHandles && HE.selected!==null){
      const hit=HE._resizeHandles.find(hd=>mx>=hd.x&&mx<=hd.x+hd.w&&my>=hd.y&&my<=hd.y+hd.h);
      if(hit){HE.resizing=true;HE.resizeEdge=hit.edge;return;}
    }

    // Check rotation/delete button hits first
    if(HE._rotBtns && HE.selected!==null){
      const btns=HE._rotBtns;
      const hitBtn = (b)=> Math.hypot(mx-b.x, my-b.y) <= b.r;
      if(hitBtn(btns.ccw)){
        const li=layout[HE.selected];
        li.angle = (li.angle||0) - Math.PI/12; // -15°
        drawHangarInterior(); updateHEProps(); return;
      }
      if(hitBtn(btns.cw)){
        const li=layout[HE.selected];
        li.angle = (li.angle||0) + Math.PI/12; // +15°
        drawHangarInterior(); updateHEProps(); return;
      }
      if(hitBtn(btns.r90)){
        const li=layout[HE.selected];
        // Snap to nearest 90°: 0→90→180→270→0
        const curDeg = Math.round((li.angle||0)*180/Math.PI) % 360;
        const next = (Math.round(curDeg/90)*90 + 90) % 360;
        li.angle = next * Math.PI/180;
        drawHangarInterior(); updateHEProps(); return;
      }
      if(hitBtn(btns.del)){
        layout.splice(HE.selected,1);
        HE.selected=null; HE._rotBtns=null;
        syncHangarItems(h); buildHEPalette(h);
        drawHangarInterior(); updateHEProps(); return;
      }
    }
    // Placing mode
    if(HE.placing){
      const wm=(mx-HE.panX)/HE.ppm, hm=(my-HE.panY)/HE.ppm;
      heAddItem(HE.placing, wm, hm);
      if(!e.shiftKey){HE.placing=null; cv.style.cursor='default'; buildHEPalette(h);}
      return;
    }
    // Hit test
    for(let i=layout.length-1;i>=0;i--){
      const li=layout[i];
      const ix=HE.panX+li.x*HE.ppm, iy=HE.panY+li.y*HE.ppm;
      const iw=li.w*HE.ppm, ih=li.h*HE.ppm;
      if(mx>=ix&&mx<=ix+iw&&my>=iy&&my<=iy+ih){
        HE.selected=i; HE.dragging=true;
        HE.dRelX=(mx-HE.panX)/HE.ppm - li.x;
        HE.dRelY=(my-HE.panY)/HE.ppm - li.y;
        drawHangarInterior(); updateHEProps(); return;
      }
    }
    HE.selected=null; drawHangarInterior(); updateHEProps();
  });

  cv.addEventListener('mouseup', ()=>{HE.dragging=false; HE.panning=false; HE.resizing=false; HE.resizeEdge=null;});
  cv.addEventListener('contextmenu', e=>e.preventDefault());

  cv.addEventListener('wheel', e=>{
    if(!HE.active) return;
    e.preventDefault();
    const f=e.deltaY<0?1.1:.9;
    const r=cv.getBoundingClientRect();
    const mx=e.clientX-r.left, my=e.clientY-r.top;
    HE.ppm*=f;
    HE.panX=mx-(mx-HE.panX)*f;
    HE.panY=my-(my-HE.panY)*f;
    drawHangarInterior();
  }, {passive:false});
}

// ═══════════════════════════════════════════════════════
// SNAP-TO: walls & objects
// ═══════════════════════════════════════════════════════
function heSnapPosition(h, x, y, w, hh, skipIdx){
  const sd = HE.snapDist; // snap threshold in meters
  const layout = heGetLayout(h);
  let sx = x, sy = y;

  // Edges of the rect being placed/dragged
  const L=x, R=x+w, T=y, B=y+hh;

  // Snap to walls (0 and h.w/h.h)
  if(Math.abs(L) < sd) sx = 0;
  else if(Math.abs(R - h.w) < sd) sx = h.w - w;
  if(Math.abs(T) < sd) sy = 0;
  else if(Math.abs(B - h.h) < sd) sy = h.h - hh;

  // Snap to wall offset zone
  const wo = h.wallOffset || 0;
  if(wo > 0){
    if(Math.abs(L - wo) < sd) sx = wo;
    else if(Math.abs(R - (h.w - wo)) < sd) sx = h.w - wo - w;
    if(Math.abs(T - wo) < sd) sy = wo;
    else if(Math.abs(B - (h.h - wo)) < sd) sy = h.h - wo - hh;
  }

  // Snap to other objects
  layout.forEach((o, i) => {
    if(i === skipIdx) return;
    const oL=o.x, oR=o.x+o.w, oT=o.y, oB=o.y+o.h;
    // Left edge → right edge of other
    if(Math.abs((sx) - oR) < sd) sx = oR;
    // Right edge → left edge of other
    if(Math.abs((sx+w) - oL) < sd) sx = oL - w;
    // Left edge → left edge of other (align)
    if(Math.abs(sx - oL) < sd) sx = oL;
    // Right edge → right edge of other
    if(Math.abs((sx+w) - oR) < sd) sx = oR - w;
    // Top edge → bottom edge of other
    if(Math.abs(sy - oB) < sd) sy = oB;
    // Bottom edge → top edge of other
    if(Math.abs((sy+hh) - oT) < sd) sy = oT - hh;
    // Top align
    if(Math.abs(sy - oT) < sd) sy = oT;
    // Bottom align
    if(Math.abs((sy+hh) - oB) < sd) sy = oB - hh;
  });

  return {x: sx, y: sy};
}
