document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. Theme + Admin Name
    // ==========================================
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    document.getElementById('topBarName').innerText = adminName;

    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = themeToggleBtn.querySelector('i');

    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    function updateThemeUI(theme) {
        if (theme === 'dark') {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            themeIcon.style.color = '#f1c40f';
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            themeIcon.style.color = 'var(--text-main)';
        }
    }
    updateThemeUI(currentTheme);
    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('siteTheme', currentTheme);
        updateThemeUI(currentTheme);
    });

    // ==========================================
    // 2. Config & State
    // ==========================================
    const API           = 'http://transit-way.runasp.net';
    const busTableBody  = document.getElementById('busTableBody');
    const searchInput   = document.getElementById('busSearchInput');

    let busesData   = [];
    let driversData = [];

    // Route color map
    const routeColors = {
        'green':  'var(--primary-color)',
        'blue':   '#3b82f6',
        'orange': '#f59e0b',
        'red':    '#ef4444',
        'yellow': '#eab308',
        'purple': '#8b5cf6'
    };
    function getRouteColor(route) {
        if (!route) return 'var(--text-muted)';
        return routeColors[route.toLowerCase()] || 'var(--primary-color)';
    }

    // ==========================================
    // 3. Helpers
    // ==========================================
    function showTableLoading() {
        busTableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    Loading fleet data...
                </td>
            </tr>`;
    }

    // ==========================================
    // 4. GET /api/Bus — جلب كل الباصات
    // ==========================================
    async function loadBuses(silent = false) {
        try {
            if (!silent) showTableLoading();
            const res = await fetch(`${API}/api/Bus`);
            if (!res.ok) throw new Error(`Server ${res.status}`);
            const data = await res.json();

            busesData = data.map(b => {
                // Robust mapping for driverId and status
                // Note: The API sometimes returns Bus ID as driverId, so we check driversData first
                let driverId = b.driver_id || b.driver?.id || null;
                const foundDriver = driversData.find(d => d.busId == b.id);
                if (foundDriver) driverId = foundDriver.id;

                const status = (b.status || '').toLowerCase();
                const isActive = b.isActive === true || status === 'active' || status === 'moving' || (b.isActive !== false && status !== 'inactive');

                return {
                    id:            b.id,
                    busNumber:     b.busNumber   || b.number      || b.id,
                    plateNumber:   b.plateNumber || b.plate       || b.licensePlate || '—',
                    routeId:       b.routeId     || b.route_id    || b.lineId || b.routeLineId || null,
                    route:         b.routeName   || b.route       || b.lineName || '—',
                    driverName:    b.driverName  || b.driver?.fullName || b.driver?.name || b.driver || null,
                    driverId:      driverId,
                    isActive:      isActive,
                    speed:         b.speed       || 0,
                    capacity:      b.capacity    || 0,
                    license:       b.licenseNumber || '—'
                };
            });
            renderTable();
        } catch (err) {
            console.error('Load buses error:', err);
            if (!silent) {
                busTableBody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align:center; padding:40px; color:#ef4444;">
                            <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                            Could not load fleet data. ${err.message}
                        </td>
                    </tr>`;
            }
        }
    }

    // جلب السواقين للـ assign dropdown
    async function loadDrivers() {
        try {
            const res = await fetch(`${API}/api/Driver`);
            const data = await res.json();
            driversData = data.map(d => ({
                id: d.id,
                name: d.fullName || d.name || `Driver #${d.id}`,
                busId: d.bus?.id || d.busId || null
            }));
        } catch (e) { console.warn('Could not load drivers:', e); }
    }

    // ==========================================
    // 5. Render Table
    // ==========================================
    function renderTable(list = busesData) {
        busTableBody.innerHTML = '';

        if (list.length === 0) {
            busTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-bus" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        No buses found
                    </td>
                </tr>`;
            return;
        }

        list.forEach(bus => {
            const color       = getRouteColor(bus.route);
            const isMoving    = bus.isActive && bus.speed > 0;
            const statusBadge = bus.isActive
                ? `<span style="background:rgba(34,197,94,0.1); color:#22c55e; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">${isMoving ? 'Moving' : 'Active'}</span>`
                : `<span style="background:rgba(239,68,68,0.1); color:#ef4444; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Inactive</span>`;

            const driverCell = bus.driverName
                ? `<div style="display:flex; align-items:center; gap:8px;">
                       <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(bus.driverName)}&background=random&color=fff&rounded=true&bold=true&size=28" style="width:28px; height:28px; border-radius:50%;">
                       <span style="font-weight:700;">${bus.driverName}</span>
                   </div>`
                : `<span style="color:var(--text-muted); font-weight:600;">No Driver</span>`;

            const row = `
                <tr>
                    <td style="color:var(--primary-color); font-family:monospace; font-weight:800;">#${bus.id}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px; font-weight:800; font-size:1.1rem;">
                            <i class="fas fa-bus" style="color:${color};"></i> ${bus.busNumber}
                        </div>
                    </td>
                    <td style="font-family:monospace; font-weight:700; letter-spacing:1px;">${bus.plateNumber}</td>
                    <td style="color:var(--text-muted); font-size:0.9rem; font-weight:600;">${bus.license || '—'}</td>
                    <td>
                        <span style="background:rgba(99,102,241,0.1); color:#6366f1; padding:6px 12px; border-radius:8px; font-weight:800; font-size:0.9rem; font-family:monospace; border:1px solid rgba(99,102,241,0.3);">
                            ${bus.routeId !== null && bus.routeId !== undefined ? '#' + bus.routeId : '—'}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:5px; font-weight:700;">
                            <i class="fas fa-users" style="color:var(--text-muted); font-size:0.85rem;"></i>
                            ${bus.capacity || 0}
                        </div>
                    </td>
                    <td>${driverCell}</td>
                    <td style="font-weight:700;">${bus.speed || 0} <span style="font-size:0.8rem; color:var(--text-muted);">km/h</span></td>
                    <td>${statusBadge}</td>
                    <td>
                        
                        <i class="fas fa-toggle-${bus.isActive ? 'on' : 'off'} toggle-bus-status"
                           style="color:${bus.isActive ? '#22c55e' : '#ef4444'}; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                           title="${bus.isActive ? 'Deactivate' : 'Activate'} Bus"
                           onmouseover="this.style.filter='brightness(0.75)'"
                           onmouseout="this.style.filter='brightness(1)'"
                           data-id="${bus.id}"></i>
                        ${bus.driverName
                            ? `<i class="fas fa-unlink unassign-bus-driver"
                                  style="color:#f59e0b; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                                  title="Unassign Driver"
                                  onmouseover="this.style.filter='brightness(0.75)'"
                                  onmouseout="this.style.filter='brightness(1)'"
                                  data-id="${bus.id}" data-num="${bus.busNumber}"></i>`
                            : ''}
                        <i class="fas fa-trash-alt delete-bus"
                           style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;"
                           title="Delete Bus"
                           onmouseover="this.style.filter='brightness(0.8)'"
                           onmouseout="this.style.filter='brightness(1)'"
                           data-id="${bus.id}" data-num="${bus.busNumber}"></i>
                    </td>
                </tr>`;
            busTableBody.innerHTML += row;
        });
    }

    // Load drivers first so we can map them to buses correctly
    loadDrivers().then(() => loadBuses());
    setInterval(() => loadBuses(true), 15000);

    // ==========================================
    // 6. Search (محلي)
    // ==========================================
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (!term) { renderTable(busesData); return; }
        const filtered = busesData.filter(b =>
            String(b.id).includes(term) ||
            String(b.busNumber).includes(term) ||
            (b.plateNumber || '').toLowerCase().includes(term) ||
            (b.route        || '').toLowerCase().includes(term) ||
            (b.driverName   || '').toLowerCase().includes(term)
        );
        renderTable(filtered);
    });

    // ==========================================
    // 7. Modals
    // ==========================================
    window.openModal  = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    document.getElementById('openAddBusModalBtn').onclick = () => openModal('addBusModal');
    document.getElementById('openAssignModalBtn').onclick = () => {
        populateAssignDropdowns();
        openModal('assignModal');
    };

    function populateAssignDropdowns() {
        const busSel    = document.getElementById('assignBusSelect');
        const driverSel = document.getElementById('assignDriverSelect');

        busSel.innerHTML = '<option value="">Select Bus</option>';
        busesData.forEach(b => {
            busSel.innerHTML += `<option value="${b.id}">Bus #${b.busNumber} — ${b.route} Line</option>`;
        });

        driverSel.innerHTML = '<option value="">Select Driver</option>';
        driversData
            .filter(d => !d.busId)
            .forEach(d => {
                driverSel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            });
    }

    // ==========================================
    // 8. POST /api/Bus — إضافة باص جديد
    // ==========================================
    document.getElementById('addBusForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');

        const busNumber     = document.getElementById('addBusNumber').value.trim();
        const plateNumber   = document.getElementById('addPlateNumber').value.trim();
        const licenseNumber = document.getElementById('addLicenseNumber').value.trim();
        const capacityVal   = document.getElementById('addCapacity').value.trim();
        const routeIdVal    = document.getElementById('addRouteId').value.trim();

        const capacity = Number(capacityVal);
        const routeId  = Number(routeIdVal);

        // التحقق من الحقول الفارغة أو اللي قيمتها مش أرقام بشكل صحيح
        if (busNumber === '' || plateNumber === '' || licenseNumber === '' || capacityVal === '' || routeIdVal === '') {
            Swal.fire({ icon: 'warning', title: 'Missing Data', text: 'Please fill all 5 fields.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            return;
        }

        // الـ API بيتوقع الـ DTO مسطح (flat)، وbusNumber يكون String
        const payload = {
            busNumber: busNumber,
            plateNumber: plateNumber,
            licenseNumber: licenseNumber,
            capacity: capacity,
            routeId: routeId
        };

        btn.disabled  = true;
        btn.innerText = 'Adding...';

        try {
            const res = await fetch(`${API}/api/Bus`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Bus Added! 🚌', text: `Bus #${busNumber} has been added to the fleet.`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                closeModal('addBusModal');
                e.target.reset();
                loadBuses();
            } else {
                const body = await res.text().catch(() => '');
                throw new Error(`Server ${res.status}: ${body}`);
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } finally {
            btn.disabled  = false;
            btn.innerText = 'Add Bus';
        }
    };

    // ==========================================
    // 9. POST /api/Bus/assign-driver — ربط سواق بباص
    // ==========================================
    document.getElementById('assignDriverForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn      = e.target.querySelector('button[type="submit"]');
        const busId    = document.getElementById('assignBusSelect').value;
        const driverId = document.getElementById('assignDriverSelect').value;

        if (!busId || !driverId) {
            Swal.fire({ icon: 'warning', title: 'Select both bus and driver', background: 'var(--bg-card)', color: 'var(--text-main)' });
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Assigning...';

        try {
            // Using the Driver API for assignment since it is confirmed working in drivers-logic.js
            const res = await fetch(`${API}/api/Driver/assign?driverId=${driverId}&busId=${busId}`, {
                method:  'POST'
            });
            if (res.ok) {
                // Local update for immediate feedback
                const selBus = busesData.find(b => b.id == busId);
                const selDriver = driversData.find(d => d.id == driverId);
                if (selBus && selDriver) {
                    selBus.driverName = selDriver.fullName || selDriver.name;
                    selBus.driverId = selDriver.id;
                    renderTable();
                }
                Swal.fire({ icon: 'success', title: 'Assigned! ✅', text: 'Driver linked to bus successfully.', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                closeModal('assignModal');
                e.target.reset();
                loadDrivers();
                // Delay silent refresh to allow backend to sync
                setTimeout(() => loadBuses(true), 1500);
            } else {
                // Fallback to the Bus API if Driver API fails (for redundancy)
                const resBus = await fetch(`${API}/api/Bus/assign-driver?busId=${busId}&driverId=${driverId}`, { method: 'POST' });
                if (resBus.ok) {
                    Swal.fire({ icon: 'success', title: 'Assigned! ✅', text: 'Driver linked to bus successfully.', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                    closeModal('assignModal');
                    e.target.reset();
                    loadBuses();
                    loadDrivers();
                } else {
                    const body = await resBus.text().catch(() => '');
                    throw new Error(`Server ${resBus.status}: ${body}`);
                }
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Confirm Assignment';
        }
    };

    // ==========================================
    // 10. Table Click Events
    // ==========================================
    busTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const busId  = target.getAttribute('data-id');
        const busNum = target.getAttribute('data-num');
        if (!busId) return;

        const busObj = busesData.find(b => b.id == busId);

        // ── PUT /api/Bus/status/{id} — تغيير الحالة ──
        if (target.classList.contains('toggle-bus-status')) {
            const isActive = busObj?.isActive !== false;
            const action   = isActive ? 'Deactivate' : 'Activate';

            const confirm = await Swal.fire({
                title:              `${action} Bus #${busNum || busId}?`,
                text:               `Are you sure you want to ${action.toLowerCase()} this bus?`,
                icon:               'question',
                showCancelButton:   true,
                confirmButtonColor: isActive ? '#ef4444' : '#22c55e',
                cancelButtonColor:  'var(--text-muted)',
                confirmButtonText:  `Yes, ${action}!`,
                background: 'var(--bg-card)',
                color:      'var(--text-main)'
            });

            if (confirm.isConfirmed) {
                try {
                    const newStatus = isActive ? 'Inactive' : 'Active';
                    // We add the status parameter to match the pattern used in drivers-logic.js
                    const res = await fetch(`${API}/api/Bus/status/${busId}?status=${newStatus}`, { method: 'PUT' });
                    if (res.ok) {
                        if (busObj) {
                            busObj.isActive = (newStatus === 'Active');
                            renderTable();
                        }
                        Swal.fire({ title: 'Updated!', text: `Bus #${busNum} is now ${newStatus}.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                        setTimeout(() => loadBuses(true), 1500);
                    } else {
                        throw new Error(`Server ${res.status}`);
                    }
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }

        // ── POST /api/Driver/unassign/{driverId} — فك الربط (الحل المضمون) ──
        if (target.classList.contains('unassign-bus-driver')) {
            // The API is unreliable with driverId in the bus object, so we look it up from driversData
            let driverId = null;
            let driverName = busObj?.driverName || 'the driver';

            const foundD = driversData.find(d => String(d.busId) === String(busId));
            if (foundD) {
                driverId = foundD.id;
                driverName = foundD.fullName || foundD.name;
            } else if (busObj?.driverId && busObj.driverId != busId) {
                // Only use driverId if it's not the same as busId (to avoid the API bug)
                driverId = busObj.driverId;
            }

            if (!driverId) {
                Swal.fire({ 
                    icon: 'warning', 
                    title: 'Driver ID not found', 
                    text: 'Could not find the driver associated with this bus.', 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-main)' 
                });
                return;
            }

            const confirm = await Swal.fire({
                title:              `Unassign Driver?`,
                text:               `Remove ${driverName} from ${String(busNum).toLowerCase().startsWith('bus') ? busNum : `Bus #${busNum || busId}`}?`,
                icon:               'warning',
                showCancelButton:   true,
                confirmButtonColor: '#f59e0b',
                cancelButtonColor:  'var(--text-muted)',
                confirmButtonText:  'Yes, Unassign!',
                background: 'var(--bg-card)',
                color:      'var(--text-main)'
            });

            if (confirm.isConfirmed) {
                try {
                    // استخدام مسار السائقين لأنه شغال ومستقر (Driver API)
                    const res = await fetch(`${API}/api/Driver/unassign/${driverId}`, { method: 'POST' });

                    if (res.ok) {
                        // Local update for immediate feedback
                        if (busObj) {
                            busObj.driverName = null;
                            busObj.driverId   = null;
                            renderTable();
                        }
                        Swal.fire({ 
                            title: 'Unassigned!', 
                            text: `${driverName} has been unassigned successfully.`, 
                            icon: 'success', 
                            timer: 2000, 
                            showConfirmButton: false, 
                            background: 'var(--bg-card)', 
                            color: 'var(--text-main)' 
                        });
                        setTimeout(() => {
                            loadBuses(true); 
                            loadDrivers();
                        }, 1500);
                    } else {
                        // Fallback: try unassigning by BUS ID directly if possible
                        const resBus = await fetch(`${API}/api/Bus/unassign-driver/${busId}`, { method: 'POST' });
                        if (resBus.ok) {
                            if (busObj) {
                                busObj.driverName = null;
                                busObj.driverId   = null;
                                renderTable();
                            }
                            Swal.fire({ title: 'Unassigned!', text: `Driver removed from bus successfully.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            setTimeout(() => { loadBuses(true); loadDrivers(); }, 1500);
                        } else {
                            const errorMsg = await resBus.text().catch(() => 'Unknown error');
                            throw new Error(`Server ${resBus.status}: ${errorMsg}`);
                        }
                    }
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }

        // ── DELETE /api/Bus/{id} — حذف باص ──
        if (target.classList.contains('delete-bus')) {
            const hasDriver = !!busObj?.driverName;

            const confirm = await Swal.fire({
                title:              `Delete Bus #${busNum || busId}?`,
                html:               `<p style="color:#ef4444; font-weight:700;">⚠ Permanently remove Bus #${busNum} from the fleet?</p>
                                     ${hasDriver ? `<p style="color:#f59e0b; font-size:0.9rem;"><i class="fas fa-exclamation-circle"></i> This bus has a driver assigned — they will be unassigned automatically.</p>` : ''}
                                     <p style="color:var(--text-muted);">This action cannot be undone.</p>`,
                icon:               'error',
                showCancelButton:   true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor:  'var(--text-muted)',
                confirmButtonText:  'Yes, DELETE!',
                background: 'var(--bg-card)',
                color:      'var(--text-main)'
            });

            if (confirm.isConfirmed) {
                try {
                    // Get the driverId for this bus to unassign correctly
                    let driverToUnassignId = busObj?.driverId;
                    if (!driverToUnassignId) {
                        const drv = driversData.find(d => d.busId == busId);
                        if (drv) driverToUnassignId = drv.id;
                    }

                    // Always try to unassign first (using the driver ID for better reliability)
                    if (driverToUnassignId) {
                        await fetch(`${API}/api/Driver/unassign/${driverToUnassignId}`, { method: 'POST' }).catch(() => {});
                    } else {
                        // Fallback to bus-based unassign if driverId unknown
                        await fetch(`${API}/api/Bus/unassign-driver/${busId}`, { method: 'POST' }).catch(() => {});
                    }

                    // Now delete the bus
                    const res = await fetch(`${API}/api/Bus/${busId}`, { method: 'DELETE' });
                    if (res.ok) {
                        busesData = busesData.filter(b => b.id != busId);
                        renderTable();
                        Swal.fire({ title: 'Deleted!', text: `Bus #${busNum} has been permanently removed.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                    } else {
                        const body = await res.text().catch(() => '');
                        throw new Error(`Server ${res.status}: ${body}`);
                    }
                } catch (err) {
                    console.error('Delete bus error:', err);
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }

        // ── AI Damage Check ──
        if (target.classList.contains('open-ai-check')) {
            document.getElementById('aiBusId').value = busId;
            document.getElementById('aiResultArea').style.display = 'none';
            document.getElementById('aiCheckForm').reset();
            document.getElementById('aiBusId').value = busId;
            openModal('aiCheckModal');
        }
    });

    // ==========================================
    // 11. AI Check Form — POST /api/complaints/report
    // ==========================================
    document.getElementById('aiCheckForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const busId    = document.getElementById('aiBusId').value;
        const file     = document.getElementById('busImageFile').files[0];
        const formData = new FormData();
        formData.append('BusId',  busId);
        formData.append('UserId', '19');
        formData.append('Image',  file);

        Swal.fire({
            title:            'Analyzing Image...',
            html:             'AI is processing the camera feed for damages or assaults.',
            allowOutsideClick: false,
            background:       'var(--bg-card)',
            color:            'var(--text-main)',
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const res  = await fetch(`${API}/api/complaints/report`, { method: 'POST', body: formData });
            const data = await res.json();
            Swal.close();

            const resultArea = document.getElementById('aiResultArea');
            const statusText = document.getElementById('aiStatusText');
            const resultImg  = document.getElementById('aiResultImage');

            resultArea.style.display = 'block';
            if (data.resultImage) resultImg.src = data.resultImage;

            if (data.problemDetected) {
                statusText.innerHTML = `<span style="color:#ef4444; background:rgba(239,68,68,0.1); padding:8px 16px; border-radius:8px;"><i class="fas fa-exclamation-triangle"></i> Alert: Issue Detected!</span>`;
                Swal.fire({ icon: 'error', title: 'Issue Detected!', text: data.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
            } else {
                statusText.innerHTML = `<span style="color:#22c55e; background:rgba(34,197,94,0.1); padding:8px 16px; border-radius:8px;"><i class="fas fa-check-circle"></i> Bus Status: Clear & Safe</span>`;
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Analysis Failed', text: 'Could not connect to the AI engine.', background: 'var(--bg-card)', color: 'var(--text-main)' });
        }
    });

});