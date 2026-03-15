// ═══════════════════════════════════════════════════════
// PLANNER ENGINE
// ═══════════════════════════════════════════════════════
const cv=()=>document.getElementById('cv');
const ctx=()=>cv().getContext('2d');
const cw=()=>document.getElementById('planCanvas');

let PMOUSE={x:0,y:0};
let PMODE={ruler:false,rulerPt1:null,gps:false,gpsPts:[],gpsDist:0,placing:null,dragging:false,rotating:false,panning:false,lastPx:0,lastPy:0,rotBase:0,rotBaseAngle:0,dRelX:0,dRelY:0};

function resizePlan(){
  const c=cv(),cw_=cw();
  c.width=cw_.clientWidth;c.height=cw_.clientHeight;
  if(APP.planImg&&APP.zoom<0.01)fitPlan();
  drawPlan();
}

// NOTE: ResizeObserver is set up in DOMContentLoaded (see app.js)

function fitPlan(){
  const c=cv();
  const z=Math.min(c.width/APP.planImgW,c.height/APP.planImgH)*0.92;
  APP.zoom=z;APP.panX=(c.width-APP.planImgW*z)/2;APP.panY=(c.height-APP.planImgH*z)/2;
}

// coord transforms
const c2w=(cx,cy)=>({x:(cx-APP.panX)/APP.zoom,y:(cy-APP.panY)/APP.zoom});
const w2c=(wx,wy)=>({x:wx*APP.zoom+APP.panX,y:wy*APP.zoom+APP.panY});

function setScale(pxDist,realM){
  APP.planScale=pxDist/realM;
  document.getElementById('scaleLbl').textContent=`1м = ${APP.planScale.toFixed(2)}px`;
  document.getElementById('scaleLbl').style.color='var(--green)';
}

// ── LOAD MAP ──
function loadMap(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{const img=new Image();img.onload=()=>{APP.planImg=img;APP.planImgW=img.width;APP.planImgH=img.height;APP.zoom=0;fitPlan();drawPlan();};img.src=e.target.result;};
  r.readAsDataURL(f);
}

// ── RULER ──
function startRuler(){
  cancelPMode();PMODE.ruler=true;PMODE.rulerPt1=null;
  document.getElementById('bRuler').classList.add('on');
  showHint('Кликните первую точку');cv().style.cursor='crosshair';
}
function cancelRuler(){
  PMODE.ruler=false;PMODE.rulerPt1=null;
  document.getElementById('bRuler').classList.remove('on');
  document.getElementById('rulerModal').classList.remove('show');
  hideHint();cv().style.cursor='default';
}
let _rulerPxDist=0;
function confirmRuler(){
  const d=parseFloat(document.getElementById('rulerDist').value);
  if(d>0){setScale(_rulerPxDist,d);}
  cancelPMode();drawPlan();
  document.getElementById('rulerModal').classList.remove('show');
}

// ── GPS ──
function openGpsModal(){document.getElementById('gpsModal').classList.add('show');}
function startGps(){
  const a1=+document.getElementById('g1lat').value,o1=+document.getElementById('g1lng').value;
  const a2=+document.getElementById('g2lat').value,o2=+document.getElementById('g2lng').value;
  if(!a1||!o1||!a2||!o2){alert('Введите все координаты');return;}
  const d=haversine(a1,o1,a2,o2);
  document.getElementById('gpsDist').textContent='Расстояние: '+d.toFixed(2)+' м';
  PMODE.gpsDist=d;
  cancelPMode();PMODE.gps=true;PMODE.gpsPts=[];
  cv().style.cursor='crosshair';showHint('Кликните Точку 1 на карте');
  closeModal('gpsModal');
}

// ── CADASTRE / BOUNDARY IMPORT ──
if(!APP.plotBoundary) APP.plotBoundary = null; // array of {x,y} in meters

function openCadastreModal(){ document.getElementById('cadastreModal').classList.add('show'); document.getElementById('cadPreview').style.display='none'; }

function parseCadCoords(raw, format){
  raw = raw.trim();
  if(!raw) return null;
  // Try GeoJSON
  if(format==='geojson' || (format==='auto' && raw.startsWith('{'))){
    try{
      const gj = JSON.parse(raw);
      let coords = null;
      if(gj.type==='Polygon') coords = gj.coordinates[0];
      else if(gj.type==='Feature' && gj.geometry?.type==='Polygon') coords = gj.geometry.coordinates[0];
      else if(gj.type==='MultiPolygon') coords = gj.coordinates[0][0];
      if(coords){
        // GeoJSON is [lng,lat] — convert to meters using first point as origin
        const origin = coords[0];
        const cosLat = Math.cos(origin[1]*Math.PI/180);
        return coords.map(c=>({
          x: (c[0]-origin[0])*111320*cosLat,
          y: -(c[1]-origin[1])*110540
        }));
      }
    }catch(e){}
    return null;
  }
  // Parse lines
  const lines = raw.split(/\n/).map(l=>l.trim()).filter(l=>l && !l.startsWith('#') && !l.startsWith('//'));
  if(!lines.length) return null;
  const pts = [];
  for(const ln of lines){
    const nums = ln.match(/[-+]?\d+\.?\d*/g);
    if(!nums || nums.length<2) continue;
    pts.push({a:+nums[0], b:+nums[1]});
  }
  if(pts.length<3) return null;
  // Detect format
  let isGps = format==='gps';
  if(format==='auto'){
    // If values look like lat/lng (30-90 range typical for Russia)
    isGps = pts.every(p=> Math.abs(p.a)>20 && Math.abs(p.a)<90 && Math.abs(p.b)>20 && Math.abs(p.b)<190);
  }
  if(isGps){
    const origin = pts[0];
    const cosLat = Math.cos(origin.a*Math.PI/180);
    return pts.map(p=>({
      x: (p.b - origin.b)*111320*cosLat,
      y: -(p.a - origin.a)*110540
    }));
  }
  // XY meters (cadastral) — normalize to origin 0,0
  const minX = Math.min(...pts.map(p=>p.a)), minY = Math.min(...pts.map(p=>p.b));
  return pts.map(p=>({ x: p.a - minX, y: p.b - minY }));
}

