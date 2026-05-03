document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const ticketTableBody = document.getElementById('ticketTableBody');
    const searchInput = document.getElementById('ticketSearchInput');

    let ticketsData = [];
    let usersMap = {};
    let routesMap = {};
    let busesMap = {};
    let calendarInstance = null;
    let dateFrom = null, dateTo = null;

    const routeColors = {
        'cairo': '#3b82f6',    // Blue
        'badr': '#8b5cf6',     // Purple
        'shorouk': '#ef4444',  // Red
        'madinaty': '#f59e0b', // Orange
        'default': '#10b981'   // Default Green
    };

    function getRouteColor(routeName) {
        if (!routeName) return '#3b82f6';
        const str = routeName.toString().toLowerCase();
        if (str.includes('capital') || str.includes('عاصمة') || str.includes('العاصمة')) return '#14b8a6';
        if (str.includes('cairo') || str.includes('قاهرة')) return '#3b82f6';
        if (str.includes('badr') || str.includes('بدر')) return '#8b5cf6';
        if (str.includes('shorouk') || str.includes('shrouk') || str.includes('شروق')) return '#ef4444';
        if (str.includes('madinaty') || str.includes('مدينتي') || str.includes('مدينتى')) return '#f59e0b';
        if (str.includes('1')) return '#f43f5e';
        if (str.includes('2')) return '#8b5cf6';
        if (str.includes('3')) return '#3b82f6';
        if (str.includes('4')) return '#f59e0b';
        if (str.includes('5')) return '#10b981';
        return '#0ea5e9';
    }

    async function loadData() {
        const ticketTableBody = document.getElementById('ticketTableBody');
        if (ticketTableBody) {
            ticketTableBody.innerHTML = Array(5).fill('<tr><td colspan="7"><div class="skeleton" style="width:100%;height:35px;border-radius:8px;"></div></td></tr>').join('');
        }
        try {

            const [tRes, uRes, rRes, bRes] = await Promise.all([
                supabase.from('tickets').select('*').order('created_at', { ascending: false }),
                supabase.from('users').select('id, full_name'),
                supabase.from('routes').select('id, name, price'),
                supabase.from('buses').select('id, plate_number')
            ]);

            if (tRes.error) throw tRes.error;

            if (uRes.data) uRes.data.forEach(u => usersMap[u.id] = u.full_name);
            if (rRes.data) rRes.data.forEach(r => routesMap[r.id] = { name: r.name, price: r.price });
            if (bRes.data) bRes.data.forEach(b => busesMap[b.id] = b.plate_number);

            ticketsData = tRes.data || [];
            updateSummary();
            renderTable();
        } catch (error) {
            console.error("Revenue Sync Error:", error);
            if (ticketTableBody) {
                ticketTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:60px; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px;"></i><p style="font-weight:800;">Neural Link Failed — Check Database Connection</p></td></tr>`;
            }
        }
    }

    function updateSummary() {
        const total = ticketsData.length;
        const active = ticketsData.filter(t => (t.status || '').toLowerCase() === 'active' || (t.status || '').toLowerCase() === 'valid').length;
        const used = ticketsData.filter(t => (t.status || '').toLowerCase() === 'used' || (t.status || '').toLowerCase() === 'redeemed').length;
        const expired = ticketsData.filter(t => (t.status || '').toLowerCase() === 'expired').length;
        const canceled = ticketsData.filter(t => (t.status || '').toLowerCase() === 'canceled').length;

        if (document.getElementById('summaryTotalSold')) document.getElementById('summaryTotalSold').innerText = total;
        if (document.getElementById('summaryAvailable')) document.getElementById('summaryAvailable').innerText = active;
        if (document.getElementById('summaryUsed')) document.getElementById('summaryUsed').innerText = used;
        if (document.getElementById('summarySold')) document.getElementById('summarySold').innerText = total - canceled;
        if (document.getElementById('summaryExpired')) document.getElementById('summaryExpired').innerText = expired;
    }

    let currentFilter = 'all';

    function renderTable() {
        if (!ticketTableBody) return;
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        
        let filtered = ticketsData;
        
        // 1. Filter by Date Range
        if (dateFrom && dateTo) {
            filtered = filtered.filter(t => {
                const d = new Date(t.created_at);
                return d >= dateFrom && d <= dateTo;
            });
        }

        // 2. Filter by Search Query
        if (query) {
            filtered = ticketsData.filter(t => 
                (String(t.id)).toLowerCase().includes(query) ||
                (t.ticket_code || '').toLowerCase().includes(query) ||
                (usersMap[t.user_id] || '').toLowerCase().includes(query)
            );
        }

        // 3. Filter by Status Card
        if (currentFilter === 'active') filtered = filtered.filter(t => (t.status || '').toLowerCase() === 'active' || (t.status || '').toLowerCase() === 'valid');
        else if (currentFilter === 'used') filtered = filtered.filter(t => (t.status || '').toLowerCase() === 'used' || (t.status || '').toLowerCase() === 'redeemed');
        else if (currentFilter === 'sold') filtered = filtered.filter(t => (t.status || '').toLowerCase() !== 'canceled');
        else if (currentFilter === 'expired') filtered = filtered.filter(t => (t.status || '').toLowerCase() === 'expired');

        ticketTableBody.innerHTML = "";
        if (filtered.length === 0) {
            ticketTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:60px; color:var(--text-muted); font-weight:700;"><i class="fas fa-ticket-alt" style="font-size:2rem; display:block; margin-bottom:10px; opacity:0.2;"></i>No tickets found in the ledger.</td></tr>`;
            return;
        }

        filtered.forEach((tck, idx) => {
            const passenger = usersMap[tck.user_id] || "Guest User";
            const routeInfo = routesMap[tck.route_id] || { name: "General Route", price: 15 };
            const status = (tck.status || 'Active').toLowerCase();
            const rColor = getRouteColor(routeInfo.name);
            
            let statusBadge = `<span style="background:rgba(245,158,11,0.1); color:#f59e0b; padding:6px 14px; border-radius:50px; font-size:0.75rem; font-weight:800; text-transform:uppercase;">${status}</span>`;
            if (status === 'active' || status === 'valid') {
                statusBadge = `<span style="background:rgba(16,185,129,0.1); color:#10b981; padding:6px 14px; border-radius:50px; font-size:0.75rem; font-weight:800; text-transform:uppercase;">Valid</span>`;
            } else if (status === 'used' || status === 'redeemed') {
                statusBadge = `<span style="background:rgba(59,130,246,0.1); color:#3b82f6; padding:6px 14px; border-radius:50px; font-size:0.75rem; font-weight:800; text-transform:uppercase;">Used</span>`;
            } else if (status === 'canceled' || status === 'expired') {
                statusBadge = `<span style="background:rgba(239,68,68,0.1); color:#ef4444; padding:6px 14px; border-radius:50px; font-size:0.75rem; font-weight:800; text-transform:uppercase;">${status}</span>`;
            }

            // Route pill badge
            const routeLabel = routeInfo.name.includes('Cairo') || routeInfo.name.includes('القاهرة') ? '🏙️ Cairo' :
                               routeInfo.name.includes('Shorouk') || routeInfo.name.includes('شروق') ? '🔴 Shorouk' :
                               routeInfo.name.includes('Madinaty') || routeInfo.name.includes('مدينتي') || routeInfo.name.includes('مدينتى') ? '🟠 Madinaty' :
                               routeInfo.name.includes('Badr') || routeInfo.name.includes('بدر') ? '🟣 Badr' : 
                               routeInfo.name.includes('Capital') || routeInfo.name.includes('العاصمة') || routeInfo.name.includes('عاصمة') ? '🏛️ Capital' : routeInfo.name;

            const tr = document.createElement('tr');
            // Color-coded left border + subtle background tint per route
            tr.style.borderLeft = `4px solid ${rColor}`;
            tr.style.background = `linear-gradient(90deg, ${rColor}08 0%, transparent 40%)`;
            tr.style.transition = 'all 0.3s ease';
            tr.style.animation = `ticketSlideIn 0.4s ease forwards ${idx * 0.03}s`;
            tr.style.opacity = '0';
            
            tr.onmouseenter = function() { this.style.background = `linear-gradient(90deg, ${rColor}15 0%, ${rColor}05 100%)`; this.style.transform = 'scale(1.005)'; };
            tr.onmouseleave = function() { this.style.background = `linear-gradient(90deg, ${rColor}08 0%, transparent 40%)`; this.style.transform = 'scale(1)'; };

            tr.innerHTML = `
                <td><div style="font-family:monospace; font-weight:900; color:${rColor};">#${String(tck.id).substring(0, 8)}</div></td>
                <td><div style="font-weight:800; cursor:pointer; color:var(--text-main);" onclick="window.jumpToUser('${tck.user_id}')" title="Jump to User Profile">${passenger} <i class="fas fa-external-link-alt" style="font-size:0.7rem; opacity:0.4; margin-left:4px;"></i></div></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="display:inline-flex; align-items:center; gap:6px; background:${rColor}12; color:${rColor}; border:1px solid ${rColor}25; padding:5px 14px; border-radius:50px; font-size:0.78rem; font-weight:800;">
                            <i class="fas fa-route" style="font-size:0.7rem;"></i>${routeLabel}
                        </span>
                    </div>
                </td>
                <td><div style="font-weight:600; color:var(--text-muted);">${new Date(tck.created_at).toLocaleString()}</div></td>
                <td><div style="font-weight:900; color:${rColor};">${routeInfo.price}.00 EGP</div></td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-outline" style="width:34px; height:34px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:10px;" onclick="window.viewTicket('${tck.id}')"><i class="fas fa-eye"></i></button>
                        <button class="btn-outline" style="width:34px; height:34px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:10px; color:#ef4444; border-color:rgba(239,68,68,0.2);" onclick="window.deleteTicket('${tck.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            ticketTableBody.appendChild(tr);
        });
    }

    if (searchInput) searchInput.addEventListener('input', renderTable);

    const statCards = document.querySelectorAll('.v-card:not(section)');
    statCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const h3 = card.querySelector('h3');
            if (!h3) return;
            const id = h3.id;
            
            statCards.forEach(c => c.style.border = 'none');
            card.style.border = '2px solid var(--primary-color)';
            
            if (id === 'summaryTotalSold') currentFilter = 'all';
            else if (id === 'summaryAvailable') currentFilter = 'active';
            else if (id === 'summaryUsed') currentFilter = 'used';
            else if (id === 'summarySold') currentFilter = 'sold';
            else if (id === 'summaryExpired') currentFilter = 'expired';
            
            renderTable();
        });
    });

    window.jumpToUser = (userId) => {
        if (!userId || userId === 'null') return;
        localStorage.setItem('jumpToUserId', userId);
        window.location.href = 'users.html';
    };

    window.viewTicket = (id) => {
        const tck = ticketsData.find(t => String(t.id) === String(id));
        if (!tck) return;
        
        const passenger = usersMap[tck.user_id] || "Guest User";
        const routeInfo = routesMap[tck.route_id] || { name: "General Route", price: 15 };
        const busPlate = busesMap[tck.bus_id] || "Not Assigned";
        const status = (tck.status || 'Active').toLowerCase();
        const rColor = getRouteColor(routeInfo.name);

        Swal.fire({
            html: `
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="width: 60px; height: 60px; background: ${rColor}; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; box-shadow: 0 10px 20px ${rColor}33;">
                        <i class="fas fa-ticket-alt" style="color: #fff; font-size: 1.5rem;"></i>
                    </div>
                    <h2 style="margin: 0; font-weight: 900; font-size: 1.6rem; letter-spacing: -0.5px; color: var(--text-main);">Ticket Intelligence</h2>
                </div>

                <div style="background: ${rColor}08; border: 1.5px solid ${rColor}22; border-radius: 28px; padding: 30px; position: relative; overflow: hidden;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; text-align: left;">
                        
                        <div>
                            <label style="display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px;">Passenger</label>
                            <p style="margin: 0; font-weight: 900; font-size: 1.1rem; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                                ${passenger} <i class="fas fa-external-link-alt" style="font-size: 0.75rem; opacity: 0.3;"></i>
                            </p>
                        </div>

                        <div style="text-align: right;">
                            <label style="display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px;">Purchase Price</label>
                            <p style="margin: 0; font-weight: 900; font-size: 1.2rem; color: ${rColor};">${routeInfo.price}.00 EGP</p>
                        </div>

                        <div style="grid-column: span 2;">
                            <label style="display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px;">Assigned Route</label>
                            <p style="margin: 0; font-weight: 800; font-size: 1rem; color: var(--text-main); line-height: 1.5;">${routeInfo.name}</p>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px;">Ticket Status</label>
                            <p style="margin: 0; font-weight: 900; font-size: 1.1rem; color: ${status === 'active' || status === 'valid' ? '#10b981' : '#ef4444'}; text-transform: uppercase;">
                                ${status === 'active' || status === 'valid' ? 'ACTIVE' : status}
                            </p>
                        </div>

                        <div style="text-align: right;">
                            <label style="display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px;">Bus Identity</label>
                            <p style="margin: 0; font-weight: 900; font-size: 1.1rem; color: var(--text-main);">${busPlate}</p>
                        </div>

                        <div style="grid-column: span 2; padding-top: 20px; border-top: 1px dashed var(--border-color); margin-top: 10px;">
                            <label style="display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Validation Code</label>
                            <div style="background: var(--bg-main); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                                <code style="font-family: 'JetBrains Mono', monospace; font-weight: 900; font-size: 0.95rem; color: ${rColor}; letter-spacing: 0.5px;">${tck.ticket_code || '---'}</code>
                                <i class="far fa-copy" style="color: var(--text-muted); cursor: pointer; font-size: 1.1rem;" onclick="navigator.clipboard.writeText('${tck.ticket_code}'); Swal.showValidationMessage('Copied to clipboard!')"></i>
                            </div>
                        </div>

                        <div style="grid-column: span 2; margin-top: 10px;">
                            <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted); text-align: center; font-weight: 600;">
                                Purchased on ${new Date(tck.created_at).toLocaleString()}
                            </p>
                        </div>

                    </div>
                </div>
            `,
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            showConfirmButton: true,
            confirmButtonText: 'Dismiss View',
            confirmButtonColor: rColor,
            width: 520,
            padding: '40px',
            customClass: {
                popup: 'premium-swal-popup',
                confirmButton: 'premium-swal-btn'
            },
            showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
            hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' }
        });
    };

    window.deleteTicket = async (id) => {
        const res = await Swal.fire({
            title: 'Delete Ticket?',
            text: "This will remove the ticket from the ledger permanently.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Delete',
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });

        if (res.isConfirmed) {
            try {
                const { error } = await supabase.from('tickets').delete().eq('id', id);
                if (error) throw error;
                Swal.fire({ icon: 'success', title: 'Deleted', timer: 1000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                loadData();
            } catch (e) {
                Swal.fire('Error', 'Could not delete ticket', 'error');
            }
        }
    };

    window.useTicketByQR = async () => {
        const { value: code } = await Swal.fire({
            title: 'Scan QR Code',
            input: 'text',
            inputLabel: 'Enter Ticket Code',
            inputPlaceholder: 'TCK-XXXX',
            showCancelButton: true,
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });

        if (code) {
            try {
                const { data, error } = await supabase.from('tickets').select('*').eq('ticket_code', code).single();
                if (error || !data) throw new Error("Invalid Code");
                if (data.status === 'Used') throw new Error("Ticket already used");
                
                await supabase.from('tickets').eq('id', data.id).update({ status: 'Used' });
                Swal.fire({ icon: 'success', title: 'Validated', text: 'Ticket used successfully', background: 'var(--bg-card)', color: 'var(--text-main)' });
                loadData();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    };

    window.filterByUser = async () => {
        const { value: uid } = await Swal.fire({
            title: 'User History',
            input: 'text',
            inputLabel: 'Enter User ID',
            showCancelButton: true,
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });
        if (uid) {
            const { data } = await supabase.from('tickets').select('*').eq('user_id', uid);
            ticketsData = data || [];
            renderTable();
        }
    };

    window.exportData = () => {
        if (!ticketsData.length) {
            Swal.fire({ icon: 'info', title: 'No Data', text: 'No tickets to export.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            return;
        }
        const headers = ['ID', 'Passenger', 'Route', 'Price', 'Status', 'Ticket Code', 'Date'];
        const rows = ticketsData.map(t => [
            t.id,
            usersMap[t.user_id] || 'Guest',
            routesMap[t.route_id] ? routesMap[t.route_id].name : 'Unknown',
            routesMap[t.route_id] ? routesMap[t.route_id].price : 0,
            t.status || 'Active',
            t.ticket_code || '',
            new Date(t.created_at).toLocaleString()
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TransitWay_Tickets_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        Swal.fire({ icon: 'success', title: 'Exported', text: `${ticketsData.length} tickets exported.`, timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
    };

    window.openAddTicket = () => {
        const modal = document.getElementById('addTicketModal');
        if (modal) {
            modal.classList.add('active');
            // Populate selects
            const routeSelect = document.getElementById('modalRouteSelect');
            const busSelect = document.getElementById('modalBusSelect');
            
            if (routeSelect) {
                routeSelect.innerHTML = '<option value="">Select Target Route</option>';
                Object.keys(routesMap).forEach(id => {
                    routeSelect.innerHTML += `<option value="${id}">${routesMap[id].name}</option>`;
                });
            }
            if (busSelect) {
                busSelect.innerHTML = '<option value="">Select Target Bus</option>';
                Object.keys(busesMap).forEach(id => {
                    busSelect.innerHTML += `<option value="${id}">${busesMap[id]}</option>`;
                });
            }
        }
    };

    window.closeAddTicket = () => {
        const modal = document.getElementById('addTicketModal');
        if (modal) modal.classList.remove('active');
    };

    const addTicketForm = document.getElementById('addTicketForm');
    if (addTicketForm) {
        addTicketForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerText = "Issuing Signal...";

            const formData = new FormData(e.target);
            const payload = {
                user_id: formData.get('user_id'),
                route_id: formData.get('route_id'),
                bus_id: formData.get('bus_id') || null,
                status: 'active',
                ticket_code: 'TCK-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                created_at: new Date().toISOString()
            };

            try {
                const { error } = await supabase.from('tickets').insert(payload);
                if (error) throw error;

                Swal.fire({
                    icon: 'success',
                    title: 'Ticket Issued',
                    text: `Signal ${payload.ticket_code} generated for user.`,
                    background: 'var(--bg-card)', color: 'var(--text-main)',
                    timer: 1500, showConfirmButton: false
                });

                window.closeAddTicket();
                e.target.reset();
                loadData();
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerText = "Confirm Issuance";
            }
        });
    }

    function initCalendar() {
        if (typeof flatpickr === 'undefined') return;
        calendarInstance = flatpickr('#ticketsCalendar', {
            mode: 'range',
            dateFormat: 'Y-m-d',
            onChange: (dates) => {
                if (dates.length === 2) {
                    dateFrom = dates[0];
                    dateTo = dates[1];
                    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    document.getElementById('currentDateRange').textContent = fmt(dateFrom) + ' — ' + fmt(dateTo);
                    renderTable();
                }
            }
        });
    }

    initCalendar();
    loadData();
    
    if (window.supabaseAuth) {
        window.supabaseAuth.channel('tickets_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    ticketsData.unshift(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    const idx = ticketsData.findIndex(t => t.id === payload.new.id);
                    if (idx !== -1) ticketsData[idx] = { ...ticketsData[idx], ...payload.new };
                } else if (payload.eventType === 'DELETE') {
                    const idx = ticketsData.findIndex(t => t.id === payload.old.id);
                    if (idx !== -1) ticketsData.splice(idx, 1);
                }
                updateStats();
                renderTable();
            })
            .subscribe();
    }
});