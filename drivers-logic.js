document.addEventListener('DOMContentLoaded', () => {
    // Basic UI Setup
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // Global Registry for Data
    window.driversData = [];
    window.busesData   = [];
    window.routesData  = [];
    window.currentViewingDriverId = null;

    // Helper: Colors
    window.getRouteColor = function(routeId) {
        if (!routeId) return '#568e74';
        const id = String(routeId);
        if (id === '8') return '#2563eb';
        if (id === '11') return '#f97316';
        if (id === '9') return '#dc2626';
        if (id === '13') return '#8b5cf6';
        return '#568e74';
    };

    // Helper: Populate Dropdowns
    window.populateAssignDropdowns = function() {
        const drvSel = document.getElementById('assignDriverSelect');
        const busSel = document.getElementById('assignBusSelect');
        if(drvSel) {
            drvSel.innerHTML = '<option value="">Select Available Driver</option>';
            window.driversData.filter(d => !d.busId).forEach(d => {
                drvSel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            });
        }
        if(busSel) {
            busSel.innerHTML = '<option value="">Select Operational Bus</option>';
            window.busesData.filter(b => !b.driver_id).forEach(b => {
                busSel.innerHTML += `<option value="${b.id}">B-${b.bus_number || b.id}</option>`;
            });
        }
    };

    // Core Logic: Load Buses & Routes
    window.loadBusesAndRoutes = async function() {
        try {
            const { data: bData } = await supabase.from('buses').select('*');
            if (bData) window.busesData = bData;
            const { data: rData } = await supabase.from('routes').select('*');
            if (rData) window.routesData = rData;
        } catch (e) { console.warn('Buses/Routes link offline', e); }
    };

    // Core Logic: Load Drivers
    window.loadDrivers = async function(silent = false) {
        const tbody = document.getElementById('driverTableBody');
        if(!tbody) return;

        try {
            if (!silent) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem; color:var(--primary-color);"></i><p style="margin-top:15px; font-weight:900;">Establishing Neural Link...</p></td></tr>`;
            }

            await window.loadBusesAndRoutes();

            let { data, error } = await supabase.from('drivers').select('*');
            if (error) throw error;

            window.driversData = (data || []).map(d => {
                const busId = d.bus_id || null;
                const busObj = busId ? window.busesData.find(b => b.id == busId) : null;
                const routeObj = busObj ? window.routesData.find(r => r.id == busObj.route_id) : null;
                return {
                    id: d.id,
                    name: d.full_name || d.name || 'Personnel Candidate',
                    license: d.license_number || d.license || '—',
                    phone: d.phone_number || d.phone || '—',
                    email: d.email || '--',
                    photo_url: d.photo_url || d.photo || null,
                    busId,
                    busObj,
                    routeObj,
                    status: d.status || 'Active'
                };
            });

            window.renderDriverTable();

        } catch (err) {
            console.error('Personnel Error:', err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:60px; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:2.5rem;"></i><p style="font-weight:900; margin-top:15px;">Personnel Intelligence Offline</p></td></tr>`;
        }
    };

    window.renderDriverTable = function(list = window.driversData) {
        const tbody = document.getElementById('driverTableBody');
        if(!tbody) return;

        if (document.getElementById('sumTotalDrivers')) document.getElementById('sumTotalDrivers').textContent = window.driversData.length;
        if (document.getElementById('sumActiveDrivers')) document.getElementById('sumActiveDrivers').textContent = window.driversData.filter(d => (d.status || '').toLowerCase() === 'active').length;
        if (document.getElementById('sumOnDutyDrivers')) document.getElementById('sumOnDutyDrivers').textContent = window.driversData.filter(d => d.busId).length;
        if (document.getElementById('sumUnassignedDrivers')) document.getElementById('sumUnassignedDrivers').textContent = window.driversData.filter(d => !d.busId).length;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:80px; color:var(--text-muted); font-weight:800;"><i class="fas fa-user-astronaut" style="font-size:4rem; display:block; margin-bottom:20px; opacity:0.2;"></i>No personnel detected.<br><button class="btn-primary" style="margin-top:20px; padding:10px 25px;" onclick="window.openModal('addDriverModal')"><i class="fas fa-plus"></i> Register</button></td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        list.forEach((driver, index) => {
            const serialNum = String(index + 1).padStart(4, '0');
            const isActive  = (driver.status || '').toLowerCase() === 'active';
            const statusBadge = isActive ? `<span class="status-badge status-active"><div class="pulse-dot"></div> OPERATIONAL</span>` : `<span class="status-badge status-inactive">STANDBY</span>`;
            const busColor = driver.busObj ? window.getRouteColor(driver.busObj.route_id) : 'var(--text-muted)';
            const busBadge = driver.busObj ? `<div class="bus-badge-cell" style="color:${busColor}; border-color:${busColor}40;">B-${driver.busObj.bus_number || driver.busObj.id}</div>` : `<span style="opacity:0.5;">Unlinked</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${driver.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=1e293b&color=fff&size=40`}" style="width:40px; height:40px; border-radius:12px; object-fit:cover;">
                        <span style="font-weight:900;">${driver.name}</span>
                    </div>
                </td>
                <td style="font-family:monospace; font-weight:900;">#${serialNum}</td>
                <td><span class="license-tag">${driver.license}</span></td>
                <td style="font-weight:800;">${driver.phone}</td>
                <td>${busBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-action" onclick="window.viewProfile('${driver.id}', '${serialNum}')"><i class="fas fa-fingerprint"></i></button>
                        <button class="btn-action" onclick="window.toggleStatus('${driver.id}')"><i class="fas fa-shield-alt" style="color:${isActive ? '#10b981' : 'var(--text-muted)'};"></i></button>
                        ${driver.busId ? `<button class="btn-action" onclick="window.unassign('${driver.id}')"><i class="fas fa-unlink" style="color:#f59e0b;"></i></button>` : ''}
                        <button class="btn-action" onclick="window.deleteDriver('${driver.id}', '${driver.name}')" style="color:#ef4444;"><i class="fas fa-user-minus"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    // --- Dynamic Modal Content ---
    let efficiencyChart = null;
    let performanceChart = null;

    window.updateDriverAnalytics = async (driver) => {
        const effCtx = document.getElementById('dpWeeklyChart')?.getContext('2d');
        const perfCtx = document.getElementById('dpPerformanceChart')?.getContext('2d');
        const tripBody = document.getElementById('dpTripTableBody');

        if(efficiencyChart) efficiencyChart.destroy();
        if(performanceChart) performanceChart.destroy();

        if (!driver.busId) {
            if(tripBody) tripBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; opacity:0.5;">No active asset linked for historical tracking.</td></tr>';
            return;
        }

        try {
            // 1. Fetch real tickets for this bus to simulate activity
            const { data: tickets, error } = await supabase.from('tickets').eq('bus_id', driver.busId).select('*').order('created_at', { ascending: false }).limit(20);
            
            // 2. Populate "Recent Tactical Sorties" with real tickets
            if(tripBody && tickets) {
                if(tickets.length === 0) {
                    tripBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; opacity:0.5;">No ticket logs detected for this asset.</td></tr>';
                } else {
                    tripBody.innerHTML = tickets.map(t => {
                        const date = new Date(t.created_at);
                        return `
                            <tr>
                                <td><span style="font-weight:800;">${driver.routeObj?.name || 'Sector Alpha'}</span></td>
                                <td><span style="font-size:0.8rem; color:var(--text-muted);">${date.toLocaleDateString()}</span></td>
                                <td><span style="font-weight:700;">${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                                <td><span style="color:var(--primary-color); font-weight:900;">LIVE</span></td>
                                <td><span class="status-badge status-active" style="padding:4px 8px; font-size:0.65rem;">VALID</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            // 3. Generate Chart Data based on ticket volume
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const today = new Date().getDay();
            const labels = [];
            for(let i=6; i>=0; i--) labels.push(days[(today - i + 7) % 7]);

            // Mocked volume based on ticket count for chart "feel"
            const ticketVolume = labels.map((_, i) => Math.floor(Math.random() * 20) + (tickets ? tickets.length : 10));

            if(effCtx) {
                efficiencyChart = new Chart(effCtx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Ticket Flow',
                            data: ticketVolume,
                            borderColor: '#568e74',
                            backgroundColor: 'rgba(86, 142, 116, 0.1)',
                            fill: true, tension: 0.4, borderWidth: 3
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
                });
            }

            if(perfCtx) {
                performanceChart = new Chart(perfCtx, {
                    type: 'radar',
                    data: {
                        labels: ['Punctuality', 'Safety', 'Compliance', 'Flow', 'Reliability'],
                        datasets: [{
                            data: [85, 90, 75, 95, 80],
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            borderColor: '#f59e0b',
                            borderWidth: 2
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                });
            }

        } catch (e) { console.error('Analytics Error:', e); }
    };

    window.viewProfile = (id, serial) => {
        const driver = window.driversData.find(d => d.id == id);
        if(!driver) return;
        window.currentViewingDriverId = id;
        
        const avatar = document.getElementById('dpAvatar');
        if(avatar) avatar.src = driver.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=1e293b&color=fff&size=200&bold=true`;
        
        if(document.getElementById('dpName')) document.getElementById('dpName').innerText = driver.name;
        if(document.getElementById('dpId')) document.getElementById('dpId').innerText = serial;
        if(document.getElementById('dpLicense')) document.getElementById('dpLicense').innerText = driver.license;
        if(document.getElementById('dpPhone')) document.getElementById('dpPhone').innerText = driver.phone;
        if(document.getElementById('dpEmail')) document.getElementById('dpEmail').innerText = driver.email;

        const badge = document.getElementById('dpStatusBadge');
        if(badge) {
            badge.innerText = driver.status.toUpperCase();
            badge.className = `status-badge ${driver.status === 'Active' ? 'status-active' : 'status-inactive'}`;
        }

        const busNumber = document.getElementById('dpBusNumber');
        const plateNumber = document.getElementById('dpPlateNumber');
        const sector = document.getElementById('dpRoute');

        if(driver.busObj) {
            if(busNumber) busNumber.innerText = `B-${driver.busObj.bus_number || driver.busObj.id}`;
            if(plateNumber) plateNumber.innerText = driver.busObj.plate_number || '—';
            if(sector) sector.innerText = driver.routeObj ? driver.routeObj.name : 'Tactical Sector';
        } else {
            if(busNumber) busNumber.innerText = 'Unlinked';
            if(plateNumber) plateNumber.innerText = '—';
            if(sector) sector.innerText = '--';
        }

        window.openModal('driverProfileModal');
        window.updateDriverAnalytics(driver);
    };

    // --- Actions ---
    window.toggleStatus = async (id) => {
        const drv = window.driversData.find(d => d.id == id);
        if(!drv) return;
        const newStatus = drv.status === 'Active' ? 'Inactive' : 'Active';
        try {
            Swal.fire({ title: 'Overriding Protocol...', didOpen: () => Swal.showLoading() });
            await supabase.from('drivers').eq('id', id).update({ status: newStatus });
            Swal.fire({ icon: 'success', title: 'Updated', timer: 1000, showConfirmButton: false });
            window.loadDrivers(true);
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    };

    window.unassign = async (id) => {
        const drv = window.driversData.find(d => d.id == id);
        if(!drv || !drv.busId) return;
        const res = await Swal.fire({
            title: 'Sever Link?',
            text: `Disconnect ${drv.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });
        if(res.isConfirmed) {
            try {
                Swal.fire({ title: 'Severing...', didOpen: () => Swal.showLoading() });
                await supabase.from('buses').eq('id', drv.busId).update({ driver_id: null });
                await supabase.from('drivers').eq('id', id).update({ bus_id: null });
                Swal.fire({ icon: 'success', title: 'Severed', timer: 1000, showConfirmButton: false });
                window.loadDrivers(true);
            } catch(e) { Swal.fire('Error', e.message, 'error'); }
        }
    };

    window.deleteDriver = async (id, name) => {
        const res = await Swal.fire({
            title: `Terminate ${name}?`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });
        if (res.isConfirmed) {
            try {
                await supabase.from('drivers').eq('id', id).delete();
                Swal.fire({ icon: 'success', title: 'Purged', timer: 1000, showConfirmButton: false });
                window.loadDrivers();
            } catch(e) { Swal.fire('Error', e.message, 'error'); }
        }
    };

    // --- Identity Update ---
    const dpPhotoInput = document.getElementById('dpEditPhotoInput');
    if(dpPhotoInput) {
        dpPhotoInput.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file || !window.currentViewingDriverId) return;
            try {
                Swal.fire({ title: 'Uploading...', didOpen: () => Swal.showLoading() });
                const fileName = `driver-${window.currentViewingDriverId}-${Date.now()}.png`;
                const { data, error } = await supabaseAuth.storage.from('avatars').upload(fileName, file);
                if(error) throw error;
                const { data: { publicUrl } } = supabaseAuth.storage.from('avatars').getPublicUrl(fileName);
                await supabase.from('drivers').eq('id', window.currentViewingDriverId).update({ photo_url: publicUrl });
                Swal.fire({ icon: 'success', title: 'Updated', timer: 1000, showConfirmButton: false });
                window.loadDrivers(true);
                if(document.getElementById('dpAvatar')) document.getElementById('dpAvatar').src = publicUrl;
            } catch(err) { Swal.fire('Error', err.message, 'error'); }
        };
    }

    // --- Static Handlers ---
    window.openModal = (id) => document.getElementById(id)?.classList.add('active');
    window.closeModal = (id) => document.getElementById(id)?.classList.remove('active');

    const addBtn = document.getElementById('openAddDriverModalBtn');
    if(addBtn) addBtn.onclick = () => window.openModal('addDriverModal');

    const assignBtn = document.getElementById('openAssignModalBtn');
    if(assignBtn) assignBtn.onclick = () => { window.populateAssignDropdowns(); window.openModal('assignModal'); };

    const closeProfileBtn = document.getElementById('dpCloseBtn');
    if(closeProfileBtn) closeProfileBtn.onclick = () => window.closeModal('driverProfileModal');

    const addForm = document.getElementById('addDriverForm');
    if(addForm) {
        addForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true; btn.innerText = "Registering...";
            const payload = {
                full_name: document.getElementById('addDriverName').value,
                email: document.getElementById('addDriverEmail').value,
                phone_number: document.getElementById('addDriverPhone').value,
                license_number: document.getElementById('addDriverLicense').value,
                status: 'Active'
            };
            try {
                const { error } = await supabase.from('drivers').insert(payload);
                if (error) throw error;
                Swal.fire({ icon: 'success', title: 'Registered!', timer: 1500, showConfirmButton: false });
                window.closeModal('addDriverModal');
                e.target.reset();
                window.loadDrivers();
            } catch(err) { Swal.fire('Error', err.message, 'error'); }
            finally { btn.disabled = false; btn.innerText = "Register & Link"; }
        };
    }

    const assignForm = document.getElementById('assignDriverForm');
    if(assignForm) {
        assignForm.onsubmit = async (e) => {
            e.preventDefault();
            const dId = document.getElementById('assignDriverSelect').value;
            const bId = document.getElementById('assignBusSelect').value;
            if(!dId || !bId) return;
            try {
                Swal.fire({ title: 'Linking...', didOpen: () => Swal.showLoading() });
                await supabase.from('drivers').eq('id', dId).update({ bus_id: bId });
                await supabase.from('buses').eq('id', bId).update({ driver_id: dId });
                Swal.fire({ icon: 'success', title: 'Established', timer: 1000, showConfirmButton: false });
                window.closeModal('assignModal');
                window.loadDrivers();
            } catch(err) { Swal.fire('Error', err.message, 'error'); }
        };
    }

    const sInput = document.getElementById('driverSearchInput');
    if(sInput) {
        sInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = window.driversData.filter(d => d.name.toLowerCase().includes(query) || d.license.toLowerCase().includes(query));
            window.renderDriverTable(filtered);
        });
    }

    window.loadDrivers();
});