function previewCadastre(){
  const raw = document.getElementById('cadCoords').value;
  const fmt = document.getElementById('cadFormat').value;
  const pts = parseCadCoords(raw, fmt);
  if(!pts || pts.length<3){ alert('Не удалось распознать координаты. Нужно минимум 3 точки.'); return; }
  // Draw preview
  const cvEl = document.getElementById('cadPreviewCv');
  const cx = cvEl.getContext('2d');
  const W = cvEl.width, H = cvEl.height;
  cx.clearRect(0,0,W,H); cx.fillStyle='#0a0f18'; cx.fillRect(0,0,W,H);
  // Bounds
  const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
  const bx0=Math.min(...xs), by0=Math.min(...ys), bx1=Math.max(...xs), by1=Math.max(...ys);
  const bw=bx1-bx0||1, bh=by1-by0||1;
  const sc = Math.min((W-40)/bw, (H-40)/bh);
  const ox = (W-bw*sc)/2 - bx0*sc, oy = (H-bh*sc)/2 - by0*sc;
  // Polygon
  cx.beginPath();
  pts.forEach((p,i)=>{ const px=p.x*sc+ox, py=p.y*sc+oy; i===0?cx.moveTo(px,py):cx.lineTo(px,py); });
  cx.closePath();
  cx.fillStyle='rgba(77,132,255,.15)'; cx.fill();
  cx.strokeStyle='rgba(77,132,255,.8)'; cx.lineWidth=2; cx.stroke();
  // Vertices
  pts.forEach((p,i)=>{
    const px=p.x*sc+ox, py=p.y*sc+oy;
    cx.beginPath(); cx.arc(px,py,4,0,Math.PI*2); cx.fillStyle='#4d84ff'; cx.fill();
    cx.fillStyle='#d0daf5'; cx.font='bold 8px monospace'; cx.textAlign='center'; cx.textBaseline='bottom';
    cx.fillText((i+1),px,py-6);
  });
  // Area & dimensions
  let area = 0;
  for(let i=0;i<pts.length;i++){ const j=(i+1)%pts.length; area += pts[i].x*pts[j].y - pts[j].x*pts[i].y; }
  area = Math.abs(area/2);
  document.getElementById('cadInfo').textContent = `Вершин: ${pts.length} | Размеры: ${bw.toFixed(1)}×${bh.toFixed(1)} м | Площадь: ${area.toFixed(0)} м² (${(area/10000).toFixed(2)} га)`;
  document.getElementById('cadPreview').style.display='block';
}

function applyCadastre(){
  const raw = document.getElementById('cadCoords').value;
  const fmt = document.getElementById('cadFormat').value;
  const pts = parseCadCoords(raw, fmt);
  if(!pts || pts.length<3){ alert('Не удалось распознать координаты'); return; }
  APP.plotBoundary = pts;
  // Update plotW/plotL to bounding box
  const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
  const bw=Math.max(...xs)-Math.min(...xs), bh=Math.max(...ys)-Math.min(...ys);
  document.getElementById('plotW').value = Math.ceil(bw);
  document.getElementById('plotL').value = Math.ceil(bh);
  // Set scale if not set
  if(!APP.planScale) APP.planScale = 15;
  recalc(); drawPlan();
  closeModal('cadastreModal');
}

