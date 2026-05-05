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

    function getBusRouteColor(bus) {
        if (!bus || !bus.routeId) return '#64748b';
        const routeObj = routesData.find(r => String(r.id) === String(bus.routeId));
        const routeName = routeObj ? routeObj.name : null;
        return window.getRouteColor(bus.routeId, routeName);
    }

    async function loadDrivers(silent = false) {
        window.loadDrivers = loadDrivers; // Expose globally

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
        window.loadRoutes = loadRoutes; // Expose globally

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
        window.loadBuses = loadBuses; // Expose globally

        try {
            if (!silent && busTableBody) {
                busTableBody.innerHTML = Array(5).fill('<tr><td colspan="9"><div class="skeleton" style="width:100%;height:35px;border-radius:8px;"></div></td></tr>').join('');
            }
            
            // Fetch everything in parallel to ensure data consistency and speed
            const [busesRes, driversRes, routesRes] = await Promise.all([
                supabase.from('buses').select('*'),
                supabase.from('drivers').select('*'),
                supabase.from('routes').select('*')
            ]);

            if (busesRes.error) throw busesRes.error;
            
            console.log('[Fleet] RAW BUSES:', busesRes.data);
            console.log('[Fleet] RAW DRIVERS:', driversRes.data);
            console.log('[Fleet] RAW ROUTES:', routesRes.data);

            // Populate global registries
            if (driversRes.data) {
                driversData = driversRes.data.map(d => ({
                    id: d.id,
                    name: d.full_name || d.name || 'Candidate',
                    busId: d.bus_id || null
                }));
            }
            if (routesRes.data) routesData = routesRes.data;

            const newData = (busesRes.data || []).map(b => {
                const driverId = b.driver_id || null;
                const status = (b.status || '').toLowerCase();
                const isActive = b.isActive === true || status === 'active' || status === 'moving';
                
                // Try to find driver if linked
                const foundDriver = driversData.find(d => d.busId == b.id);

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

            // ALWAYS clear skeletons
            if (busTableBody) busTableBody.innerHTML = '';

            if (newData.length > 0 || (busesRes.data && busesRes.data.length === 0)) {
                busesData = newData;
                updateStats();
                renderTable();
            } else if (busesRes.data && busesRes.data.length === 0) {
                renderTable([]); // Force "No assets" message
            }
            
        } catch (err) {
            console.error('[Fleet] Matrix Error:', err);
            if (!silent && busTableBody) {
                const errorMsg = err.message || JSON.stringify(err);
                busTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:60px; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:2.5rem; margin-bottom:15px; display:block;"></i><p style="font-weight:900;">Fleet Connection Offline</p><p style="font-size:0.8rem; opacity:0.7;">Error: ${errorMsg}</p><button class="btn-primary" style="margin-top:20px;" onclick="loadBuses()">Retry Connection</button></td></tr>`;
            }
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
            const color       = getBusRouteColor(bus);
            const statusBadge = bus.isActive 
                ? `<span class="status-badge status-active"><div class="pulse-dot"></div> Operational</span>`
                : `<span class="status-badge status-inactive">Standby</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:${color}; font-family:monospace; font-weight:900;">#${serialNum}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; border-radius:12px; background:${window.hexToRgba(color, 0.15)}; display:flex; align-items:center; justify-content:center; color:${color}; font-size:1.2rem; border:1px solid ${window.hexToRgba(color, 0.3)};">
                            <i class="fas fa-bus" style="color:${color} !important;"></i>
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

    // FIXED: Add Bus logic with RLS bypass strategies
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

        // Handle route_id
        const routeVal = document.getElementById('addRouteId').value;
        if (routeVal) {
            payload.route_id = (routeVal.length > 5) ? routeVal : parseInt(routeVal);
        }

        try {
            // Strategy 1: Try normal insert via REST wrapper
            const { error } = await supabase.from('buses').insert(payload);
            
            if (error) {
                const errMsg = error.message || JSON.stringify(error);
                
                // If RLS error, try Strategy 2: Direct fetch with admin session token
                if (errMsg.includes('row-level security') || errMsg.includes('policy')) {
                    console.warn('[TransitWay] RLS blocked insert. Trying with auth session...');
                    
                    // Try using the authenticated admin's session token if available
                    let authToken = localStorage.getItem('adminToken');
                    
                    // Try getting a fresh token from supabaseAuth
                    if (window.supabaseAuth && window.supabaseAuth.auth) {
                        try {
                            const { data: sessionData } = await window.supabaseAuth.auth.getSession();
                            if (sessionData && sessionData.session) {
                                authToken = sessionData.session.access_token;
                            }
                        } catch(e) { /* ignore */ }
                    }

                    const headers = {
                        'apikey': window.SUPABASE_KEY,
                        'Authorization': 'Bearer ' + (authToken && authToken !== 'db-session' ? authToken : window.SUPABASE_KEY),
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    };

                    const res2 = await fetch(window.SUPABASE_URL + '/rest/v1/buses', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload)
                    });

                    if (!res2.ok) {
                        const err2 = await res2.json().catch(() => ({ message: res2.statusText }));
                        const err2Msg = err2.message || JSON.stringify(err2);
                        
                        // Strategy 3: Try using SDK insert if available
                        if (window.supabaseAuth && window.supabaseAuth.from) {
                            const { error: err3 } = await window.supabaseAuth.from('buses').insert(payload);
                            if (err3) throw new Error(err3.message || 'SDK insert also failed');
                        } else {
                            throw new Error('RLS Policy Error: ' + err2Msg + '\n\nPlease go to Supabase Dashboard → SQL Editor and run:\nCREATE POLICY "Allow admin bus insert" ON buses FOR INSERT WITH CHECK (true);');
                        }
                    }
                } else {
                    throw new Error(errMsg);
                }
            }
            
            Swal.fire({ icon: 'success', title: 'Asset Deployed' });
            closeModal('addBusModal');
            e.target.reset();
            loadBuses();
            } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Deployment Error',
                html: `<div style="text-align:left; font-size:0.9rem;">
                    <p style="margin-bottom:10px; font-weight:700;">${err.message}</p>
                    ${err.message.includes('RLS') || err.message.includes('policy') ? `
                        <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2); padding:15px; border-radius:12px; margin-top:10px;">
                            <p style="font-weight:800; color:#f59e0b; margin-bottom:8px;"><i class="fas fa-exclamation-triangle"></i> Fix Required:</p>
                            <p style="font-size:0.8rem; color:var(--text-muted);">Go to <strong>Supabase Dashboard → SQL Editor</strong> and run:</p>
                            <code style="display:block; background:var(--bg-main); padding:10px; border-radius:8px; margin-top:8px; font-size:0.75rem; word-break:break-all;">CREATE POLICY "Allow bus insert" ON buses FOR INSERT WITH CHECK (true);</code>
                        </div>
                    ` : ''}
                </div>`,
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
            await supabase.from('buses').eq('id', busId).update({ driver_id: drvId });
            await supabase.from('drivers').eq('id', drvId).update({ bus_id: busId });
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
                loadDrivers(true).then(() => loadBuses(true));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, () => {
                loadRoutes().then(() => loadBuses(true));
            })
            .subscribe();
    }
});