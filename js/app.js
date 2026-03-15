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
  // Init ABK with default hangar panel (tabBuilding is now inside modBuilding module)
  document.getElementById('tabBuilding').innerHTML=`
    <div class="abkPanel">
      <h4>АБК — Административный блок</h4>
      <p style="font-size:11px;color:var(--tx3);margin-bottom:10px;">Включает позиции из вкладки «Инфра/АБК». Площадь рассчитывается автоматически.</p>
      <div class="abkList" id="abk-list-mini"><span style="color:var(--tx4)">Добавьте позиции на вкладке «Инфра/АБК»</span></div>
      <div class="sliderRow">
        <label>Коридоры / стены:</label>
        <input type="range" id="abk-corridor-pct" min="0" max="50" value="30" oninput="calcABK()">
        <span class="sliderVal" id="abk-corridor-val">30%</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;border-top:1px dashed var(--bd);padding-top:10px;">
        <span style="font-size:11px;color:var(--tx3)">Площадь АБК: <b id="abk-area-disp" style="color:var(--tx)">0 м²</b></span>
        <span style="font-size:13px;font-weight:700;color:var(--gold2)" id="abk-cost-disp">0 ₽</span>
      </div>
    </div>
    <div id="hangars-container"></div>
    <button class="btnGhost" onclick="addHangar()" style="margin-top:0;">+ Добавить спортивный ангар</button>
  `;
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