// ── LIBRARY ──
function buildLibrary(){
  const el=document.getElementById('libItems');el.innerHTML='';
  // First: items selected in calculator
  const selected=CATALOG.filter(i=>itemTotalQty(i.id)>0);
  if(selected.length){
    const hdr=document.createElement('div');
    hdr.style.cssText='font-size:8px;letter-spacing:1px;color:var(--tx2);padding:4px 4px 2px;font-weight:700;';
    hdr.textContent='ИЗ КАЛЬКУЛЯТОРА';
    el.appendChild(hdr);
    selected.forEach(item=>{
      const zone=getItemZone(item);
      const zc=ZONE_COLORS[zone]||ZONE_COLORS.other;
      // Show each active variant as separate library item
      const s=APP.calcState[item.id];
      s.opts.forEach((q,oi)=>{
        if(q<=0) return;
        // Count how many already placed on plan with this sourceId
        const placedCount = APP.planBuildings.filter(b=>b.sourceId===item.id).length;
        const remaining = q - placedCount;
        const li=makeLibItem({id:item.id+'_opt'+oi,sourceId:item.id,label:item.name,w:item.areaW||item.areaW,h:item.areaL,ht:0,zone,note:item.options[oi].n+' ×'+q+(placedCount>0?' (размещено '+placedCount+')':''),maxQty:q},zc);
        if(remaining<=0) li.style.opacity='0.4';
        el.appendChild(li);
      });
    });
  }
  // Hangars
  APP.hangars.forEach((h,i)=>{
    const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[0];
    const area=calcHangarArea(h);
    if(area>0){
      // Use actual hangar dimensions if set, otherwise fallback to square
      const hw = h.w || Math.ceil(Math.sqrt(area));
      const hh = h.h || Math.ceil(Math.sqrt(area));
      const zone=bt.zone||'infra';
      const zc=ZONE_COLORS[zone]||ZONE_COLORS.other;
      const li=makeLibItem({id:'hangar_'+h.id,label:`Ангар ${i+1} (${bt.name})`,w:hw,h:hh,ht:8,zone,note:`${area} м²`,hangarId:h.id,sourceId:'hangar_'+h.id},zc);
      el.appendChild(li);
    }
  });
  // Extra/custom
  if(APP.extraLibItems.length){
    const hdr=document.createElement('div');
    hdr.style.cssText='font-size:8px;letter-spacing:1px;color:var(--tx2);padding:6px 4px 2px;font-weight:700;border-top:1px solid var(--bd);margin-top:4px;';
    hdr.textContent='ДОПОЛНИТЕЛЬНО';
    el.appendChild(hdr);
    APP.extraLibItems.forEach(item=>{
      const zc=ZONE_COLORS[item.zone]||ZONE_COLORS.other;
      el.appendChild(makeLibItem(item,zc));
    });
  }
  // Catalog-based collapsible groups (only items with placeable dimensions)
  const catGroups = {
    racket:  {label:'🎾 Ракеточные',   zone:'sport'},
    team:    {label:'⚽ Командные',     zone:'sport'},
    athletics:{label:'🏃 Атлетика',     zone:'sport'},
    fun:     {label:'🎪 Развлечения',   zone:'event'},
    glamping:{label:'🏕️ Глэмпинг',     zone:'glamp'},
    wellness:{label:'♨️ Велнесс',      zone:'well'},
  };
  // Infrastructure items for planner (buildings with real dimensions)
  const infraLib = [
    {id:'lib_rest',label:'Ресторан',w:40,h:20,ht:6,zone:'gastro',note:'120-150 мест'},
    {id:'lib_terrace',label:'Терраса',w:40,h:15,ht:0,zone:'gastro',note:'открытая'},
    {id:'lib_park',label:'Парковка',w:50,h:30,ht:0,zone:'infra',note:'~70 мест'},
    {id:'lib_boiler',label:'Котельная',w:20,h:20,ht:5,zone:'infra',note:''},
    {id:'lib_mfc',label:'МФЦ/Конференц',w:59,h:30,ht:15,zone:'event',note:'до 200 чел'},
    {id:'lib_abk',label:'АБК (админ-бытовой)',w:24,h:12,ht:4,zone:'infra',note:'раздевалки+офис'},
  ];

  if(!window._planLibOpen) window._planLibOpen={};

  const selectedIds = new Set(selected.map(i=>i.id));

  // Render collapsible sport categories
  for(const [cat,meta] of Object.entries(catGroups)){
    const items = CATALOG.filter(i=>i.cat===cat && i.areaW>0 && i.areaL>0 && !selectedIds.has(i.id));
    if(!items.length) continue;
    const isOpen = window._planLibOpen[cat]||false;
    const grpHdr = document.createElement('div');
    grpHdr.style.cssText='font-size:10px;color:#c5a059;padding:6px 6px 4px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;border-top:1px solid rgba(255,255,255,.06);margin-top:2px;user-select:none;';
    grpHdr.innerHTML=`<span style="font-size:8px;transition:transform .2s;transform:rotate(${isOpen?90:0}deg)">▶</span> ${meta.label} <span style="color:#555;font-weight:400;font-size:9px">(${items.length})</span>`;
    grpHdr.onclick=()=>{window._planLibOpen[cat]=!window._planLibOpen[cat]; buildLibrary();};
    el.appendChild(grpHdr);
    if(isOpen){
      items.forEach(item=>{
        const zone = meta.zone;
        const zc = ZONE_COLORS[zone]||ZONE_COLORS.other;
        el.appendChild(makeLibItem({id:'lib_'+item.id, sourceId:item.id, label:item.name, w:item.areaW, h:item.areaL, ht:0, zone, note:item.desc||''}, zc));
      });
    }
  }

  // Infrastructure group
  const isInfraOpen = window._planLibOpen['_infra']||false;
  const infraHdr = document.createElement('div');
  infraHdr.style.cssText='font-size:10px;color:#c5a059;padding:6px 6px 4px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;border-top:1px solid rgba(255,255,255,.06);margin-top:2px;user-select:none;';
  infraHdr.innerHTML=`<span style="font-size:8px;transition:transform .2s;transform:rotate(${isInfraOpen?90:0}deg)">▶</span> 🏢 Инфраструктура <span style="color:#555;font-weight:400;font-size:9px">(${infraLib.length})</span>`;
  infraHdr.onclick=()=>{window._planLibOpen['_infra']=!window._planLibOpen['_infra']; buildLibrary();};
  el.appendChild(infraHdr);
  if(isInfraOpen){
    infraLib.forEach(item=>{
      const zc=ZONE_COLORS[item.zone]||ZONE_COLORS.other;
      el.appendChild(makeLibItem(item,zc));
    });
  }

  // Presets group (typovye resheniya)
  if(typeof PRESETS!=='undefined' && PRESETS.length){
    const isPresOpen = window._planLibOpen['_presets']||false;
    const presHdr = document.createElement('div');
    presHdr.style.cssText='font-size:10px;color:#c5a059;padding:6px 6px 4px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;border-top:1px solid rgba(255,255,255,.06);margin-top:2px;user-select:none;';
    presHdr.innerHTML=`<span style="font-size:8px;transition:transform .2s;transform:rotate(${isPresOpen?90:0}deg)">▶</span> ★ Типовые решения <span style="color:#555;font-weight:400;font-size:9px">(${PRESETS.length})</span>`;
    presHdr.onclick=()=>{window._planLibOpen['_presets']=!window._planLibOpen['_presets']; buildLibrary();};
    el.appendChild(presHdr);
    if(isPresOpen){
      PRESETS.forEach((pr,idx)=>{
        const pDiv = document.createElement('div');
        pDiv.className='libItem';
        pDiv.style.cssText='border-left:3px solid #c5a059;';
        pDiv.innerHTML=`<div class="liName" style="color:#c5a059">${pr.icon||'★'} ${pr.name}</div><div class="liDim" style="color:#888">${pr.desc||''}</div>`;
        pDiv.onclick=()=>{
          if(confirm('Загрузить типовое решение «'+pr.name+'» в калькулятор?\nТекущая конфигурация будет заменена.')){
            loadPreset(idx);
            buildLibrary();
          }
        };
        el.appendChild(pDiv);
      });
    }
  }
  // Add custom button
  const addBtn=document.createElement('div');
  addBtn.className='libAddBtn';addBtn.textContent='+ Добавить объект…';
  addBtn.onclick=()=>document.getElementById('custModal').classList.add('show');
  el.appendChild(addBtn);
}

