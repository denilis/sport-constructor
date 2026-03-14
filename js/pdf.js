// ═══════════════════════════════════════════════════════
// PDF COMMERCIAL PROPOSAL
// ═══════════════════════════════════════════════════════
function generatePDF(){
  // Collect data
  const cats = [
    {key:'racket',label:'Ракеточные виды спорта'},
    {key:'team',label:'Командные виды спорта'},
    {key:'athletics',label:'Атлетика и фитнес'},
    {key:'fun',label:'Развлечения'},
    {key:'glamping',label:'Глэмпинг'},
    {key:'wellness',label:'Велнес / СПА'},
    {key:'infra',label:'Инфраструктура'},
    {key:'prep',label:'Благоустройство'}
  ];
  let rows=[], grandTotal=0, totalArea=0;
  cats.forEach(({key,label})=>{
    const items=CATALOG.filter(i=>i.cat===key && itemTotalQty(i.id)>0);
    if(!items.length) return;
    let section={label, items:[], subtotal:0};
    items.forEach(item=>{
      const s=APP.calcState[item.id];
      s.opts.forEach((q,oi)=>{
        if(q<=0) return;
        const opt=item.options[oi];
        const cost=opt.p*q;
        section.subtotal+=cost;
        grandTotal+=cost;
        if(item.areaW&&item.areaL) totalArea+=item.areaW*item.areaL*q;
        const thumbKey = item.id+'_'+oi;
        const thumbUrl = APP.thumbCache?.[thumbKey]||'';
        section.items.push({name:item.name, variant:opt.n, qty:q, unit:item.unit, price:opt.p, cost, specs:opt.specs||[], thumbUrl});
      });
    });
    if(section.items.length) rows.push(section);
  });
  // ABK
  const abkArea=calcAbkArea();
  if(abkArea>0){
    const shellCost=abkArea*45000;
    grandTotal+=shellCost; totalArea+=abkArea;
    const infraSec=rows.find(r=>r.label.includes('Инфраструктура'));
    if(infraSec){ infraSec.items.push({name:'АБК — строительство',variant:abkArea+' м² (вкл. коридоры)',qty:1,unit:'шт',price:shellCost,cost:shellCost,specs:[]}); infraSec.subtotal+=shellCost; }
  }
  // Hangars
  if(APP.hangars.length){
    let hSec={label:'Здания / Ангары',items:[],subtotal:0};
    APP.hangars.forEach((h,i)=>{
      const bt=BUILDING_TYPES.find(b=>b.id===h.type)||BUILDING_TYPES[0];
      const area=calcHangarArea(h);
      if(area>0){
        const cost=area*bt.price;
        grandTotal+=cost; totalArea+=area;
        hSec.items.push({name:'Ангар №'+(i+1),variant:bt.name+', '+area+' м²',qty:1,unit:'шт',price:cost,cost,specs:[]});
        hSec.subtotal+=cost;
      }
    });
    if(hSec.items.length) rows.push(hSec);
  }
  if(!rows.length){ alert('Добавьте объекты в калькулятор'); return; }

  const clientName = document.getElementById('kpClient')?.value||'';
  const managerName = document.getElementById('kpManager')?.value||'';

  // Financial model data for PDF — uses same logic as calcFin()
  const hoursF = gv('finHours',14), seasonF = gv('finSeason',12), avgLoadF = gv('finLoad',65)/100;
  const ticketF = gv('finTicket',3000);
  const addRevF = gv('finRevCafe') + gv('finRevRent') + gv('finRevEvents') + gv('finRevGlamp') + gv('finRevSpa');

  // Per-item revenue (same model as financial.js)
  const revCatsF = ['racket','team','athletics','fun','glamping','wellness'];
  let pdfRevItems = [];
  CATALOG.filter(i=>revCatsF.includes(i.cat)).forEach(item=>{
    const qty = APP.calcState[item.id].opts.reduce((a,q)=>a+q, 0);
    if(qty > 0){
      const rc = REVENUE_CONFIG[item.id] || { model:'hourly', rate:ticketF };
      if(rc.model !== 'none') pdfRevItems.push({ qty, model:rc.model, rate:rc.rate, sessions:rc.sessions||1 });
    }
  });
  let finRevYear = 0;
  for(let m=0; m<12; m++){
    const mL = (finMonthLoads[m]||avgLoadF*100)/100;
    let itemsRev = 0;
    pdfRevItems.forEach(ri => {
      switch(ri.model){
        case 'hourly':  itemsRev += ri.qty * ri.rate * hoursF * mL * 30; break;
        case 'nightly': itemsRev += ri.qty * ri.rate * mL * 30; break;
        case 'session': itemsRev += ri.qty * ri.rate * ri.sessions * mL * 30; break;
        default:        itemsRev += ri.qty * ticketF * hoursF * mL * 30;
      }
    });
    if(m < seasonF) finRevYear += itemsRev + addRevF;
  }

  // OPEX with fixed/variable split (same as financial.js)
  const staffTotalF = FIN_STAFF.reduce((s,r)=>s+r.qty*r.salary, 0);
  const rentF=gv('finRent',200000), securityF=gv('finSecurity',30000), insuranceF=gv('finInsurance',15000);
  const internetF=gv('finInternet',5000), accountingF=gv('finAccounting',25000), softF=gv('finMarkSoft',10000);
  const utilTotalF = rentF+gv('finElec',80000)+gv('finHeat',40000)+gv('finWater',15000)+gv('finWaste',15000)+internetF+securityF+insuranceF;
  const markTotalF = gv('finMarkOnline',40000)+gv('finMarkSMM',20000)+gv('finMarkOutdoor',10000)+softF+gv('finMaint',30000)+gv('finConsumables',15000)+accountingF;
  const fixedMonthF = staffTotalF + rentF + securityF + insuranceF + accountingF + softF + internetF;
  const variableMonthF = (staffTotalF + utilTotalF + markTotalF) - fixedMonthF;
  const opexYearF = fixedMonthF * 12 + variableMonthF * seasonF;
  const finEbitda = finRevYear - opexYearF;
  const finNetProfit = finEbitda * 0.8;
  const finMargin = finRevYear>0 ? (finEbitda/finRevYear*100).toFixed(0) : 0;
  // Use full CAPEX (equipment + extra) for payback — same as financial model
  const capexExtraF = gv('finCapDesign') + gv('finCapComm') + gv('finCapLand') + gv('finCapFurn') + gv('finCapReserve');
  const fullCapex = grandTotal + capexExtraF;
  const finPayback = finNetProfit > 0 ? Math.ceil(fullCapex / (finNetProfit / seasonF)) : 999;

  const pw=parseFloat(document.getElementById('plotW').value)||0;
  const pl=parseFloat(document.getElementById('plotL').value)||0;
  const plotTotal=pw*pl;
  const today=new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  let num=1;
  // Build sections HTML
  const hasAnyThumb = rows.some(sec=>sec.items.some(it=>it.thumbUrl));
  let sectionsHtml=rows.map(sec=>`
    <div class="kp-section">
      <div class="kp-sect-head">${sec.label}</div>
      <table class="kp-table">
        <thead><tr>${hasAnyThumb?'<th style="width:50px">Фото</th>':''}<th>№</th><th>Наименование</th><th>Вариант</th><th>Кол-во</th><th>Цена за ед.</th><th>Стоимость</th></tr></thead>
        <tbody>
          ${sec.items.map(it=>`<tr>
            ${hasAnyThumb?`<td>${it.thumbUrl?'<img src="'+it.thumbUrl+'" style="width:44px;height:30px;object-fit:cover;border-radius:4px;">':''}</td>`:''}
            <td>${num++}</td>
            <td><b>${it.name}</b>${it.specs.length?'<br><small style="color:#666">'+it.specs.slice(0,3).join(' | ')+'</small>':''}</td>
            <td>${it.variant}</td>
            <td>${it.qty} ${it.unit}</td>
            <td class="r">${fmt(it.price)} ₽</td>
            <td class="r"><b>${fmt(it.cost)} ₽</b></td>
          </tr>`).join('')}
          <tr class="sub"><td colspan="${hasAnyThumb?6:5}" class="r">Подитог:</td><td class="r"><b>${fmt(sec.subtotal)} ₽</b></td></tr>
        </tbody>
      </table>
    </div>
  `).join('');

  const html=`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Коммерческое предложение — СПОРТВСЕГДА</title>
<style>
@page{size:A4;margin:20mm 15mm 20mm 15mm;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11pt;line-height:1.5;}
.kp-header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2B5EA7;padding-bottom:16px;margin-bottom:24px;}
.kp-logo{display:flex;align-items:center;gap:12px;}
.kp-logo-circle{width:40px;height:40px;border-radius:50%;border:3px solid #2B5EA7;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;color:#2B5EA7;}
.kp-logo-text{font-size:22px;font-weight:700;letter-spacing:1px;}
.kp-logo-text span:first-child{color:#2B5EA7;}
.kp-logo-text span:last-child{color:#D42B2B;}
.kp-meta{text-align:right;font-size:9pt;color:#666;}
.kp-title{text-align:center;margin:20px 0 30px;}
.kp-title h1{font-size:20pt;color:#2B5EA7;font-weight:700;margin-bottom:6px;}
.kp-title p{font-size:11pt;color:#555;}
.kp-summary{display:flex;gap:16px;margin-bottom:28px;}
.kp-card{flex:1;background:#f0f4ff;border:1px solid #d0daf5;border-radius:8px;padding:14px 16px;text-align:center;}
.kp-card .val{font-size:20pt;font-weight:700;color:#2B5EA7;}
.kp-card .lbl{font-size:9pt;color:#666;margin-top:4px;}
.kp-section{margin-bottom:20px;page-break-inside:avoid;}
.kp-sect-head{font-size:12pt;font-weight:700;color:#2B5EA7;padding:8px 12px;background:#f0f4ff;border-left:4px solid #2B5EA7;margin-bottom:8px;}
.kp-table{width:100%;border-collapse:collapse;font-size:9.5pt;}
.kp-table th{background:#2B5EA7;color:#fff;padding:6px 10px;text-align:left;font-weight:600;}
.kp-table td{padding:5px 10px;border-bottom:1px solid #e0e0e0;}
.kp-table .r{text-align:right;}
.kp-table tr.sub{background:#f8f9ff;}
.kp-table tr.sub td{border-bottom:2px solid #2B5EA7;font-size:10pt;}
.kp-grand{margin-top:24px;padding:16px 20px;background:linear-gradient(135deg,#2B5EA7,#1a3d7a);border-radius:10px;color:#fff;display:flex;justify-content:space-between;align-items:center;}
.kp-grand .gl{font-size:14pt;font-weight:700;}
.kp-grand .gv{font-size:22pt;font-weight:700;}
.kp-footer{margin-top:40px;padding-top:16px;border-top:2px solid #e0e0e0;font-size:8.5pt;color:#888;text-align:center;}
.kp-footer b{color:#2B5EA7;}
.kp-table img{display:block;}
.kp-notes{margin-top:24px;padding:14px 16px;background:#fffdf0;border:1px solid #e5d99e;border-radius:8px;font-size:9pt;color:#555;}
.kp-notes h4{color:#b8860b;margin-bottom:6px;font-size:10pt;}
.kp-notes ul{padding-left:16px;}
.kp-notes li{margin:3px 0;}
</style></head><body>

<div class="kp-header">
  <div class="kp-logo">
    <div class="kp-logo-circle">В</div>
    <div class="kp-logo-text"><span>СПОРТ</span><span>ВСЕГДА</span></div>
  </div>
  <div class="kp-meta">
    Коммерческое предложение<br>
    от ${today}<br>
    № КП-${Date.now().toString(36).toUpperCase()}
  </div>
</div>

<div class="kp-title">
  <h1>Коммерческое предложение</h1>
  <p>на комплексное оснащение спортивного объекта</p>
  ${clientName ? '<p style="font-size:13pt;color:#2B5EA7;font-weight:600;margin-top:8px;">для '+clientName+'</p>' : ''}
</div>

<div class="kp-summary">
  <div class="kp-card"><div class="val">${fmt(grandTotal)} ₽</div><div class="lbl">Общая стоимость</div></div>
  <div class="kp-card"><div class="val">${Math.ceil(totalArea)} м²</div><div class="lbl">Площадь объектов</div></div>
  <div class="kp-card"><div class="val">${plotTotal>0?fmt2(plotTotal)+' м²':'—'}</div><div class="lbl">Площадь участка</div></div>
  <div class="kp-card"><div class="val">${num-1}</div><div class="lbl">Позиций</div></div>
</div>

${sectionsHtml}

<div class="kp-grand">
  <div class="gl">ИТОГО:</div>
  <div class="gv">${fmt(grandTotal)} ₽</div>
</div>

<div style="page-break-before:always;margin-top:30px;"></div>
<h2 style="font-size:16pt;color:#2B5EA7;margin-bottom:16px;">Финансовые показатели проекта</h2>
<div class="kp-summary">
  <div class="kp-card"><div class="val">${fmt(fullCapex)} ₽</div><div class="lbl">CAPEX (инвестиции)</div></div>
  <div class="kp-card" style="background:#e8f5e9;border-color:#a5d6a7;"><div class="val" style="color:#2e7d32;">${fmt(Math.round(finRevYear))} ₽</div><div class="lbl">Выручка / год</div></div>
  <div class="kp-card" style="background:#e8f5e9;border-color:#a5d6a7;"><div class="val" style="color:#2e7d32;">${fmt(Math.round(finEbitda))} ₽</div><div class="lbl">EBITDA / год (${finMargin}%)</div></div>
  <div class="kp-card" style="background:#e3f2fd;border-color:#90caf9;"><div class="val" style="color:#1565c0;">${finPayback < 999 ? finPayback+' мес' : '—'}</div><div class="lbl">Окупаемость</div></div>
</div>
<p style="font-size:9pt;color:#666;margin-top:8px;">* Расчёт при средней загрузке ${gv('finLoad',65)}%, ${gv('finHours',14)} часов работы, среднем чеке ${fmt(gv('finTicket',3000))} ₽/час</p>

<h2 style="font-size:16pt;color:#2B5EA7;margin:30px 0 16px;">Ориентировочные сроки реализации</h2>
<table class="kp-table">
  <thead><tr><th>Этап</th><th>Срок</th><th>Описание</th></tr></thead>
  <tbody>
    <tr><td><b>1. Проектирование</b></td><td>1-2 мес</td><td>Разработка проектной документации, согласования</td></tr>
    <tr><td><b>2. Подготовка площадки</b></td><td>1-2 мес</td><td>Земляные работы, фундамент, коммуникации</td></tr>
    <tr><td><b>3. Строительство</b></td><td>3-6 мес</td><td>Возведение зданий, ангаров, монтаж конструкций</td></tr>
    <tr><td><b>4. Оснащение</b></td><td>1-2 мес</td><td>Установка оборудования, покрытий, освещения</td></tr>
    <tr><td><b>5. Благоустройство</b></td><td>1-2 мес</td><td>Территория, парковка, ландшафт, навигация</td></tr>
    <tr><td><b>6. Запуск</b></td><td>0.5-1 мес</td><td>Тестирование, найм персонала, маркетинг</td></tr>
    <tr class="sub"><td colspan="2"><b>Итого: 8-15 месяцев</b></td><td>В зависимости от масштаба проекта</td></tr>
  </tbody>
</table>

<div style="page-break-before:always;margin-top:30px;"></div>
<h2 style="font-size:16pt;color:#2B5EA7;margin-bottom:16px;">Почему СПОРТВСЕГДА</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px;">
  <div style="padding:14px 16px;background:#f0f4ff;border:1px solid #d0daf5;border-radius:8px;">
    <div style="font-size:13pt;font-weight:700;color:#2B5EA7;margin-bottom:4px;">Комплексный подход</div>
    <div style="font-size:9pt;color:#555;">Проектирование, поставка оборудования, строительство и ввод в эксплуатацию — всё от одного подрядчика. Единая ответственность и контроль сроков.</div>
  </div>
  <div style="padding:14px 16px;background:#f0f4ff;border:1px solid #d0daf5;border-radius:8px;">
    <div style="font-size:13pt;font-weight:700;color:#2B5EA7;margin-bottom:4px;">Проверенные поставщики</div>
    <div style="font-size:9pt;color:#555;">Работаем только с сертифицированным оборудованием от ведущих мировых и российских производителей. Гарантия качества и долговечности.</div>
  </div>
  <div style="padding:14px 16px;background:#f0f4ff;border:1px solid #d0daf5;border-radius:8px;">
    <div style="font-size:13pt;font-weight:700;color:#2B5EA7;margin-bottom:4px;">Финансовая модель</div>
    <div style="font-size:9pt;color:#555;">Для каждого проекта рассчитываем прогноз окупаемости, помогаем оптимизировать CAPEX и выйти на прибыль в оптимальные сроки.</div>
  </div>
  <div style="padding:14px 16px;background:#f0f4ff;border:1px solid #d0daf5;border-radius:8px;">
    <div style="font-size:13pt;font-weight:700;color:#2B5EA7;margin-bottom:4px;">Сервис и поддержка</div>
    <div style="font-size:9pt;color:#555;">Гарантийное и постгарантийное обслуживание, обучение персонала, помощь в маркетинге и выходе на операционную эффективность.</div>
  </div>
</div>

<h2 style="font-size:16pt;color:#2B5EA7;margin-bottom:16px;">Реализованные проекты</h2>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:28px;">
  <div style="border:1px solid #d0daf5;border-radius:8px;overflow:hidden;">
    <div style="height:8px;background:#2B5EA7;"></div>
    <div style="padding:12px 14px;">
      <div style="font-size:11pt;font-weight:700;color:#1a1a2e;margin-bottom:4px;">Спортивный кластер «Арена»</div>
      <div style="font-size:8.5pt;color:#666;">Московская область</div>
      <div style="font-size:8.5pt;color:#555;margin-top:6px;">4 падел-корта, 2 теннисных корта, фитнес-зал, ресторан. Площадь 3 500 м².</div>
      <div style="font-size:8pt;color:#2B5EA7;font-weight:600;margin-top:6px;">Окупаемость: 18 месяцев</div>
    </div>
  </div>
  <div style="border:1px solid #d0daf5;border-radius:8px;overflow:hidden;">
    <div style="height:8px;background:#27ae60;"></div>
    <div style="padding:12px 14px;">
      <div style="font-size:11pt;font-weight:700;color:#1a1a2e;margin-bottom:4px;">Глэмпинг-парк «Сосны»</div>
      <div style="font-size:8.5pt;color:#666;">Ленинградская область</div>
      <div style="font-size:8.5pt;color:#555;margin-top:6px;">12 глэмпинг-домиков, СПА-комплекс, верёвочный парк, ресторан. Участок 2 га.</div>
      <div style="font-size:8pt;color:#27ae60;font-weight:600;margin-top:6px;">Окупаемость: 24 месяца</div>
    </div>
  </div>
  <div style="border:1px solid #d0daf5;border-radius:8px;overflow:hidden;">
    <div style="height:8px;background:#e67e22;"></div>
    <div style="padding:12px 14px;">
      <div style="font-size:11pt;font-weight:700;color:#1a1a2e;margin-bottom:4px;">Мультиспорт «Олимп»</div>
      <div style="font-size:8.5pt;color:#666;">Краснодарский край</div>
      <div style="font-size:8.5pt;color:#555;margin-top:6px;">Футбольное поле, баскетбольная площадка, скалодром, батутный центр. Площадь 5 000 м².</div>
      <div style="font-size:8pt;color:#e67e22;font-weight:600;margin-top:6px;">Окупаемость: 20 месяцев</div>
    </div>
  </div>
</div>

<div class="kp-notes">
  <h4>Примечания</h4>
  <ul>
    <li>Цены указаны ориентировочно и могут быть скорректированы при заключении договора</li>
    <li>Стоимость доставки и монтажа рассчитывается отдельно</li>
    <li>Предложение действительно в течение 30 календарных дней</li>
    <li>Возможна поэтапная оплата и лизинг оборудования</li>
    <li>Финансовые показатели носят прогнозный характер</li>
  </ul>
</div>

<div class="kp-footer">
  <b>СПОРТВСЕГДА</b> — комплексное оснащение спортивных объектов<br>
  ${managerName ? 'Менеджер: '+managerName+' | ' : ''}Сгенерировано в Sport Constructor Pro
</div>

</body></html>`;

  const win=window.open('','_blank');
  if(!win){ alert('Разрешите всплывающие окна для генерации PDF'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(()=>win.print(), 500);
}
