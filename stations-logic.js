document.addEventListener('DOMContentLoaded', () => {
    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
    if (!isSuperAdmin) {
        const addBtn = document.getElementById('openAddStationModalBtn');
        if (addBtn) addBtn.style.display = 'none';
    }

    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;

    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        function updateThemeUI(theme) {
            if (theme === 'dark') {
                if(themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
                if(themeIcon) themeIcon.style.color = '#f1c40f';
            } else {
                if(themeIcon) themeIcon.classList.replace('fa-sun', 'fa-moon');
                if(themeIcon) themeIcon.style.color = 'var(--text-main)';
            }
        }
        updateThemeUI(currentTheme);

        themeToggleBtn.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('siteTheme', newTheme);
            updateThemeUI(newTheme);
        });
    }

    const stationTableBody = document.getElementById('stationTableBody');
    const searchInput = document.getElementById('stationSearchInput');

    let stationsData = [];
    let routesMap = {}; 
    const routeSelect = document.getElementById('routeSelect');

    let routesLoadedPromise = null;

    function loadRoutes() {
        if (!routesLoadedPromise) {
            routesLoadedPromise = (async () => {
                try {
                    const { data, error } = await supabase.from('routes').select('*');
                    if (error) throw error;
                    if (routeSelect) routeSelect.innerHTML = `<option value="">${t('select_route')}</option>`;
                    data.forEach(r => {
                        routesMap[r.id] = r.name;
                        if (routeSelect) {
                            const opt = document.createElement('option');
                            opt.value = r.id;
                            opt.textContent = `${r.name} (Route #${r.id})`;
                            routeSelect.appendChild(opt);
                        }
                    });
                } catch (e) {
                    console.error('loadRoutes error:', e);
                    if (routeSelect) routeSelect.innerHTML = `<option value="">${t('failed_load_routes')}</option>`;
                }
            })();
        }
        return routesLoadedPromise;
    }
    loadRoutes();

    function getRouteInfo(routeId) {
        const name = routesMap[routeId] || '';
        if (name.toLowerCase().includes('blue')) return { line: name, color: '#3b82f6' };
        if (name.toLowerCase().includes('orange')) return { line: name, color: '#f59e0b' };
        return { line: name || 'Route', color: 'var(--primary-color)' };
    }

    async function loadStations(silent = false) {
        if (!silent && stationTableBody) {
            stationTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                        ${t('loading_stations')}
                    </td>
                </tr>`;
        }

        try {
            await loadRoutes();

            const [stRes, rpRes] = await Promise.all([
                supabase.from('stations').select('*').order('created_at', { ascending: false }),
                supabase.from('route_points').select('*')
            ]);
            if (stRes.error) throw stRes.error;

            const rPoints = rpRes.data || [];

            stationsData = (stRes.data || []).map(s => {
                const pt = rPoints.find(p => String(p.station_id) === String(s.id));
                const rId = pt ? pt.route_id : (s.line_id || '');
                const routeInfo = getRouteInfo(rId);
                
                let lat = parseFloat(s.latitude) || 0;
                let lng = parseFloat(s.longitude) || 0;
                if ((!lat || !lng) && s.latLong) {
                    const parts = s.latLong.split('&');
                    if (parts.length === 2) {
                        lat = parseFloat(parts[0].trim()) || 0;
                        lng = parseFloat(parts[1].trim()) || 0;
                    }
                }

                const cachedZone = s.zone || localStorage.getItem('station_zone_' + s.id) || 'Central Zone';
                const cachedStatus = s.status || localStorage.getItem('station_status_' + s.id) || 'Active';

                return {
                    id: s.id,
                    name: s.name || 'Unknown Station',
                    lat: lat,
                    lng: lng,
                    zone: cachedZone,
                    routeId: rId,
                    line: routeInfo.line,
                    color: routeInfo.color,
                    status: cachedStatus
                };
            });

            renderTable();
            if (searchInput) {
                const term = searchInput.value.toLowerCase();
                if (term && stationTableBody) {
                    const rows = stationTableBody.querySelectorAll('tr');
                    rows.forEach(row => {
                        row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
                    });
                }
            }
        } catch (err) {
            console.error('Load stations error:', err);
            if (!silent && stationTableBody) {
                stationTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align:center; padding:40px; color:#ef4444;">
                            <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                            ${t('network_error')}
                        </td>
                    </tr>`;
            }
        }
    }

    function renderTable() {
        if(!stationTableBody) return;
        stationTableBody.innerHTML = '';

        if (stationsData.length === 0) {
            stationTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-map-marker-alt" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        ${t('no_stations')}
                    </td>
                </tr>`;
            return;
        }

        stationsData.forEach((st, index) => {
            const serialNum = String(index + 1).padStart(4, '0');
            const statusLower = (st.status || 'active').toLowerCase();
            let statusBadge = '';
            if (statusLower === 'active') {
                statusBadge = `<span class="status active" style="background:rgba(34,197,94,0.1); color:#22c55e; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800;">${t('active')}</span>`;
            } else if (statusLower === 'inactive' || statusLower === 'maintenance') {
                const sText = statusLower === 'maintenance' ? t('maintenance') : t('inactive');
                statusBadge = `<span class="status inactive" style="background:rgba(239,68,68,0.1); color:#ef4444; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800;">${sText}</span>`;
            } else {
                statusBadge = `<span class="status" style="background:rgba(148,163,184,0.1); color:#64748b; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800;">${st.status}</span>`;
            }

            const row = `
                <tr>
                    <td style="font-weight:bold; color:var(--text-muted);" data-id="${st.id}">#ST-${serialNum}</td>
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
                            ${st.line} ${t('line')}
                        </span>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        ${isSuperAdmin ? `
                        <i class="fas fa-exchange-alt change-status-station" 
                           style="color:#3b82f6; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;" 
                           title="${t('change_status')}"
                           data-id="${st.id}"
                           data-name="${st.name}"
                           data-status="${st.status}"
                           onmouseover="this.style.filter='brightness(0.7)'" 
                           onmouseout="this.style.filter='brightness(1)'">
                        </i>
                        <i class="fas fa-edit edit-station" 
                           style="color:#3b82f6; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;" 
                           title="${t('edit_station')}"
                           data-id="${st.id}"
                           onmouseover="this.style.filter='brightness(0.7)'" 
                           onmouseout="this.style.filter='brightness(1)'">
                        </i>
                        <i class="fas fa-trash-alt delete-station" 
                           style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;" 
                           title="${t('remove_station')}"
                           data-id="${st.id}"
                           data-name="${st.name}"
                           onmouseover="this.style.filter='brightness(0.8)'" 
                           onmouseout="this.style.filter='brightness(1)'">
                        </i>
                        ` : ''}
                    </td>
                </tr>`;
            stationTableBody.innerHTML += row;
        });
    }

    loadStations();
    
    if (window.supabaseAuth) {
        window.supabaseAuth.channel('stations_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, () => {
                loadStations(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'route_points' }, () => {
                loadStations(true);
            })
            .subscribe();
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            if(stationTableBody) {
                const rows = stationTableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
                });
            }
        });
    }

    window.openModal = (id) => { const el = document.getElementById(id); if(el) el.classList.add('active'); };
    window.closeModal = (id) => { const el = document.getElementById(id); if(el) el.classList.remove('active'); };

    if(document.getElementById('openAddStationModalBtn')) {
        document.getElementById('openAddStationModalBtn').onclick = () => openModal('addStationModal');
    }

    if(document.getElementById('addStationForm')) {
        document.getElementById('addStationForm').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerText = t('saving');

            const formData = new FormData(e.target);
            const routeId = formData.get('route') || '';

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

            try {
                const zoneVal = formData.get('zone') || 'Central Zone';
                const latLongVal = `${latitude} & ${longitude}`;
                const codeVal = 'S-' + String(Math.floor(Math.random() * 900) + 100);

                const { data, error } = await supabase.from('stations').insert({
                    name: stationName.trim(),
                    latitude: latitude,
                    longitude: longitude,
                    latLong: latLongVal,
                    zone: zoneVal,
                    status: 'Active',
                    code: codeVal,
                    route_id: routeId
                });
                if (error) throw error;

                const newStation = data && data[0] ? data[0] : null;
                if (newStation) {
                    const newId = newStation.id;
                    localStorage.setItem('station_zone_' + newId, zoneVal);

                    // Link station to route via route_points
                    await supabase.from('route_points').insert({
                        route_id: routeId,
                        station_id: newId,
                        step_order: 1
                    });
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Station Added! ✅',
                    html: `<p style="margin:0; font-weight:600;">"${stationName}" added to the network.</p>
                           <p style="margin:5px 0 0 0; color:var(--text-muted);">Route ID: ${routeId}</p>`,
                    timer: 2500,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
                closeModal('addStationModal');
                e.target.reset();
                loadStations();
            } catch (err) {
                console.error('Add station error:', err);
                Swal.fire({ icon: 'error', title: 'Error!', text: `Failed to add station: ${err.message}`, background: 'var(--bg-card)', color: 'var(--text-main)' });
            } finally {
                btn.disabled = false;
                btn.innerText = 'Save Station';
            }
        };
    }

    if(stationTableBody) {
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
                            // Clear references to this station in routes and route_points
                            await Promise.all([
                                supabase.from('routes').update({ start_station_id: null }).eq('start_station_id', stationId),
                                supabase.from('routes').update({ end_station_id: null }).eq('end_station_id', stationId),
                                supabase.from('route_points').delete().eq('station_id', stationId)
                            ]);
                            await supabase.from('stations').delete().eq('id', stationId);
                            Swal.fire({ title: 'Deleted!', text: `"${stationName}" has been removed.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            loadStations();
                        } catch (err) {
                            Swal.fire({ title: 'Error!', text: `Could not delete station: ${err.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
                        }
                    }
                });
            }

            if (target.classList.contains('edit-station')) {
                const stationId = target.getAttribute('data-id');
                const st = stationsData.find(s => String(s.id) === String(stationId));
                if (!st) return;

                let routeOptionsHtml = `<option value="">None / Unassigned</option>`;
                Object.keys(routesMap).forEach(rId => {
                    const selected = String(st.routeId) === String(rId) ? 'selected' : '';
                    routeOptionsHtml += `<option value="${rId}" ${selected}>${routesMap[rId]} (Route #${rId})</option>`;
                });

                Swal.fire({
                    title: 'Modify Node Parameters',
                    html: `
                        <div style="margin-bottom:25px;">
                            <div style="width:70px; height:70px; background:rgba(59,130,246,0.1); border-radius:20px; display:flex; align-items:center; justify-content:center; color:#3b82f6; font-size:2rem; margin:0 auto 15px; border:1px solid rgba(59,130,246,0.2);">
                                <i class="fas fa-edit"></i>
                            </div>
                            <h3 style="margin:0; font-weight:900; color:var(--text-main); letter-spacing:-0.5px;">Station Configuration</h3>
                            <p style="margin:5px 0 0; font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:1px;">ID Reference: #...${stationId.slice(-8)}</p>
                        </div>

                        <div style="text-align:left; margin-bottom:18px;">
                            <label style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-left:5px; display:flex; align-items:center; gap:5px;">
                                <i class="fas fa-tag" style="color:#3b82f6;"></i> Station Name
                            </label>
                            <input id="swal-stName" class="swal2-input" value="${st.name}" style="margin-top:8px; width:100%; box-sizing:border-box; border-radius:12px; height:45px; font-weight:700;">
                        </div>

                        <div style="text-align:left; margin-bottom:18px;">
                            <label style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-left:5px; display:flex; align-items:center; gap:5px;">
                                <i class="fas fa-globe" style="color:#10b981;"></i> Regional Zone
                            </label>
                            <input id="swal-stZone" class="swal2-input" value="${st.zone}" style="margin-top:8px; width:100%; box-sizing:border-box; border-radius:12px; height:45px; font-weight:700;">
                        </div>

                        <div style="text-align:left; margin-bottom:18px;">
                            <label style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-left:5px; display:flex; align-items:center; gap:5px;">
                                <i class="fas fa-route" style="color:var(--primary-color);"></i> Assigned Route
                            </label>
                            <select id="swal-stRoute" class="swal2-input" style="margin-top:8px; width:100%; box-sizing:border-box; border-radius:12px; height:45px; font-weight:700; padding:0 10px; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border-color);">
                                ${routeOptionsHtml}
                            </select>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:10px;">
                            <div style="text-align:left;">
                                <label style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-left:5px; display:flex; align-items:center; gap:5px;">
                                    <i class="fas fa-location-crosshairs" style="color:#f59e0b;"></i> Latitude
                                </label>
                                <input id="swal-stLat" class="swal2-input" value="${st.lat}" style="margin-top:8px; width:100%; box-sizing:border-box; border-radius:12px; height:45px; font-weight:700; font-family:monospace;">
                            </div>
                            <div style="text-align:left;">
                                <label style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-left:5px; display:flex; align-items:center; gap:5px;">
                                    <i class="fas fa-location-crosshairs" style="color:#f59e0b;"></i> Longitude
                                </label>
                                <input id="swal-stLng" class="swal2-input" value="${st.lng}" style="margin-top:8px; width:100%; box-sizing:border-box; border-radius:12px; height:45px; font-weight:700; font-family:monospace;">
                            </div>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Save Changes',
                    confirmButtonColor: '#3b82f6',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    preConfirm: () => {
                        const name = document.getElementById('swal-stName').value;
                        const zone = document.getElementById('swal-stZone').value;
                        const lat = parseFloat(document.getElementById('swal-stLat').value);
                        const lng = parseFloat(document.getElementById('swal-stLng').value);
                        const routeId = document.getElementById('swal-stRoute').value;
                        if (!name || !zone || isNaN(lat) || isNaN(lng)) {
                            Swal.showValidationMessage('Please enter valid details');
                            return false;
                        }
                        return { name, zone, latitude: lat, longitude: lng, routeId };
                    }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            localStorage.setItem('station_zone_' + stationId, result.value.zone);
                            const latLongVal = `${result.value.latitude} & ${result.value.longitude}`;
                            const routeId = result.value.routeId || null;
                            
                            const { error } = await supabase.from('stations').update({
                                name: result.value.name,
                                latitude: result.value.latitude,
                                longitude: result.value.longitude,
                                latLong: latLongVal,
                                zone: result.value.zone,
                                route_id: routeId
                            }).eq('id', stationId);
                            if (error) throw error;

                            // Update route_points table
                            // 1. Delete old points for this station
                            await supabase.from('route_points').delete().eq('station_id', stationId);
                            
                            // 2. Insert new point if a route is assigned
                            if (routeId) {
                                await supabase.from('route_points').insert({
                                    route_id: routeId,
                                    station_id: stationId,
                                    step_order: 1
                                });
                            }

                            Swal.fire({ title: 'Success!', text: 'Station updated successfully.', icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            loadStations();
                        } catch (err) {
                            Swal.fire({ title: 'Error!', text: `Failed to update: ${err.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
                        }
                    }
                });
            }

            if (target.classList.contains('change-status-station')) {
                const stationId = target.getAttribute('data-id');
                const stationName = target.getAttribute('data-name') || 'Unknown Station';
                const currentStatus = target.getAttribute('data-status') || 'Active';

                Swal.fire({
                    title: 'Telemetry Configuration',
                    html: `
                        <div style="margin-bottom:25px;">
                            <div style="width:70px; height:70px; background:rgba(16,185,129,0.1); border-radius:20px; display:flex; align-items:center; justify-content:center; color:#10b981; font-size:2rem; margin:0 auto 15px; border:1px solid rgba(16,185,129,0.2);">
                                <i class="fas fa-tower-broadcast"></i>
                            </div>
                            <h3 style="margin:0; font-weight:900; color:var(--text-main); letter-spacing:-0.5px;">Node Signal State</h3>
                            <p style="margin:5px 0 0; font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:1px;">Target: ${stationName}</p>
                        </div>
                        <div style="text-align:left; margin-bottom:10px;">
                            <label style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-left:5px; display:flex; align-items:center; gap:5px;">
                                <i class="fas fa-signal" style="color:#10b981;"></i> Select New Broadcast Status
                            </label>
                        </div>
                    `,
                    input: 'select',
                    inputOptions: {
                        'Active': 'Active — Operating normally',
                        'Inactive': 'Inactive — Station closed',
                        'Maintenance': 'Maintenance — Under repair'
                    },
                    inputValue: currentStatus,
                    showCancelButton: true,
                    confirmButtonText: 'Update Signal',
                    confirmButtonColor: '#3b82f6',
                    cancelButtonColor: 'var(--text-muted)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    customClass: {
                        input: 'swal-custom-select'
                    },
                    inputValidator: (value) => {
                        if (!value) return 'Please select a status!';
                    }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        const newStatus = result.value;
                        try {
                            localStorage.setItem('station_status_' + stationId, newStatus);
                            await supabase.from('stations').update({
                                status: newStatus
                            }).eq('id', stationId);
                            Swal.fire({ title: 'Updated!', text: `Station status changed to "${newStatus}".`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            loadStations();
                        } catch (err) {
                            console.error('Update status error:', err);
                            Swal.fire({ 
                                title: 'Update Failed', 
                                html: `<p style="color:#ef4444; font-weight:700;">Database Error:</p><p style="color:var(--text-muted);">${err.message || 'The server rejected the change.'}</p>`,
                                icon: 'error', 
                                background: 'var(--bg-card)', 
                                color: 'var(--text-main)' 
                            });
                        }
                    }
                });
            }
        });
    }
});