function makeLibItem(item,zc){
  const li=document.createElement('div');
  li.className='libItem';li.id='li-'+item.id;
  li.innerHTML=`<div class="liName"><span class="zDot" style="background:${zc.s}"></span>${item.label}</div><div class="liDim">${item.w}×${item.h}м${item.ht?' h='+item.ht+'м':''}</div>`;
  li.onclick=()=>startPlacing(item);
  return li;
}

function getItemZone(item){
  const m={racket:'sport',team:'sport',athletics:'sport',fun:'event',infra:'infra',prep:'infra'};
  return m[item.cat]||'other';
}

function startPlacing(tpl){
  cancelPMode();PMODE.placing={...tpl};
  document.querySelectorAll('.libItem').forEach(e=>e.classList.remove('placing'));
  const el=document.getElementById('li-'+tpl.id);if(el)el.classList.add('placing');
  showHint('Кликните на карте для размещения | Shift = ещё один такой');
  cv().style.cursor='copy';
}

function addCustomItem(){
  const item={
    id:'cust_'+Date.now(),
    label:document.getElementById('custName').value||'Объект',
    w:+document.getElementById('custW').value||20,
    h:+document.getElementById('custH').value||15,
    ht:+document.getElementById('custHt').value||0,
    zone:document.getElementById('custZone').value,
    note:document.getElementById('custNote').value,
  };
  APP.extraLibItems.push(item);
  buildLibrary();
  closeModal('custModal');
  startPlacing(item);
}

// ── BUILDINGS ──
function mkBuilding(tpl,wx,wy){
  return{id:Date.now()+Math.random(),label:tpl.label,w:tpl.w,h:tpl.h,ht:tpl.ht||0,
    cx:wx,cy:wy,angle:0,zone:tpl.zone||'other',note:tpl.note||'',
    sourceId:tpl.sourceId||tpl.id||null, hangarId:tpl.hangarId||null};
}

const hw_=(b,scale,zoom)=>(b.w*(scale||15)*zoom)/2;
const hh_=(b,scale,zoom)=>(b.h*(scale||15)*zoom)/2;
function hw(b){return hw_(b,APP.planScale,APP.zoom);}
function hh(b){return hh_(b,APP.planScale,APP.zoom);}
function bCenter(b){return w2c(b.cx,b.cy);}

