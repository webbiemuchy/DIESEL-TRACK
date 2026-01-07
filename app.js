// Diesel Management System - Single Page App
// Storage: IndexedDB (persistent), with initial seeded simulation data on first run.
// Features: CRUD Machines/Operators, Refuel entries, Anomaly detection, Charts, Export/Import, Settings.

(function() {
  'use strict';

  // ---- Utilities ----
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const byId = id => document.getElementById(id);

  const fmt = {
    n: (v, d=2) => {
      if (Number.isNaN(+v) || v === null || v === undefined) return '';
      return (+v).toFixed(d);
    },
    pct: (v, d=1) => isFinite(v) ? `${(+v).toFixed(d)}%` : '',
    date: s => s ? new Date(s).toISOString().slice(0,10) : ''
  };

  function uuid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  function playBeep(){
    const audio = byId('beep');
    try { audio.currentTime = 0; audio.play(); } catch {}
  }

  function setStatus(msg){ byId('status-indicator').textContent = msg; setTimeout(()=>{ byId('status-indicator').textContent = 'Idle'; }, 1500); }

  function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); } }

  // Decimal ops to avoid float issues
  function toDec(v){ return Math.round((+v) * 1000000); }
  function fromDec(v){ return v / 1000000; }

  // ---- IndexedDB wrapper ----
  const DB_NAME = 'diesel_mgmt_db_v1';
  const DB_STORE = {
    meta: 'meta',
    machines: 'machines',
    operators: 'operators',
    refuels: 'refuels',
    settings: 'settings'
  };

  function openDb(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e)=>{
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE.meta)) db.createObjectStore(DB_STORE.meta, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(DB_STORE.machines)) db.createObjectStore(DB_STORE.machines, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(DB_STORE.operators)) db.createObjectStore(DB_STORE.operators, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(DB_STORE.refuels)) {
          const st = db.createObjectStore(DB_STORE.refuels, { keyPath: 'id' });
          st.createIndex('by_machine', 'machineId', { unique: false });
          st.createIndex('by_date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains(DB_STORE.settings)) db.createObjectStore(DB_STORE.settings, { keyPath: 'key' });
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }

  function tx(db, stores, mode='readonly'){ return db.transaction(stores, mode); }

  async function dbGetAll(store){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const req = tx(db, [store], 'readonly').objectStore(store).getAll();
      req.onsuccess = ()=> resolve(req.result || []);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function dbPut(store, value){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const req = tx(db, [store], 'readwrite').objectStore(store).put(value);
      req.onsuccess = ()=> resolve(value);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function dbBulkPut(store, values){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const t = tx(db, [store], 'readwrite');
      const os = t.objectStore(store);
      values.forEach(v => os.put(v));
      t.oncomplete = ()=> resolve(values);
      t.onerror = ()=> reject(t.error);
    });
  }

  async function dbDelete(store, key){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const req = tx(db, [store], 'readwrite').objectStore(store).delete(key);
      req.onsuccess = ()=> resolve();
      req.onerror = ()=> reject(req.error);
    });
  }

  async function dbClear(store){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const req = tx(db, [store], 'readwrite').objectStore(store).clear();
      req.onsuccess = ()=> resolve();
      req.onerror = ()=> reject(req.error);
    });
  }

  // meta helpers
  async function getMeta(key){
    const db = await openDb();
    return new Promise((resolve)=>{
      const req = tx(db, [DB_STORE.meta], 'readonly').objectStore(DB_STORE.meta).get(key);
      req.onsuccess = ()=> resolve(req.result?.value);
      req.onerror = ()=> resolve(undefined);
    });
  }
  async function setMeta(key, value){
    return dbPut(DB_STORE.meta, { key, value });
  }

  // ---- Domain logic ----
  const defaultSettings = {
    key: 'settings',
    tolerancePct: 10,
    soundOnAnomaly: 'on',
    decimals: 2,
    defaultUsageType: 'hours'
  };

  // usageType: hours | distance | loads | hybrid
  function calcExpectedFuel({usageType, rateA=0, rateB=0}, usageDelta, loads=0){
    const a = +rateA || 0;
    const b = +rateB || 0;
    switch(usageType){
      case 'hours':
      case 'distance':
      case 'loads':
        return usageDelta * a;
      case 'hybrid':
        return (usageDelta * a) + (loads * b);
      default:
        return usageDelta * a;
    }
  }

  function analyzeRefuel(record, machine, settings, recent){
    const decimals = +settings.decimals || 2;
    const tolerance = Math.max(0, +settings.tolerancePct || 0);

    const prev = +record.prevMeter;
    const curr = +record.currMeter;
    const loads = +record.loads || 0;
    const disp = +record.fuelDispensed;

    let reasons = [];

    if (!isFinite(prev) || !isFinite(curr) || !isFinite(disp)) {
      return { expectedFuel: 0, diff: 0, diffPct: 0, withinTolerance: false, reasons: ['Missing/invalid numeric fields'] };
    }

    if (curr < prev) {
      reasons.push('Meter rollback');
    }

    const usageDelta = Math.max(curr - prev, 0);
    const expected = calcExpectedFuel(machine, usageDelta, loads);

    // Define diff and within rule prioritizing over-expected usage
    const diff = disp - expected; // positive when actual > expected
    const tolAbs = expected * (tolerance / 100);
    let within = true;

    if (diff > 0) {
      // If actual > expected, only acceptable within tolerance window
      within = diff <= tolAbs;
      if (diff > 0) reasons.push('Actual > Expected');
      if (!within) reasons.push('Outside tolerance');
    } else {
      // If actual <= expected, it's generally acceptable unless other errors
      within = Math.abs(diff) <= tolAbs || diff <= 0;
    }

    // zero/low usage but fuel taken
    if (usageDelta === 0 && disp > 0) reasons.push('Zero usage with fuel dispensed');

    // basic outlier check: compare to moving average of last 3 diffs
    if (recent && recent.length >= 3) {
      const diffs = recent.map(r => (+r.fuelDispensed) - (+r.expectedFuel || 0));
      const avg = diffs.reduce((a,b)=>a+b,0) / diffs.length;
      const sd = Math.sqrt(diffs.map(d=>Math.pow(d-avg,2)).reduce((a,b)=>a+b,0)/diffs.length);
      if (Math.abs(diff - avg) > 2*sd) reasons.push('Outlier vs history');
    }

    const diffPct = expected > 0 ? (diff / expected) * 100 : (disp>0?100:0);

    return {
      expectedFuel: +expected.toFixed(decimals),
      diff: +diff.toFixed(decimals),
      diffPct: +diffPct.toFixed(decimals),
      withinTolerance: within,
      reasons
    };
  }

  // ---- State ----
  let state = {
    machines: [],
    operators: [],
    refuels: [],
    settings: { ...defaultSettings },
  };

  async function loadAll(){
    const [machines, operators, refuels, settings] = await Promise.all([
      dbGetAll(DB_STORE.machines),
      dbGetAll(DB_STORE.operators),
      dbGetAll(DB_STORE.refuels),
      (async()=>{ const s = await dbGetAll(DB_STORE.settings); const obj = s.find(x=>x.key==='settings'); return obj || defaultSettings; })()
    ]);
    state.machines = machines;
    state.operators = operators;
    state.refuels = refuels.sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    state.settings = { ...defaultSettings, ...(settings||{}) };
  }

  async function saveSettings(){
    await dbPut(DB_STORE.settings, { key: 'settings', tolerancePct: +byId('set-tolerance').value, soundOnAnomaly: byId('set-sound').value, decimals: +byId('set-decimals').value, defaultUsageType: byId('set-default-usage').value });
    await loadAll();
    renderAll();
    setStatus('Settings saved');
  }

  // ---- Seed Simulation Data ----
  function genSimData(){
    // Seed with requested hours-based machines
    const machines = [
      { name: 'Excavator', rate: 17 },
      { name: 'Grader', rate: 13 },
      { name: 'Roller', rate: 8 },
      { name: 'Water truck', rate: 1.5 },
      { name: 'Tipper', rate: 1.5 },
      { name: 'TLB', rate: 7.5 },
    ].map(m=>({ id: uuid(), name: m.name, usageType: 'hours', rateA: m.rate, rateB: 0, notes: '' }));

    const ops = [ 'John Doe', 'Jane Smith', 'Carlos N.', 'Aisha K.' ].map(n=>({ id: uuid(), name: n, badgeId: '', notes: '' }));

    // generate 20 days of entries
    const today = new Date();
    const days = 20;
    const refuels = [];
    function makeEntry(machine, basePrev, day){
      const date = new Date(+today - (days-day)*24*3600*1000).toISOString().slice(0,10);
      const delta = 4 + Math.random()*4; // hours worked
      const loads = 0;
      const curr = +(basePrev + delta).toFixed(2);
      const expected = calcExpectedFuel(machine, delta, loads);
      const actual = expected * (0.9 + Math.random()*0.25); // within ~±15%
      const disp = +actual.toFixed(2);
      const op = ops[Math.floor(Math.random()*ops.length)];
      return { id: uuid(), date, machineId: machine.id, operatorId: op.id, prevMeter: +basePrev.toFixed(2), currMeter: curr, loads, fuelDispensed: disp, notes: '' };
    }

    let prevs = machines.map(()=> 1000 + Math.random()*5000);
    for (let d=1; d<=days; d++){
      machines.forEach((m, idx)=>{
        const e = makeEntry(m, prevs[idx], d); prevs[idx] = e.currMeter; refuels.push(e);
      });
    }

    return { machines, operators: ops, refuels };
  }

  async function ensureSeeded(){
    const seeded = await getMeta('seeded');
    if (!seeded){
      const { machines, operators, refuels } = genSimData();
      await dbBulkPut(DB_STORE.machines, machines);
      await dbBulkPut(DB_STORE.operators, operators);
      // analyze and store refuels
      for (const r of refuels){
        const mach = machines.find(m=>m.id===r.machineId);
        const recent = [];
        const analyzed = analyzeRefuel(r, mach, defaultSettings, recent);
        await dbPut(DB_STORE.refuels, { ...r, ...analyzed });
      }
      await setMeta('seeded', true);
      await dbPut(DB_STORE.settings, defaultSettings);
    }
  }

  async function resetAndSeed(){
    await Promise.all([
      dbClear(DB_STORE.machines),
      dbClear(DB_STORE.operators),
      dbClear(DB_STORE.refuels),
      dbClear(DB_STORE.settings),
      dbClear(DB_STORE.meta)
    ]);
    await ensureSeeded();
    await loadAll();
    renderAll();
    setStatus('Database reset and seeded');
  }

  async function resetEmpty(){
    await Promise.all([
      dbClear(DB_STORE.machines),
      dbClear(DB_STORE.operators),
      dbClear(DB_STORE.refuels),
      dbClear(DB_STORE.settings),
      dbClear(DB_STORE.meta)
    ]);
    await setMeta('seeded', true); // mark so it doesn't reseed
    await dbPut(DB_STORE.settings, defaultSettings);
    await loadAll();
    renderAll();
    setStatus('Database reset (empty)');
  }

  // ---- Render Helpers ----
  function renderTabs(){
    $$('.tabs .tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('.tabs .tab').forEach(b=>b.classList.remove('active'));
        $$('.tab-content').forEach(s=>s.classList.remove('active'));
        btn.classList.add('active');
        byId('tab-' + btn.dataset.tab).classList.add('active');
      });
    });
  }

  function usageTypeLabel(t){
    switch(t){
      case 'hours': return 'Hours (L/hr)';
      case 'distance': return 'Distance (L/km)';
      case 'loads': return 'Loads (L/load)';
      case 'hybrid': return 'Hybrid (L/hr + L/load)';
      default: return t;
    }
  }

  function renderMachinesTable(){
    const tbody = byId('table-machines').querySelector('tbody');
    tbody.innerHTML = '';
    for (const m of state.machines){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.name}</td>
        <td>${usageTypeLabel(m.usageType)}</td>
        <td>${fmt.n(m.rateA, state.settings.decimals)}</td>
        <td>${fmt.n(m.rateB, state.settings.decimals)}</td>
        <td>${m.notes||''}</td>
        <td>
          <button data-act="edit" data-id="${m.id}">Edit</button>
          <button data-act="del" data-id="${m.id}" class="danger">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll('button[data-act="edit"]').forEach(btn=>btn.addEventListener('click', ()=> startEditMachine(btn.dataset.id)));
    tbody.querySelectorAll('button[data-act="del"]').forEach(btn=>btn.addEventListener('click', ()=> deleteMachine(btn.dataset.id)));
  }

  function renderOperatorsTable(){
    const tbody = byId('table-operators').querySelector('tbody');
    tbody.innerHTML = '';
    for (const o of state.operators){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.name}</td>
        <td>${o.badgeId||''}</td>
        <td>${o.notes||''}</td>
        <td>
          <button data-act="edit" data-id="${o.id}">Edit</button>
          <button data-act="del" data-id="${o.id}" class="danger">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll('button[data-act="edit"]').forEach(btn=>btn.addEventListener('click', ()=> startEditOperator(btn.dataset.id)));
    tbody.querySelectorAll('button[data-act="del"]').forEach(btn=>btn.addEventListener('click', ()=> deleteOperator(btn.dataset.id)));
  }

  function renderRefuelsTable(){
    const tbody = byId('table-refuels').querySelector('tbody');
    tbody.innerHTML = '';
    for (const r of state.refuels){
      const m = state.machines.find(x=>x.id===r.machineId);
      const o = state.operators.find(x=>x.id===r.operatorId);
      const badge = r.withinTolerance ? 'ok' : (Math.abs(r.diffPct) <= 25 ? 'warn' : 'err');
      const reasons = r.reasons?.join('; ') || '';
      const usageDelta = r.hoursWorked ?? Math.max((+r.currMeter||0)-(+r.prevMeter||0), 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmt.date(r.date)}</td>
        <td>${m?m.name:'?'}</td>
        <td>${o?o.name:'?'}</td>
        <td>${fmt.n(r.prevMeter, state.settings.decimals)}</td>
        <td>${fmt.n(r.currMeter, state.settings.decimals)}</td>
        <td>${fmt.n(usageDelta, state.settings.decimals)}</td>
        <td>${fmt.n(r.loads||0, state.settings.decimals)}</td>
        <td>${fmt.n(r.fuelDispensed, state.settings.decimals)}</td>
        <td>${fmt.n(r.expectedFuel||0, state.settings.decimals)}</td>
        <td>${fmt.n(r.diff||0, state.settings.decimals)}</td>
        <td>${fmt.pct(r.diffPct||0)}</td>
        <td><span class="badge ${badge}" title="${reasons}">${r.withinTolerance?'OK':(badge==='warn'?'Check':'Anomaly')}</span></td>
        <td>
          <button data-act="edit" data-id="${r.id}">Edit</button>
          <button data-act="del" data-id="${r.id}" class="danger">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll('button[data-act="edit"]').forEach(btn=>btn.addEventListener('click', ()=> startEditRefuel(btn.dataset.id)));
    tbody.querySelectorAll('button[data-act="del"]').forEach(btn=>btn.addEventListener('click', ()=> deleteRefuel(btn.dataset.id)));
  }

  function renderRefuelSelectors(){
    const mSel = byId('refuel-machine');
    const oSel = byId('refuel-operator');
    const rMSel = byId('report-machine');
    mSel.innerHTML = state.machines.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
    oSel.innerHTML = state.operators.map(o=>`<option value="${o.id}">${o.name}</option>`).join('');
    rMSel.innerHTML = '<option value="">All</option>' + state.machines.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  }

  function renderSettings(){
    byId('set-tolerance').value = state.settings.tolerancePct;
    byId('set-sound').value = state.settings.soundOnAnomaly;
    byId('set-decimals').value = state.settings.decimals;
    byId('set-default-usage').value = state.settings.defaultUsageType;
  }

  function renderAll(){
    renderMachinesTable();
    renderOperatorsTable();
    renderRefuelsTable();
    renderRefuelSelectors();
    renderSettings();
    refreshChartsAndSummary();
  }

  // ---- CRUD Handlers ----
  function clearMachineForm(){ byId('machine-id').value=''; byId('machine-name').value=''; byId('machine-usage-type').value=state.settings.defaultUsageType; byId('machine-rate-a').value=''; byId('machine-rate-b').value=''; byId('machine-notes').value=''; }
  function startEditMachine(id){ const m=state.machines.find(x=>x.id===id); if(!m) return; byId('machine-id').value=m.id; byId('machine-name').value=m.name; byId('machine-usage-type').value=m.usageType; byId('machine-rate-a').value=m.rateA; byId('machine-rate-b').value=m.rateB; byId('machine-notes').value=m.notes||''; }
  async function deleteMachine(id){ if(!confirm('Delete machine and its references will remain in refuels. Continue?')) return; await dbDelete(DB_STORE.machines,id); await loadAll(); renderAll(); setStatus('Machine deleted'); }

  byId('form-machine').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = byId('machine-id').value || uuid();
    const payload = {
      id,
      name: byId('machine-name').value.trim(),
      usageType: byId('machine-usage-type').value,
      rateA: +byId('machine-rate-a').value || 0,
      rateB: +byId('machine-rate-b').value || 0,
      notes: byId('machine-notes').value.trim()
    };
    if (!payload.name) return alert('Machine name is required');
    await dbPut(DB_STORE.machines, payload);
    await loadAll();
    renderAll();
    clearMachineForm();
    setStatus('Machine saved');
  });
  byId('machine-cancel').addEventListener('click', clearMachineForm);

  function clearOperatorForm(){ byId('operator-id').value=''; byId('operator-name').value=''; byId('operator-badge').value=''; byId('operator-notes').value=''; }
  function startEditOperator(id){ const o=state.operators.find(x=>x.id===id); if(!o) return; byId('operator-id').value=o.id; byId('operator-name').value=o.name; byId('operator-badge').value=o.badgeId||''; byId('operator-notes').value=o.notes||''; }
  async function deleteOperator(id){ if(!confirm('Delete operator?')) return; await dbDelete(DB_STORE.operators,id); await loadAll(); renderAll(); setStatus('Operator deleted'); }

  byId('form-operator').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = byId('operator-id').value || uuid();
    const payload = {
      id,
      name: byId('operator-name').value.trim(),
      badgeId: byId('operator-badge').value.trim(),
      notes: byId('operator-notes').value.trim()
    };
    if (!payload.name) return alert('Operator name is required');
    await dbPut(DB_STORE.operators, payload);
    await loadAll();
    renderAll();
    clearOperatorForm();
    setStatus('Operator saved');
  });
  byId('operator-cancel').addEventListener('click', clearOperatorForm);

  function clearRefuelForm(){ byId('refuel-id').value=''; byId('refuel-date').value=''; byId('refuel-machine').value=state.machines[0]?.id||''; byId('refuel-operator').value=state.operators[0]?.id||''; byId('refuel-hours').value=''; byId('refuel-loads').value=''; byId('refuel-fuel').value=''; byId('refuel-notes').value=''; }
  function startEditRefuel(id){ const r=state.refuels.find(x=>x.id===id); if(!r) return; byId('refuel-id').value=r.id; byId('refuel-date').value=r.date; byId('refuel-machine').value=r.machineId; byId('refuel-operator').value=r.operatorId; const hours = r.hoursWorked ?? Math.max((+r.currMeter||0)-(+r.prevMeter||0), 0); byId('refuel-hours').value=hours; byId('refuel-loads').value=r.loads||''; byId('refuel-fuel').value=r.fuelDispensed; byId('refuel-notes').value=r.notes||''; }
  async function deleteRefuel(id){ if(!confirm('Delete refuel entry?')) return; await dbDelete(DB_STORE.refuels,id); await loadAll(); renderAll(); setStatus('Refuel deleted'); }

  byId('form-refuel').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = byId('refuel-id').value || uuid();
    const machine = state.machines.find(m=>m.id===byId('refuel-machine').value);
    const hoursWorked = +byId('refuel-hours').value;
    const payload = {
      id,
      date: byId('refuel-date').value || new Date().toISOString().slice(0,10),
      machineId: machine?.id,
      operatorId: byId('refuel-operator').value,
      hoursWorked: hoursWorked,
      loads: +byId('refuel-loads').value || 0,
      fuelDispensed: +byId('refuel-fuel').value,
      notes: byId('refuel-notes').value.trim()
    };

    if (!payload.machineId) return alert('Select a machine');
    if (!payload.operatorId) return alert('Select an operator');
    if (!isFinite(payload.hoursWorked)) return alert('Enter valid hours worked');
    if (!isFinite(payload.fuelDispensed)) return alert('Enter valid fuel dispensed');

    // recent last 3 entries for this machine
    const recent = state.refuels.filter(r=>r.machineId===payload.machineId).slice(-3);
    // shim a record compatible with analyzeRefuel
    const recordForAnalysis = { ...payload, prevMeter: 0, currMeter: payload.hoursWorked };
    const analyzed = analyzeRefuel(recordForAnalysis, machine, state.settings, recent);
    const final = { ...payload, ...analyzed };

    await dbPut(DB_STORE.refuels, final);
    await loadAll();
    renderAll();
    clearRefuelForm();
    setStatus('Refuel saved');

    if (!final.withinTolerance && state.settings.soundOnAnomaly==='on') playBeep();
  });
  byId('refuel-cancel').addEventListener('click', clearRefuelForm);

  // ---- Export/Import ----
  byId('btn-export').addEventListener('click', async ()=>{
    const data = {
      machines: await dbGetAll(DB_STORE.machines),
      operators: await dbGetAll(DB_STORE.operators),
      refuels: await dbGetAll(DB_STORE.refuels),
      settings: await dbGetAll(DB_STORE.settings)
    };
    const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'diesel-data-export.json'; a.click();
    URL.revokeObjectURL(url);
  });

  byId('file-import').addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (data.machines) await dbBulkPut(DB_STORE.machines, data.machines);
      if (data.operators) await dbBulkPut(DB_STORE.operators, data.operators);
      if (data.refuels) await dbBulkPut(DB_STORE.refuels, data.refuels);
      if (data.settings) for (const s of data.settings) await dbPut(DB_STORE.settings, s);
      await loadAll();
      renderAll();
      setStatus('Import completed');
    } catch(err){
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  });

  byId('btn-reset').addEventListener('click', ()=>{ if(confirm('This will erase all data and reload simulation data. Continue?')) resetAndSeed(); });
  byId('btn-clear').addEventListener('click', ()=>{ if(confirm('This will erase all data and start with an empty database. Continue?')) resetEmpty(); });

  // ---- Additional Exports (CSV + PNG) ----
  function downloadBlob(filename, blob){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }
  function downloadDataURL(filename, dataUrl){
    const a = document.createElement('a'); a.href = dataUrl; a.download = filename; a.click();
  }
  function csvEscape(v){
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  }
  function toCsv(headers, rows){
    const head = headers.join(',');
    const body = rows.map(r=> headers.map(h=> csvEscape(r[h])).join(',')).join('\n');
    return head + '\n' + body + '\n';
  }

  async function exportExcelCsv(){
    const machines = await dbGetAll(DB_STORE.machines);
    const operators = await dbGetAll(DB_STORE.operators);
    const refuels = await dbGetAll(DB_STORE.refuels);

    const mCsv = toCsv(['id','name','usageType','rateA','rateB','notes'], machines);
    const oCsv = toCsv(['id','name','badgeId','notes'], operators);
    const rRows = refuels.map(r=>({
      id: r.id,
      date: r.date,
      machine: (state.machines.find(m=>m.id===r.machineId)||{}).name || r.machineId,
      operator: (state.operators.find(o=>o.id===r.operatorId)||{}).name || r.operatorId,
      hoursWorked: r.hoursWorked ?? Math.max((+r.currMeter||0)-(+r.prevMeter||0), 0),
      loads: r.loads||0,
      fuelDispensed: r.fuelDispensed,
      expectedFuel: r.expectedFuel||0,
      diff: r.diff||0,
      diffPct: r.diffPct||0,
      withinTolerance: r.withinTolerance,
      reasons: (r.reasons||[]).join('; ')
    }));
    const rCsv = toCsv(['id','date','machine','operator','hoursWorked','loads','fuelDispensed','expectedFuel','diff','diffPct','withinTolerance','reasons'], rRows);

    downloadBlob('machines.csv', new Blob([mCsv], { type: 'text/csv' }));
    downloadBlob('operators.csv', new Blob([oCsv], { type: 'text/csv' }));
    downloadBlob('refuels.csv', new Blob([rCsv], { type: 'text/csv' }));
    setStatus('Exported CSV files');
  }

  byId('btn-export-excel')?.addEventListener('click', exportExcelCsv);

  byId('btn-export-zip')?.addEventListener('click', async ()=>{
    // Multiple downloads: CSVs + chart PNGs. Place into your reports folder manually after download.
    await exportExcelCsv();
    try{
      const ts = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
      const c1 = byId('chart-fuel-time');
      const c2 = byId('chart-expected-actual');
      const c3 = byId('chart-anomalies');
      if (c1) downloadDataURL(`reports_fuel_time_${ts}.png`, c1.toDataURL('image/png'));
      if (c2) downloadDataURL(`reports_expected_actual_${ts}.png`, c2.toDataURL('image/png'));
      if (c3) downloadDataURL(`reports_anomalies_${ts}.png`, c3.toDataURL('image/png'));
      setStatus('Exported CSVs and chart PNGs');
    } catch(e){ setStatus('Chart export failed'); }
  });

  // ---- Reports & Charts ----
  let charts = { fuelTime: null, expectedActual: null, anomalies: null };

  function filterRefuelsForReport(){
    const from = byId('report-from').value;
    const to = byId('report-to').value;
    const mId = byId('report-machine').value;
    return state.refuels.filter(r=>{
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (mId && r.machineId !== mId) return false;
      return true;
    });
  }

  function refreshChartsAndSummary(){
    const rows = filterRefuelsForReport();

    // totals
    const totalFuel = rows.reduce((a,b)=>a+(+b.fuelDispensed||0),0);
    const totalExpected = rows.reduce((a,b)=>a+(+b.expectedFuel||0),0);
    const anomalies = rows.filter(r=>!r.withinTolerance).length;
    byId('sum-fuel').textContent = fmt.n(totalFuel, state.settings.decimals);
    byId('sum-expected').textContent = fmt.n(totalExpected, state.settings.decimals);
    byId('sum-anomalies').textContent = anomalies;

    // chart data
    const labels = rows.map(r=>r.date);
    const dsFuel = rows.map(r=>+r.fuelDispensed||0);
    const dsExp = rows.map(r=>+r.expectedFuel||0);

    const perDay = {};
    rows.forEach(r=>{ perDay[r.date] = perDay[r.date] || { fuel:0, exp:0, total:0, anom:0 }; perDay[r.date].fuel += +r.fuelDispensed||0; perDay[r.date].exp += +r.expectedFuel||0; perDay[r.date].total++; if(!r.withinTolerance) perDay[r.date].anom++; });
    const dates = Object.keys(perDay).sort();
    const anomRate = dates.map(d=> perDay[d].total? (perDay[d].anom / perDay[d].total) * 100 : 0);
    const perDayFuel = dates.map(d=> perDay[d].fuel);
    const perDayExp = dates.map(d=> perDay[d].exp);

    drawLineChart('chart-fuel-time', dates, [{label:'Fuel', data: perDayFuel, color:'#60a5fa'}]);
    drawLineChart('chart-expected-actual', labels, [
      {label:'Expected', data: dsExp, color:'#86efac'},
      {label:'Actual', data: dsFuel, color:'#fca5a5'}
    ]);
    drawLineChart('chart-anomalies', dates, [{label:'Anomaly %', data: anomRate, color:'#fbbf24'}]);
  }

  function drawLineChart(canvasId, labels, datasets){
    const ctx = byId(canvasId).getContext('2d');
    // minimal pseudo-chart using Canvas to avoid heavy deps if Chart.js-lite failed
    // We'll try to use global Chart if available
    if (window.Chart && Chart.defaults){
      if (charts[canvasId]) charts[canvasId].destroy();
      charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: datasets.map(d=>({ label:d.label, data:d.data, borderColor:d.color, backgroundColor:'transparent', tension:0.2 }))
        },
        options: { responsive: true, plugins: { legend: { display: true, labels: { color: '#e5e7eb' } } }, scales: { x: { ticks:{ color:'#9ca3af' }}, y: { ticks:{ color:'#9ca3af' } } } }
      });
      return;
    }

    // fallback tiny renderer
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle = '#374151'; ctx.strokeRect(0,0,W,H);
    datasets.forEach((ds, idx)=>{
      const vals = ds.data;
      const min = Math.min(...vals,0), max = Math.max(...vals,1);
      ctx.beginPath();
      ctx.strokeStyle = ds.color;
      vals.forEach((v,i)=>{
        const x = (i/(vals.length-1||1))*W;
        const y = H - ((v-min)/(max-min||1))*H;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
    });
  }

  byId('btn-refresh-report').addEventListener('click', refreshChartsAndSummary);

  // ---- init ----
  async function init(){
    renderTabs();
    await ensureSeeded();
    await loadAll();
    // default dates in report
    const minDate = state.refuels[0]?.date; const maxDate = state.refuels[state.refuels.length-1]?.date;
    byId('report-from').value = minDate || '';
    byId('report-to').value = maxDate || '';
    renderAll();

    byId('form-settings').addEventListener('submit', (e)=>{ e.preventDefault(); saveSettings(); });
  }

  init();
})();
