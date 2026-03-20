// ═══════════════════════════════════════════════════════
// FINANCIAL MODEL
// ═══════════════════════════════════════════════════════
const FIN_STAFF = [
  {role:'Управляющий',qty:1,salary:80000},
  {role:'Администратор',qty:2,salary:45000},
  {role:'Тренер / инструктор',qty:3,salary:50000},
  {role:'Уборщик',qty:2,salary:30000},
  {role:'Техник / разнорабочий',qty:1,salary:40000},
  {role:'Охранник',qty:2,salary:35000}
];
const MONTH_NAMES = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
let finMonthLoads = [40,45,55,65,75,80,80,75,70,60,50,40];
let finInited = false;

function initFinMonth(){
  if(finInited) return;
  finInited = true;
  const el = document.getElementById('finMonthLoad');
  if(!el) return;
  el.innerHTML = MONTH_NAMES.map((m,i)=>
    `<div class="finMonthBox"><label>${m}</label><input class="finInput" type="number" value="${finMonthLoads[i]}" min="0" max="100" onchange="finMonthLoads[${i}]=+this.value;calcFin()"></div>`
  ).join('');
  // Init staff table
  renderStaffTable();
}

function renderStaffTable(){
  const tbody = document.querySelector('#finStaffTbl tbody');
  if(!tbody) return;
  tbody.innerHTML = FIN_STAFF.map((s,i)=>
    `<tr>
      <td><input class="finInput" style="width:140px;text-align:left;" value="${s.role}" onchange="FIN_STAFF[${i}].role=this.value"></td>
      <td><input class="finInput" style="width:40px;text-align:center;" type="number" value="${s.qty}" min="0" onchange="FIN_STAFF[${i}].qty=+this.value;calcFin()"></td>
      <td><input class="finInput" type="number" value="${s.salary}" min="0" step="5000" onchange="FIN_STAFF[${i}].salary=+this.value;calcFin()"> ₽</td>
      <td class="r">${fmt(s.qty*s.salary)} ₽</td>
      <td><span style="cursor:pointer;color:var(--red);font-size:14px;" onclick="FIN_STAFF.splice(${i},1);renderStaffTable();calcFin();">✕</span></td>
    </tr>`
  ).join('');
}
function addStaffRow(){
  FIN_STAFF.push({role:'Новая должность',qty:1,salary:35000});
  renderStaffTable();
  calcFin();
}

