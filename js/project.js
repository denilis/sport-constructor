// ═══════════════════════════════════════════════════════
// PROJECT MANAGEMENT — SAVE / LOAD / IMPORT
// ═══════════════════════════════════════════════════════

function saveProject(){
  const data = {
    version: 1,
    date: new Date().toISOString(),
    client: document.getElementById('kpClient')?.value||'',
    manager: document.getElementById('kpManager')?.value||'',
    plotW: parseFloat(document.getElementById('plotW').value)||100,
    plotL: parseFloat(document.getElementById('plotL').value)||50,
    calcState: {},
    hangars: APP.hangars,
    planBuildings: APP.planBuildings,
    planScale: APP.planScale,
    extraLibItems: APP.extraLibItems||[],
    plotBoundary: APP.plotBoundary||null,
    abkNorms: window.ABK_NORMS||null
  };
  // Save only non-zero calc states
  CATALOG.forEach(it=>{
    const s = APP.calcState[it.id];
    if(s.opts.some(q=>q>0)) data.calcState[it.id] = s;
  });
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sport_project_${data.client.replace(/\s+/g,'_')||'new'}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadProject(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const data = JSON.parse(e.target.result);
      // Restore
      if(data.client) document.getElementById('kpClient').value = data.client;
      if(data.manager) document.getElementById('kpManager').value = data.manager;
      if(data.plotW) document.getElementById('plotW').value = data.plotW;
      if(data.plotL) document.getElementById('plotL').value = data.plotL;
      // Reset all calc state first
      CATALOG.forEach(it=>{ APP.calcState[it.id] = {opts: it.options.map(()=>0)}; });
      // Apply saved states
      Object.keys(data.calcState||{}).forEach(id=>{
        if(APP.calcState[id]) APP.calcState[id] = data.calcState[id];
      });
      if(data.hangars) APP.hangars = data.hangars;
      if(data.planBuildings) APP.planBuildings = data.planBuildings;
      if(data.planScale) APP.planScale = data.planScale;
      if(data.extraLibItems) APP.extraLibItems = data.extraLibItems;
      APP.plotBoundary = data.plotBoundary || null;
      if(data.abkNorms) window.ABK_NORMS = data.abkNorms;
      renderAllGrids(); recalc(); renderHangars(); drawPlan(); updatePlanBadge(); updateCalcBadge();
      if(typeof renderAbkNormsUI==='function') renderAbkNormsUI();
      alert('Проект загружен: ' + (data.client||'без названия'));
    }catch(err){ alert('Ошибка загрузки: '+err.message); }
  };
  reader.readAsText(file);
  input.value = '';
}

/* ─── IMPORT CSV ─── */
function importCSV(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    let imported = 0;
    // Reset calc state
    CATALOG.forEach(it=>{ APP.calcState[it.id] = {opts: it.options.map(()=>0)}; });
    lines.forEach(line=>{
      // Try to match: name, variant, quantity
      const parts = line.split(/[;,\t]/).map(p=>p.trim());
      if(parts.length < 2) return;
      const name = parts[0].toLowerCase();
      const qty = parseInt(parts[parts.length-1]) || 1;
      // Find matching catalog item
      const item = CATALOG.find(i=>
        i.name.toLowerCase().includes(name) || name.includes(i.name.toLowerCase()) ||
        i.options.some(o=>o.n.toLowerCase().includes(name))
      );
      if(item){
        // Try to match variant
        let optIdx = 0;
        if(parts.length >= 3){
          const varName = parts[1].toLowerCase();
          const vi = item.options.findIndex(o=>o.n.toLowerCase().includes(varName));
          if(vi>=0) optIdx = vi;
        }
        APP.calcState[item.id].opts[optIdx] = qty;
        imported++;
      }
    });
    renderAllGrids(); recalc(); updateCalcBadge();
    alert(`Импортировано: ${imported} позиций из ${lines.length} строк`);
  };
  reader.readAsText(file);
  input.value = '';
}

/* ─── IMPORT TZ (via NeyroMozg) ─── */
function openImportTZ(){
  const text = prompt('Вставьте текст ТЗ клиента (бриф, письмо, требования):');
  if(!text || !text.trim()) return;
  // Open NeyroMozg and send the brief
  AIW.messages = [];
  openAIWizard();
  document.getElementById('aiWizInput').value = 'Клиент прислал ТЗ. Проанализируй и собери комплектацию:\n\n' + text;
  sendAIMessage();
}