function hitBuilding(b,mx,my){
  const c=bCenter(b);
  const dx=mx-c.x,dy=my-c.y;
  const cos=Math.cos(-b.angle),sin=Math.sin(-b.angle);
  const lx=dx*cos-dy*sin,ly=dx*sin+dy*cos;
  return Math.abs(lx)<=hw(b)&&Math.abs(ly)<=hh(b);
}
function rotHandle(b){
  const c=bCenter(b),d=hh(b)+16;
  return{x:c.x-Math.sin(b.angle)*d,y:c.y-Math.cos(b.angle)*d};
}
function hitRotHandle(b,mx,my){const r=rotHandle(b);return Math.hypot(mx-r.x,my-r.y)<=10;}

// ── DRAW ──
function drawPlan(){
  const c=cv(),x=ctx();
  c.width=c.width; // clear
  x.fillStyle='#020509';x.fillRect(0,0,c.width,c.height);

  // Map image
  if(APP.planImg) x.drawImage(APP.planImg,APP.panX,APP.panY,APP.planImgW*APP.zoom,APP.planImgH*APP.zoom);

  // Grid
  if(APP.showGrid&&APP.planScale){
    const step=parseFloat(document.getElementById('gridStep').value)||10;
    const spx=step*APP.planScale*APP.zoom;
    if(spx>=5){
      x.save();x.strokeStyle='rgba(77,132,255,.18)';x.lineWidth=.5;
      const gx=((APP.panX%spx)+spx)%spx,gy=((APP.panY%spx)+spx)%spx;
      for(let px=gx;px<c.width;px+=spx){x.beginPath();x.moveTo(px,0);x.lineTo(px,c.height);x.stroke();}
      for(let py=gy;py<c.height;py+=spx){x.beginPath();x.moveTo(0,py);x.lineTo(c.width,py);x.stroke();}
      x.fillStyle='rgba(77,132,255,.45)';x.font='7px JetBrains Mono,monospace';x.textBaseline='top';x.textAlign='left';
      const ow=c2w(0,0);
      let smx=Math.ceil(ow.x/APP.planScale/step)*step;
      for(let m=smx;w2c(m*APP.planScale,0).x<c.width;m+=step){const px=w2c(m*APP.planScale,0).x;if(px>0)x.fillText(m+'м',px+1,1);}
      let smy=Math.ceil(ow.y/APP.planScale/step)*step;
      for(let m=smy;w2c(0,m*APP.planScale).y<c.height;m+=step){const py=w2c(0,m*APP.planScale).y;if(py>8)x.fillText(m+'м',1,py+1);}
      x.restore();
    }
  }

  // Plot boundary polygon
  if(APP.plotBoundary && APP.plotBoundary.length>=3 && APP.planScale){
    x.save();
    x.beginPath();
    APP.plotBoundary.forEach((p,i)=>{
      const c2=w2c(p.x*APP.planScale, p.y*APP.planScale);
      i===0 ? x.moveTo(c2.x,c2.y) : x.lineTo(c2.x,c2.y);
    });
    x.closePath();
    x.fillStyle='rgba(77,132,255,.06)';x.fill();
    x.strokeStyle='rgba(77,132,255,.6)';x.lineWidth=2;x.setLineDash([8,4]);x.stroke();x.setLineDash([]);
    // Vertices
    APP.plotBoundary.forEach((p,i)=>{
      const c2=w2c(p.x*APP.planScale, p.y*APP.planScale);
      x.beginPath();x.arc(c2.x,c2.y,3,0,Math.PI*2);x.fillStyle='rgba(77,132,255,.7)';x.fill();
    });
    // Label
    const xs=APP.plotBoundary.map(p=>p.x), ys=APP.plotBoundary.map(p=>p.y);
    let area=0; for(let i=0;i<APP.plotBoundary.length;i++){const j=(i+1)%APP.plotBoundary.length;area+=APP.plotBoundary[i].x*APP.plotBoundary[j].y-APP.plotBoundary[j].x*APP.plotBoundary[i].y;}
    area=Math.abs(area/2);
    const cx2=xs.reduce((a,v)=>a+v,0)/xs.length, cy2=ys.reduce((a,v)=>a+v,0)/ys.length;
    const lc=w2c(cx2*APP.planScale, cy2*APP.planScale);
    x.fillStyle='rgba(77,132,255,.5)';x.font='9px Inter,sans-serif';x.textAlign='center';x.textBaseline='middle';
    x.fillText(`${area.toFixed(0)} м² (${(area/10000).toFixed(2)} га)`,lc.x,lc.y);
    x.restore();
  }

  // Ruler line in progress
  if(PMODE.ruler&&PMODE.rulerPt1){
    const p=w2c(PMODE.rulerPt1.x,PMODE.rulerPt1.y);
    x.save();x.setLineDash([5,4]);x.strokeStyle='var(--amber)';x.lineWidth=1.5;
    x.beginPath();x.moveTo(p.x,p.y);x.lineTo(PMOUSE.x,PMOUSE.y);x.stroke();x.restore();
    x.beginPath();x.arc(p.x,p.y,5,0,Math.PI*2);x.fillStyle='var(--amber)';x.fill();
  }

  // GPS points
  PMODE.gpsPts.forEach((p,i)=>{
    const c2=w2c(p.x,p.y);
    x.beginPath();x.arc(c2.x,c2.y,6,0,Math.PI*2);x.fillStyle='var(--amber)';x.fill();
    x.strokeStyle='#fff';x.lineWidth=1.5;x.stroke();
    x.fillStyle='#000';x.font='bold 8px monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(i+1,c2.x,c2.y);
  });
  if(PMODE.gpsPts.length===2){
    const a=w2c(PMODE.gpsPts[0].x,PMODE.gpsPts[0].y),b=w2c(PMODE.gpsPts[1].x,PMODE.gpsPts[1].y);
    x.save();x.setLineDash([5,4]);x.strokeStyle='var(--amber)';x.lineWidth=1.5;
    x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();x.restore();
  }

  // Ghost placing
  if(PMODE.placing){
    const tpl=PMODE.placing;
    const zc=ZONE_COLORS[tpl.zone]||ZONE_COLORS.other;
    const W=hw_(tpl,APP.planScale,APP.zoom)*2,H=hh_(tpl,APP.planScale,APP.zoom)*2;
    x.save();x.translate(PMOUSE.x,PMOUSE.y);
    x.fillStyle=zc.f.replace('.18','.5');x.fillRect(-W/2,-H/2,W,H);
    x.strokeStyle=zc.s;x.lineWidth=1.5;x.setLineDash([5,3]);x.strokeRect(-W/2,-H/2,W,H);x.setLineDash([]);
    if(Math.min(W,H)>22){
      const fs=Math.max(8,Math.min(11,Math.min(W,H)*.2));
      x.fillStyle=zc.t;x.font=`bold ${fs}px Inter,sans-serif`;x.textAlign='center';x.textBaseline='middle';
      x.fillText(`${tpl.w}×${tpl.h}м`,0,0);
    }
    x.restore();
  }

  // Buildings
  APP.planBuildings.forEach(b=>{
    const zc=ZONE_COLORS[b.zone]||ZONE_COLORS.other;
    const isSel=APP.planSelected&&APP.planSelected.id===b.id;
    const c2=bCenter(b);
    x.save();x.translate(c2.x,c2.y);x.rotate(b.angle);
    x.fillStyle=zc.f;x.fillRect(-hw(b),-hh(b),hw(b)*2,hh(b)*2);
    if(isSel){x.shadowColor='rgba(255,255,255,.3)';x.shadowBlur=10;}
    x.strokeStyle=isSel?'rgba(255,255,255,.9)':zc.s;
    x.lineWidth=isSel?2:1;
    x.strokeRect(-hw(b),-hh(b),hw(b)*2,hh(b)*2);
    x.shadowBlur=0;
    const ms=Math.min(hw(b),hh(b));
    if(ms>10){
      const fs=Math.max(7,Math.min(11,ms*.35));
      const lbl=b.label.length>20?b.label.slice(0,19)+'…':b.label;
      x.fillStyle=zc.t;x.textAlign='center';x.textBaseline='middle';
      x.font=`bold ${fs}px Inter,sans-serif`;x.fillText(lbl,0,-fs*.5);
      x.font=`${Math.max(6,fs-1)}px monospace`;x.fillStyle=zc.t+'aa';
      x.fillText(`${b.w}×${b.h}м`,0,fs*.9);
    }
    x.restore();
    // Selection handles
    if(isSel){
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>{
        const px=c2.x+sx*hw(b)*Math.cos(b.angle)-sy*hh(b)*Math.sin(b.angle);
        const py=c2.y+sx*hw(b)*Math.sin(b.angle)+sy*hh(b)*Math.cos(b.angle);
        x.beginPath();x.arc(px,py,4,0,Math.PI*2);x.fillStyle='#fff';x.fill();
        x.strokeStyle='var(--blue)';x.lineWidth=1;x.stroke();
      });
      const rh=rotHandle(b);
      x.beginPath();x.arc(rh.x,rh.y,8,0,Math.PI*2);x.fillStyle='var(--amber)';x.fill();
      x.strokeStyle='#fff';x.lineWidth=1.5;x.stroke();
      x.fillStyle='#000';x.font='bold 9px monospace';x.textAlign='center';x.textBaseline='middle';x.fillText('↻',rh.x,rh.y);
      x.save();x.setLineDash([3,3]);x.strokeStyle='rgba(245,166,35,.4)';x.lineWidth=1;
      x.beginPath();x.moveTo(c2.x,c2.y);x.lineTo(rh.x,rh.y);x.stroke();x.restore();
    }
  });

  updateInfoBar();
}

