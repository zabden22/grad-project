document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || localStorage.getItem('adminName') || 'Commander';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const adminPhoto = localStorage.getItem('adminProfilePhoto');
    if (adminPhoto && document.getElementById('topAvatar')) document.getElementById('topAvatar').src = adminPhoto;

    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    let routesData = [];
    const tbody = document.getElementById('routeTableBody');
    const searchInput = document.getElementById('routeSearchInput');
    const modal = document.getElementById('addRouteModal');
    const form = document.getElementById('addRouteForm');
    const stationCheckboxList = document.getElementById('routeStationCheckboxList');

    let dbStations = [];

    function getRouteColor(routeId, routeName) {
        const name = (routeName || String(routeId) || '').toLowerCase();
        if (name.includes('capital') || name.includes('عاصمة') || name.includes('العاصمة')) return '#14b8a6';
        if (name.includes('cairo') || name.includes('قاهرة') || String(routeId) === '8') return '#3b82f6';
        if (name.includes('badr') || name.includes('بدر') || String(routeId) === '13') return '#8b5cf6';
        if (name.includes('shorouk') || name.includes('shrouk') || name.includes('شروق') || String(routeId) === '9') return '#ef4444';
        if (name.includes('madinaty') || name.includes('مدينتي') || name.includes('مدينتى') || String(routeId) === '11') return '#f59e0b';

        if (name.includes('1')) return '#f43f5e';
        if (name.includes('2')) return '#8b5cf6';
        if (name.includes('3')) return '#3b82f6';
        if (name.includes('4')) return '#f59e0b';
        if (name.includes('5')) return '#10b981';
        return '#0ea5e9';
    }

    async function loadDbStations() {
        try {
            const { data, error } = await supabase.from('stations').select('*').order('created_at', { ascending: true });
            if (!error && data) {
                dbStations = data;
            }
        } catch (e) {
            console.error('Error loading stations', e);
        }
    }

    async function loadRoutes() {
        try {
            if (tbody && routesData.length === 0) {
                tbody.innerHTML = Array(5).fill('<tr><td colspan="7"><div class="skeleton" style="width:100%;height:35px;border-radius:8px;"></div></td></tr>').join('');
            }
            const { data, error } = await supabase.from('routes').select('*').order('id', { ascending: true });
            if (error) throw error;
            routesData = data || [];
            updateStats();
            filterRoutes();
        } catch (e) {
            console.error('Error loading routes', e);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>Failed to load routes from server.</td></tr>`;
        }
    }

    function updateStats() {
        const total = routesData.length;
        const active = routesData.filter(r => (r.status || 'Active').toLowerCase() === 'active').length;
        const inactive = total - active;
        let totalStations = 0;
        routesData.forEach(r => {
            const routeZone = (r.zone || '').toLowerCase().trim();
            const matched = dbStations.filter(s => (s.zone || '').toLowerCase().trim() === routeZone);
            totalStations += matched.length;
        });

        if (document.getElementById('rtStatTotal')) document.getElementById('rtStatTotal').innerText = total;
        if (document.getElementById('rtStatActive')) document.getElementById('rtStatActive').innerText = active;
        if (document.getElementById('rtStatInactive')) document.getElementById('rtStatInactive').innerText = inactive;
        if (document.getElementById('rtStatStations')) document.getElementById('rtStatStations').innerText = totalStations;
    }

    function filterRoutes() {
        const container = document.getElementById('routeZonesContainer');
        if (!container) return;
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        let filtered = routesData;
        if (query) {
            filtered = routesData.filter(r =>
                (r.name || '').toLowerCase().includes(query) ||
                (String(r.id)).includes(query) ||
                (r.zone || '').toLowerCase().includes(query)
            );
        }

        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = `<div class="v-card" style="text-align:center;padding:60px;color:var(--text-muted);"><i class="fas fa-route" style="font-size:3rem; margin-bottom:15px; display:block; opacity:0.3;"></i><h3 style="font-weight:900;">No routes found.</h3></div>`;
            return;
        }

        // Group routes by zone
        const zones = {};
        filtered.forEach(rt => {
            const zoneName = rt.zone || 'Central Zone';
            if (!zones[zoneName]) zones[zoneName] = [];
            zones[zoneName].push(rt);
        });

        Object.keys(zones).forEach((zoneName, zIndex) => {
            const zoneRoutes = zones[zoneName];

            // Create Zone Accordion Wrapper
            const zoneWrapper = document.createElement('div');
            zoneWrapper.style.cssText = `background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 24px; overflow: hidden; box-shadow: var(--card-shadow); transition: 0.3s;`;

            // Zone Header
            const zoneHeader = document.createElement('div');
            zoneHeader.style.cssText = `padding: 24px 30px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: rgba(16, 185, 129, 0.03);`;
            zoneHeader.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(16, 185, 129, 0.1); color: var(--primary-color); display:flex; align-items:center; justify-content:center; font-size:1.4rem;"><i class="fas fa-map-marked-alt"></i></div>
                    <div>
                        <h2 style="margin:0; font-weight:900; font-size:1.6rem; color:var(--text-main);">${zoneName}</h2>
                        <p style="margin:4px 0 0; color:var(--text-muted); font-weight:700; font-size:0.85rem;">${zoneRoutes.length} Active Routes</p>
                    </div>
                </div>
                <i class="fas fa-chevron-down" style="font-size:1.5rem; color:var(--text-muted); transition:0.3s;" id="chevron-${zIndex}"></i>
            `;

            // Zone Content (Routes Grid)
            const zoneContent = document.createElement('div');
            zoneContent.id = `zoneContent-${zIndex}`;
            zoneContent.style.cssText = `display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; padding: 24px 30px; border-top: 1px solid var(--border-color);`;

            // Render Route Cards inside the zone
            zoneRoutes.forEach(rt => {
                const routeName = rt.name || "General Route";
                const color = getRouteColor(rt.id, routeName);
                const stationsArr = dbStations.filter(s => (s.zone || '').toLowerCase().trim() === zoneName.toLowerCase().trim()).map(s => s.name);
                const numStations = stationsArr.length;

                // Mock progress for UI visual fidelity as requested
                const mockProgress = Math.floor(Math.random() * 40) + 20;

                const routeCard = document.createElement('div');
                routeCard.style.cssText = `background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 20px; padding: 24px; position:relative; overflow:hidden; transition: 0.3s;`;
                routeCard.onmouseover = () => { routeCard.style.borderColor = color; routeCard.style.boxShadow = `0 10px 25px ${color}20`; routeCard.style.transform = 'translateY(-3px)'; };
                routeCard.onmouseout = () => { routeCard.style.borderColor = 'var(--border-color)'; routeCard.style.boxShadow = 'none'; routeCard.style.transform = 'translateY(0)'; };

                const isShrouk = routeName.toLowerCase().includes('shrouk') || routeName.toLowerCase().includes('shorouk') || routeName.includes('شروق');
                const isMadinaty = routeName.toLowerCase().includes('madinat') || routeName.includes('مدينت');
                
                let pillTextColor = color;
                if (isShrouk) pillTextColor = '#ff0000';
                else if (isMadinaty) pillTextColor = '#f59e0b';

                const stationsHtml = stationsArr.length > 0 
                    ? stationsArr.map(s => `<span style="background:${color}10; border:1px solid ${color}30; padding:6px 14px; border-radius:12px; font-size:0.8rem; font-weight:900; color:${pillTextColor} !important; display:inline-flex; align-items:center; gap:6px;"><i class="fas fa-map-pin" style="color:${pillTextColor}; opacity:0.9;"></i> ${s}</span>`).join('')
                    : `<span style="color:var(--text-muted); font-size:0.8rem; font-weight:700; font-style:italic;">No stations mapped yet.</span>`;

                routeCard.innerHTML = `
                    <div style="position:absolute; top:0; left:0; width:6px; height:100%; background:${color};"></div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; padding-left:10px;">
                        <div style="display:flex; gap:15px; align-items:center;">
                            <div style="width: 50px; height: 50px; border-radius: 12px; background: ${color}15; color: ${color}; display:flex; align-items:center; justify-content:center; font-size:1.3rem;">
                                <i class="fas fa-cog"></i>
                            </div>
                            <div>
                                <h3 style="margin:0; font-weight:900; font-size:1.3rem; color:${color};">${routeName}</h3>
                                <p style="margin:2px 0 0; color:var(--text-muted); font-weight:700; font-size:0.9rem;">${numStations} stations</p>
                            </div>
                        </div>
                        <div style="font-size:1.6rem; font-weight:900; color:${color};">${mockProgress}%</div>
                    </div>
                    
                    <div style="width:100%; height:4px; background:var(--border-color); border-radius:4px; margin-bottom:20px; overflow:hidden; margin-left:10px; width:calc(100% - 10px);">
                        <div style="width:${mockProgress}%; height:100%; background:${color}; border-radius:4px;"></div>
                    </div>
                    
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-left:10px;">
                        ${stationsHtml}
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-top:20px; margin-left:10px; padding-top:15px; border-top:1px solid var(--border-color);">
                        <button onclick="window.editRoute('${rt.id}')" style="background:transparent; border:none; color:#3b82f6; font-weight:800; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:6px;"><i class="fas fa-sliders-h"></i> Configure</button>
                        <button onclick="window.deleteRoute('${rt.id}')" style="background:transparent; border:none; color:#ef4444; font-weight:800; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:6px;"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                `;
                zoneContent.appendChild(routeCard);
            });

            zoneHeader.onclick = () => {
                const isHidden = zoneContent.style.display === 'none';
                zoneContent.style.display = isHidden ? 'grid' : 'none';
                zoneHeader.style.background = isHidden ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-card)';
                document.getElementById(`chevron-${zIndex}`).style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
            };

            zoneWrapper.appendChild(zoneHeader);
            zoneWrapper.appendChild(zoneContent);
            container.appendChild(zoneWrapper);
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterRoutes);

    window.openAddRouteModal = async () => {
        if (modal) modal.classList.add('active');
    };

    window.closeAddRouteModal = () => {
        if (modal) modal.classList.remove('active');
        if (form) form.reset();
    };

    window.viewAllStations = (routeName, encodedArr) => {
        const arr = JSON.parse(decodeURIComponent(encodedArr));
        const html = arr.map((s, i) => `<div style="text-align:left; padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-main); font-weight:600;"><span style="color:var(--primary-color); font-weight:900; margin-right:10px;">${i + 1}.</span> ${s}</div>`).join('');
        Swal.fire({
            title: `<i class="fas fa-route" style="color:#3b82f6; margin-right:10px;"></i> ${routeName} Stations`,
            html: `<div style="max-height:300px; overflow-y:auto; margin-top:15px; border:1px solid var(--border-color); border-radius:12px; padding:5px;">${html}</div>`,
            confirmButtonText: 'Close',
            confirmButtonColor: '#3b82f6',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });
    };

    window.saveRoute = async () => {
        const rId = document.getElementById('routeNumber').value.trim();
        const rName = document.getElementById('routeName').value.trim();
        const rZone = document.getElementById('routeZone').value;

        if (!rId || !rName) {
            Swal.fire({ title: 'Missing Info', text: 'Please enter both ID and Name.', icon: 'warning', background: 'var(--bg-card)', color: 'var(--text-main)' });
            return;
        }

        try {
            const { error } = await supabase.from('routes').insert({
                id: parseInt(rId),
                name: rName,
                zone: rZone
            });
            if (error) throw error;

            Swal.fire({ icon: 'success', title: 'Route Added! ✅', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
            closeModal('addRouteModal');
            loadRoutes();
        } catch (e) {
            console.error(e);
            Swal.fire({ title: 'Error', text: `Could not add route: ${e.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
        }
    };

    window.editRoute = async (id) => {
        const rt = routesData.find(r => String(r.id) === String(id));
        if (!rt) return;

        const routeZone = (rt.zone || '').toLowerCase().trim();
        const existingStations = dbStations.filter(s => (s.zone || '').toLowerCase().trim() === routeZone).map(s => s.name);

        const { value: formValues } = await Swal.fire({
            title: 'Edit Route',
            html: `
                <div style="text-align:left; margin-bottom:10px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Route Name</label>
                    <input id="swal-rName" class="swal2-input" value="${rt.name || ''}" style="margin-top:5px;">
                </div>
                <div style="text-align:left; margin-bottom:10px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Zone</label>
                    <input id="swal-rZone" class="swal2-input" value="${rt.zone || 'Central Zone'}" style="margin-top:5px;">
                </div>
                <div style="text-align:left; margin-bottom:10px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Stations</label>
                    <div style="margin-top:5px; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; font-size:0.9rem; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:5px;">
                        ${existingStations.length > 0 ? existingStations.map(s => `<span class="station-pill">${s}</span>`).join('') : 'No stations linked. Add them from the Stations page.'}
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#3b82f6',
            background: 'var(--bg-card)', color: 'var(--text-main)',
            preConfirm: () => {
                return {
                    name: document.getElementById('swal-rName').value,
                    zone: document.getElementById('swal-rZone').value
                };
            }
        });

        if (formValues) {
            try {
                const { error } = await supabase.from('routes').eq('id', id).update(formValues);
                if (error) throw error;
                Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                loadRoutes();
            } catch (e) {
                Swal.fire({ title: 'Error', text: 'Could not update route', icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        }
    };

    window.deleteRoute = async (id) => {
        const rt = routesData.find(r => String(r.id) === String(id));
        const routeName = rt ? rt.name : `Route #${id}`;

        const res = await Swal.fire({
            title: 'Delete Route?',
            html: `<p style="color:#ef4444; font-weight:700;">⚠ Are you sure you want to delete <strong>${routeName}</strong>?</p><p style="color:var(--text-muted);">This action cannot be undone.</p>`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: 'Yes, delete it!',
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });

        if (res.isConfirmed) {
            try {
                const { error } = await supabase.from('routes').eq('id', id).delete();
                if (error) throw error;
                Swal.fire({ icon: 'success', title: 'Deleted!', text: `${routeName} has been removed.`, timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                loadRoutes();
            } catch (e) {
                Swal.fire({ title: 'Error', text: `Could not delete route: ${e.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        }
    };

    loadDbStations().then(() => loadRoutes());

    if (window.supabaseAuth) {
        window.supabaseAuth.channel('routes_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, (payload) => {
                loadRoutes();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, (payload) => {
                loadDbStations().then(() => loadRoutes());
            })
            .subscribe();
    }
});
