document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if(document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const busTableBody = document.getElementById('busTableBody');
    const searchInput = document.getElementById('busSearchInput');

    let busesData = [];
    let driversData = [];
    let routesData = []; // Added routes registry

    function getRouteColor(routeId, index = -1) {
        if (index === 0) return '#2563eb';
        if (index === 1) return '#f97316';
        if (index === 2) return '#8b5cf6';
        if (index === 3) return '#dc2626';

        if (!routeId) return 'var(--text-muted)';
        const id = String(routeId);
        if (id === '8') return '#2563eb';
        if (id === '11') return '#f97316';
        if (id === '9') return '#dc2626';
        if (id === '13') return '#8b5cf6';
        return '#568e74';
    }

    async function loadDrivers() {
        try {
            const { data } = await supabase.from('drivers').select('*');
            if (data) {
                driversData = data.map(d => ({
                    id: d.id,
                    name: d.full_name || d.name || `Driver #${d.id}`,
                    busId: d.bus_id || null
                }));
            }
        } catch (e) { console.warn('Driver link offline'); }
    }

    async function loadRoutes() {
        try {
            const { data } = await supabase.from('routes').select('*');
            if (data) {
                routesData = data;
                // Update Route Dropdown in Add Bus Modal
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
                busTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem; color:var(--primary-color);"></i><p style="margin-top:10px; font-weight:700;">Synchronizing Fleet Signals...</p></td></tr>`;
            }
            const { data, error } = await supabase.from('buses').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            
            busesData = data.map(b => {
                let driverId = b.driver_id;
                const foundDriver = driversData.find(d => d.busId == b.id);
                if (foundDriver) driverId = foundDriver.id;

                const status = (b.status || '').toLowerCase();
                const isActive = b.isActive === true || status === 'active' || status === 'moving';

                return {
                    id:            b.id,
                    busNumber:     b.bus_number || b.id,
                    plateNumber:   b.plate_number || '—',
                    routeId:       b.route_id || null,
                    driverName:    b.driver_name || (foundDriver ? foundDriver.name : null),
                    driverId:      driverId,
                    isActive:      isActive,
                    speed:         b.speed || 0,
                    capacity:      b.capacity || 0,
                    license:       b.license_number || '—'
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

    function renderTable(list = busesData) {
        if(!busTableBody) return;
        busTableBody.innerHTML = '';

        if (list.length === 0) {
            busTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:60px; color:var(--text-muted); font-weight:700;"><i class="fas fa-bus-alt" style="font-size:2.5rem; display:block; margin-bottom:15px; opacity:0.2;"></i>No assets detected.</td></tr>`;
            return;
        }

        list.forEach((bus, index) => {
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
                    <div style="display:flex; gap:8px;">
                        <button class="btn-outline" onclick="window.toggleStatus('${bus.id}')"><i class="fas fa-power-off"></i></button>
                        <button class="btn-outline" onclick="window.deleteBus('${bus.id}', '${bus.busNumber}')" style="color:#ef4444;"><i class="fas fa-trash-alt"></i></button>
                    </div>
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

    window.openModal = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    document.getElementById('openAddBusModalBtn').onclick = () => openModal('addBusModal');
    document.getElementById('openAssignModalBtn').onclick = () => { populateAssignDropdowns(); openModal('assignModal'); };

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
            await supabase.from('buses').eq('id', id).update({ status: newStatus });
            loadBuses(true);
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    };

    window.deleteBus = async (id, num) => {
        const res = await Swal.fire({ title: `Decommission B-${num}?`, icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444' });
        if (res.isConfirmed) {
            try {
                await supabase.from('buses').eq('id', id).delete();
                loadBuses();
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        }
    };

    // FIXED: Add Bus logic to handle potential UUID issues
    document.getElementById('addBusForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "Deploying...";

        const payload = {
            bus_number: document.getElementById('addBusNumber').value,
            plate_number: document.getElementById('addPlateNumber').value,
            license_number: document.getElementById('addLicenseNumber').value,
            capacity: parseInt(document.getElementById('addCapacity').value),
            status: 'Active',
            speed: 0
        };

        // Handle route_id: check if it's a UUID column
        const routeVal = document.getElementById('addRouteId').value;
        if (routeVal) {
            // If it's a UUID (36 chars), send as string. Otherwise try to parse as int.
            payload.route_id = (routeVal.length > 5) ? routeVal : parseInt(routeVal);
        }

        try {
            // DO NOT send manual 'id' if the DB uses UUIDs or Auto-increment
            const { error } = await supabase.from('buses').insert(payload);
            if(error) throw error;
            
            Swal.fire({ icon: 'success', title: 'Asset Deployed', background: 'var(--bg-card)', color: 'var(--text-main)' });
            closeModal('addBusModal');
            e.target.reset();
            loadBuses();
        } catch (err) {
            Swal.fire('Deployment Error', err.message, 'error');
        } finally {
            btn.disabled = false; btn.innerText = "Confirm Deployment";
        }
    };

    document.getElementById('assignDriverForm').onsubmit = async (e) => {
        e.preventDefault();
        const busId = document.getElementById('assignBusSelect').value;
        const drvId = document.getElementById('assignDriverSelect').value;
        try {
            await supabase.from('buses').eq('id', busId).update({ driver_id: drvId });
            await supabase.from('drivers').eq('id', drvId).update({ bus_id: busId });
            closeModal('assignModal');
            loadDrivers().then(() => loadBuses());
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    };

    loadDrivers().then(() => loadRoutes()).then(() => loadBuses());
});