// ── MOUSE ──
function planMXY(e){const r=cv().getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}

document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.getElementById('cv');
  canvas.addEventListener('mousemove',e=>{
    const m=planMXY(e);PMOUSE.x=m.x;PMOUSE.y=m.y;
    if(PMODE.panning){APP.panX+=m.x-PMODE.lastPx;APP.panY+=m.y-PMODE.lastPy;PMODE.lastPx=m.x;PMODE.lastPy=m.y;drawPlan();return;}
    if(PMODE.rotating&&APP.planSelected){
      const c=bCenter(APP.planSelected);
      APP.planSelected.angle=PMODE.rotBase+(Math.atan2(m.x-c.x,c.y-m.y)-PMODE.rotBaseAngle);
      renderProps();drawPlan();return;
    }
    if(PMODE.dragging&&APP.planSelected){
      const w=c2w(m.x,m.y);APP.planSelected.cx=w.x-PMODE.dRelX;APP.planSelected.cy=w.y-PMODE.dRelY;
      renderProps();drawPlan();return;
    }
    if(!PMODE.placing&&!PMODE.ruler&&!PMODE.gps&&APP.planSelected){
      if(hitRotHandle(APP.planSelected,m.x,m.y))canvas.style.cursor='grab';
      else if(hitBuilding(APP.planSelected,m.x,m.y))canvas.style.cursor='move';
      else canvas.style.cursor='default';
    }
    const xh=document.getElementById('crosshair');
    if(APP.planScale){
      const w=c2w(m.x,m.y);
      xh.style.display='block';xh.style.left=(m.x+14)+'px';xh.style.top=(m.y-12)+'px';
      xh.textContent=`${(w.x/APP.planScale).toFixed(1)}м, ${(w.y/APP.planScale).toFixed(1)}м`;
    } else xh.style.display='none';
    drawPlan();
  });

  canvas.addEventListener('mousedown',e=>{
    if(e.button===2)return;
    const m=planMXY(e);
    if(e.altKey||e.button===1){PMODE.panning=true;PMODE.lastPx=m.x;PMODE.lastPy=m.y;return;}
    const w=c2w(m.x,m.y);
    // RULER
    if(PMODE.ruler){
      if(!PMODE.rulerPt1){PMODE.rulerPt1=w;showHint('Кликните вторую точку');}
      else{
        _rulerPxDist=Math.hypot(w.x-PMODE.rulerPt1.x,w.y-PMODE.rulerPt1.y);
        document.getElementById('rulerModal').classList.add('show');
        PMODE.ruler=false;PMODE.rulerPt1=null;hideHint();canvas.style.cursor='default';document.getElementById('bRuler').classList.remove('on');
      }
      drawPlan();return;
    }
    // GPS
    if(PMODE.gps){
      PMODE.gpsPts.push(w);
      if(PMODE.gpsPts.length===1){showHint('Кликните Точку 2');}
      else if(PMODE.gpsPts.length===2){
        const pxDist=Math.hypot(PMODE.gpsPts[1].x-PMODE.gpsPts[0].x,PMODE.gpsPts[1].y-PMODE.gpsPts[0].y);
        setScale(pxDist,PMODE.gpsDist);
        cancelPMode();
      }
      drawPlan();return;
    }
    // PLACE
    if(PMODE.placing){
      // Check quantity limit for calculator items
      const src = PMODE.placing.sourceId || PMODE.placing.id;
      if(PMODE.placing.maxQty){
        const placed = APP.planBuildings.filter(b=>b.sourceId===src).length;
        if(placed >= PMODE.placing.maxQty){
          showHint(`Все ${PMODE.placing.maxQty} шт. уже размещены на плане`);
          cancelPMode(); drawPlan(); return;
        }
      }
      const b=mkBuilding(PMODE.placing,w.x,w.y);
      APP.planBuildings.push(b);APP.planSelected=b;
      if(!e.shiftKey)cancelPMode();
      buildLibrary(); // refresh placed counts
      renderProps();drawPlan();updatePlanBadge();return;
    }
    // ROT HANDLE
    if(APP.planSelected&&hitRotHandle(APP.planSelected,m.x,m.y)){
      PMODE.rotating=true;const c=bCenter(APP.planSelected);
      PMODE.rotBase=APP.planSelected.angle;PMODE.rotBaseAngle=Math.atan2(m.x-c.x,c.y-m.y);return;
    }
    // HIT
    for(let i=APP.planBuildings.length-1;i>=0;i--){
      if(hitBuilding(APP.planBuildings[i],m.x,m.y)){
        APP.planSelected=APP.planBuildings[i];PMODE.dragging=true;
        const ww=c2w(m.x,m.y);PMODE.dRelX=ww.x-APP.planSelected.cx;PMODE.dRelY=ww.y-APP.planSelected.cy;
        renderProps();drawPlan();return;
      }
    }
    APP.planSelected=null;renderProps();drawPlan();
  });

  canvas.addEventListener('mouseup',()=>{PMODE.dragging=false;PMODE.rotating=false;PMODE.panning=false;});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    const m=planMXY(e),f=e.deltaY<0?1.12:.9;
    APP.zoom*=f;APP.panX=m.x-(m.x-APP.panX)*f;APP.panY=m.y-(m.y-APP.panY)*f;drawPlan();
  },{passive:false});
});

