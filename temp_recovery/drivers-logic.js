document.addEventListener('DOMContentLoaded', () => {

    
    
    
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

    
    
    
    const API = 'http://transit-way.runasp.net';
    const driverTableBody = document.getElementById('driverTableBody');
    const searchInput     = document.getElementById('driverSearchInput');

    let driversData = [];
    let busesData   = [];

    
    
    
    function showTableLoading() {
        driverTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    Loading drivers...
                </td>
            </tr>`;
    }

    function showTableError(msg) {
        driverTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px; color:#ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    ${msg}
                </td>
            </tr>`;
    }

    
    
    
    async function loadDrivers(silent = false) {
        try {
            if (!silent) showTableLoading();

            
            if (busesData.length === 0) {
                await loadBuses();
            }

            const res = await fetch(`${API}/api/Driver`);
            if (!res.ok) throw new Error(`Server ${res.status}`);
            const data = await res.json();

            driversData = data.map(d => {
                
                const busId = d.busId || d.bus?.id || d.assignedBusId || d.assignedBus?.id || null;

                
                let busName = null;
                if (d.busNumber) {
                    busName = `Bus #${d.busNumber}`;
                } else if (busId) {
                    const matchedBus = busesData.find(b => b.id == busId);
                    busName = matchedBus
                        ? `Bus #${matchedBus.busNumber || matchedBus.id}`
                        : `Bus #${busId}`;
                }

                return {
                    id:      d.id,
                    name:    d.fullName    || d.name     || 'Driver',
                    license: d.licenseNumber || d.license || '—',
                    phone:   d.phoneNumber || d.phone    || '—',
                    busId,
                    busName,
                    status:  d.isActive === false ? 'Inactive' : (d.status || 'Active')
                };
            });
            renderTable();
        } catch (err) {
            console.error('Load drivers error:', err);
            if (!silent) showTableError('Could not load drivers. ' + err.message);
        }
    }

    
    
    
    async function loadBuses() {
        try {
            const res = await fetch(`${API}/api/Bus`);
            if (!res.ok) return;
            busesData = await res.json();
        } catch (e) {
            console.warn('Could not load buses:', e);
        }
    }

    
    
    
    function renderTable(list = driversData) {
        driverTableBody.innerHTML = '';

        if (list.length === 0) {
            driverTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-users" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        No drivers found
                    </td>
                </tr>`;
            return;
        }

        list.forEach(driver => {
            const isActive   = driver.status === 'Active';
            const statusBadge = isActive
                ? `<span style="background:rgba(34,197,94,0.1); color:#22c55e; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Active</span>`
                : `<span style="background:rgba(239,68,68,0.1); color:#ef4444; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Inactive</span>`;

            const busBadge = driver.busName
                ? `<span style="background:var(--bg-main); border:1px solid var(--border-color); padding:5px 10px; border-radius:8px; font-weight:800; font-size:0.85rem;"><i class="fas fa-bus" style="color:var(--primary-color); margin-right:5px;"></i>${driver.busName}</span>`
                : `<span style="color:var(--text-muted); font-weight:bold;">Unassigned</span>`;

            const row = `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=random&color=fff&rounded=true&bold=true"
                                 alt="Avatar" style="width:38px; height:38px; border-radius:50%; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                            <span style="font-weight:700;">${driver.name}</span>
                        </div>
                    </td>
                    <td style="color:var(--primary-color); font-family:monospace; font-weight:bold;">#${driver.id}</td>
                    <td style="font-family:monospace;">${driver.license}</td>
                    <td>${driver.phone}</td>
                    <td>${busBadge}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <i class="fas fa-eye view-driver"
                           style="color:var(--text-muted); cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                           title="View Details"
                           onmouseover="this.style.color='var(--primary-color)'"
                           onmouseout="this.style.color='var(--text-muted)'"
                           data-id="${driver.id}"></i>
                        <i class="fas fa-toggle-${isActive ? 'on' : 'off'} toggle-driver-status"
                           style="color:${isActive ? '#22c55e' : '#ef4444'}; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                           title="${isActive ? 'Deactivate' : 'Activate'}"
                           onmouseover="this.style.filter='brightness(0.75)'"
                           onmouseout="this.style.filter='brightness(1)'"
                           data-id="${driver.id}"></i>
                        ${driver.busName
                            ? `<i class="fas fa-unlink unassign-driver"
                                  style="color:#f59e0b; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                                  title="Unassign Bus"
                                  onmouseover="this.style.filter='brightness(0.75)'"
                                  onmouseout="this.style.filter='brightness(1)'"
                                  data-id="${driver.id}"></i>`
                            : ''}
                        <i class="fas fa-trash-alt delete-driver"
                           style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;"
                           title="Delete Driver"
                           onmouseover="this.style.filter='brightness(0.8)'"
                           onmouseout="this.style.filter='brightness(1)'"
                           data-id="${driver.id}"></i>
                    </td>
                </tr>`;
            driverTableBody.innerHTML += row;
        });
    }

    
    loadDrivers();
    loadBuses();

    
    setInterval(() => loadDrivers(true), 20000);

    
    
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        clearTimeout(searchTimeout);

        if (!term) {
            renderTable(driversData);
            return;
        }

        
        const local = driversData.filter(d =>
            d.name.toLowerCase().includes(term.toLowerCase()) ||
            String(d.id).includes(term) ||
            d.license.toLowerCase().includes(term.toLowerCase())
        );
        renderTable(local);

        
        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`${API}/api/Driver/search?name=${encodeURIComponent(term)}`);
                if (res.ok) {
                    const data = await res.json();
                    const mapped = data.map(d => {
                        const busId = d.busId || null;
                        let busName = null;
                        if (d.busNumber) {
                            busName = `Bus #${d.busNumber}`;
                        } else if (busId) {
                            const matchedBus = busesData.find(b => b.id == busId);
                            busName = matchedBus
                                ? `Bus #${matchedBus.busNumber || matchedBus.id}`
                                : `Bus #${busId}`;
                        }
                        return {
                            id:      d.id,
                            name:    d.fullName    || d.name     || 'Driver',
                            license: d.licenseNumber || d.license || '—',
                            phone:   d.phoneNumber || d.phone    || '—',
                            busId,
                            busName,
                            status:  d.isActive === false ? 'Inactive' : (d.status || 'Active')
                        };
                    });
                    renderTable(mapped);
                }
            } catch (e) {  }
        }, 500);
    });

    
    
    
    window.openModal  = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    document.getElementById('openAddDriverModalBtn').onclick = () => openModal('addDriverModal');
    document.getElementById('openAssignModalBtn').onclick    = () => {
        populateAssignDropdowns();
        openModal('assignModal');
    };

    function populateAssignDropdowns() {
        const driverSel = document.getElementById('assignDriverSelect');
        const busSel    = document.getElementById('assignBusSelect');

        
        const assignedBusIds = new Set(
            driversData
                .filter(d => d.busId)
                .map(d => String(d.busId))
        );

        
        driverSel.innerHTML = '<option value="">Select Driver</option>';
        driversData
            .filter(d => !d.busName)
            .forEach(d => {
                driverSel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            });

        
        busSel.innerHTML = '<option value="">Select Bus</option>';
        busesData
            .filter(b => !assignedBusIds.has(String(b.id)))
            .forEach(b => {
                const label = b.busNumber ? `Bus #${b.busNumber}` : `Bus #${b.id}`;
                busSel.innerHTML += `<option value="${b.id}">${label}</option>`;
            });
    }

    
    
    
    document.getElementById('addDriverForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'Processing...';

        const inputs  = e.target.querySelectorAll('input');
        const payload = {
            fullName:      inputs[0].value.trim(),
            email:         inputs[1].value.trim(),
            licenseNumber: inputs[2].value.trim(),
            phoneNumber:   inputs[3].value.trim(),
            password:      inputs[4].value.trim()
        };

        if (!payload.fullName || !payload.email || !payload.licenseNumber || !payload.password) {
            Swal.fire({ icon: 'warning', title: 'Missing Data', text: 'Please fill all required fields.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            btn.disabled = false;
            btn.innerText = 'Add Driver';
            return;
        }

        try {
            const res = await fetch(`${API}/api/Driver`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });

            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Driver Added! ✅', text: `${payload.fullName} has been registered.`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                closeModal('addDriverModal');
                e.target.reset();
                loadDrivers();
            } else {
                const err = await res.text().catch(() => '');
                throw new Error(`Server ${res.status}: ${err}`);
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Add Driver';
        }
    };

    
    
    
    document.getElementById('assignDriverForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn      = e.target.querySelector('button[type="submit"]');
        const driverId = document.getElementById('assignDriverSelect').value;
        const busId    = document.getElementById('assignBusSelect').value;

        if (!driverId || !busId) {
            Swal.fire({ icon: 'warning', title: 'Select both driver and bus', background: 'var(--bg-card)', color: 'var(--text-main)' });
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Assigning...';

        try {
            
            const res = await fetch(`${API}/api/Driver/assign?driverId=${driverId}&busId=${busId}`, {
                method: 'POST'
            });

            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Assigned! ✅', text: 'Driver has been linked to the bus.', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                closeModal('assignModal');
                e.target.reset();
                loadDrivers();
            } else {
                const err = await res.text().catch(() => '');
                throw new Error(`Server ${res.status}: ${err}`);
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Assign Now';
        }
    };

    
    
    
    driverTableBody.addEventListener('click', async (e) => {
        const target   = e.target;
        const driverId = target.getAttribute('data-id');
        if (!driverId) return;

        const driverObj = driversData.find(d => d.id == driverId);

        
        if (target.classList.contains('view-driver')) {
            try {
                const res = await fetch(`${API}/api/Driver/${driverId}`);
                const d   = res.ok ? await res.json() : driverObj;
                const name    = d.fullName    || d.name    || driverObj?.name    || 'Driver';
                const license = d.licenseNumber || d.license || driverObj?.license || '—';
                const phone   = d.phoneNumber || d.phone   || driverObj?.phone   || '—';
                const status  = d.isActive === false ? 'Inactive' : (d.status || driverObj?.status || 'Active');
                
                const resolvedBusId = driverObj?.busId
                    || d.busId || d.bus?.id || d.assignedBusId || d.assignedBus?.id
                    || null;
                const busInfo = resolvedBusId ? `#${resolvedBusId}` : 'Unassigned';

                Swal.fire({
                    title: `<i class="fas fa-id-card" style="color:var(--primary-color);"></i> ${name}`,
                    html: `
                        <div style="text-align:left; font-size:0.95rem; line-height:2.2; padding:10px 0;">
                            <p><strong><i class="fas fa-hashtag" style="width:20px; color:var(--text-muted);"></i> ID:</strong> #${driverId}</p>
                            <p><strong><i class="fas fa-id-card" style="width:20px; color:var(--text-muted);"></i> License:</strong> ${license}</p>
                            <p><strong><i class="fas fa-phone" style="width:20px; color:var(--text-muted);"></i> Phone:</strong> ${phone}</p>
                            <p><strong><i class="fas fa-bus" style="width:20px; color:var(--text-muted);"></i> Bus:</strong> ${busInfo}</p>
                            <p><strong><i class="fas fa-circle" style="width:20px; color:var(--text-muted);"></i> Status:</strong>
                                <span style="font-weight:800; color:${status === 'Active' ? '#22c55e' : '#ef4444'}; text-transform:uppercase;">${status}</span>
                            </p>
                        </div>`,
                    showCloseButton:   true,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color:      'var(--text-main)',
                    width:      460
                });
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load driver details.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        }

        
        if (target.classList.contains('toggle-driver-status')) {
            const displayName = driverObj?.name || `Driver #${driverId}`;
            const isActive    = driverObj?.status === 'Active';
            const action      = isActive ? 'Deactivate' : 'Activate';

            const confirm = await Swal.fire({
                title:              `${action} Driver?`,
                text:               `Are you sure you want to ${action.toLowerCase()} ${displayName}?`,
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
                    const res = await fetch(`${API}/api/Driver/status/${driverId}?status=${newStatus}`, {
                        method: 'PUT'
                    });
                    if (res.ok) {
                        Swal.fire({ title: 'Updated!', text: `${displayName} is now ${newStatus}.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                        loadDrivers();
                    } else {
                        const body = await res.text().catch(() => '');
                        throw new Error(`Server ${res.status}: ${body}`);
                    }
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }

        
        if (target.classList.contains('unassign-driver')) {
            const displayName = driverObj?.name || `Driver #${driverId}`;

            const confirm = await Swal.fire({
                title:              'Unassign Bus?',
                text:               `Remove ${displayName} from their current bus?`,
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
                    const res = await fetch(`${API}/api/Driver/unassign/${driverId}`, { method: 'POST' });
                    if (res.ok) {
                        Swal.fire({ title: 'Unassigned!', text: `${displayName} has been unassigned from their bus.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                        loadDrivers();
                    } else {
                        throw new Error(`Server ${res.status}`);
                    }
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }

        
        if (target.classList.contains('delete-driver')) {
            const displayName = driverObj?.name || `Driver #${driverId}`;
            const isAssigned  = !!driverObj?.busName;

            const confirm = await Swal.fire({
                title:              'Delete Driver?',
                html:               `<p style="color:#ef4444; font-weight:700;">⚠ Permanently remove <strong>${displayName}</strong>?</p>
                                     ${isAssigned ? `<p style="color:#f59e0b; font-size:0.9rem;"><i class="fas fa-exclamation-circle"></i> This driver is assigned to a bus — they will be unassigned automatically.</p>` : ''}
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
                    
                    await fetch(`${API}/api/Driver/unassign/${driverId}`, { method: 'POST' }).catch(() => {});

                    
                    const res = await fetch(`${API}/api/Driver/${driverId}`, { method: 'DELETE' });
                    if (res.ok) {
                        driversData = driversData.filter(d => d.id != driverId);
                        renderTable();
                        Swal.fire({ title: 'Deleted!', text: `${displayName} has been permanently removed.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                    } else {
                        const body = await res.text().catch(() => '');
                        throw new Error(`Server ${res.status}: ${body}`);
                    }
                } catch (err) {
                    console.error('Delete driver error:', err);
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }
    });
});