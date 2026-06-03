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

    
    
    
    const API_BASE_URL = 'http://transit-way.runasp.net';
    const stationTableBody = document.getElementById('stationTableBody');
    const searchInput = document.getElementById('stationSearchInput');

    let stationsData = [];
    let routesMap = {}; 
    const routeSelect = document.getElementById('routeSelect');

    
    
    
    async function loadRoutes() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/Routes`);
            if (res.ok) {
                const routes = await res.json();
                routeSelect.innerHTML = '<option value="">Select Route</option>';
                routes.forEach(r => {
                    routesMap[r.id] = r.name;
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = `${r.name} (Route #${r.id})`;
                    routeSelect.appendChild(opt);
                });
            } else {
                routeSelect.innerHTML = '<option value="">Failed to load routes</option>';
            }
        } catch (e) {
            routeSelect.innerHTML = '<option value="">Network error</option>';
        }
    }
    loadRoutes();

    
    
    
    function getRouteInfo(routeId) {
        const name = routesMap[routeId] || '';
        if (name.toLowerCase().includes('blue')) return { line: name, color: '#3b82f6' };
        if (name.toLowerCase().includes('orange')) return { line: name, color: '#f59e0b' };
        return { line: name || 'Route', color: 'var(--primary-color)' };
    }

    
    
    
    async function loadStations(silent = false) {
        if (!silent) {
            stationTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                        Loading stations from server...
                    </td>
                </tr>`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/Stations`);
            if (res.ok) {
                const data = await res.json();
                stationsData = data.map(s => {
                    const routeInfo = getRouteInfo(s.routeId);
                    
                    let parsedLat = 0;
                    let parsedLng = 0;
                    if (s.latLong) {
                        const parts = s.latLong.split('&').map(p => p.trim());
                        parsedLat = parseFloat(parts[0]) || 0;
                        parsedLng = parseFloat(parts[1]) || 0;
                    }

                    return {
                        id: s.id,
                        name: s.name || 'Unknown Station',
                        lat: parsedLat,
                        lng: parsedLng,
                        zone: s.zone || '—',
                        routeId: s.routeId || 1,
                        line: s.routeName || routeInfo.line,
                        color: routeInfo.color,
                        status: s.status || 'Active'
                    };
                });
                
                const term = searchInput.value.toLowerCase();
                renderTable();
                if (term) {
                    const rows = stationTableBody.querySelectorAll('tr');
                    rows.forEach(row => {
                        row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
                    });
                }
            } else {
                if (!silent) showTableError(`Server error (${res.status})`);
            }
        } catch (err) {
            console.error('Load stations error:', err);
            if (!silent) showTableError('Network error — Could not reach server');
        }
    }

    function showTableError(msg) {
        stationTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px; color:#ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    ${msg}
                </td>
            </tr>`;
    }

    
    
    
    function renderTable() {
        stationTableBody.innerHTML = '';

        if (stationsData.length === 0) {
            stationTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-map-marker-alt" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        No stations found
                    </td>
                </tr>`;
            return;
        }

        stationsData.forEach(st => {
            const statusLower = (st.status || 'active').toLowerCase();
            let statusBadge = '';
            if (statusLower === 'active') {
                statusBadge = `<span class="status active" style="background:rgba(34,197,94,0.1); color:#22c55e; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800;">Active</span>`;
            } else if (statusLower === 'inactive' || statusLower === 'maintenance') {
                statusBadge = `<span class="status inactive" style="background:rgba(239,68,68,0.1); color:#ef4444; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800;">${st.status}</span>`;
            } else {
                statusBadge = `<span class="status" style="background:rgba(148,163,184,0.1); color:#64748b; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800;">${st.status}</span>`;
            }

            const row = `
                <tr>
                    <td style="font-weight:bold; color:var(--text-muted);">#ST-${st.id}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px; font-weight:800; font-size:1.05rem;">
                            <i class="fas fa-map-marker-alt" style="color:${st.color}; font-size:1.2rem;"></i>
                            ${st.name}
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px; padding-left:28px;">Zone: ${st.zone}</div>
                    </td>
                    <td style="font-family:monospace; color:var(--text-muted); font-size:0.9rem;">
                        <i class="fas fa-location-arrow" style="font-size:0.8rem; margin-right:5px;"></i>
                        ${parseFloat(st.lat).toFixed(4)}, ${parseFloat(st.lng).toFixed(4)}
                    </td>
                    <td>
                        <span style="background:${st.color}15; color:${st.color}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:0.85rem; border:1px solid ${st.color}30;">
                            ${st.line} Line
                        </span>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <i class="fas fa-exchange-alt change-status-station" 
                           style="color:#3b82f6; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;" 
                           title="Change Status"
                           data-id="${st.id}"
                           data-status="${st.status}"
                           onmouseover="this.style.filter='brightness(0.7)'" 
                           onmouseout="this.style.filter='brightness(1)'">
                        </i>
                        <i class="fas fa-trash-alt delete-station" 
                           style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;" 
                           title="Remove Station"
                           data-id="${st.id}"
                           data-name="${st.name}"
                           onmouseover="this.style.filter='brightness(0.8)'" 
                           onmouseout="this.style.filter='brightness(1)'">
                        </i>
                    </td>
                </tr>`;
            stationTableBody.innerHTML += row;
        });
    }

    
    loadStations();

    
    setInterval(() => {
        loadStations(true);
    }, 10000);

    
    
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = stationTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    
    
    
    window.openModal = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    document.getElementById('openAddStationModalBtn').onclick = () => openModal('addStationModal');

    
    
    
    
    document.getElementById('addStationForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'Saving...';

        const formData = new FormData(e.target);
        const routeId = parseInt(formData.get('route'), 10) || 0;

        if (!routeId) {
            Swal.fire({ icon: 'warning', title: 'Missing Route', text: 'Please select a route.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            btn.disabled = false;
            btn.innerText = 'Save Station';
            return;
        }

        const latRaw = formData.get('latitude');
        const lngRaw = formData.get('longitude');

        
        const latitude  = latRaw ? parseFloat(latRaw)  : null;
        const longitude = lngRaw ? parseFloat(lngRaw)  : null;

        if (!latRaw || !lngRaw || isNaN(latitude) || isNaN(longitude)) {
            Swal.fire({ icon: 'warning', title: 'Invalid Coordinates', text: 'Please enter valid Latitude and Longitude numbers.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            btn.disabled = false;
            btn.innerText = 'Save Station';
            return;
        }

        const stationName = formData.get('name') || '';
        if (!stationName.trim()) {
            Swal.fire({ icon: 'warning', title: 'Missing Name', text: 'Please enter a station name.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            btn.disabled = false;
            btn.innerText = 'Save Station';
            return;
        }

        const payload = {
            name:      stationName.trim(),
            zone:      formData.get('zone') || '',
            latitude:  latitude,
            longitude: longitude,
            routeId:   parseInt(routeId, 10)
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/Stations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Station Added! ✅',
                    html: `<p style="margin:0; font-weight:600;">"${payload.name}" added to the network.</p>
                           <p style="margin:5px 0 0 0; color:var(--text-muted);">Route ID: ${routeId} | Zone: ${payload.zone || '—'}</p>`,
                    timer: 2500,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
                closeModal('addStationModal');
                e.target.reset();
                loadStations(); 
            } else {
                const errorBody = await res.text().catch(() => '');
                throw new Error(`Server: ${res.status} — ${errorBody}`);
            }
        } catch (err) {
            console.error('Add station error:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: `Failed to add station: ${err.message}`,
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Save Station';
        }
    };

    
    
    
    stationTableBody.addEventListener('click', (e) => {
        const target = e.target;

        
        
        
        if (target.classList.contains('delete-station')) {
            const stationId = target.getAttribute('data-id');
            const stationName = target.getAttribute('data-name') || `#ST-${stationId}`;

            Swal.fire({
                title: 'Delete Station?',
                html: `<p style="color:#ef4444; font-weight:700;">⚠ Remove <strong>"${stationName}"</strong> from the network?</p>
                       <p style="color:var(--text-muted);">This action cannot be undone.</p>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: 'var(--text-muted)',
                confirmButtonText: 'Yes, delete it!',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/Stations/${stationId}`, {
                            method: 'DELETE'
                        });
                        if (res.ok) {
                            Swal.fire({
                                title: 'Deleted!',
                                text: `"${stationName}" has been removed.`,
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false,
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)'
                            });
                            loadStations();
                        } else {
                            const errorBody = await res.text().catch(() => '');
                            throw new Error(`Server: ${res.status} — ${errorBody}`);
                        }
                    } catch (err) {
                        console.error('Delete station error:', err);
                        Swal.fire({
                            title: 'Error!',
                            text: `Could not delete station: ${err.message}`,
                            icon: 'error',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)'
                        });
                    }
                }
            });
        }

        
        
        
        if (target.classList.contains('change-status-station')) {
            const stationId = target.getAttribute('data-id');
            const currentStatus = target.getAttribute('data-status') || 'Active';

            Swal.fire({
                title: `Change Status — #ST-${stationId}`,
                input: 'select',
                inputOptions: {
                    'Active': 'Active',
                    'Inactive': 'Inactive',
                    'Maintenance': 'Maintenance'
                },
                inputValue: currentStatus,
                showCancelButton: true,
                confirmButtonText: 'Update',
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                inputValidator: (value) => {
                    if (!value) return 'Please select a status!';
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const newStatus = result.value;
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/Stations/status/${stationId}?status=${encodeURIComponent(newStatus)}`, {
                            method: 'PUT'
                        });
                        if (res.ok) {
                            Swal.fire({
                                title: 'Updated!',
                                text: `Station status changed to "${newStatus}".`,
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false,
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)'
                            });
                            loadStations();
                        } else {
                            const errorBody = await res.text().catch(() => '');
                            throw new Error(`Server: ${res.status} — ${errorBody}`);
                        }
                    } catch (err) {
                        console.error('Status update error:', err);
                        Swal.fire({
                            title: 'Error!',
                            text: `Could not update status: ${err.message}`,
                            icon: 'error',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)'
                        });
                    }
                }
            });
        }
    });
});