document.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;
  if((e.key==='Delete'||e.key==='Backspace')&&document.getElementById('modPlan').classList.contains('active'))delSelected();
  if(e.key==='Escape')cancelPMode(),APP.planSelected=null,renderProps(),drawPlan();
  if(e.key==='ArrowLeft'&&APP.planSelected){APP.planSelected.angle-=Math.PI/180;renderProps();drawPlan();}
  if(e.key==='ArrowRight'&&APP.planSelected){APP.planSelected.angle+=Math.PI/180;renderProps();drawPlan();}
});

function cancelPMode(){
  PMODE.ruler=false;PMODE.rulerPt1=null;PMODE.gps=false;PMODE.gpsPts=[];PMODE.placing=null;
  document.getElementById('bRuler')?.classList.remove('on');
  document.querySelectorAll('.libItem').forEach(e=>e.classList.remove('placing'));
  hideHint();if(document.getElementById('cv'))document.getElementById('cv').style.cursor='default';
}

// ── PROPERTIES PANEL ──
function renderProps(){
  const p=document.getElementById('propsBody');
  const b=APP.planSelected;
  if(!b){p.innerHTML='<div style="color:var(--tx4);font-size:10px;padding:8px 0;">Выберите объект на плане</div>';return;}
  const deg=Math.round(b.angle*180/Math.PI);
  const pos=APP.planScale
    ?`<b>${Math.round(b.cx/APP.planScale)}</b>м от З,  <b>${Math.round(b.cy/APP.planScale)}</b>м от С`
    :'<span style="color:var(--tx4)">нет масштаба</span>';
  p.innerHTML=`
<div class="pPg"><div class="pPl">НАЗВАНИЕ</div>
<input type="text" value="${b.label}" style="width:100%;background:var(--bg0);border:1px solid var(--bd);color:var(--tx);padding:4px 7px;border-radius:4px;font-size:10px;outline:none;margin-bottom:4px;" onchange="APP.planSelected.label=this.value;drawPlan()"></div>
<div class="pPg"><div class="pPl">РАЗМЕРЫ (м)</div>
<div class="pRow"><label>Ширина</label><input type="number" value="${b.w}" min="1" step="0.5" oninput="APP.planSelected.w=+this.value||1;drawPlan();renderProps()"></div>
<div class="pRow"><label>Глубина</label><input type="number" value="${b.h}" min="1" step="0.5" oninput="APP.planSelected.h=+this.value||1;drawPlan();renderProps()"></div>
<div class="pRow"><label>Высота</label><input type="number" value="${b.ht||0}" min="0" step="0.5" oninput="APP.planSelected.ht=+this.value;drawPlan()"></div></div>
<div class="pPg"><div class="pPl">УГОЛ: ${deg}°</div>
<div class="pRow"><input type="range" min="-180" max="180" value="${deg}" oninput="APP.planSelected.angle=+this.value*Math.PI/180;renderProps();drawPlan()"></div>
<div class="pBtns">
<button onclick="APP.planSelected.angle=0;renderProps();drawPlan()">0°</button>
<button onclick="APP.planSelected.angle+=Math.PI/2;renderProps();drawPlan()">+90°</button>
<button onclick="APP.planSelected.angle-=Math.PI/2;renderProps();drawPlan()">−90°</button>
<button onclick="APP.planSelected.angle+=Math.PI/4;renderProps();drawPlan()">+45°</button>
</div></div>
<div class="pPg"><div class="pPl">ЗОНА</div>
<select style="width:100%;background:var(--bg0);border:1px solid var(--bd);color:var(--tx);padding:5px;border-radius:4px;font-size:10px;outline:none;" onchange="APP.planSelected.zone=this.value;drawPlan()">
${Object.keys(ZONE_COLORS).map(z=>`<option value="${z}"${b.zone===z?' selected':''}>${z}</option>`).join('')}
</select></div>
<div class="pPg"><div class="pPl">ПОЗИЦИЯ</div><div style="font-size:9px;color:var(--tx2);font-family:var(--fm);">${pos}</div></div>
<div class="pPg"><div class="pPl">ПЛОЩАДЬ ПЯТНА</div><div style="font-size:11px;font-weight:700;color:var(--gold2);font-family:var(--fm);">${b.w*b.h} м²</div></div>`;
}

