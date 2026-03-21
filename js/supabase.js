// ═══════════════════════════════════════════════════════
// SUPABASE CLIENT — Sport Constructor Pro
// ═══════════════════════════════════════════════════════
const SUPABASE_URL = 'https://hggbfwbmhnewuprwzvew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZ2Jmd2JtaG5ld3Vwcnd6dmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTI5NDIsImV4cCI6MjA4OTMyODk0Mn0.bO4kEpQ41lt0ZBQ8Cuh6o4cHEPigyVHNHNjTL3xtLss';

const SB = {
  // ── Generic REST helpers ──
  async _fetch(table, opts = {}) {
    const { method = 'GET', query = '', body, returnData = true } = opts;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    if (returnData && (method === 'POST' || method === 'PATCH')) {
      headers['Prefer'] = 'return=representation';
    }
    const url = SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || res.statusText);
    }
    if (method === 'DELETE' || !returnData) return null;
    return res.json();
  },

  // ── Projects ──
  async listProjects() {
    return this._fetch('sc_projects', { query: 'select=id,name,client_name,updated_at&order=updated_at.desc&limit=50' });
  },

  async loadProject(id) {
    const rows = await this._fetch('sc_projects', { query: 'id=eq.' + id + '&select=*' });
    return rows && rows[0] || null;
  },

  async saveProject(data) {
    const payload = {
      name: data.name || 'Без названия',
      client_name: data.client_name || null,
      manager_name: data.manager_name || null,
      plot_w: data.plot_w,
      plot_l: data.plot_l,
      calc_state: data.calc_state || {},
      hangars: data.hangars || [],
      plan_buildings: data.plan_buildings || [],
      plan_scale: data.plan_scale || 0,
      abk_norms: data.abk_norms || null,
      financial: data.financial || null,
      metadata: data.metadata || {},
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      // Update existing
      const rows = await this._fetch('sc_projects', {
        method: 'PATCH',
        query: 'id=eq.' + data.id,
        body: payload,
      });
      return rows && rows[0] || null;
    } else {
      // Insert new
      const rows = await this._fetch('sc_projects', {
        method: 'POST',
        body: payload,
      });
      return rows && rows[0] || null;
    }
  },

  async deleteProject(id) {
    await this._fetch('sc_projects', { method: 'DELETE', query: 'id=eq.' + id });
  },

  // ── Research ──
  async saveResearch(projectId, scope, rawInput, results) {
    return this._fetch('sc_research', {
      method: 'POST',
      body: { project_id: projectId, scope, raw_input: rawInput, results },
    });
  },

  // ── Renders ──
  async saveRender(projectId, angle, prompt, imageUrl, provider) {
    return this._fetch('sc_renders', {
      method: 'POST',
      body: { project_id: projectId, angle, prompt, image_url: imageUrl, provider },
    });
  },

  async listRenders(projectId) {
    return this._fetch('sc_renders', {
      query: 'project_id=eq.' + projectId + '&select=*&order=created_at.desc',
    });
  },

  // ── AI Chats ──
  async saveChat(projectId, messages, mode) {
    const existing = await this._fetch('sc_ai_chats', {
      query: 'project_id=eq.' + projectId + '&mode=eq.' + mode + '&select=id&limit=1',
    });
    if (existing && existing.length) {
      return this._fetch('sc_ai_chats', {
        method: 'PATCH',
        query: 'id=eq.' + existing[0].id,
        body: { messages, updated_at: new Date().toISOString() },
      });
    }
    return this._fetch('sc_ai_chats', {
      method: 'POST',
      body: { project_id: projectId, messages, mode },
    });
  },
};

// ═══════════════════════════════════════════════════════
// CLOUD SAVE / LOAD UI
// ═══════════════════════════════════════════════════════

// Current cloud project ID
window._cloudProjectId = null;