function switchFinTab(tab, btn){
  document.querySelectorAll('.finPage').forEach(p=>p.classList.remove('show'));
  document.querySelectorAll('.finSubTab').forEach(b=>b.classList.remove('active'));
  document.getElementById('finPage' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('show');
  if(btn) btn.classList.add('active');
  calcFin();
}

function toggleFinBlock(id){
  const el = document.getElementById(id);
  const h4 = el.previousElementSibling;
  if(el.style.display==='none'){ el.style.display=''; h4.classList.remove('collapsed'); }
  else { el.style.display='none'; h4.classList.add('collapsed'); }
}

function gv(id,def){ return +(document.getElementById(id)?.value)||def||0; }

function calcFin(){
  initFinMonth();

  // Count revenue-generating objects by type
  const revCats = ['racket','team','athletics','fun','glamping','wellness'];
  let totalRevUnits = 0;
  let revItems = []; // {id, name, qty, model, rate, sessions}
  CATALOG.filter(i=>revCats.includes(i.cat)).forEach(item=>{
    const s = APP.calcState[item.id];
    const qty = s.opts.reduce((a,q)=>a+q, 0);
    if(qty > 0){
      const rc = REVENUE_CONFIG[item.id] || { model:'hourly', rate:3000 };
      if(rc.model !== 'none'){
        totalRevUnits += qty;
        revItems.push({ id:item.id, name:item.name, qty, model:rc.model, rate:rc.rate, sessions:rc.sessions||1 });
      }
    }
  });
  document.getElementById('finCourts').textContent = totalRevUnits || '—';

  // ── CAPEX ──
  let capexEquip = 0;
  let capexItems = [];
  const catLabels = {racket:'Ракеточные',team:'Командные',athletics:'Атлетика',fun:'Развлечения',glamping:'Глэмпинг',wellness:'Велнес/СПА',infra:'Инфраструктура',prep:'Благоустройство'};
  CATALOG.forEach(item=>{
    const s = APP.calcState[item.id];
    s.opts.forEach((q,oi)=>{
      if(q>0){
        const cost = item.options[oi].p * q;
        capexEquip += cost;
        capexItems.push({name:item.name+' — '+item.options[oi].n, qty:q, cost});
      }
    });
  });
  // ABK buildings
  APP.hangars.filter(h=>h.type==='abk').forEach((h,i)=>{
    const bt=BUILDING_TYPES.find(b=>b.id===h.type);
    const area=h.w*h.h*(h.floors||1);
    if(area>0){ const c=area*(bt?bt.price:45000); capexEquip+=c; capexItems.push({name:'АБК №'+(i+1)+' ('+area+' м², '+(h.floors||1)+' эт.)',qty:1,cost:c}); }
  });
  // Sport hangars
  APP.hangars.filter(h=>h.type!=='abk').forEach((h,i)=>{
    const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[0];
    const area=calcHangarArea(h);
    if(area>0){ const c=area*bt.price; capexEquip+=c; capexItems.push({name:'Ангар №'+(i+1)+' ('+bt.name+', '+area+' м²)',qty:1,cost:c}); }
  });
  const capexExtra = gv('finCapDesign') + gv('finCapComm') + gv('finCapLand') + gv('finCapFurn') + gv('finCapReserve');
  const capex = capexEquip + capexExtra;

  // Render CAPEX list
  const capListEl = document.getElementById('finCapList');
  if(capListEl){
    capListEl.innerHTML = capexItems.length
      ? `<table class="finTbl"><thead><tr><th>Позиция</th><th style="text-align:right">Стоимость</th></tr></thead><tbody>
          ${capexItems.map(ci=>`<tr><td>${ci.name} × ${ci.qty}</td><td class="r">${fmt(ci.cost)} ₽</td></tr>`).join('')}
          <tr class="total"><td>Оборудование итого</td><td class="r">${fmt(capexEquip)} ₽</td></tr>
         </tbody></table>`
      : '<p style="font-size:11px;color:var(--tx3);">Добавьте объекты в калькулятор</p>';
  }

  // ── STAFF (OPEX) ──
  const staffTotal = FIN_STAFF.reduce((s,r)=>s+r.qty*r.salary, 0);
  const stEl = document.getElementById('finStaffTotal');
  if(stEl) stEl.textContent = 'Итого ФОТ: ' + fmt(staffTotal) + ' ₽/мес';

  // ── UTILITIES (OPEX) ──
  const rent = gv('finRent',200000);
  const elec = gv('finElec',80000);
  const heat = gv('finHeat',40000);
  const water = gv('finWater',15000);
  const waste = gv('finWaste',15000);
  const internet = gv('finInternet',5000);
  const security = gv('finSecurity',30000);
  const insurance = gv('finInsurance',15000);
  const utilTotal = rent + elec + heat + water + waste + internet + security + insurance;
  const utEl = document.getElementById('finUtilTotal');
  if(utEl) utEl.textContent = 'Итого: ' + fmt(utilTotal) + ' ₽/мес';

  // ── MARKETING & OTHER (OPEX) ──
  const markOnline = gv('finMarkOnline',40000);
  const markSMM = gv('finMarkSMM',20000);
  const markOutdoor = gv('finMarkOutdoor',10000);
  const markSoft = gv('finMarkSoft',10000);
  const maint = gv('finMaint',30000);
  const consumables = gv('finConsumables',15000);
  const accounting = gv('finAccounting',25000);
  const markTotal = markOnline + markSMM + markOutdoor + markSoft + maint + consumables + accounting;
  const mkEl = document.getElementById('finMarkTotal');
  if(mkEl) mkEl.textContent = 'Итого: ' + fmt(markTotal) + ' ₽/мес';

  // ── TOTAL OPEX ──
  const opexMonth = staffTotal + utilTotal + markTotal;

  // ── REVENUE ──
  const ticket = gv('finTicket',3000); // fallback for items without REVENUE_CONFIG
  const hours = gv('finHours',14);
  const season = gv('finSeason',12);
  const avgLoad = gv('finLoad',65)/100;

  // Additional revenue
  const addRev = gv('finRevCafe') + gv('finRevRent') + gv('finRevEvents') + gv('finRevGlamp') + gv('finRevSpa');

  // Monthly revenue using per-month load and per-item revenue models
  let revYear = 0;
  const monthRevs = [];
  for(let m=0; m<12; m++){
    const mLoad = (finMonthLoads[m]||avgLoad*100)/100;
    let itemsRev = 0;
    revItems.forEach(ri => {
      switch(ri.model){
        case 'hourly':
          // rate per hour * hours/day * load * 30 days * qty
          itemsRev += ri.qty * ri.rate * hours * mLoad * 30;
          break;
        case 'nightly':
          // rate per night * load * 30 days * qty
          itemsRev += ri.qty * ri.rate * mLoad * 30;
          break;
        case 'session':
          // rate per session * sessions/day * load * 30 days * qty
          itemsRev += ri.qty * ri.rate * ri.sessions * mLoad * 30;
          break;
        default:
          // fallback to old flat rate
          itemsRev += ri.qty * ticket * hours * mLoad * 30;
      }
    });
    const totalMRev = itemsRev + addRev;
    monthRevs.push(totalMRev);
    if(m < season) revYear += totalMRev;
  }
  const revMonth = revYear / (season||1);

  // ── P&L ──
  // Fixed costs run 12 months (staff, rent, insurance, accounting, software)
  // Variable costs run only during season (utilities, marketing, maintenance, consumables)
  const fixedMonth = staffTotal + rent + security + insurance + accounting + gv('finMarkSoft',10000) + internet;
  const variableMonth = opexMonth - fixedMonth;
  const opexYear = fixedMonth * 12 + variableMonth * season;
  const ebitda = revYear - opexYear;
  const netProfit = ebitda * 0.8;
  const paybackMonths = netProfit > 0 ? Math.ceil(capex / (netProfit / season)) : 999;
  const margin = revYear>0 ? (ebitda/revYear*100) : 0;
  const roi = capex>0 ? (netProfit/capex*100) : 0;

  // ── KPI CARDS ──
  document.getElementById('finKPI').innerHTML = `
    <div class="finCard"><div class="fVal">${fmt(capex)}</div><div class="fLbl">CAPEX (инвестиции)</div></div>
    <div class="finCard green"><div class="fVal">${fmt(Math.round(revYear))}</div><div class="fLbl">Выручка / год</div></div>
    <div class="finCard${ebitda>=0?' green':' red'}"><div class="fVal">${fmt(Math.round(ebitda))}</div><div class="fLbl">EBITDA / год (${margin.toFixed(0)}%)</div></div>
    <div class="finCard blue"><div class="fVal">${paybackMonths<999?paybackMonths+' мес':'—'}</div><div class="fLbl">Окупаемость (ROI ${roi.toFixed(0)}%)</div></div>
  `;

  // ── P&L TABLE ──
  document.getElementById('finPL').innerHTML = `
    <thead><tr><th>Показатель</th><th style="text-align:right">Месяц</th><th style="text-align:right">Год</th></tr></thead>
    <tbody>
      <tr><td>Выручка (площадки)</td><td class="r g">${fmt(Math.round(revMonth-addRev))}</td><td class="r g">${fmt(Math.round(revYear-addRev*season))}</td></tr>
      <tr><td>Доп. доходы</td><td class="r g">${fmt(addRev)}</td><td class="r g">${fmt(addRev*season)}</td></tr>
      <tr style="border-top:1px solid var(--bd2)"><td><b>Итого выручка</b></td><td class="r g"><b>${fmt(Math.round(revMonth))}</b></td><td class="r g"><b>${fmt(Math.round(revYear))}</b></td></tr>
      <tr><td>Персонал (ФОТ) — 12 мес</td><td class="r rd">−${fmt(staffTotal)}</td><td class="r rd">−${fmt(staffTotal*12)}</td></tr>
      <tr><td>Аренда + коммуналка</td><td class="r rd">−${fmt(utilTotal)}</td><td class="r rd">−${fmt(rent*12 + security*12 + insurance*12 + internet*12 + (elec+heat+water+waste)*season)}</td></tr>
      <tr><td>Маркетинг + прочие</td><td class="r rd">−${fmt(markTotal)}</td><td class="r rd">−${fmt(accounting*12 + gv('finMarkSoft',10000)*12 + (markOnline+markSMM+markOutdoor+maint+consumables)*season)}</td></tr>
      <tr class="total"><td>EBITDA</td><td class="r">${fmt(Math.round(ebitda/(season||1)))}</td><td class="r">${fmt(Math.round(ebitda))}</td></tr>
      <tr><td>Налоги (~20%)</td><td class="r rd">−${fmt(Math.round(ebitda*0.2/(season||1)))}</td><td class="r rd">−${fmt(Math.round(ebitda*0.2))}</td></tr>
      <tr class="total"><td>Чистая прибыль</td><td class="r">${fmt(Math.round(netProfit/(season||1)))}</td><td class="r">${fmt(Math.round(netProfit))}</td></tr>
    </tbody>
  `;

  // ── EXPENSE BAR ──
  const expItems = [
    {lbl:'Персонал',val:staffTotal,clr:'#e67e22'},
    {lbl:'Аренда',val:rent,clr:'#e74c3c'},
    {lbl:'Коммуналка',val:elec+heat+water+waste,clr:'#3498db'},
    {lbl:'Охрана+страхование',val:security+insurance,clr:'#27ae60'},
    {lbl:'Маркетинг',val:markOnline+markSMM+markOutdoor,clr:'#9b59b6'},
    {lbl:'Обслуживание',val:maint+consumables,clr:'#f39c12'},
    {lbl:'Бухгалтерия+софт',val:accounting+markSoft+internet,clr:'#95a5a6'}
  ];
  const expTotal = opexMonth || 1;
  document.getElementById('finExpBar').innerHTML = expItems.map(e=>
    `<div class="finBarSeg" style="width:${e.val/expTotal*100}%;background:${e.clr};" title="${e.lbl}: ${fmt(e.val)} ₽"></div>`
  ).join('');
  document.getElementById('finExpLegend').innerHTML = expItems.map(e=>
    `<div class="finLabel"><div class="dot" style="background:${e.clr}"></div>${e.lbl}: ${fmt(e.val)} ₽ (${Math.round(e.val/expTotal*100)}%)</div>`
  ).join('');

  // ── PAYBACK CHART ──
  const monthNetProfit = netProfit > 0 ? netProfit / season : (ebitda * 0.8 / 12);
  const maxM = Math.min(paybackMonths < 999 ? paybackMonths + 6 : 36, 48);
  let cumCF = -capex;
  let bars = [];
  for(let m=0; m<=maxM; m++){
    if(m>0) cumCF += monthNetProfit;
    bars.push({month:m, cf:cumCF});
  }
  const chartMax = Math.max(...bars.map(b=>Math.abs(b.cf))) || 1;
  const chartH = 200;
  const bw = Math.max(12, Math.min(30, 800/(maxM+1) - 4));
  document.getElementById('finPayback').innerHTML = bars.map((b,i)=>{
    const h = Math.abs(b.cf) / chartMax * (chartH * 0.8);
    const isNeg = b.cf < 0;
    const bottom = isNeg ? (chartH/2 - h) : chartH/2;
    const clr = isNeg ? 'var(--red)' : 'var(--green)';
    const left = i * (bw + 3);
    return `<div style="position:absolute;left:${left}px;bottom:${bottom}px;width:${bw}px;height:${h}px;background:${clr};border-radius:3px;opacity:.7;" title="Месяц ${b.month}: ${fmt(Math.round(b.cf))} ₽"></div>
    ${b.month % 3===0 ? `<div style="position:absolute;left:${left}px;bottom:-16px;font-size:8px;color:var(--tx3);width:${bw}px;text-align:center;">${b.month}</div>` : ''}`;
  }).join('') + `<div style="position:absolute;left:0;right:0;top:${chartH/2}px;height:1px;background:var(--bd2);"></div>`;

  // ── TEXT SUMMARY ──
  const sumEl = document.getElementById('finSummaryText');
  if(sumEl){
    const paybackYears = paybackMonths < 999 ? (paybackMonths/12).toFixed(1) : '—';
    const profitStatus = ebitda > 0
      ? `<span style="color:var(--green);">проект прибыльный</span>`
      : `<span style="color:var(--red);">проект убыточный</span>`;
    const marginStatus = margin > 30 ? 'высокая' : margin > 15 ? 'средняя' : margin > 0 ? 'низкая' : 'отрицательная';
    const topExpense = expItems.sort((a,b)=>b.val-a.val)[0];

    let lines = [];
    lines.push(`Общий объём инвестиций (CAPEX): <b>${fmt(capex)}</b>, из них оборудование и строительство — ${fmt(capexEquip)}.`);
    lines.push(`Прогнозная годовая выручка: <b>${fmt(Math.round(revYear))}</b> при средней загрузке ${Math.round(avgLoad*100)}% и сезоне ${season} мес.`);
    lines.push(`Годовые операционные расходы (OPEX): <b>${fmt(Math.round(opexYear))}</b> (фикс. ${fmt(Math.round(fixedMonth*12))} + перемен. ${fmt(Math.round(variableMonth*season))}).`);
    lines.push(`EBITDA: <b>${fmt(Math.round(ebitda))}/год</b> — ${profitStatus}, маржинальность ${marginStatus} (${margin.toFixed(1)}%).`);
    lines.push(`Чистая прибыль (после налогов ~20%): <b>${fmt(Math.round(netProfit))}/год</b>.`);
    if(paybackMonths < 999){
      lines.push(`Срок окупаемости: <b>${paybackMonths} мес.</b> (${paybackYears} лет). ROI: ${roi.toFixed(1)}%.`);
    } else {
      lines.push(`<span style="color:var(--red);">Проект не окупается при текущих параметрах.</span> Рекомендуется пересмотреть ценообразование или снизить расходы.`);
    }
    if(topExpense) lines.push(`Крупнейшая статья расходов: <b>${topExpense.lbl}</b> — ${fmt(topExpense.val)}/мес (${Math.round(topExpense.val/expTotal*100)}% от OPEX).`);
    lines.push(`Доходных объектов: <b>${totalRevUnits}</b>. Персонал: <b>${FIN_STAFF.reduce((s,r)=>s+r.qty,0)} чел.</b> (ФОТ ${fmt(staffTotal)}/мес).`);

    sumEl.innerHTML = lines.map(l=>`<p style="margin-bottom:6px;">${l}</p>`).join('');
  }
}
