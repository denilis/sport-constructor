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

function buildHEPalette(h){
  const pal = document.getElementById('hePalette');
  const sportItems = ['racket','team','athletics','fun'].flatMap(c=>CATALOG.filter(i=>i.cat===c && i.areaW>0 && i.areaL>0));
  const infra = CATALOG.filter(i=>['reception','cafe'].includes(i.id));
  const all = [...sportItems, ...infra];

  // Split: selected in calculator vs others
  const selected = all.filter(it => itemTotalQty(it.id) > 0);
  const others = all.filter(it => itemTotalQty(it.id) <= 0);

  const renderItem = it => {
    const totalQty = itemTotalQty(it.id);
    const placed = h.layout ? h.layout.filter(li=>li.itemId===it.id).length : 0;
    let countHtml = '';
    if(totalQty > 0){
      const cls = placed >= totalQty ? 'done' : (placed > 0 ? '' : 'none');
      countHtml = `<span class="hePalCount ${cls}">${placed} из ${totalQty} расставлено</span>`;
    }
    return `
    <div class="hePalItem${HE.placing===it.id?' active':''}" onclick="heStartPlace('${it.id}')" title="${it.name} (${it.areaW}×${it.areaL}м)">
      <span>${it.icon}</span>
      <div class="hePalInfo"><b>${it.name}</b><span class="hePalDims">${it.areaW}×${it.areaL}м</span>${countHtml}</div>
    </div>`;
  };

  let html = '';
  if(selected.length){
    html += '<div class="hePalSection">Выбранные в калькуляторе</div>';
    html += selected.map(renderItem).join('');
  }
  if(others.length){
    html += '<div class="hePalSection other">Другие объекты</div>';
    html += others.map(renderItem).join('');
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
    const alreadyPlaced = h.layout.filter(li=>li.itemId===it.id).length;
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
  const it = CATALOG.find(i=>i.id===itemId);
  if(!it) return;
  h.layout.push({itemId, x: cx - it.areaW/2, y: cy - it.areaL/2, w: it.areaW, h: it.areaL, angle:0});
  // Sync items count
  syncHangarItems(h);
  HE.selected = h.layout.length-1;
  drawHangarInterior();
  updateHEProps();
}

function heDeleteSelected(){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h||HE.selected===null) return;
  h.layout.splice(HE.selected,1);
  HE.selected=null;
  syncHangarItems(h);
  drawHangarInterior();
  updateHEProps();
}

