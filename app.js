(function() {
    'use strict';

    const byId = id => document.getElementById(id);
    const fmt = {
        n: (v, d = 2) => (v !== null && v !== undefined) ? Number(v).toFixed(d) : '0.00',
        date: s => s ? new Date(s).toLocaleString() : '',
        dateShort: s => s ? new Date(s).toLocaleDateString() : ''
    };

    function uuid() { return 'ax-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16)); }
    
    function isToday(timestamp) {
        const today = new Date();
        const date = new Date(timestamp);
        return date.toDateString() === today.toDateString();
    }

    const DB_NAME = 'DieselTrackDB_v5';
    const STORES = { machines: 'machines', operators: 'operators', refuels: 'refuels', settings: 'settings' };

    let db;
    let state = { 
        machines: [], 
        operators: [], 
        refuels: [], 
        settings: { tolerance: 10, id: 'current' },
        viewMode: 'today', // 'today' or 'all'
        dateFilter: { from: null, to: null }
    };
    let charts = { expected: null, fleet: null, machine: null, operator: null };

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

    // ========== DATABASE OPERATIONS ==========
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
        
        const machine = state.machines.find(m => m.id === machineId);
        if (machine && machine.capacity && fuel > machine.capacity) {
            showNotification(`Warning: Fuel amount (${fuel}L) exceeds tank capacity (${machine.capacity}L)`, 'warning');
        }
        
        return true;
    }

    // ========== DATA FILTERING ==========
    function getFilteredRefuels() {
        let filtered = state.refuels;
        
        // Apply view mode filter (today/all)
        if (state.viewMode === 'today') {
            filtered = filtered.filter(r => isToday(r.timestamp));
        }
        
        // Apply date range filter (for analytics)
        if (state.dateFilter.from || state.dateFilter.to) {
            filtered = filtered.filter(r => {
                const date = new Date(r.timestamp);
                date.setHours(0, 0, 0, 0);
                
                if (state.dateFilter.from && state.dateFilter.to) {
                    return date >= state.dateFilter.from && date <= state.dateFilter.to;
                } else if (state.dateFilter.from) {
                    return date >= state.dateFilter.from;
                } else if (state.dateFilter.to) {
                    return date <= state.dateFilter.to;
                }
                return true;
            });
        }
        
        return filtered;
    }

    // ========== RENDERING ==========
    function renderTables() {
        const refuelsToShow = state.viewMode === 'today' 
            ? state.refuels.filter(r => isToday(r.timestamp))
            : state.refuels;
            
        byId('table-refuels').tBodies[0].innerHTML = refuelsToShow.slice().reverse().map(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            const o = state.operators.find(x => x.id === r.operatorId);
            const expected = m ? m.rate * r.usage : 0;
            const variance = r.fuel - expected;
            const varPercent = expected > 0 ? (variance / expected) * 100 : 0;
            const overflow = m && m.capacity && r.fuel > m.capacity;
            const isTooHigh = varPercent > state.settings.tolerance;
            const isAnomaly = overflow || (variance > 0 && isTooHigh);
            
            return `<tr>
                <td>${fmt.date(r.timestamp)}</td>
                <td>${m ? `${m.id} (${m.model})` : 'N/A'}</td>
                <td>${o ? `${o.name} (${o.badge})` : 'N/A'}</td>
                <td>${fmt.n(r.usage)} hrs</td>
                <td>${fmt.n(r.fuel)} L</td>
                <td>${fmt.n(expected)} L</td>
                <td class="${variance > 0 ? 'danger-text' : ''}">${variance > 0 ? '+' : ''}${fmt.n(variance)} L (${varPercent > 0 ? '+' : ''}${fmt.n(varPercent)}%)</td>
                <td><span class="badge ${isAnomaly ? 'badge-warn' : 'badge-ok'}">${isAnomaly ? 'ANOMALY' : 'NORMAL'}</span></td>
                <td><button class="btn btn-danger btn-sm" onclick="app.deleteRefuel('${r.id}')">Delete</button></td>
            </tr>`;
        }).join('');

        byId('table-machines').tBodies[0].innerHTML = state.machines.map(m => `<tr>
            <td>${m.id}</td>
            <td>${m.model}</td>
            <td>${fmt.n(m.rate)}</td>
            <td>${m.capacity}</td>
            <td><button class="btn btn-danger btn-sm" onclick="app.deleteMachine('${m.id}')">Delete</button></td>
        </tr>`).join('');

        byId('table-operators').tBodies[0].innerHTML = state.operators.map(o => `<tr>
            <td>${o.name}</td>
            <td>${o.badge}</td>
            <td><button class="btn btn-danger btn-sm" onclick="app.deleteOperator('${o.id}')">Delete</button></td>
        </tr>`).join('');
    }

    function updateFilters() {
        const mSel = byId('refuel-machine');
        const chartMSel = byId('chart-filter-machine');
        const chartExpSel = byId('chart-filter-expected');
        const chartOSel = byId('chart-filter-operator');
        
        mSel.innerHTML = '<option value="">Select Machine</option>' + 
            state.machines.map(m => `<option value="${m.id}">${m.id} - ${m.model}</option>`).join('');
        
        chartMSel.innerHTML = '<option value="">All Machines</option>' + 
            state.machines.map(m => `<option value="${m.id}">${m.id} - ${m.model}</option>`).join('');
            
        chartExpSel.innerHTML = '<option value="">All Machines</option>' + 
            state.machines.map(m => `<option value="${m.id}">${m.id} - ${m.model}</option>`).join('');
        
        const oSel = byId('refuel-operator');
        oSel.innerHTML = '<option value="">Select Operator</option>' + 
            state.operators.map(o => `<option value="${o.id}">${o.name} (${o.badge})</option>`).join('');
        
        chartOSel.innerHTML = '<option value="">All Operators</option>' + 
            state.operators.map(o => `<option value="${o.id}">${o.name} (${o.badge})</option>`).join('');
    }

    // ========== ANALYTICS & CHARTS ==========
    function renderAnalytics() {
        const filteredData = getFilteredRefuels();
        
        renderExpectedVsDelivered(filteredData);
        renderFleetTrend(filteredData);
        renderMachinePerformance(filteredData);
        renderOperatorPerformance(filteredData);
        updateStatsSummary(filteredData);
    }

    function renderExpectedVsDelivered(data) {
        const ctx = byId('chart-expected');
        if (!ctx) return;
        
        const machineFilter = byId('chart-filter-expected').value;
        let filtered = data;
        
        if (machineFilter) {
            filtered = data.filter(r => r.machineId === machineFilter);
        }
        
        // Sort by timestamp to show chronological trend
        const sortedData = [...filtered].sort((a, b) => a.timestamp - b.timestamp);
        
        const labels = sortedData.map(r => fmt.dateShort(r.timestamp));
        const expectedData = sortedData.map(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            return m ? m.rate * r.usage : 0;
        });
        const deliveredData = sortedData.map(r => r.fuel);
        
        if (charts.expected) charts.expected.destroy();
        
        charts.expected = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Expected Fuel (L)',
                        data: expectedData,
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Delivered Fuel (L)',
                        data: deliveredData,
                        backgroundColor: 'rgba(255, 180, 0, 0.1)',
                        borderColor: 'rgba(255, 180, 0, 1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointBackgroundColor: 'rgba(255, 180, 0, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        labels: { color: '#f0f0f0' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' L';
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        ticks: { 
                            color: '#a0a0a0',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: { color: '#333' }
                    },
                    y: { 
                        ticks: { 
                            color: '#a0a0a0',
                            callback: function(value) {
                                return value.toFixed(0) + ' L';
                            }
                        },
                        grid: { color: '#333' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderFleetTrend(data) {
        const ctx = byId('chart-fleet');
        if (!ctx) return;
        
        // Sort data by timestamp
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
        
        const labels = sortedData.map(r => fmt.dateShort(r.timestamp));
        const fuelData = sortedData.map(r => r.fuel);
        
        if (charts.fleet) charts.fleet.destroy();
        
        charts.fleet = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Fuel Consumption per Entry (L)',
                    data: fuelData,
                    backgroundColor: 'rgba(255, 180, 0, 0.2)',
                    borderColor: 'rgba(255, 180, 0, 1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointBackgroundColor: 'rgba(255, 180, 0, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        labels: { color: '#f0f0f0' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Fuel: ' + context.parsed.y.toFixed(2) + ' L';
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        ticks: { 
                            color: '#a0a0a0',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: { color: '#333' }
                    },
                    y: { 
                        ticks: { 
                            color: '#a0a0a0',
                            callback: function(value) {
                                return value.toFixed(0) + ' L';
                            }
                        },
                        grid: { color: '#333' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderMachinePerformance(data) {
        const ctx = byId('chart-machine');
        if (!ctx) return;
        
        const machineId = byId('chart-filter-machine').value;
        
        if (charts.machine) charts.machine.destroy();
        
        if (!machineId) {
            // Show all machines - aggregated view
            const machineStats = {};
            
            data.forEach(r => {
                if (!machineStats[r.machineId]) {
                    const machine = state.machines.find(m => m.id === r.machineId);
                    machineStats[r.machineId] = {
                        name: machine ? `${machine.id}` : r.machineId,
                        totalFuel: 0,
                        totalExpected: 0,
                        count: 0,
                        machine: machine
                    };
                }
                
                const machine = state.machines.find(m => m.id === r.machineId);
                const expected = machine ? machine.rate * r.usage : 0;
                
                machineStats[r.machineId].totalFuel += r.fuel;
                machineStats[r.machineId].totalExpected += expected;
                machineStats[r.machineId].count++;
            });
            
            const labels = Object.keys(machineStats).map(id => machineStats[id].name);
            const actualData = Object.keys(machineStats).map(id => machineStats[id].totalFuel);
            const expectedData = Object.keys(machineStats).map(id => machineStats[id].totalExpected);
            
            charts.machine = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Expected Fuel (L)',
                            data: expectedData,
                            backgroundColor: 'rgba(52, 152, 219, 0.6)',
                            borderColor: 'rgba(52, 152, 219, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Actual Fuel (L)',
                            data: actualData,
                            backgroundColor: 'rgba(255, 180, 0, 0.6)',
                            borderColor: 'rgba(255, 180, 0, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: true,
                            labels: { color: '#f0f0f0' }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' L';
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            ticks: { color: '#a0a0a0' },
                            grid: { color: '#333' }
                        },
                        y: { 
                            ticks: { color: '#a0a0a0' },
                            grid: { color: '#333' },
                            beginAtZero: true
                        }
                    }
                }
            });
        } else {
            // Show individual machine over time
            const machineData = data.filter(r => r.machineId === machineId);
            const machine = state.machines.find(m => m.id === machineId);
            
            if (machineData.length === 0) {
                return;
            }
            
            const labels = machineData.map(r => fmt.dateShort(r.timestamp));
            const expectedData = machineData.map(r => machine ? machine.rate * r.usage : 0);
            const actualData = machineData.map(r => r.fuel);
            
            charts.machine = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Expected (L)',
                            data: expectedData,
                            borderColor: 'rgba(52, 152, 219, 1)',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Actual (L)',
                            data: actualData,
                            borderColor: 'rgba(255, 180, 0, 1)',
                            backgroundColor: 'rgba(255, 180, 0, 0.1)',
                            borderWidth: 2,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: true,
                            labels: { color: '#f0f0f0' }
                        }
                    },
                    scales: {
                        x: { 
                            ticks: { color: '#a0a0a0' },
                            grid: { color: '#333' }
                        },
                        y: { 
                            ticks: { color: '#a0a0a0' },
                            grid: { color: '#333' },
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    function renderOperatorPerformance(data) {
        const ctx = byId('chart-operator');
        if (!ctx) return;
        
        const operatorId = byId('chart-filter-operator').value;
        
        if (charts.operator) charts.operator.destroy();
        
        if (!operatorId) {
            // Show all operators - aggregated efficiency view
            const operatorStats = {};
            
            data.forEach(r => {
                if (!operatorStats[r.operatorId]) {
                    const operator = state.operators.find(o => o.id === r.operatorId);
                    operatorStats[r.operatorId] = {
                        name: operator ? operator.name : 'Unknown',
                        totalExpected: 0,
                        totalActual: 0,
                        count: 0
                    };
                }
                
                const machine = state.machines.find(m => m.id === r.machineId);
                const expected = machine ? machine.rate * r.usage : 0;
                
                operatorStats[r.operatorId].totalExpected += expected;
                operatorStats[r.operatorId].totalActual += r.fuel;
                operatorStats[r.operatorId].count++;
            });
            
            const labels = Object.keys(operatorStats).map(id => operatorStats[id].name);
            const efficiencyData = Object.keys(operatorStats).map(id => {
                const exp = operatorStats[id].totalExpected;
                const act = operatorStats[id].totalActual;
                return exp > 0 ? ((exp / act) * 100) : 100;
            });
            
            charts.operator = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Average Efficiency (%)',
                        data: efficiencyData,
                        backgroundColor: efficiencyData.map(e => e >= 95 ? 'rgba(46, 204, 113, 0.6)' : 'rgba(243, 156, 18, 0.6)'),
                        borderColor: efficiencyData.map(e => e >= 95 ? 'rgba(46, 204, 113, 1)' : 'rgba(243, 156, 18, 1)'),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: true,
                            labels: { color: '#f0f0f0' }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Efficiency: ' + context.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            ticks: { color: '#a0a0a0' },
                            grid: { color: '#333' }
                        },
                        y: { 
                            ticks: { 
                                color: '#a0a0a0',
                                callback: function(value) {
                                    return value.toFixed(0) + '%';
                                }
                            },
                            grid: { color: '#333' },
                            min: 0,
                            max: 120
                        }
                    }
                }
            });
        } else {
            // Show individual operator efficiency over time
            const operatorData = data.filter(r => r.operatorId === operatorId);
            
            if (operatorData.length === 0) {
                return;
            }
            
            // Calculate efficiency per session
            const labels = operatorData.map(r => fmt.dateShort(r.timestamp));
            const efficiencyData = operatorData.map(r => {
                const m = state.machines.find(x => x.id === r.machineId);
                const expected = m ? m.rate * r.usage : 0;
                return expected > 0 ? ((expected / r.fuel) * 100) : 100;
            });
            
            charts.operator = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Efficiency (%)',
                        data: efficiencyData,
                        backgroundColor: efficiencyData.map(e => e >= 95 ? 'rgba(46, 204, 113, 0.6)' : 'rgba(243, 156, 18, 0.6)'),
                        borderColor: efficiencyData.map(e => e >= 95 ? 'rgba(46, 204, 113, 1)' : 'rgba(243, 156, 18, 1)'),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: true,
                            labels: { color: '#f0f0f0' }
                        }
                    },
                    scales: {
                        x: { 
                            ticks: { color: '#a0a0a0' },
                            grid: { color: '#333' }
                        },
                        y: { 
                            ticks: { 
                                color: '#a0a0a0',
                                callback: function(value) {
                                    return value.toFixed(0) + '%';
                                }
                            },
                            grid: { color: '#333' },
                            min: 0,
                            max: 120
                        }
                    }
                }
            });
        }
    }

    function updateStatsSummary(data) {
        const totalFuel = data.reduce((sum, r) => sum + r.fuel, 0);
        const totalHours = data.reduce((sum, r) => sum + r.usage, 0);
        
        let totalExpected = 0;
        data.forEach(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            if (m) totalExpected += m.rate * r.usage;
        });
        
        const avgEfficiency = totalExpected > 0 ? ((totalExpected / totalFuel) * 100) : 0;
        
        const anomalies = data.filter(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            if (!m) return false;
            const expected = m.rate * r.usage;
            const variance = r.fuel - expected;
            const overflow = m.capacity && r.fuel > m.capacity;
            const isTooHigh = (variance / expected) * 100 > state.settings.tolerance;
            return overflow || (variance > 0 && isTooHigh);
        }).length;
        
        byId('stat-total-fuel').textContent = fmt.n(totalFuel, 1) + ' L';
        byId('stat-total-hours').textContent = fmt.n(totalHours, 1) + ' hrs';
        byId('stat-avg-efficiency').textContent = fmt.n(avgEfficiency, 1) + '%';
        byId('stat-anomalies').textContent = anomalies;
    }

    // ========== IMPORT/EXPORT ==========
    function exportData() {
        const wb = XLSX.utils.book_new();
        
        const machineData = state.machines.map(m => ({
            'Machine ID': m.id,
            'Model': m.model,
            'Rate (L/U)': m.rate,
            'Capacity (L)': m.capacity
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(machineData), 'Machines');
        
        const operatorData = state.operators.map(o => ({
            'Name': o.name,
            'Badge': o.badge
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(operatorData), 'Operators');
        
        const refuelData = state.refuels.map(r => {
            const m = state.machines.find(x => x.id === r.machineId);
            const o = state.operators.find(x => x.id === r.operatorId);
            const expected = m ? m.rate * r.usage : 0;
            const variance = r.fuel - expected;
            return {
                'Timestamp': fmt.date(r.timestamp),
                'Machine': m ? `${m.id} (${m.model})` : 'N/A',
                'Operator': o ? `${o.name} (${o.badge})` : 'N/A',
                'Usage (hrs)': r.usage,
                'Fuel (L)': r.fuel,
                'Expected (L)': fmt.n(expected),
                'Variance (L)': fmt.n(variance),
                'Variance (%)': fmt.n((variance / expected) * 100)
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refuelData), 'Refuel Logs');
        
        XLSX.writeFile(wb, `DieselTrack_Export_${Date.now()}.xlsx`);
        showNotification('Data exported successfully', 'success');
    }

    async function importData(file) {
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
                            const rate = findValue(row, ['Rate', 'Consumption Rate', 'Fuel Rate', 'L/hr', 'Liters/Hour', 'Rate (L/U)']);
                            const capacity = findValue(row, ['Capacity', 'Tank Capacity', 'Tank Size', 'Max Capacity', 'Capacity (L)']);
                            
                            console.log('Machine row:', { machineId, model, rate, capacity });
                            
                            if (machineId && model && rate && capacity) {
                                const cleanId = machineId.toString().toUpperCase().trim();
                                const cleanRate = parseFloat(rate);
                                const cleanCapacity = parseFloat(capacity);
                                
                                if (!isNaN(cleanRate) && cleanRate > 0 && !isNaN(cleanCapacity) && cleanCapacity > 0) {
                                    // Check if machine already exists
                                    const existing = state.machines.find(m => m.id === cleanId);
                                    if (!existing) {
                                        await dbPut(STORES.machines, { 
                                            id: cleanId, 
                                            model: model.toString().trim(), 
                                            rate: cleanRate, 
                                            capacity: cleanCapacity 
                                        });
                                        imported.machines++;
                                        console.log(`Imported machine: ${cleanId}`);
                                    } else {
                                        console.log(`Machine ${cleanId} already exists, skipping`);
                                    }
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
                    const isOperatorSheet = (keys.includes('operator') || keys.includes('badge') || keys.includes('badgenumber') || keys.includes('name')) &&
                                           !keys.includes('machine') && !keys.includes('model') && !keys.includes('rate');
                    
                    if (isOperatorSheet) {
                        console.log(`Processing operators from sheet: ${sheetName}`);
                        for (const row of sheet) {
                            const name = findValue(row, ['Operator', 'Name', 'Operator Name', 'Full Name', 'Employee Name']);
                            const badge = findValue(row, ['Badge Number', 'Badge', 'BadgeNumber', 'ID', 'Employee ID', 'Badge ID', 'Badge #']);
                            
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
                                } else {
                                    console.log(`Operator ${cleanName} already exists, skipping`);
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
                            const usage = findValue(row, ['Hours worked', 'Hoursworked', 'Hours', 'Usage', 'Running Hours', 'Operating Hours', 'Usage (hrs)']);
                            const fuel = findValue(row, ['Fuel issued', 'Fuelissued', 'Fuel', 'Fuel Amount', 'Liters', 'Fuel Dispensed', 'Fuel (L)']);
                            
                            console.log('Refuel row:', { timestamp, machineId, operatorName, usage, fuel });
                            
                            if (machineId && operatorName && usage && fuel) {
                                // Find machine - handle both full name and ID only
                                let machine = state.machines.find(m => 
                                    m.id === machineId.toString().toUpperCase().trim()
                                );
                                
                                // If not found, try extracting ID from format "ID (Model)"
                                if (!machine && machineId.toString().includes('(')) {
                                    const extractedId = machineId.toString().split('(')[0].trim().toUpperCase();
                                    machine = state.machines.find(m => m.id === extractedId);
                                }
                                
                                // Find operator - handle both name only and "Name (Badge)"
                                let operator = state.operators.find(o => 
                                    o.name.toLowerCase().trim() === operatorName.toString().toLowerCase().trim()
                                );
                                
                                // If not found, try extracting name from format "Name (Badge)"
                                if (!operator && operatorName.toString().includes('(')) {
                                    const extractedName = operatorName.toString().split('(')[0].trim();
                                    operator = state.operators.find(o => 
                                        o.name.toLowerCase().trim() === extractedName.toLowerCase()
                                    );
                                }
                                
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
                    showNotification(`✓ Successfully imported: ${messages.join(', ')}`, 'success');
                    if (warnings.length > 0 && warnings.length < 10) {
                        console.warn('Import warnings:', warnings);
                        showNotification(`⚠ ${warnings.length} warnings (check console)`, 'warning');
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
    function backupToLocalStorage() {
        const backup = {
            timestamp: Date.now(),
            machines: state.machines,
            operators: state.operators,
            refuels: state.refuels,
            settings: state.settings
        };
        localStorage.setItem('DieselTrack_Backup', JSON.stringify(backup));
        updateBackupInfo();
        showNotification('Backup created successfully', 'success');
    }

    async function restoreFromLocalStorage() {
        const backup = localStorage.getItem('DieselTrack_Backup');
        if (!backup) {
            showNotification('No backup found', 'error');
            return;
        }
        
        try {
            const data = JSON.parse(backup);
            for (const m of data.machines) await dbPut(STORES.machines, m);
            for (const o of data.operators) await dbPut(STORES.operators, o);
            for (const r of data.refuels) await dbPut(STORES.refuels, r);
            await dbPut(STORES.settings, data.settings);
            
            await loadState();
            renderTables();
            updateFilters();
            showNotification('Data restored successfully', 'success');
        } catch (e) {
            showNotification('Restore failed: ' + e.message, 'error');
        }
    }

    function downloadBackup() {
        const backup = {
            timestamp: Date.now(),
            machines: state.machines,
            operators: state.operators,
            refuels: state.refuels,
            settings: state.settings
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DieselTrack_Backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Backup file downloaded', 'success');
    }

    function uploadBackup(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                for (const m of data.machines) await dbPut(STORES.machines, m);
                for (const o of data.operators) await dbPut(STORES.operators, o);
                for (const r of data.refuels) await dbPut(STORES.refuels, r);
                await dbPut(STORES.settings, data.settings);
                
                await loadState();
                renderTables();
                updateFilters();
                showNotification('Backup restored from file', 'success');
            } catch (err) {
                showNotification('Failed to restore backup: ' + err.message, 'error');
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
        
        byId('set-tolerance').value = state.settings.tolerance;
        
        // View mode toggle
        byId('btn-view-today').onclick = () => {
            state.viewMode = 'today';
            byId('btn-view-today').classList.add('active');
            byId('btn-view-all').classList.remove('active');
            renderTables();
            showNotification('Showing today\'s data only', 'info');
        };
        
        byId('btn-view-all').onclick = () => {
            state.viewMode = 'all';
            byId('btn-view-all').classList.add('active');
            byId('btn-view-today').classList.remove('active');
            renderTables();
            showNotification('Showing all historical data', 'info');
        };
        
        // Date range filter for analytics
        byId('btn-apply-dates').onclick = () => {
            const from = byId('date-from').value;
            const to = byId('date-to').value;
            
            state.dateFilter.from = from ? new Date(from) : null;
            state.dateFilter.to = to ? new Date(to) : null;
            
            if (state.dateFilter.from) state.dateFilter.from.setHours(0, 0, 0, 0);
            if (state.dateFilter.to) state.dateFilter.to.setHours(23, 59, 59, 999);
            
            renderAnalytics();
            showNotification('Date filter applied', 'success');
        };
        
        byId('btn-reset-dates').onclick = () => {
            state.dateFilter.from = null;
            state.dateFilter.to = null;
            byId('date-from').value = '';
            byId('date-to').value = '';
            renderAnalytics();
            showNotification('Date filter reset', 'info');
        };
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                document.querySelectorAll('.nav-link, .tab-content').forEach(el => el.classList.remove('active'));
                link.classList.add('active');
                byId(link.dataset.target).classList.add('active');
                if (link.dataset.target === 'view-analytics') renderAnalytics();
            });
        });

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

        byId('form-machine').onsubmit = async (e) => {
            e.preventDefault();
            const id = byId('m-id').value.toUpperCase();
            const model = byId('m-model').value;
            const rate = parseFloat(byId('m-rate').value);
            const capacity = parseFloat(byId('m-capacity').value);
            
            if (!validateMachine(id, model, rate, capacity)) return;
            
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
            renderTables();
        };

        // Chart filters
        byId('chart-filter-machine').onchange = () => renderAnalytics();
        byId('chart-filter-operator').onchange = () => renderAnalytics();
        byId('chart-filter-expected').onchange = () => renderAnalytics();
        
        byId('btn-export').onclick = exportData;
        
        byId('btn-import-trigger').onclick = () => byId('file-import').click();
        byId('file-import').onchange = (e) => {
            if (e.target.files.length) {
                importData(e.target.files[0]);
                e.target.value = '';
            }
        };
        
        byId('btn-reset').onclick = () => {
            showConfirm('Are you sure you want to wipe all data? This cannot be undone!', () => {
                indexedDB.deleteDatabase(DB_NAME);
                localStorage.removeItem('DieselTrack_Backup');
                showNotification('All data wiped. Reloading...', 'info');
                setTimeout(() => location.reload(), 1500);
            });
        };
        
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
        
        updateBackupInfo();
        setInterval(backupToLocalStorage, 5 * 60 * 1000);
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
