// ═══════════════════════════════════════════════════════
// HELP MODAL
// ═══════════════════════════════════════════════════════
function openHelp(){ document.getElementById('helpModal').classList.add('show'); }
function closeHelp(){ document.getElementById('helpModal').classList.remove('show'); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeHelp(); closeAIWizard(); }});
function switchHelpTab(tab, btn){
  document.querySelectorAll('.helpTab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.helpSection').forEach(s=>s.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('help-'+tab).classList.add('active');
}