function toggleGrid(){APP.showGrid=!APP.showGrid;document.getElementById('bGrid').classList.toggle('on',APP.showGrid);drawPlan();}
function delSelected(){if(!APP.planSelected)return;APP.planBuildings=APP.planBuildings.filter(b=>b.id!==APP.planSelected.id);APP.planSelected=null;renderProps();drawPlan();updatePlanBadge();}
function clearPlan(){if(!confirm('Удалить все объекты с плана?'))return;APP.planBuildings=[];APP.planSelected=null;renderProps();drawPlan();updatePlanBadge();}
function updatePlanBadge(){
  const n=APP.planBuildings.length;
  const b=document.getElementById('badgePlan');
  b.textContent=n||'';b.classList.toggle('show',n>0);
}

function updateInfoBar(){
  const w=c2w(PMOUSE.x,PMOUSE.y);
  const pos=document.getElementById('iPos');
  if(pos)pos.textContent=APP.planScale?`${(w.x/APP.planScale).toFixed(1)}м, ${(w.y/APP.planScale).toFixed(1)}м`:`px ${Math.round(w.x)},${Math.round(w.y)}`;
  const sel=document.getElementById('iSel');
  if(sel)sel.textContent=APP.planSelected?`${APP.planSelected.label} ${APP.planSelected.w}×${APP.planSelected.h}м ∠${Math.round(APP.planSelected.angle*180/Math.PI)}°`:'—';
  const cnt=document.getElementById('iCnt');
  if(cnt)cnt.textContent=APP.planBuildings.length;
}
