(function() {
    'use strict';

    const byId = id => document.getElementById(id);
    const fmt = {
        n: (v, d = 2) => (v !== null && v !== undefined) ? Number(v).toFixed(d) : '0.00',
        date: s => s ? new Date(s).toLocaleString() : ''
    };

    function uuid() { return 'ax-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16)); }

    const DB_NAME = 'DieselTrackDB_v4';
    const STORES = { machines: 'machines', operators: 'operators', refuels: 'refuels', settings: 'settings' };

    let db;
    let state = { machines: [], operators: [], refuels: [], settings: { tolerance: 10, id: 'current' } };
    let charts = { linking: null, machine: null, operator: null };

    // ========== NOTIFICATION SYSTEM ==========
    function showNotification(message, type = 'info') {
        const container = byId('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    function showConfirm(message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Confirm Action</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary btn-sm" id="modal-cancel">Cancel</button>
                    <button class="btn btn-danger btn-sm" id="modal-confirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        byId('modal-cancel').onclick = () => modal.remove();
        byId('modal-confirm').onclick = () => {
            modal.remove();
            onConfirm();
        };
    }

    // ========== DATABASE OPERATIONS WITH ERROR HANDLING ==========
    async function openDb() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = e => Object.values(STORES).forEach(s => e.target.result.createObjectStore(s, { keyPath: 'id' }));
            req.onsuccess = e => { 
                db = e.target.result; 
                resolve(); 
            };
            req.onerror = e => {
                showNotification('Database error: Unable to open storage', 'error');
                reject(e);
            };
        });
    }

    async function dbPut(store, data) { 
        try {
            const tx = db.transaction(store, 'readwrite'); 
            tx.objectStore(store).put(data);
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            showNotification('Failed to save data', 'error');
            return false;
        }
    }

    async function dbGetAll(store) { 
        try {
            return new Promise(r => { 
                const tx = db.transaction(store, 'readonly'); 
                const req = tx.objectStore(store).getAll(); 
                req.onsuccess = () => r(req.result); 
                req.onerror = () => r([]);
            });
        } catch (e) {
            showNotification('Failed to retrieve data', 'error');
            return [];
        }
    }

    async function dbDelete(store, id) { 
        try {
            const tx = db.transaction(store, 'readwrite'); 
            tx.objectStore(store).delete(id);
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            showNotification('Failed to delete record', 'error');
            return false;
        }
    }

    async function loadState() {
        state.machines = await dbGetAll(STORES.machines);
        state.operators = await dbGetAll(STORES.operators);
        state.refuels = await dbGetAll(STORES.refuels);
        const s = await dbGetAll(STORES.settings);
        if (s.length) state.settings = s[0];
        updateStatusIndicator();
    }

    function updateStatusIndicator() {
        const indicator = byId('status-indicator');
        const total = state.refuels.length;
        const anomalies = state.refuels.filter(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            if (!m) return false;
            const expected = m.rate * r.usage;
            const variance = r.fuel - expected;
            const overflow = m.capacity && r.fuel > m.capacity;
            const isTooHigh = (variance / expected) * 100 > state.settings.tolerance;
            return overflow || (variance > 0 && isTooHigh);
        }).length;
        
        indicator.textContent = `${total} LOGS | ${anomalies} ANOMALIES`;
        indicator.className = anomalies > 0 ? 'status-pill status-warning' : 'status-pill';
        
        // Update system info if on settings page
        if (byId('info-machines')) {
            byId('info-machines').textContent = state.machines.length;
            byId('info-operators').textContent = state.operators.length;
            byId('info-refuels').textContent = state.refuels.length;
        }
    }

    // ========== VALIDATION ==========
    function validateMachine(id, model, rate, capacity) {
        if (!id || id.trim() === '') {
            showNotification('Machine ID is required', 'error');
            return false;
        }
        if (!model || model.trim() === '') {
            showNotification('Model is required', 'error');
            return false;
        }
        if (rate <= 0) {
            showNotification('Consumption rate must be positive', 'error');
            return false;
        }
        if (capacity <= 0) {
            showNotification('Tank capacity must be positive', 'error');
            return false;
        }
        return true;
    }

    function validateOperator(name, badge) {
        if (!name || name.trim() === '') {
            showNotification('Operator name is required', 'error');
            return false;
        }
        if (!badge || badge.trim() === '') {
            showNotification('Badge number is required', 'error');
            return false;
        }
        return true;
    }

    function validateRefuel(machineId, operatorId, usage, fuel) {
        if (!machineId) {
            showNotification('Please select a machine', 'error');
            return false;
        }
        if (!operatorId) {
            showNotification('Please select an operator', 'error');
            return false;
        }
        if (usage <= 0) {
            showNotification('Usage must be positive', 'error');
            return false;
        }
        if (fuel <= 0) {
            showNotification('Fuel amount must be positive', 'error');
            return false;
        }
        
        // Check if fuel exceeds tank capacity
        const machine = state.machines.find(m => m.id === machineId);
        if (machine && machine.capacity && fuel > machine.capacity) {
            showNotification(`Warning: Fuel amount (${fuel}L) exceeds tank capacity (${machine.capacity}L)`, 'warning');
        }
        
        return true;
    }

    // ========== RENDERING ==========
    function renderTables() {
        byId('table-refuels').tBodies[0].innerHTML = state.refuels.slice().reverse().map(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            const o = state.operators.find(x => x.id === r.operatorId);
            const expected = m ? m.rate * r.usage : 0;
            const variance = r.fuel - expected;
            
            const overflow = m && m.capacity && r.fuel > m.capacity;
            const isTooHigh = expected > 0 && (variance / expected) * 100 > state.settings.tolerance;
            const isAnomaly = overflow || (variance > 0 && isTooHigh);

            return `<tr>
                <td>${fmt.date(r.timestamp)}</td>
                <td>${r.machineId}</td>
                <td>${o?.name || 'N/A'}</td>
                <td>${r.usage}</td>
                <td>${r.fuel} L</td>
                <td class="${variance > 0 ? 'danger-text' : ''}">${fmt.n(variance)}</td>
                <td><span class="badge ${isAnomaly ? 'badge-warn' : 'badge-ok'}">${overflow ? 'OVER TANK' : (isAnomaly ? 'ANOMALY' : 'OK')}</span></td>
                <td><button class="btn-sm btn-danger" onclick="app.deleteRefuel('${r.id}')">×</button></td>
            </tr>`;
        }).join('');

        byId('table-machines').tBodies[0].innerHTML = state.machines.map(m => `<tr>
            <td>${m.id}</td>
            <td>${m.model}</td>
            <td>${m.rate}</td>
            <td>${m.capacity}</td>
            <td><button class="btn-sm btn-danger" onclick="app.deleteMachine('${m.id}')">Delete</button></td>
        </tr>`).join('');

        byId('table-operators').tBodies[0].innerHTML = state.operators.map(o => `<tr>
            <td>${o.name}</td>
            <td>${o.badge}</td>
            <td><button class="btn-sm btn-danger" onclick="app.deleteOperator('${o.id}')">Delete</button></td>
        </tr>`).join('');
    }

    function renderAnalytics() {
        const createChart = (id, type, labels, datasets) => {
            if (charts[id]) charts[id].destroy();
            const ctx = byId(`chart-${id}`).getContext('2d');
            charts[id] = new Chart(ctx, {
                type, data: { labels, datasets },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { labels: { color: '#fff' } },
                        tooltip: {
                            callbacks: {
                                title: (items) => items[0].label,
                                label: (context) => {
                                    const dataIndex = context.dataIndex;
                                    const refuel = type === 'line' ? recent[dataIndex] : 
                                                   id === 'machine' ? mData[dataIndex] : oData[dataIndex];
                                    if (!refuel) return context.label;
                                    
                                    const machine = state.machines.find(m => m.id === refuel.machineId);
                                    const operator = state.operators.find(o => o.id === refuel.operatorId);
                                    
                                    return [
                                        `Machine: ${refuel.machineId} (${machine?.model || 'N/A'})`,
                                        `Operator: ${operator?.name || 'N/A'}`,
                                        `Usage: ${refuel.usage} hrs`,
                                        `Fuel: ${refuel.fuel} L`
                                    ];
                                }
                            }
                        }
                    },
                    scales: type === 'bar' ? {
                        y: { 
                            ticks: { color: '#fff' }, 
                            grid: { color: '#333' },
                            title: { display: true, text: 'Fuel (Liters)', color: '#fff' }
                        },
                        x: { 
                            ticks: { color: '#fff' }, 
                            grid: { color: '#333' }
                        }
                    } : {
                        y: { 
                            ticks: { color: '#fff' }, 
                            grid: { color: '#333' },
                            title: { display: true, text: 'Fuel (Liters)', color: '#fff' }
                        },
                        x: { 
                            ticks: { color: '#fff' }, 
                            grid: { color: '#333' }
                        }
                    }
                }
            });
        };

        const recent = state.refuels.slice(-20);
        
        // Linking Graph - show machine and operator on each point
        const linkingLabels = recent.map(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            const o = state.operators.find(x => x.id === r.operatorId);
            return `${fmt.date(r.timestamp).split(',')[0]}\n${r.machineId} | ${o?.name || 'N/A'}`;
        });
        
        createChart('linking', 'line', linkingLabels, [{
            label: 'Total Fleet Fuel Consumption (L)',
            data: recent.map(r => r.fuel),
            borderColor: '#FFB400', 
            tension: 0.3, 
            fill: true, 
            backgroundColor: 'rgba(255, 180, 0, 0.1)'
        }]);

        // Machine Graph - show operator on each bar
        const filterM = byId('chart-filter-machine').value;
        const mData = filterM ? state.refuels.filter(r => r.machineId === filterM) : recent;
        const machineLabels = mData.map(r => {
            const o = state.operators.find(x => x.id === r.operatorId);
            return `${fmt.date(r.timestamp).split(',')[0]}\n${o?.name || 'N/A'}`;
        });
        
        createChart('machine', 'bar', machineLabels, [{
            label: `Fuel Usage: ${filterM || 'All'}`,
            data: mData.map(r => r.fuel), 
            backgroundColor: '#2ecc71'
        }]);

        // Operator Graph - show machine on each bar
        const filterO = byId('chart-filter-operator').value;
        const oData = filterO ? state.refuels.filter(r => r.operatorId === filterO) : recent;
        const operatorLabels = oData.map(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            return `${fmt.date(r.timestamp).split(',')[0]}\n${m?.id || 'N/A'}`;
        });
        
        createChart('operator', 'bar', operatorLabels, [{
            label: `Fuel Issued to: ${state.operators.find(o => o.id === filterO)?.name || 'All'}`,
            data: oData.map(r => r.fuel), 
            backgroundColor: '#3498db'
        }]);
    }

    function updateFilters() {
        byId('chart-filter-machine').innerHTML = '<option value="">All Machines</option>' + state.machines.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
        byId('chart-filter-operator').innerHTML = '<option value="">All Operators</option>' + state.operators.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
        byId('refuel-machine').innerHTML = byId('chart-filter-machine').innerHTML;
        byId('refuel-operator').innerHTML = byId('chart-filter-operator').innerHTML;
    }

    // ========== IMPORT/EXPORT ==========
    function exportData() {
        try {
            const wb = XLSX.utils.book_new();
            
            // Refuel logs with enhanced data
            const refuelData = state.refuels.map(r => {
                const m = state.machines.find(x => x.id === r.machineId);
                const o = state.operators.find(x => x.id === r.operatorId);
                const expected = m ? m.rate * r.usage : 0;
                const variance = r.fuel - expected;
                return {
                    Timestamp: fmt.date(r.timestamp),
                    Machine: r.machineId,
                    Model: m?.model || 'N/A',
                    Operator: o?.name || 'N/A',
                    Badge: o?.badge || 'N/A',
                    Usage: r.usage,
                    Fuel: r.fuel,
                    Expected: expected,
                    Variance: variance,
                    Status: (m && m.capacity && r.fuel > m.capacity) ? 'OVER TANK' : (variance > expected * state.settings.tolerance / 100 ? 'ANOMALY' : 'OK')
                };
            });
            
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refuelData), "Refuel Logs");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.machines), "Machines");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.operators), "Operators");
            
            const filename = `DieselTrack_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            showNotification('Data exported successfully', 'success');
        } catch (e) {
            showNotification('Export failed: ' + e.message, 'error');
        }
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                let imported = { machines: 0, operators: 0, refuels: 0 };
                let warnings = [];
                
                // Helper function to normalize column names
                const normalizeKey = (key) => {
                    if (!key) return '';
                    return key.toString().toLowerCase().trim().replace(/\s+/g, '');
                };
                
                // Helper to find value by multiple possible column names
                const findValue = (row, possibleNames) => {
                    for (const name of possibleNames) {
                        const normalized = normalizeKey(name);
                        for (const key in row) {
                            if (normalizeKey(key) === normalized) {
                                const val = row[key];
                                return (val !== null && val !== undefined && val !== '') ? val : null;
                            }
                        }
                    }
                    return null;
                };
                
                console.log('Starting import process...');
                console.log('Available sheets:', workbook.SheetNames);
                
                // PHASE 1: Import Machines first
                for (const sheetName of workbook.SheetNames) {
                    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    if (sheet.length === 0) continue;
                    
                    const firstRow = sheet[0];
                    const keys = Object.keys(firstRow).map(k => normalizeKey(k));
                    
                    console.log(`Sheet: ${sheetName}, Keys:`, keys);
                    
                    // Detect Machines/Assets
                    const isMachineSheet = keys.some(k => k.includes('machine') || k === 'model' || k === 'rate' || k === 'capacity');
                    
                    if (isMachineSheet) {
                        console.log(`Processing machines from sheet: ${sheetName}`);
                        for (const row of sheet) {
                            const machineId = findValue(row, ['Machine ID', 'Machine I', 'MachineID', 'Machine', 'ID', 'Asset ID', 'AssetID']);
                            const model = findValue(row, ['Model', 'Machine Model', 'Type', 'Equipment Type']);
                            const rate = findValue(row, ['Rate', 'Consumption Rate', 'Fuel Rate', 'L/hr', 'Liters/Hour']);
                            const capacity = findValue(row, ['Capacity', 'Tank Capacity', 'Tank Size', 'Max Capacity']);
                            
                            console.log('Machine row:', { machineId, model, rate, capacity });
                            
                            if (machineId && model && rate && capacity) {
                                const cleanId = machineId.toString().toUpperCase().trim();
                                const cleanRate = parseFloat(rate);
                                const cleanCapacity = parseFloat(capacity);
                                
                                if (!isNaN(cleanRate) && cleanRate > 0 && !isNaN(cleanCapacity) && cleanCapacity > 0) {
                                    await dbPut(STORES.machines, { 
                                        id: cleanId, 
                                        model: model.toString().trim(), 
                                        rate: cleanRate, 
                                        capacity: cleanCapacity 
                                    });
                                    imported.machines++;
                                    console.log(`Imported machine: ${cleanId}`);
                                }
                            }
                        }
                    }
                }
                
                // Reload state after machines
                await loadState();
                console.log('Machines loaded:', state.machines.length);
                
                // PHASE 2: Import Operators
                for (const sheetName of workbook.SheetNames) {
                    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    if (sheet.length === 0) continue;
                    
                    const firstRow = sheet[0];
                    const keys = Object.keys(firstRow).map(k => normalizeKey(k));
                    
                    // Detect Operators - must have operator or badge, but NOT machine/model/rate
                    const isOperatorSheet = (keys.includes('operator') || keys.includes('badge') || keys.includes('badgenumber')) &&
                                           !keys.includes('machine') && !keys.includes('model') && !keys.includes('rate');
                    
                    if (isOperatorSheet) {
                        console.log(`Processing operators from sheet: ${sheetName}`);
                        for (const row of sheet) {
                            const name = findValue(row, ['Operator', 'Name', 'Operator Name', 'Full Name', 'Employee Name']);
                            const badge = findValue(row, ['Badge Number', 'Badge', 'BadgeNumber', 'ID', 'Employee ID', 'Badge ID']);
                            
                            console.log('Operator row:', { name, badge });
                            
                            if (name && badge) {
                                const cleanName = name.toString().trim();
                                const cleanBadge = badge.toString().trim();
                                
                                const existingOp = state.operators.find(o => 
                                    o.badge === cleanBadge || 
                                    o.name.toLowerCase() === cleanName.toLowerCase()
                                );
                                
                                if (!existingOp) {
                                    await dbPut(STORES.operators, { 
                                        id: uuid(), 
                                        name: cleanName, 
                                        badge: cleanBadge 
                                    });
                                    imported.operators++;
                                    console.log(`Imported operator: ${cleanName}`);
                                }
                            }
                        }
                    }
                }
                
                // Reload state after operators
                await loadState();
                console.log('Operators loaded:', state.operators.length);
                
                // PHASE 3: Import Refueling logs
                for (const sheetName of workbook.SheetNames) {
                    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    if (sheet.length === 0) continue;
                    
                    const firstRow = sheet[0];
                    const keys = Object.keys(firstRow).map(k => normalizeKey(k));
                    
                    // Detect Refueling - must have fuel/fuelissued AND hours/usage AND machine AND operator
                    const isRefuelSheet = (keys.some(k => k.includes('fuel')) || keys.includes('fuelissued')) &&
                                         (keys.some(k => k.includes('hours')) || keys.includes('usage')) &&
                                         keys.some(k => k.includes('machine')) &&
                                         keys.some(k => k.includes('operator'));
                    
                    if (isRefuelSheet) {
                        console.log(`Processing refueling from sheet: ${sheetName}`);
                        for (const row of sheet) {
                            const timestamp = findValue(row, ['Time', 'Timestamp', 'Date', 'DateTime', 'Date Time']);
                            const machineId = findValue(row, ['Machine', 'Machine ID', 'MachineID', 'Asset', 'Equipment']);
                            const operatorName = findValue(row, ['Operator', 'Operator Name', 'Name', 'Employee']);
                            const usage = findValue(row, ['Hours worked', 'Hoursworked', 'Hours', 'Usage', 'Running Hours', 'Operating Hours']);
                            const fuel = findValue(row, ['Fuel issued', 'Fuelissued', 'Fuel', 'Fuel Amount', 'Liters', 'Fuel Dispensed']);
                            
                            console.log('Refuel row:', { timestamp, machineId, operatorName, usage, fuel });
                            
                            if (machineId && operatorName && usage && fuel) {
                                // Find machine
                                const machine = state.machines.find(m => 
                                    m.id === machineId.toString().toUpperCase().trim()
                                );
                                
                                // Find operator
                                const operator = state.operators.find(o => 
                                    o.name.toLowerCase().trim() === operatorName.toString().toLowerCase().trim()
                                );
                                
                                if (!machine) {
                                    warnings.push(`Machine ${machineId} not found`);
                                    continue;
                                }
                                
                                if (!operator) {
                                    warnings.push(`Operator "${operatorName}" not found`);
                                    continue;
                                }
                                
                                const parsedUsage = parseFloat(usage);
                                const parsedFuel = parseFloat(fuel);
                                
                                if (!isNaN(parsedUsage) && parsedUsage > 0 && !isNaN(parsedFuel) && parsedFuel > 0) {
                                    let ts = Date.now();
                                    if (timestamp) {
                                        try {
                                            // Handle Excel date serial numbers
                                            if (typeof timestamp === 'number') {
                                                ts = (timestamp - 25569) * 86400 * 1000;
                                            } else {
                                                const parsedDate = new Date(timestamp);
                                                if (!isNaN(parsedDate.getTime())) {
                                                    ts = parsedDate.getTime();
                                                }
                                            }
                                        } catch (err) {
                                            console.warn('Date parsing failed:', err);
                                        }
                                    }
                                    
                                    await dbPut(STORES.refuels, {
                                        id: uuid(),
                                        timestamp: ts,
                                        machineId: machine.id,
                                        operatorId: operator.id,
                                        usage: parsedUsage,
                                        fuel: parsedFuel
                                    });
                                    imported.refuels++;
                                    console.log(`Imported refuel: ${machine.id} / ${operator.name}`);
                                }
                            }
                        }
                    }
                }
                
                await loadState();
                renderTables();
                updateFilters();
                
                const messages = [];
                if (imported.machines > 0) messages.push(`${imported.machines} machines`);
                if (imported.operators > 0) messages.push(`${imported.operators} operators`);
                if (imported.refuels > 0) messages.push(`${imported.refuels} refuel logs`);
                
                if (messages.length > 0) {
                    showNotification(`Successfully imported: ${messages.join(', ')}`, 'success');
                    if (warnings.length > 0) {
                        console.warn('Import warnings:', warnings);
                    }
                } else {
                    showNotification('No valid data found to import. Check console for details.', 'warning');
                    console.log('Import completed with 0 records. Warnings:', warnings);
                }
            } catch (e) {
                showNotification('Import failed: ' + e.message, 'error');
                console.error('Import error:', e);
            }
        };
        reader.readAsArrayBuffer(file);
    }
    // ========== BACKUP/RESTORE ==========
    async function backupToLocalStorage() {
        try {
            const backup = {
                machines: state.machines,
                operators: state.operators,
                refuels: state.refuels,
                settings: state.settings,
                timestamp: Date.now()
            };
            localStorage.setItem('DieselTrack_Backup', JSON.stringify(backup));
            
            // Update last backup time display
            updateBackupInfo();
            showNotification('Backup created successfully', 'success');
        } catch (e) {
            showNotification('Backup failed: Storage quota exceeded', 'error');
        }
    }

    async function restoreFromLocalStorage() {
        try {
            const backup = localStorage.getItem('DieselTrack_Backup');
            if (!backup) {
                showNotification('No backup found', 'warning');
                return;
            }
            
            const data = JSON.parse(backup);
            
            for (const machine of data.machines) await dbPut(STORES.machines, machine);
            for (const operator of data.operators) await dbPut(STORES.operators, operator);
            for (const refuel of data.refuels) await dbPut(STORES.refuels, refuel);
            if (data.settings) await dbPut(STORES.settings, data.settings);
            
            await loadState();
            renderTables();
            updateFilters();
            showNotification(`Restored backup from ${fmt.date(data.timestamp)}`, 'success');
        } catch (e) {
            showNotification('Restore failed: ' + e.message, 'error');
        }
    }

    function downloadBackup() {
        try {
            const backup = localStorage.getItem('DieselTrack_Backup');
            if (!backup) {
                showNotification('No backup found to download', 'warning');
                return;
            }
            
            const data = JSON.parse(backup);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DieselTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('Backup file downloaded', 'success');
        } catch (e) {
            showNotification('Download failed: ' + e.message, 'error');
        }
    }

    function uploadBackup(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate backup structure
                if (!data.machines || !data.operators || !data.refuels) {
                    showNotification('Invalid backup file format', 'error');
                    return;
                }
                
                // Save to localStorage first
                localStorage.setItem('DieselTrack_Backup', JSON.stringify(data));
                
                showConfirm('Backup file uploaded. Do you want to restore it now?', async () => {
                    await restoreFromLocalStorage();
                });
            } catch (e) {
                showNotification('Failed to read backup file: ' + e.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    function updateBackupInfo() {
        const backup = localStorage.getItem('DieselTrack_Backup');
        const infoEl = byId('backup-info');
        
        if (!infoEl) return;
        
        if (backup) {
            try {
                const data = JSON.parse(backup);
                const date = fmt.date(data.timestamp);
                const size = (new Blob([backup]).size / 1024).toFixed(2);
                infoEl.innerHTML = `
                    <div class="backup-status">
                        <span class="backup-indicator">●</span>
                        <div>
                            <strong>Last Backup:</strong> ${date}<br>
                            <small>Size: ${size} KB | Location: Browser LocalStorage</small>
                        </div>
                    </div>
                `;
            } catch (e) {
                infoEl.innerHTML = '<div class="backup-status error">Backup data corrupted</div>';
            }
        } else {
            infoEl.innerHTML = '<div class="backup-status warning">No backup found</div>';
        }
    }

    // ========== INITIALIZATION ==========
    async function init() {
        await openDb();
        await loadState();
        renderTables();
        updateFilters();
        
        // Load settings into form
        byId('set-tolerance').value = state.settings.tolerance;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                document.querySelectorAll('.nav-link, .tab-content').forEach(el => el.classList.remove('active'));
                link.classList.add('active');
                byId(link.dataset.target).classList.add('active');
                if (link.dataset.target === 'view-analytics') renderAnalytics();
            });
        });

        // Refuel form
        byId('form-refuel').onsubmit = async (e) => {
            e.preventDefault();
            const machineId = byId('refuel-machine').value;
            const operatorId = byId('refuel-operator').value;
            const usage = parseFloat(byId('refuel-usage').value);
            const fuel = parseFloat(byId('refuel-fuel').value);
            
            if (!validateRefuel(machineId, operatorId, usage, fuel)) return;
            
            await dbPut(STORES.refuels, { 
                id: uuid(), 
                timestamp: Date.now(), 
                machineId, 
                operatorId, 
                usage, 
                fuel 
            });
            await loadState();
            renderTables();
            e.target.reset();
            showNotification('Refuel entry logged successfully', 'success');
        };

        // Machine form
        byId('form-machine').onsubmit = async (e) => {
            e.preventDefault();
            const id = byId('m-id').value.toUpperCase();
            const model = byId('m-model').value;
            const rate = parseFloat(byId('m-rate').value);
            const capacity = parseFloat(byId('m-capacity').value);
            
            if (!validateMachine(id, model, rate, capacity)) return;
            
            // Check for duplicate ID
            if (state.machines.find(m => m.id === id)) {
                showNotification('Machine ID already exists', 'error');
                return;
            }
            
            await dbPut(STORES.machines, { id, model, rate, capacity });
            await loadState();
            renderTables();
            updateFilters();
            e.target.reset();
            showNotification(`Machine ${id} added successfully`, 'success');
        };

        // Operator form
        byId('form-operator').onsubmit = async (e) => {
            e.preventDefault();
            const name = byId('op-name').value;
            const badge = byId('op-badge').value;
            
            if (!validateOperator(name, badge)) return;
            
            await dbPut(STORES.operators, { id: uuid(), name, badge });
            await loadState();
            renderTables();
            updateFilters();
            e.target.reset();
            showNotification(`Operator ${name} added successfully`, 'success');
        };

        // Settings form
        byId('form-settings').onsubmit = async (e) => {
            e.preventDefault();
            const tolerance = parseFloat(byId('set-tolerance').value);
            
            if (tolerance < 0 || tolerance > 100) {
                showNotification('Tolerance must be between 0 and 100', 'error');
                return;
            }
            
            state.settings.tolerance = tolerance;
            await dbPut(STORES.settings, state.settings);
            showNotification('Settings saved successfully', 'success');
            renderTables(); // Re-render to update anomaly detection
        };

        // Chart filters
        byId('chart-filter-machine').onchange = renderAnalytics;
        byId('chart-filter-operator').onchange = renderAnalytics;
        
        // Export
        byId('btn-export').onclick = exportData;
        
        // Import
        byId('btn-import-trigger').onclick = () => byId('file-import').click();
        byId('file-import').onchange = (e) => {
            if (e.target.files.length) {
                importData(e.target.files[0]);
                e.target.value = '';
            }
        };
        
        // Reset
        byId('btn-reset').onclick = () => {
            showConfirm('Are you sure you want to wipe all data? This cannot be undone!', () => {
                indexedDB.deleteDatabase(DB_NAME);
                localStorage.removeItem('DieselTrack_Backup');
                showNotification('All data wiped. Reloading...', 'info');
                setTimeout(() => location.reload(), 1500);
            });
        };
        
        // Backup/Restore
        byId('btn-backup').onclick = backupToLocalStorage;
        byId('btn-restore').onclick = () => {
            showConfirm('This will restore data from the last backup. Continue?', restoreFromLocalStorage);
        };
        byId('btn-download-backup').onclick = downloadBackup;
        byId('btn-upload-backup').onclick = () => byId('file-backup').click();
        byId('file-backup').onchange = (e) => {
            if (e.target.files.length) {
                uploadBackup(e.target.files[0]);
                e.target.value = '';
            }
        };
        
        // Update backup info on settings page load
        updateBackupInfo();
        
        // Auto-backup every 5 minutes
        setInterval(backupToLocalStorage, 5 * 60 * 1000);
        
        // Initial backup info update
        setTimeout(updateBackupInfo, 500);
        
        showNotification('System initialized successfully', 'success');
    }

    // ========== PUBLIC API ==========
    window.app = {
        deleteMachine: async id => {
            showConfirm(`Delete machine ${id}? This will not delete associated refuel logs.`, async () => {
                await dbDelete(STORES.machines, id);
                await loadState();
                renderTables();
                updateFilters();
                showNotification(`Machine ${id} deleted`, 'info');
            });
        },
        deleteOperator: async id => {
            const op = state.operators.find(o => o.id === id);
            showConfirm(`Delete operator ${op?.name}? This will not delete associated refuel logs.`, async () => {
                await dbDelete(STORES.operators, id);
                await loadState();
                renderTables();
                updateFilters();
                showNotification('Operator deleted', 'info');
            });
        },
        deleteRefuel: async id => {
            showConfirm('Delete this refuel entry?', async () => {
                await dbDelete(STORES.refuels, id);
                await loadState();
                renderTables();
                showNotification('Refuel entry deleted', 'info');
            });
        }
    };

    document.addEventListener('DOMContentLoaded', init);
})();