function syncHangarItems(h){
  // Rebuild h.items from layout
  h.items={};
  h.layout.forEach(li=>{
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

  // Draw placed items
  (h.layout||[]).forEach((li,idx)=>{
    const ix=hx+li.x*ppm, iy=hy+li.y*ppm, iw=li.w*ppm, ih=li.h*ppm;
    ctx.save();
    if(li.angle){
      ctx.translate(ix+iw/2, iy+ih/2);
      ctx.rotate(li.angle);
      ctx.translate(-(ix+iw/2), -(iy+ih/2));
    }
    // Draw sport-specific view
    const drawFn = getDrawFunc(li.itemId);
    if(drawFn) drawFn(ctx, ix, iy, iw, ih);
    else SPORT_DRAW.default(ctx, ix, iy, iw, ih, CATALOG.find(c=>c.id===li.itemId)?.name||li.itemId);

    // Selection highlight
    if(idx===HE.selected){
      ctx.strokeStyle='#c5a059'; ctx.lineWidth=2; ctx.setLineDash([4,3]);
      ctx.strokeRect(ix-2,iy-2,iw+4,ih+4);
      ctx.setLineDash([]);
    }
    ctx.restore();
  });

  // Distance indicators for selected/dragging object
  if(HE.selected!==null && h.layout[HE.selected]){
    heDrawDistances(ctx, h, HE.selected, hx, hy, ppm);
  }

  // Ghost (placing mode)
  if(HE.placing){
    const it = CATALOG.find(i=>i.id===HE.placing);
    if(it){
      const mx=(HE.mouse.x-px)/ppm, my=(HE.mouse.y-py)/ppm;
      const gx=hx+(mx-it.areaW/2)*ppm, gy=hy+(my-it.areaL/2)*ppm;
      const gw=it.areaW*ppm, gh=it.areaL*ppm;
      ctx.globalAlpha=0.5;
      const drawFn=getDrawFunc(HE.placing);
      if(drawFn) drawFn(ctx, gx, gy, gw, gh);
      else SPORT_DRAW.default(ctx, gx, gy, gw, gh, it.name);
      ctx.globalAlpha=1;
      // Distance indicators for ghost too
      const ghostLi = {x: mx-it.areaW/2, y: my-it.areaL/2, w: it.areaW, h: it.areaL};
      heDrawDistancesForRect(ctx, h, ghostLi, -1, hx, hy, ppm);
    }
  }

  // Info bar
  const wm=(HE.mouse.x-px)/ppm, hm=(HE.mouse.y-py)/ppm;
  ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,cv.height-22,cv.width,22);
  ctx.fillStyle='#7a90c0'; ctx.font='10px monospace'; ctx.textAlign='left';
  ctx.fillText(`${wm.toFixed(1)}м, ${hm.toFixed(1)}м  |  Объектов: ${h.layout?.length||0}  |  ${HE.placing?'Размещение: '+HE.placing:''}`,6,cv.height-7);
}

function heDrawDistances(ctx, h, selIdx, hx, hy, ppm){
  const li = h.layout[selIdx];
  heDrawDistancesForRect(ctx, h, li, selIdx, hx, hy, ppm);
}

function heDrawDistancesForRect(ctx, h, li, skipIdx, hx, hy, ppm){
  const gap = h.objectGap||0;
  // Edges of selected rect in meters
  const L=li.x, R=li.x+li.w, T=li.y, B=li.y+li.h;
  const cx=li.x+li.w/2, cy=li.y+li.h/2;

  // Distances to walls
  const dLeft=L, dRight=h.w-R, dTop=T, dBottom=h.h-B;

  // Find nearest object edges in each direction
  let nearL=dLeft, nearR=dRight, nearT=dTop, nearB=dBottom;
  (h.layout||[]).forEach((o,i)=>{
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
  if(!h||HE.selected===null||!h.layout[HE.selected]){
    el.innerHTML='<div style="color:var(--tx4);font-size:10px;">Выберите объект</div>';
    return;
  }
  const li=h.layout[HE.selected];
  const it=CATALOG.find(c=>c.id===li.itemId);
  const deg=Math.round((li.angle||0)*180/Math.PI);
  el.innerHTML=`
    <div style="font-size:11px;font-weight:600;color:var(--gold2);margin-bottom:6px;">${it?.name||li.itemId}</div>
    <div style="font-size:10px;color:var(--tx3);margin-bottom:4px;">${li.w}×${li.h}м = ${li.w*li.h} м²</div>
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

function heRotateSelected(deg){
  const h = APP.hangars.find(x=>x.id===HE.hangarId);
  if(!h||HE.selected===null) return;
  h.layout[HE.selected].angle = deg*Math.PI/180;
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
    if(HE.dragging && HE.selected!==null){
      const h=APP.hangars.find(x=>x.id===HE.hangarId);
      if(!h) return;
      const li=h.layout[HE.selected];
      li.x = (HE.mouse.x-HE.panX)/HE.ppm - HE.dRelX;
      li.y = (HE.mouse.y-HE.panY)/HE.ppm - HE.dRelY;
      drawHangarInterior(); updateHEProps();
      return;
    }
    if(HE.panning){
      HE.panX += e.movementX; HE.panY += e.movementY;
      drawHangarInterior(); return;
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
    // Placing mode
    if(HE.placing){
      const wm=(mx-HE.panX)/HE.ppm, hm=(my-HE.panY)/HE.ppm;
      heAddItem(HE.placing, wm, hm);
      if(!e.shiftKey){HE.placing=null; cv.style.cursor='default'; buildHEPalette(h);}
      return;
    }
    // Hit test
    for(let i=(h.layout||[]).length-1;i>=0;i--){
      const li=h.layout[i];
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

  cv.addEventListener('mouseup', ()=>{HE.dragging=false; HE.panning=false;});
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
