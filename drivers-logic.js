document.addEventListener('DOMContentLoaded', () => {
    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
    if (!isSuperAdmin) {
        const addBtn = document.getElementById('openAddDriverModalBtn');
        const assignBtn = document.getElementById('openAssignModalBtn');
        const dpEditBtn = document.getElementById('dpEditBtn');
        const dpEditPhoto = document.querySelector('label[for="dpEditPhotoInput"]');
        if (addBtn) addBtn.style.display = 'none';
        if (assignBtn) assignBtn.style.display = 'none';
        if (dpEditBtn) dpEditBtn.style.display = 'none';
        if (dpEditPhoto) dpEditPhoto.style.display = 'none';
    }
    
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    
    window.driversData = [];
    window.busesData   = [];
    window.routesData  = [];
    window.currentViewingDriverId = null;

    
    window.getRouteColor = function(routeId) {
        if (!routeId) return '#0ea5e9';
        const routeObj = window.routesData.find(r => String(r.id) === String(routeId));
        const name = routeObj ? (routeObj.name || '').toLowerCase() : String(routeId).toLowerCase();

        if (name.includes('capital') || name.includes('عاصمة') || name.includes('العاصمة')) return '#14b8a6';
        if (name.includes('cairo') || name.includes('قاهرة')) return '#3b82f6';
        if (name.includes('badr') || name.includes('بدر') || String(routeId) === 'ba494dc9-7d4b-4c6d-b37e-0ffbd47f7014') return '#8b5cf6';
        if (name.includes('shorouk') || name.includes('shrouk') || name.includes('شروق') || String(routeId) === '9d9f642d-31cd-4cb1-ae7e-daf930983bcf') return '#ef4444';
        if (name.includes('madinaty') || name.includes('madinty') || name.includes('مدينتي') || name.includes('مدينتى') || String(routeId) === 'e8cd6c96-8f89-474d-b86f-fb0c9efd990f') return '#f59e0b';
        
        if (name.includes('1')) return '#f43f5e';
        if (name.includes('2')) return '#8b5cf6';
        if (name.includes('3')) return '#3b82f6';
        if (name.includes('4')) return '#f59e0b';
        if (name.includes('5')) return '#10b981';
        
        return '#0ea5e9';
    };

    
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
            window.busesData.filter(b => {
                // Check if bus is not currently linked in active shifts
                const isAssigned = window.driversData.some(d => String(d.busId) === String(b.id));
                return !isAssigned;
            }).forEach(b => {
                busSel.innerHTML += `<option value="${b.id}">B-${b.plate_number || b.id.substring(0, 5).toUpperCase()}</option>`;
            });
        }
    };

    
    window.loadDrivers = async function(silent = false) {
        const tbody = document.getElementById('driverTableBody');
        if(!tbody) return;

        try {
            if (!silent) {
                tbody.innerHTML = Array(5).fill('<tr><td colspan="7"><div class="skeleton" style="width:100%;height:35px;border-radius:8px;"></div></td></tr>').join('');
            }

            const [bRes, rRes, shRes, trRes, drRes] = await Promise.all([
                supabase.from('buses').select('*'),
                supabase.from('routes').select('*'),
                supabase.from('shifts').select('*').is('end_time', null),
                supabase.from('trips').select('*').is('end_time', null),
                supabase.from('drivers').select('*').order('created_at', { ascending: false })
            ]);

            if (drRes.error) throw drRes.error;

            window.busesData = bRes.data || [];
            window.routesData = rRes.data || [];
            const shifts = shRes.data || [];
            const trips = trRes.data || [];

            window.driversData = (drRes.data || []).map(d => {
                const activeShift = shifts.find(s => s.driver_id === d.id);
                const busId = activeShift ? activeShift.bus_id : null;
                const busObj = busId ? window.busesData.find(b => b.id === busId) : null;
                
                const activeTrip = busId ? trips.find(t => t.bus_id === busId) : null;
                const routeId = activeTrip ? activeTrip.route_id : null;
                const routeObj = routeId ? window.routesData.find(r => r.id === routeId) : null;

                const cachedEmail = d.email || localStorage.getItem('driver_email_' + d.id) || (d.name.toLowerCase().replace(/\s+/g, '') + '@transitway.com');
                const cachedLicense = d.license_number || d.license || localStorage.getItem('driver_license_' + d.id) || ('LNC-' + d.id.substring(0, 4).toUpperCase());
                const cachedStatus = d.status || localStorage.getItem('driver_status_' + d.id) || 'Active';
                const cachedPhoto = d.photo || null;

                return {
                    id: d.id,
                    name: d.name || d.full_name || 'Personnel Candidate',
                    license: cachedLicense,
                    phone: d.phone || d.phone_number || '—',
                    email: cachedEmail,
                    photo_url: cachedPhoto,
                    busId: busId,
                    busObj: busObj,
                    routeObj: routeObj,
                    status: cachedStatus
                };
            });

            window.renderDriverTable();

        } catch (err) {
            console.error('Personnel Error:', err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:60px; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:2.5rem;"></i><p style="font-weight:900; margin-top:15px;">Personnel Intelligence Offline</p></td></tr>`;
        }
    };

    let currentFilter = 'all';

    window.renderDriverTable = function(list = window.driversData) {
        const tbody = document.getElementById('driverTableBody');
        if(!tbody) return;

        if (document.getElementById('sumTotalDrivers')) document.getElementById('sumTotalDrivers').textContent = window.driversData.length;
        if (document.getElementById('sumActiveDrivers')) document.getElementById('sumActiveDrivers').textContent = window.driversData.filter(d => (d.status || '').toLowerCase() === 'active').length;
        if (document.getElementById('sumOnDutyDrivers')) document.getElementById('sumOnDutyDrivers').textContent = window.driversData.filter(d => d.busId).length;
        if (document.getElementById('sumUnassignedDrivers')) document.getElementById('sumUnassignedDrivers').textContent = window.driversData.filter(d => !d.busId).length;

        let filteredList = list;
        if (currentFilter === 'active') filteredList = list.filter(d => (d.status || '').toLowerCase() === 'active');
        else if (currentFilter === 'inactive') filteredList = list.filter(d => (d.status || '').toLowerCase() !== 'active');
        else if (currentFilter === 'onduty') filteredList = list.filter(d => d.busId);
        else if (currentFilter === 'standby') filteredList = list.filter(d => !d.busId);

        if (filteredList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:80px; color:var(--text-muted); font-weight:800;"><i class="fas fa-user-astronaut" style="font-size:4rem; display:block; margin-bottom:20px; opacity:0.2;"></i>No personnel detected.<br><button class="btn-primary" style="margin-top:20px; padding:10px 25px;" onclick="window.openModal('addDriverModal')"><i class="fas fa-plus"></i> Register</button></td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        filteredList.forEach((driver, index) => {
            const serialNum = String(index + 1).padStart(4, '0');
            const isActive  = (driver.status || '').toLowerCase() === 'active';
            const statusBadge = isActive ? `<span class="status-badge status-active"><div class="pulse-dot"></div> OPERATIONAL</span>` : `<span class="status-badge status-inactive">STANDBY</span>`;
            const busColor = driver.busObj ? window.getRouteColor(driver.routeObj?.id) : 'var(--text-muted)';
            const busBadge = driver.busObj ? `<div class="bus-badge-cell" style="color:${busColor}; border-color:${busColor}40;">B-${driver.busObj.plate_number || driver.busObj.id.substring(0, 5).toUpperCase()}</div>` : `<span style="opacity:0.5;">Unlinked</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${driver.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=568e74&color=fff`}" style="width:40px; height:40px; border-radius:12px; object-fit:cover;">
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
                        ${isSuperAdmin ? `
                        <button class="btn-action" onclick="window.toggleStatus('${driver.id}')"><i class="fas fa-shield-alt" style="color:${isActive ? '#10b981' : 'var(--text-muted)'};"></i></button>
                        ${driver.busId ? `<button class="btn-action" onclick="window.unassign('${driver.id}')"><i class="fas fa-unlink" style="color:#f59e0b;"></i></button>` : ''}
                        <button class="btn-action" onclick="window.deleteDriver('${driver.id}', '${driver.name}')" style="color:#ef4444;"><i class="fas fa-user-minus"></i></button>
                        ` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const h3 = card.querySelector('h3');
            if (!h3) return;
            const id = h3.id;
            
            statCards.forEach(c => c.style.border = '1px solid var(--border-color)');
            card.style.border = '1px solid var(--primary-color)';
            
            if (id === 'sumTotalDrivers') currentFilter = 'all';
            else if (id === 'sumActiveDrivers') currentFilter = 'active';
            else if (id === 'sumOnDutyDrivers') currentFilter = 'onduty';
            else if (id === 'sumUnassignedDrivers') currentFilter = 'standby';
            
            const sInput = document.getElementById('driverSearchInput');
            const query = sInput ? sInput.value.toLowerCase().trim() : '';
            const filtered = window.driversData.filter(d => d.name.toLowerCase().includes(query) || d.license.toLowerCase().includes(query));
            window.renderDriverTable(filtered);
        });
    });

    
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
            const { data: tickets, error } = await supabase.from('tickets').select('*').eq('trip_id', driver.busId).order('created_at', { ascending: false }).limit(20);
            
            if(tripBody) {
                if(!tickets || tickets.length === 0) {
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

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const today = new Date().getDay();
            const labels = [];
            for(let i=6; i>=0; i--) labels.push(days[(today - i + 7) % 7]);

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
        if(avatar) avatar.src = driver.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=568e74&color=fff`;
        
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
            if(busNumber) busNumber.innerText = `B-${driver.busObj.id.substring(0, 5).toUpperCase()}`;
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

    
    window.toggleStatus = async (id) => {
        const drv = window.driversData.find(d => d.id == id);
        if(!drv) return;
        const newStatus = drv.status === 'Active' ? 'Inactive' : 'Active';
        try {
            localStorage.setItem('driver_status_' + id, newStatus);
            await supabase.from('drivers').update({ status: newStatus }).eq('id', id);
            Swal.fire({ icon: 'success', title: 'Status Overridden', timer: 1000, showConfirmButton: false });
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
                const busId = drv.busId;
                const { data: activeShifts } = await supabase.from('shifts').select('id').eq('driver_id', id).is('end_time', null).limit(1);
                if (activeShifts && activeShifts[0]) {
                    await supabase.from('shifts').update({ end_time: new Date().toISOString() }).eq('id', activeShifts[0].id);
                }
                
                // Clear references in drivers and buses tables for mobile app compatibility
                await Promise.all([
                    supabase.from('drivers').update({ busId: null, current_bus_id: null }).eq('id', id),
                    supabase.from('buses').update({ driver_id: null }).eq('id', busId)
                ]);

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
                // Clear references in buses, trips and delete shifts
                await Promise.all([
                    supabase.from('buses').update({ driver_id: null }).eq('driver_id', id),
                    supabase.from('trips').update({ driver_id: null }).eq('driver_id', id),
                    supabase.from('shifts').delete().eq('driver_id', id)
                ]);
                await supabase.from('drivers').delete().eq('id', id);
                Swal.fire({ icon: 'success', title: 'Purged', timer: 1000, showConfirmButton: false });
                window.loadDrivers();
            } catch(e) { Swal.fire('Error', e.message, 'error'); }
        }
    };

    
    const dpPhotoInput = document.getElementById('dpEditPhotoInput');
    if(dpPhotoInput) {
        dpPhotoInput.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file || !window.currentViewingDriverId) return;
            try {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const base64 = ev.target.result;
                    // Photo saved to DB only - not localStorage (quota issues)
                    await supabase.from('drivers').update({ photo: base64 }).eq('id', window.currentViewingDriverId);
                    Swal.fire({ icon: 'success', title: 'Portrait Updated', timer: 1000, showConfirmButton: false });
                    window.loadDrivers(true);
                    if(document.getElementById('dpAvatar')) document.getElementById('dpAvatar').src = base64;
                };
                reader.readAsDataURL(file);
            } catch(err) { Swal.fire('Error', err.message, 'error'); }
        };
    }

    
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
        const photoInput = document.getElementById('addDriverPhoto');
        const photoLabel = document.getElementById('addDriverPhotoLabel');
        if (photoInput && photoLabel) {
            photoInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) photoLabel.innerText = file.name;
            };
        }

        addForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true; btn.innerText = "Registering...";
            
            const name = document.getElementById('addDriverName').value;
            const email = document.getElementById('addDriverEmail').value;
            const phone = document.getElementById('addDriverPhone').value;
            const license = document.getElementById('addDriverLicense').value;
            const password = document.getElementById('addDriverPassword').value;
            const file = photoInput?.files[0];

            try {
                let photoBase64 = null;
                if (file) {
                    photoBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => resolve(ev.target.result);
                        reader.readAsDataURL(file);
                    });
                }

                const { data, error } = await supabase.from('drivers').insert({
                    name: name,
                    full_name: name,
                    phone: phone,
                    phone_number: phone,
                    email: email,
                    license_number: license,
                    password: password,
                    status: 'Active',
                    photo: photoBase64
                });
                if (error) throw error;

                const newDriver = data && data[0] ? data[0] : null;
                if (newDriver) {
                    const drvId = newDriver.id;
                    localStorage.setItem('driver_email_' + drvId, email);
                    localStorage.setItem('driver_license_' + drvId, license);
                    localStorage.setItem('driver_status_' + drvId, 'Active');
                }

                Swal.fire({ icon: 'success', title: 'Registered!', timer: 1500, showConfirmButton: false });
                window.closeModal('addDriverModal');
                e.target.reset();
                if (photoLabel) photoLabel.innerText = "Upload High-Res Portrait";
                window.loadDrivers();
            } catch(err) { 
                Swal.fire('Error', err.message, 'error'); 
            } finally { 
                btn.disabled = false; btn.innerText = "Register & Link"; 
            }
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
                await supabase.from('shifts').insert({
                    driver_id: dId,
                    bus_id: bId,
                    start_time: new Date().toISOString()
                });
                
                // Update references in drivers and buses tables for mobile app compatibility
                await Promise.all([
                    supabase.from('drivers').update({ busId: bId, current_bus_id: bId }).eq('id', dId),
                    supabase.from('buses').update({ driver_id: dId }).eq('id', bId)
                ]);

                Swal.fire({ icon: 'success', title: 'Established', timer: 1000, showConfirmButton: false });
                window.closeModal('assignModal');
                window.loadDrivers();
            } catch(err) { Swal.fire('Error', err.message, 'error'); }
        };
    }

    const editBtn = document.getElementById('dpEditBtn');
    if (editBtn) {
        editBtn.onclick = () => {
            if (!window.currentViewingDriverId) return;
            const driver = window.driversData.find(d => d.id == window.currentViewingDriverId);
            if (!driver) return;
            
            document.getElementById('editDriverId').value = driver.id;
            document.getElementById('editDriverName').value = driver.name;
            document.getElementById('editDriverEmail').value = driver.email;
            document.getElementById('editDriverPhone').value = driver.phone;
            document.getElementById('editDriverLicense').value = driver.license;
            document.getElementById('editDriverPassword').value = ''; // empty by default
            
            window.closeModal('driverProfileModal');
            window.openModal('editDriverModal');
        };
    }

    const editForm = document.getElementById('editDriverForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('editDriverId').value;
            const name = document.getElementById('editDriverName').value;
            const email = document.getElementById('editDriverEmail').value;
            const phone = document.getElementById('editDriverPhone').value;
            const license = document.getElementById('editDriverLicense').value;
            const password = document.getElementById('editDriverPassword').value;

            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true; btn.innerText = "Saving...";

            try {
                const updatePayload = {
                    name: name,
                    full_name: name,
                    phone: phone,
                    phone_number: phone,
                    email: email,
                    license_number: license
                };
                if (password.trim() !== '') {
                    updatePayload.password = password;
                }

                const { error } = await supabase.from('drivers').update(updatePayload).eq('id', id);
                if (error) throw error;

                localStorage.setItem('driver_email_' + id, email);
                localStorage.setItem('driver_license_' + id, license);

                Swal.fire({ icon: 'success', title: 'Details Updated!', timer: 1500, showConfirmButton: false });
                window.closeModal('editDriverModal');
                window.loadDrivers();
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            } finally {
                btn.disabled = false; btn.innerText = "Save Changes";
            }
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

    if (window.supabaseAuth) {
        window.supabaseAuth.channel('drivers_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
                window.loadDrivers(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
                window.loadDrivers(true);
            })
            .subscribe();
    }
});