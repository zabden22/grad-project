document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    let routesData = [];
    const tbody = document.getElementById('routeTableBody');
    const searchInput = document.getElementById('routeSearchInput');
    const modal = document.getElementById('addRouteModal');
    const form = document.getElementById('addRouteForm');
    const stationCheckboxList = document.getElementById('routeStationCheckboxList');

    let dbStations = [];

    async function loadDbStations() {
        try {
            const { data, error } = await supabase.from('stations').select('*').order('created_at', { ascending: true });
            if (!error && data) {
                dbStations = data;
            }
        } catch(e) {
            console.error('Error loading stations', e);
        }
    }

    async function loadRoutes() {
        try {
            if (tbody && routesData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>Loading routes...</td></tr>`;
            }
            const { data, error } = await supabase.from('routes').select('*').order('id', { ascending: true });
            if (error) throw error;
            routesData = data || [];
            updateStats();
            filterRoutes();
        } catch(e) {
            console.error('Error loading routes', e);
            if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>Failed to load routes from server.</td></tr>`;
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

        if(document.getElementById('rtStatTotal')) document.getElementById('rtStatTotal').innerText = total;
        if(document.getElementById('rtStatActive')) document.getElementById('rtStatActive').innerText = active;
        if(document.getElementById('rtStatInactive')) document.getElementById('rtStatInactive').innerText = inactive;
        if(document.getElementById('rtStatStations')) document.getElementById('rtStatStations').innerText = totalStations;
    }

    function filterRoutes() {
        if(!tbody) return;
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        let filtered = routesData;
        if(query) {
            filtered = routesData.filter(r => 
                (r.name || '').toLowerCase().includes(query) ||
                (String(r.id)).includes(query) ||
                (r.zone || '').toLowerCase().includes(query)
            );
        }

        tbody.innerHTML = '';
        if(filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-route" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>No routes found.</td></tr>`;
            return;
        }

        filtered.forEach((rt, index) => {
            const serialNum = String(index + 1).padStart(4, '0');
            const tr = document.createElement('tr');
            const isActive = (rt.status || 'Active').toLowerCase() === 'active';
            const stBadge = isActive 
                ? `<span class="status active" style="background: rgba(34, 197, 94, 0.1); color: #22c55e; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Active</span>` 
                : `<span class="status inactive" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Offline</span>`;

            let color = "var(--primary-color)";
            let routeName = rt.name || "General Route";
            if (routeName.toLowerCase().includes('blue')) color = "#3b82f6";
            else if (routeName.toLowerCase().includes('orange')) color = "#f59e0b";
            else if (routeName.toLowerCase().includes('green')) color = "#10b981";

            const routeZone = (rt.zone || '').toLowerCase().trim();
            const stationsArr = dbStations.filter(s => (s.zone || '').toLowerCase().trim() === routeZone).map(s => s.name);

            let stationsHtml = stationsArr.slice(0, 3).map(s => `<span class="station-pill"><i class="fas fa-map-pin"></i> ${s}</span>`).join('');
            if (stationsArr.length > 3) {
                stationsHtml += `<span class="station-pill" style="background:rgba(59,130,246,0.1);color:#3b82f6;">+${stationsArr.length - 3} more</span>`;
            }

            tr.innerHTML = `
                <td style="font-family: monospace; font-weight:bold; color:var(--text-main); font-size: 1.05rem;" data-id="${rt.id}">#${serialNum}</td>
                <td><span class="route-num-badge"><i class="fas fa-bus-alt"></i> R${rt.id}</span></td>
                <td><span style="background:${color}15; color:${color}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:0.85rem; border: 1px solid ${color}30;">${routeName}</span></td>
                <td style="font-weight:700; color:var(--text-muted);">${rt.zone || 'Central Zone'}</td>
                <td>
                    <div class="station-pills-wrap">
                        ${stationsHtml || '<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">No stations defined</span>'}
                    </div>
                </td>
                <td>${stBadge}</td>
                <td>
                    <i class="fas fa-pen edit-btn" style="color:#3b82f6; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;" title="Edit Route" onclick="window.editRoute('${rt.id}')" onmouseover="this.style.filter='brightness(0.7)'" onmouseout="this.style.filter='brightness(1)'"></i>
                    <i class="fas fa-trash-alt del-btn" style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;" title="Delete Route" onclick="window.deleteRoute('${rt.id}')" onmouseover="this.style.filter='brightness(0.7)'" onmouseout="this.style.filter='brightness(1)'"></i>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    if(searchInput) searchInput.addEventListener('input', filterRoutes);

    window.openAddRouteModal = async () => {
        if(modal) modal.classList.add('active');
    };

    window.closeAddRouteModal = () => {
        if(modal) modal.classList.remove('active');
        if(form) form.reset();
    };

    // Override the inline openModal and closeModal from HTML for this page
    window.openModal = window.openAddRouteModal;
    window.closeModal = window.closeAddRouteModal;

    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.innerText = "Processing..."; }

            const rId = document.getElementById('routeNumberInput').value.trim();
            const rName = document.getElementById('routeNameInput').value.trim();
            
            try {
                const { error } = await supabase.from('routes').insert({
                    id: parseInt(rId),
                    name: rName,
                    status: 'Active',
                    zone: 'Central Zone' // Default
                });
                if(error) throw error;

                Swal.fire({icon: 'success', title: 'Route Added! ✅', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)'});
                closeAddRouteModal();
                loadRoutes();
            } catch(e) {
                console.error(e);
                Swal.fire({ title: 'Error', text: `Could not add route: ${e.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
            } finally {
                if (btn) { btn.disabled = false; btn.innerText = "Define Route"; }
            }
        });
    }

    window.editRoute = async (id) => {
        const rt = routesData.find(r => String(r.id) === String(id));
        if(!rt) return;

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
                <div style="text-align:left;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Status</label>
                    <select id="swal-rStatus" class="swal2-select" style="margin-top:5px;">
                        <option value="Active" ${rt.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Offline" ${rt.status === 'Offline' ? 'selected' : ''}>Offline</option>
                    </select>
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
                    zone: document.getElementById('swal-rZone').value,
                    status: document.getElementById('swal-rStatus').value
                };
            }
        });

        if(formValues) {
            try {
                const { error } = await supabase.from('routes').eq('id', id).update(formValues);
                if(error) throw error;
                Swal.fire({icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)'});
                loadRoutes();
            } catch(e) {
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

        if(res.isConfirmed) {
            try {
                const { error } = await supabase.from('routes').eq('id', id).delete();
                if(error) throw error;
                Swal.fire({icon: 'success', title: 'Deleted!', text: `${routeName} has been removed.`, timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)'});
                loadRoutes();
            } catch(e) {
                Swal.fire({ title: 'Error', text: `Could not delete route: ${e.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        }
    };

    loadDbStations().then(() => loadRoutes());
    setInterval(() => {
        loadDbStations().then(() => loadRoutes(true));
    }, 15000);
});
