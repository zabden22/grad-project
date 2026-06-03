// buses-logic.js — Strategic Fleet Oversight (Adapted for New Schema)
document.addEventListener('DOMContentLoaded', () => {
    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
    if (!isSuperAdmin) {
        const addBtn = document.getElementById('openAddBusModalBtn');
        const assignBtn = document.getElementById('openAssignModalBtn');
        if (addBtn) addBtn.style.display = 'none';
        if (assignBtn) assignBtn.style.display = 'none';
    }

    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if(document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const busTableBody = document.getElementById('busTableBody');
    const searchInput = document.getElementById('busSearchInput');

    let busesData = [];
    let driversData = [];
    let routesData = []; 

    function getRouteColor(routeId) {
        if (!routeId) return '#0ea5e9';
        const routeObj = routesData.find(r => String(r.id) === String(routeId) || String(r.line_number) === String(routeId));
        const name = routeObj ? (routeObj.name || '').toLowerCase() : String(routeId).toLowerCase();
        const lineNum = routeObj ? String(routeObj.line_number) : String(routeId);

        if (name.includes('shorouk') || name.includes('shrouk') || name.includes('شروق') || lineNum === '9' || lineNum === '1001' || String(routeId) === '9d9f642d-31cd-4cb1-ae7e-daf930983bcf') return '#ef4444';
        if (name.includes('madinaty') || name.includes('madinty') || name.includes('مدينتي') || name.includes('مدينتى') || lineNum === '11' || lineNum === '1003' || String(routeId) === 'e8cd6c96-8f89-474d-b86f-fb0c9efd990f') return '#f59e0b';
        if (name.includes('badr') || name.includes('بدر') || lineNum === '13' || lineNum === '1002' || String(routeId) === 'ba494dc9-7d4b-4c6d-b37e-0ffbd47f7014') return '#8b5cf6';
        if (name.includes('capital') || name.includes('عاصمة') || name.includes('العاصمة') || lineNum === '1' || lineNum === '1005') return '#14b8a6';
        if (name.includes('cairo') || name.includes('قاهرة') || lineNum === '8' || lineNum === '1004') return '#3b82f6';
        
        if (name.includes('1')) return '#f43f5e';
        if (name.includes('2')) return '#8b5cf6';
        if (name.includes('3')) return '#3b82f6';
        if (name.includes('4')) return '#f59e0b';
        if (name.includes('5')) return '#10b981';
        
        return '#0ea5e9';
    }

    async function loadDrivers() {
        try {
            const { data } = await supabase.from('drivers').select('*');
            if (data) {
                driversData = data.map(d => ({
                    id: d.id,
                    name: d.name || `Driver #${d.id.substring(0, 5)}`,
                    busId: null // Populated via shifts
                }));
            }
        } catch (e) { console.warn('Driver link offline'); }
    }

    async function loadRoutes() {
        try {
            const { data } = await supabase.from('routes').select('*');
            if (data) {
                routesData = data;
                
                const rSel = document.getElementById('addRouteId');
                if (rSel) {
                    rSel.innerHTML = '<option value="">Select Tactical Route</option>';
                    data.forEach(r => {
                        rSel.innerHTML += `<option value="${r.id}">R-${r.id} | ${r.name}</option>`;
                    });
                }
            }
        } catch (e) { console.warn('Routes link offline'); }
    }

    async function loadBuses(silent = false) {
        try {
            if (!silent && busTableBody) {
                busTableBody.innerHTML = Array(5).fill('<tr><td colspan="9"><div class="skeleton" style="width:100%;height:35px;border-radius:8px;"></div></td></tr>').join('');
            }

            // Load shifts and trips to resolve driver and route relations
            const [bRes, shRes, trRes] = await Promise.all([
                supabase.from('buses').select('*').order('created_at', { ascending: false }),
                supabase.from('shifts').select('*').is('end_time', null),
                supabase.from('trips').select('*').is('end_time', null)
            ]);

            if (bRes.error) throw bRes.error;
            
            const shifts = shRes.data || [];
            const trips = trRes.data || [];

            // Sync driver's linked bus IDs for Quick Assign dropdown
            driversData.forEach(d => {
                const activeShift = shifts.find(s => s.driver_id === d.id);
                d.busId = activeShift ? activeShift.bus_id : null;
            });
            
            busesData = bRes.data.map(b => {
                const activeShift = shifts.find(s => s.bus_id === b.id);
                const foundDriver = activeShift ? driversData.find(d => d.id === activeShift.driver_id) : null;

                const activeTrip = trips.find(t => t.bus_id === b.id);
                const routeId = activeTrip ? activeTrip.route_id : (b.route_id || null);

                const status = (b.status || '').toLowerCase();
                const isActive = status === 'active' || status === 'moving';

                let cleanBusNumber = b.id.substring(0, 5).toUpperCase();
                if (b.bus_number) {
                    cleanBusNumber = b.bus_number.startsWith('B-') ? b.bus_number.substring(2) : b.bus_number;
                }

                return {
                    id:            b.id,
                    busNumber:     cleanBusNumber,
                    plateNumber:   b.plate_number || '—',
                    routeId:       routeId,
                    driverName:    foundDriver ? foundDriver.name : null,
                    driverId:      foundDriver ? foundDriver.id : null,
                    isActive:      isActive,
                    speed:         0,
                    capacity:      b.capacity || 0,
                    license:       'LNC-' + b.id.substring(0, 4).toUpperCase() // Simulate operating license
                };
            });
            
            updateStats();
            renderTable();
        } catch (err) {
            console.error('Fleet Sync Error:', err);
        }
    }

    function updateStats() {
        const total = busesData.length;
        const active = busesData.filter(b => b.isActive).length;
        if (document.getElementById('statTotalBuses')) document.getElementById('statTotalBuses').innerText = total;
        if (document.getElementById('statActiveBuses')) document.getElementById('statActiveBuses').innerText = active;
    }

    let currentFilter = 'all';

    function renderTable(list = busesData) {
        if(!busTableBody) return;
        busTableBody.innerHTML = '';

        let filteredList = list;
        if (currentFilter === 'active') filteredList = list.filter(b => b.isActive);
        else if (currentFilter === 'inactive') filteredList = list.filter(b => !b.isActive);

        if (filteredList.length === 0) {
            busTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:60px; color:var(--text-muted); font-weight:700;"><i class="fas fa-bus-alt" style="font-size:2.5rem; display:block; margin-bottom:15px; opacity:0.2;"></i>No assets detected.</td></tr>`;
            return;
        }

        filteredList.forEach((bus, index) => {
            const serialNum   = String(index + 1).padStart(4, '0');
            const color       = getRouteColor(bus.routeId, index);
            const statusBadge = bus.isActive 
                ? `<span class="status-badge status-active"><div class="pulse-dot"></div> Operational</span>`
                : `<span class="status-badge status-inactive">Standby</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:${color}; font-family:monospace; font-weight:900;">#${serialNum}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; border-radius:12px; background:${color}15; display:flex; align-items:center; justify-content:center; color:${color}; font-size:1.1rem; border:1px solid ${color}30;">
                            <i class="fas fa-bus-alt"></i>
                        </div>
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:900; color:var(--text-main);">B-${bus.busNumber}</span>
                            <span style="font-size:0.6rem; color:var(--text-muted); font-weight:800; text-transform:uppercase;">Asset Identity</span>
                        </div>
                    </div>
                </td>
                <td style="font-family:monospace; font-weight:900;">${bus.plateNumber}</td>
                <td><span style="font-weight:800;">${bus.license}</span></td>
                <td><span class="route-badge" style="background:${color}; color:#fff; padding:4px 12px; border-radius:8px; font-weight:900; font-size:0.7rem;">ROUTE #${bus.routeId || '?' }</span></td>
                <td><div style="display:flex; align-items:center; gap:8px; font-weight:900;"><i class="fas fa-users" style="color:${color};"></i> ${bus.capacity}</div></td>
                <td>${bus.driverName || 'Unassigned'}</td>
                <td>${statusBadge}</td>
                <td>
                    ${isSuperAdmin ? `
                    <div style="display:flex; gap:8px;">
                        <button class="btn-outline" onclick="window.toggleStatus('${bus.id}')"><i class="fas fa-power-off"></i></button>
                        <button class="btn-outline" onclick="window.deleteBus('${bus.id}', '${bus.busNumber}')" style="color:#ef4444;"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    ` : ''}
                </td>
            `;
            busTableBody.appendChild(tr);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = busesData.filter(b => String(b.busNumber).includes(query) || b.plateNumber.toLowerCase().includes(query));
            renderTable(filtered);
        });
    }

    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const h3 = card.querySelector('h3');
            if (!h3) return;
            const id = h3.id;
            
            statCards.forEach(c => c.style.border = '1px solid var(--border-color)');
            card.style.border = '1px solid var(--primary-color)';
            
            if (id === 'statTotalBuses') currentFilter = 'all';
            else if (id === 'statActiveBuses' || id === 'statMovingBuses') currentFilter = 'active';
            else if (id === 'statInactiveBuses') currentFilter = 'inactive';
            
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const filtered = busesData.filter(b => String(b.busNumber).includes(query) || b.plateNumber.toLowerCase().includes(query));
            renderTable(filtered);
        });
    });

    window.openModal = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    const openAddBusBtn = document.getElementById('openAddBusModalBtn');
    if (openAddBusBtn) openAddBusBtn.onclick = () => openModal('addBusModal');
    
    const openAssignBtn = document.getElementById('openAssignModalBtn');
    if (openAssignBtn) openAssignBtn.onclick = () => { populateAssignDropdowns(); openModal('assignModal'); };

    function populateAssignDropdowns() {
        const busSel = document.getElementById('assignBusSelect');
        const driverSel = document.getElementById('assignDriverSelect');
        if(busSel) {
            busSel.innerHTML = '<option value="">Select Asset</option>';
            busesData.filter(b => !b.driverId).forEach(b => { busSel.innerHTML += `<option value="${b.id}">B-${b.busNumber}</option>`; });
        }
        if(driverSel) {
            driverSel.innerHTML = '<option value="">Select Driver</option>';
            driversData.filter(d => !d.busId).forEach(d => { driverSel.innerHTML += `<option value="${d.id}">${d.name}</option>`; });
        }
    }

    window.toggleStatus = async (id) => {
        const bus = busesData.find(b => b.id == id);
        if(!bus) return;
        const newStatus = bus.isActive ? 'Inactive' : 'Active';
        try {
            await supabase.from('buses').update({ status: newStatus }).eq('id', id);
            loadBuses(true);
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    };

    window.deleteBus = async (id, num) => {
        const res = await Swal.fire({ title: `Decommission B-${num}?`, icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444' });
        if (res.isConfirmed) {
            try {
                // Clear references in drivers table, delete active trips and shifts first to prevent foreign key errors
                await Promise.all([
                    supabase.from('drivers').update({ busId: null, current_bus_id: null }).eq('busId', id),
                    supabase.from('drivers').update({ busId: null, current_bus_id: null }).eq('current_bus_id', id),
                    supabase.from('trips').delete().eq('bus_id', id),
                    supabase.from('shifts').delete().eq('bus_id', id)
                ]);
                await supabase.from('buses').delete().eq('id', id);
                loadBuses();
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        }
    };

    document.getElementById('addBusForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "Deploying...";

        const busNumber = document.getElementById('addBusNumber').value;
        const plateNumber = document.getElementById('addPlateNumber').value;
        const capacity = parseInt(document.getElementById('addCapacity').value, 10);
        const routeVal = document.getElementById('addRouteId').value;

        try {
            const selectedRoute = routesData.find(r => r.id === routeVal);
            const lineNum = selectedRoute ? parseInt(selectedRoute.line_number, 10) : null;
            const routeName = selectedRoute ? selectedRoute.name : null;

            const { data, error } = await supabase.from('buses').insert({
                bus_number: busNumber ? 'B-' + busNumber : undefined,
                plate_number: plateNumber,
                capacity: capacity,
                status: 'Active',
                route_id: routeVal || null,
                route_name: routeName
            });
            
            if (error) throw error;

            // Link to route via trips if selected
            if (routeVal && data && data[0]) {
                const busId = data[0].id;
                await supabase.from('trips').insert({
                    bus_id: busId,
                    route_id: routeVal,
                    status: 'active',
                    start_time: new Date().toISOString()
                });
            }

            Swal.fire({ icon: 'success', title: 'Asset Deployed', background: 'var(--bg-card)', color: 'var(--text-main)', timer: 1500, showConfirmButton: false });
            closeModal('addBusModal');
            e.target.reset();
            loadBuses();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Deployment Error',
                text: err.message,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            btn.disabled = false; btn.innerText = "Confirm Deployment";
        }
    };

    document.getElementById('assignDriverForm').onsubmit = async (e) => {
        e.preventDefault();
        const busId = document.getElementById('assignBusSelect').value;
        const drvId = document.getElementById('assignDriverSelect').value;
        try {
            const { error } = await supabase.from('shifts').insert({
                driver_id: drvId,
                bus_id: busId,
                start_time: new Date().toISOString()
            });
            if (error) throw error;

            // Update references in drivers and buses tables for mobile app compatibility
            await Promise.all([
                supabase.from('drivers').update({ busId: busId, current_bus_id: busId }).eq('id', drvId),
                supabase.from('buses').update({ driver_id: drvId }).eq('id', busId)
            ]);

            closeModal('assignModal');
            loadDrivers().then(() => loadBuses());
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    };

    loadDrivers().then(() => loadRoutes()).then(() => loadBuses());

    if (window.supabaseAuth) {
        window.supabaseAuth.channel('buses_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'buses' }, () => {
                loadBuses(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
                loadBuses(true);
            })
            .subscribe();
    }
});