// ═══════════════════════════════════════════════════════
// UTILITY / HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

// ── FORMAT ──
function fmt(n){return Math.round(n).toLocaleString('ru-RU')+' ₽';}
function fmt2(n){return n.toLocaleString('ru-RU');}
function fmtPrice(v){return String(v).replace(/\s/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,' ');}

// ── HAVERSINE ──
function haversine(a1,o1,a2,o2){
  const R=6371000,da=(a2-a1)*Math.PI/180,doo=(o2-o1)*Math.PI/180;
  const a=Math.sin(da/2)**2+Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(doo/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ── HINTS ──
function showHint(t){const h=document.getElementById('planHint');if(h){h.textContent=t;h.style.display='block';}}
function hideHint(){const h=document.getElementById('planHint');if(h)h.style.display='none';}
function closeModal(id){document.getElementById(id)?.classList.remove('show');}