function collectProjectData() {
  return {
    id: window._cloudProjectId,
    name: document.getElementById('projName')?.value || 'Новый проект',
    client_name: document.getElementById('projClient')?.value || null,
    manager_name: document.getElementById('projManager')?.value || null,
    plot_w: parseFloat(document.getElementById('plotW')?.value) || 100,
    plot_l: parseFloat(document.getElementById('plotL')?.value) || 50,
    calc_state: APP.calcState,
    hangars: APP.hangars,
    plan_buildings: APP.planBuildings,
    plan_scale: APP.planScale,
    abk_norms: window.ABK_NORMS || null,
    metadata: {},
  };
}

function applyProjectData(p) {
  window._cloudProjectId = p.id;
  if (p.name) { const el = document.getElementById('projName'); if (el) el.value = p.name; }
  if (p.client_name) { const el = document.getElementById('projClient'); if (el) el.value = p.client_name; }
  if (p.manager_name) { const el = document.getElementById('projManager'); if (el) el.value = p.manager_name; }
  if (p.plot_w) { const el = document.getElementById('plotW'); if (el) el.value = p.plot_w; }
  if (p.plot_l) { const el = document.getElementById('plotL'); if (el) el.value = p.plot_l; }
  if (p.calc_state) APP.calcState = p.calc_state;
  if (p.hangars) APP.hangars = p.hangars;
  if (p.plan_buildings) APP.planBuildings = p.plan_buildings;
  if (p.plan_scale) APP.planScale = p.plan_scale;
  if (p.abk_norms) window.ABK_NORMS = p.abk_norms;
  // Re-render
  if (typeof initCalc === 'function') initCalc();
  if (typeof renderHangars === 'function') renderHangars();
  if (typeof recalc === 'function') recalc();
  if (typeof drawPlan === 'function') drawPlan();
}

async function cloudSave() {
  const btn = document.getElementById('cloudSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Сохраняю...'; }
  try {
    const data = collectProjectData();
    const result = await SB.saveProject(data);
    if (result && result.id) {
      window._cloudProjectId = result.id;
      alert('Проект сохранён в облако: ' + (result.name || result.id));
    }
  } catch (e) {
    alert('Ошибка сохранения: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '☁️ Сохранить'; }
  }
}

async function cloudLoad() {
  try {
    const projects = await SB.listProjects();
    if (!projects || !projects.length) {
      alert('Нет сохранённых проектов');
      return;
    }
    // Build modal
    let modal = document.getElementById('cloudLoadModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cloudLoadModal';
      document.body.appendChild(modal);
    }
    const listHtml = projects.map(p => {
      const date = new Date(p.updated_at).toLocaleDateString('ru-RU');
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--bd);border-radius:8px;cursor:pointer;transition:all .15s"
        onmouseover="this.style.borderColor='var(--cyan)'" onmouseout="this.style.borderColor='var(--bd)'"
        onclick="cloudLoadProject('${p.id}')">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--tx)">${p.name || 'Без названия'}</div>
          <div style="font-size:11px;color:var(--tx3)">${p.client_name || ''} · ${date}</div>
        </div>
        <button onclick="event.stopPropagation();cloudDeleteProject('${p.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px" title="Удалить">✕</button>
      </div>`;
    }).join('');

    modal.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7)';
    modal.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:12px;width:420px;max-width:94vw;max-height:80vh;overflow:auto;padding:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:14px;color:var(--cyan)">☁️ Облачные проекты</h3>
        <button onclick="document.getElementById('cloudLoadModal').style.display='none'" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">${listHtml}</div>
    </div>`;
  } catch (e) {
    alert('Ошибка загрузки: ' + e.message);
  }
}

async function cloudLoadProject(id) {
  try {
    const p = await SB.loadProject(id);
    if (!p) { alert('Проект не найден'); return; }
    applyProjectData(p);
    const modal = document.getElementById('cloudLoadModal');
    if (modal) modal.style.display = 'none';
    alert('Проект загружен: ' + (p.name || p.id));
  } catch (e) {
    alert('Ошибка: ' + e.message);
  }
}

async function cloudDeleteProject(id) {
  if (!confirm('Удалить проект из облака?')) return;
  try {
    await SB.deleteProject(id);
    cloudLoad(); // refresh list
  } catch (e) {
    alert('Ошибка удаления: ' + e.message);
  }
}
