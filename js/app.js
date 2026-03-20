// ═══════════════════════════════════════════════════════
// SHARED STATE
// ═══════════════════════════════════════════════════════
const APP = {
  calcState: {},   // {id: {opts: [qty_per_option]}}
  hangars: [],
  planBuildings: [],
  planSelected: null,
  planScale: 0,    // px per meter
  planImg: null, planImgW: 0, planImgH: 0,
  panX: 0, panY: 0, zoom: 1,
  showGrid: true,
  extraLibItems: [], // custom items added in planner
  generatedImages: {pTop:[], pNW:[], pSE:[]}, // gallery per prompt
};

// ═══════════════════════════════════════════════════════
// MODULE SWITCHING
// ═══════════════════════════════════════════════════════
function switchModule(id, btn) {
  document.querySelectorAll('.module').forEach(m=>m.classList.remove('active'));
  // Map id to element id (building -> modBuilding, calc -> modCalc, etc.)
  const modMap = {calc:'modCalc', building:'modBuilding', plan:'modPlan', render:'modRender', fin:'modFin'};
  const modEl = document.getElementById(modMap[id] || 'mod'+id.charAt(0).toUpperCase()+id.slice(1));
  if(modEl) modEl.classList.add('active');
  document.querySelectorAll('.mTab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(id==='building') { renderHangars(); recalc(); }
  if(id==='plan') buildLibrary();
  if(id==='calc' && typeof syncPlanToCalc==='function') syncPlanToCalc();
  if(id==='render') genPrompts();
  if(id==='fin') calcFin();
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded',()=>{
  initCalc();
  resizePlan();
  // ResizeObserver for planner canvas
  new ResizeObserver(resizePlan).observe(document.getElementById('planCanvas'));
  // Patch gridStep listener
  document.getElementById('gridStep')?.addEventListener('input',drawPlan);
  // Init building panel (tabBuilding is now inside modBuilding module)
  document.getElementById('tabBuilding').innerHTML=`
    <div id="hangars-container"></div>
    <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap">
      <button class="btnGhost" onclick="addABK()" style="margin:0;border-color:rgba(34,211,238,.3);color:var(--cyan)">+ Добавить АБК</button>
      <button class="btnGhost" onclick="addHangar()" style="margin:0;">+ Добавить спортивный ангар</button>
    </div>
    <div id="abkNormsSection"></div>
  `;
  renderAbkNormsUI();
  renderHangars();
  renderSettings();
  // Init hangar editor canvas events
  initHangarEditorEvents();
  // Delete key for hangar editor
  document.addEventListener('keydown',e=>{
    if(!HE.active) return;
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    if(e.key==='Delete'||e.key==='Backspace') heDeleteSelected();
    if(e.key==='Escape'){HE.placing=null;HE.selected=null;HE.canvas.style.cursor='default';
      buildHEPalette(APP.hangars.find(x=>x.id===HE.hangarId));drawHangarInterior();updateHEProps();}
  });
});
