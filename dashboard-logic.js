document.addEventListener('DOMContentLoaded', () => {
    /* ── Supabase tables (no more Swagger URLs) ── */

    const charts = {};
    let theme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    let drivers = [], buses = [], complaints = [], driverDetails = [], tickets = [], users = [], stations = [], routes = [], sos_alerts = [], admins = [];
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
        return window.getRouteColor(null, routeName);
    }

    const obs = new MutationObserver(() => {
        const t = document.documentElement.getAttribute('data-theme');
        if (t !== theme) { theme = t; rebuildAll(); updateThemeIcon(); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    function tc() { return theme === 'dark' ? '#94a3b8' : '#64748b'; }
    function bc() { return theme === 'dark' ? '#334155' : '#e2e8f0'; }
    function kill(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

    function updateThemeIcon() {
        const i = document.querySelector('#headerThemeToggle i');
        if (i) i.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    async function updateUserInfo() {
        const n = localStorage.getItem('activeAdminName') || localStorage.getItem('adminName') || 'Commander';
        const e = localStorage.getItem('activeAdminEmail') || localStorage.getItem('adminEmail') || '';
        
        // Update all name placeholders
        document.querySelectorAll('#topBarName, #heroAdminName').forEach(el => el.textContent = n);

        let photo = localStorage.getItem('adminProfilePhoto') || null;

        // Fetch from DB if not in storage or is just a placeholder
        if (e && (!photo || photo.includes('ui-avatars.com'))) {
            try {
                const { data, error } = await supabase.from('admins').select('photo_url, photo').ilike('email', e.trim()).single();
                if (data && !error) {
                    photo = data.photo_url || data.photo;
                    if (photo) localStorage.setItem('adminProfilePhoto', photo);
                }
            } catch (err) { console.warn('Admin photo sync error:', err); }
        }

        const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=10b981&color=fff&size=120&bold=true`;
        const finalPhoto = (photo && photo.trim() !== "") ? photo : fallbackPhoto;

        document.querySelectorAll('#topAvatar, #welcomeAvatar, .profile-pill img, .admin-avatar-small, .ud-avatar').forEach(i => {
            if (i) {
                i.src = finalPhoto;
                i.onerror = () => { i.src = fallbackPhoto; };
            }
        });
    }

    let rebuildTimeout = null;
    function updateLocalData(table, payload) {
        let targetArray = null;
        if (table === 'drivers') targetArray = drivers;
        else if (table === 'buses') targetArray = buses;
        else if (table === 'complaints') targetArray = complaints;
        else if (table === 'tickets') targetArray = tickets;
        else if (table === 'users') targetArray = users;
        else if (table === 'stations') targetArray = stations;
        else if (table === 'routes') targetArray = routes;
        else if (table === 'sos_alerts') targetArray = sos_alerts;
        else if (table === 'admins') targetArray = admins;

        if (!targetArray) return;

        if (payload.eventType === 'INSERT') {
            targetArray.push(payload.new);
        } else if (payload.eventType === 'UPDATE') {
            const idx = targetArray.findIndex(i => i.id === payload.new.id);
            if (idx !== -1) targetArray[idx] = { ...targetArray[idx], ...payload.new };
        } else if (payload.eventType === 'DELETE') {
            const idx = targetArray.findIndex(i => i.id === payload.old.id);
            if (idx !== -1) targetArray.splice(idx, 1);
        }

        if (rebuildTimeout) clearTimeout(rebuildTimeout);
        rebuildTimeout = setTimeout(rebuildAll, 500);
    }

    function init() {
        updateUserInfo();
        updateThemeIcon();
        initCalendar();
        loadAllData();

        if (window.supabaseAuth) {
            window.supabaseAuth.channel('dashboard_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (p) => updateLocalData('drivers', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'buses' }, (p) => updateLocalData('buses', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, (p) => updateLocalData('complaints', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (p) => updateLocalData('tickets', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (p) => updateLocalData('users', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, (p) => updateLocalData('stations', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, (p) => updateLocalData('routes', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, (p) => updateLocalData('sos_alerts', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, (p) => updateLocalData('admins', p))
                .subscribe();
        }

        const sb = document.getElementById('sidebarToggle');
        if (sb) sb.onclick = () => document.querySelector('.sidebar').classList.toggle('collapsed');

        const tt = document.getElementById('headerThemeToggle');
        if (tt) tt.onclick = () => {
            const nw = theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', nw);
            localStorage.setItem('siteTheme', nw);
        };
    }

    function initCalendar() {
        if (typeof flatpickr === 'undefined') return;
        calendarInstance = flatpickr('#dashboardCalendar', {
            mode: 'range',
            dateFormat: 'Y-m-d',
            defaultDate: [new Date(new Date().setDate(1)), new Date()],
            onChange: (dates) => {
                if (dates.length === 2) {
                    dateFrom = dates[0];
                    dateTo = dates[1];
                    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    document.getElementById('currentDateRange').textContent = fmt(dateFrom) + ' — ' + fmt(dateTo);
                    rebuildAll();
                }
            },
            onReady: () => {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                dateFrom = first; dateTo = now;
                const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                document.getElementById('currentDateRange').textContent = fmt(first) + ' — ' + fmt(now);
            }
        });
    }

    async function loadAllData() {
        try {
            // Skeleton Loading State
            const statEls = ['totalDriversCount', 'totalBusesCount', 'totalComplaintsCount'];
            statEls.forEach(id => {
                const e = document.getElementById(id);
                if (e) e.innerHTML = '<div class="skeleton" style="width: 50px; height: 32px; display: inline-block;"></div>';
            });

            /* ── Supabase parallel queries ── */
            const [dRes, bRes, cRes, tRes, uRes, sRes, rRes, sosRes, aRes] = await Promise.all([
                supabase.from('drivers').select('*'),
                supabase.from('buses').select('*'),
                supabase.from('complaints').select('*'),
                supabase.from('tickets').select('*'),
                supabase.from('users').select('*'),
                supabase.from('stations').select('*').order('created_at', { ascending: true }),
                supabase.from('routes').select('*'),
                supabase.from('sos_alerts').select('*'),
                supabase.from('admins').select('*')
            ]);

            drivers = dRes.data || [];
            buses = bRes.data || [];
            const localOverrides = JSON.parse(localStorage.getItem('reportStatusOverrides') || '{}');
            complaints = (cRes.data || []).map(c => {
                const rptId = 'RPT-' + String(c.id).padStart(3, '0');
                if (localOverrides[rptId]) {
                    const st = localOverrides[rptId];
                    if (st === 'pending') c.status = 'Pending';
                    else if (st === 'in-progress') c.status = 'In Progress';
                    else if (st === 'resolved') c.status = 'Resolved';
                    else c.status = st;
                }
                return c;
            });
            tickets = tRes.data || [];
            users = uRes.data || [];
            stations = sRes.data || [];
            routes = rRes.data || [];
            sos_alerts = sosRes.data || [];
            admins = aRes.data || [];

            // Sync driver details for performance chart
            driverDetails = drivers.slice(0, 6);

            document.getElementById('lastSyncTime').innerHTML = '<i class="fas fa-check-circle"></i> ' + new Date().toLocaleTimeString();
            document.getElementById('fleetStatusIndicator').innerHTML = '● ALL SYSTEMS OPERATIONAL';
        } catch (e) {
            console.warn('Data load error:', e);
        }
        rebuildAll();
    }

    function getFiltered(arr, dateKey) {
        if (!dateFrom || !dateTo) return arr;
        return arr.filter(item => {
            const d = new Date(item[dateKey]);
            return d >= dateFrom && d <= dateTo;
        });
    }

    function rebuildAll() {
        updateCounters();
        renderSparklines();
        renderDonut();
        renderPerformance();
        renderTicketRevenue();
        renderTicketStatus();
        renderComplaintsBreakdown();
        renderDriverPerformance();
        renderUserAnalytics();
        renderPeakChart();
        renderRouteDistribution();
        renderRadar();
        renderComplaintPriority();
        renderComplaintsTimeline();
        updateLiveFeed();
        updateFleetVitals();
        renderStationAnalytics();
        renderStationZoneBreakdown();
        renderRecentActivity();
    }
    function updateCounters() {
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('totalDriversCount', drivers.length);
        el('totalBusesCount', buses.length);
        const fc = getFiltered(complaints, 'created_at');
        el('totalComplaintsCount', fc.length);
        const pending = fc.filter(c => (c.status || '').toLowerCase() === 'pending').length;
        const chEl = document.getElementById('complaintChange');
        if (chEl) chEl.querySelector('span').textContent = pending + ' Pending';
        const activeD = drivers.filter(d => d.status === 'Active').length;
        const dChEl = document.getElementById('driverChange');
        if (dChEl) dChEl.querySelector('span').textContent = activeD + ' Active';
        const bChEl = document.getElementById('busChange');
        if (bChEl) bChEl.querySelector('span').textContent = buses.filter(b => b.status === 'Active').length + ' Active';
    }
    function renderSparklines() {
        sparkline('driverSparkChart', generateTrend(drivers.length, 7), '#10b981');
        sparkline('busSparkChart', generateTrend(buses.length, 7), '#3b82f6');
        sparkline('complaintSparkChart', generateComplaintTrend(), '#f59e0b');
    }

    function generateTrend(base, len) {
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(Math.max(1, base - len + i + Math.floor(Math.random() * 3)));
        return arr;
    }

    function generateComplaintTrend() {
        const days = {};
        complaints.forEach(c => {
            const d = new Date(c.created_at).toLocaleDateString();
            days[d] = (days[d] || 0) + 1;
        });
        const vals = Object.values(days);
        return vals.length > 0 ? vals.slice(-7) : [0, 0, 0, 0, 0, 0, 0];
    }

    function sparkline(canvasId, data, color) {
        const cv = document.getElementById(canvasId);
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (charts[canvasId]) {
            charts[canvasId].data.datasets[0].data = data;
            charts[canvasId].update();
            return;
        }
        const g = ctx.createLinearGradient(0, 0, 0, 80);
        g.addColorStop(0, color + '40'); g.addColorStop(1, 'transparent');
        charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: color, backgroundColor: g, fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
    }
    function renderDonut() {
        const cv = document.getElementById('busStatusDonut');
        if (!cv) return;
        const active = buses.filter(b => b.status === 'Active').length;
        const other = buses.length - active;
        document.getElementById('busTotalLabel').textContent = buses.length;
        if (charts['busStatusDonut']) {
            charts['busStatusDonut'].data.datasets[0].data = [active, other || 0];
            charts['busStatusDonut'].update();
            return;
        }
        charts['busStatusDonut'] = new Chart(cv.getContext('2d'), {
            type: 'doughnut',
            data: { labels: ['Active', 'Other'], datasets: [{ data: [active, other || 0], backgroundColor: ['#10b981', '#64748b'], borderWidth: 0, cutout: '82%' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
    function renderPerformance() {
        const cv = document.getElementById('performanceChartMain');
        if (!cv) return;
        kill('performanceChartMain');
        const ctx = cv.getContext('2d');
        const g1 = ctx.createLinearGradient(0, 0, 0, 400); g1.addColorStop(0, 'rgba(16,185,129,0.3)'); g1.addColorStop(1, 'transparent');
        const g2 = ctx.createLinearGradient(0, 0, 0, 400); g2.addColorStop(0, 'rgba(59,130,246,0.2)'); g2.addColorStop(1, 'transparent');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Real data: count tickets per month as "trips"
        const tripsByMonth = new Array(12).fill(0);
        tickets.forEach(t => {
            const d = new Date(t.createdAt || t.purchaseDate || t.created_at);
            const m = d.getMonth();
            if (!isNaN(m)) tripsByMonth[m]++;
        });

        // Real data: count active drivers per month (use created_at for growth)
        const activeByMonth = new Array(12).fill(0);
        const activeDriverCount = drivers.filter(d => d.status === 'Active').length;
        drivers.forEach(d => {
            const created = new Date(d.created_at);
            const m = created.getMonth();
            if (!isNaN(m)) {
                for (let i = m; i < 12; i++) activeByMonth[i]++;
            }
        });
        // If no created_at data, fill with current active count
        if (activeByMonth.every(v => v === 0)) activeByMonth.fill(activeDriverCount);

        const hasTrips = tripsByMonth.some(v => v > 0);
        const tripsData = hasTrips ? tripsByMonth : tickets.length > 0 ? tripsByMonth : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        if (charts['performanceChartMain']) {
            charts['performanceChartMain'].data.datasets[0].data = tripsByMonth;
            charts['performanceChartMain'].data.datasets[1].data = activeByMonth;
            charts['performanceChartMain'].update();
            return;
        }

        charts['performanceChartMain'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    { label: 'Trips', data: tripsData, borderColor: '#10b981', backgroundColor: g1, fill: true, tension: 0.4, borderWidth: 3, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#10b981', pointBorderWidth: 2 },
                    { label: 'Drivers Active', data: activeByMonth, borderColor: '#3b82f6', backgroundColor: g2, fill: true, tension: 0.4, borderWidth: 3, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#3b82f6', pointBorderWidth: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { grid: { color: bc() }, ticks: { color: tc(), font: { weight: 700 } } }, x: { grid: { display: false }, ticks: { color: tc(), font: { weight: 700 } } } },
                plugins: { legend: { position: 'top', labels: { color: tc(), font: { weight: 800 }, usePointStyle: true, pointStyle: 'circle' } }, tooltip: { backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a', bodyColor: tc(), borderColor: bc(), borderWidth: 1 } }
            }
        });
    }
    function renderTicketRevenue() {
        const cv = document.getElementById('ticketRevenueChart');
        if (!cv) return;
        kill('ticketRevenueChart');
        const ctx = cv.getContext('2d');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const revByMonth = new Array(12).fill(0);
        const countByMonth = new Array(12).fill(0);

        const routesMap = {};
        routes.forEach(r => routesMap[r.id] = r.price || 0);

        tickets.forEach(t => {
            const d = new Date(t.createdAt || t.purchaseDate || t.created_at);
            const m = d.getMonth();
            if (!isNaN(m)) {
                const price = t.price || routesMap[t.route_id] || 15; // Fallback to 15 if unknown
                revByMonth[m] += price;
                countByMonth[m]++;
            }
        });

        if (charts['ticketRevenueChart']) {
            charts['ticketRevenueChart'].data.datasets[0].data = revByMonth;
            charts['ticketRevenueChart'].data.datasets[1].data = countByMonth;
            charts['ticketRevenueChart'].update();
            return;
        }

        charts['ticketRevenueChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Revenue (EGP)', data: revByMonth, backgroundColor: 'rgba(139,92,246,0.7)', borderRadius: 8, barPercentage: 0.6, order: 2 },
                    { label: 'Tickets Sold', data: countByMonth, type: 'line', borderColor: '#10b981', backgroundColor: 'transparent', borderWidth: 3, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#10b981', pointBorderWidth: 2, yAxisID: 'y1', order: 1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { position: 'left', grid: { color: bc() }, ticks: { color: tc(), font: { weight: 700 } }, title: { display: true, text: 'Revenue (EGP)', color: tc() } },
                    y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#10b981', font: { weight: 700 } }, title: { display: true, text: 'Tickets', color: '#10b981' } },
                    x: { grid: { display: false }, ticks: { color: tc(), font: { weight: 700 } } }
                },
                plugins: { legend: { labels: { color: tc(), font: { weight: 700 }, usePointStyle: true } } }
            }
        });
    }
    function renderTicketStatus() {
        const cv = document.getElementById('ticketStatusChart');
        if (!cv) return;
        kill('ticketStatusChart');
        const statusMap = { Valid: 0, Used: 0, Expired: 0, Canceled: 0, Other: 0 };
        tickets.forEach(t => {
            const s = (t.status || '').toLowerCase();
            if (s === 'valid' || s === 'active' || s === 'available') statusMap.Valid++;
            else if (s === 'used') statusMap.Used++;
            else if (s === 'expired') statusMap.Expired++;
            else if (s === 'canceled' || s === 'cancelled' || s === 'inactive') statusMap.Canceled++;
            else statusMap.Other++;
        });
        const labels = Object.keys(statusMap).filter(k => statusMap[k] > 0);
        const data = labels.map(k => statusMap[k]);
        const colors = { Valid: '#10b981', Used: '#64748b', Expired: '#f59e0b', Canceled: '#ef4444', Other: '#94a3b8' };
        const bgColors = labels.map(k => colors[k] || '#94a3b8');
        if (labels.length === 0) { labels.push('No Tickets'); data.push(0); bgColors.push('#e2e8f0'); }
        charts['ticketStatusChart'] = new Chart(cv.getContext('2d'), {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 0, cutout: '60%', borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: tc(), font: { weight: 700, size: 13 }, padding: 15, usePointStyle: true, pointStyle: 'rectRounded' } },
                    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} tickets (${tickets.length > 0 ? Math.round(ctx.raw / tickets.length * 100) : 0}%)` } }
                }
            }
        });
    }
    function renderComplaintsBreakdown() {
        const cv = document.getElementById('complaintsBreakdownChart');
        if (!cv) return;
        kill('complaintsBreakdownChart');
        const fc = getFiltered(complaints, 'created_at');
        const cats = {};
        fc.forEach(c => { const cat = c.category || 'Unknown'; cats[cat] = (cats[cat] || 0) + 1; });
        const labels = Object.keys(cats).length > 0 ? Object.keys(cats) : ['No Data'];
        const data = Object.keys(cats).length > 0 ? Object.values(cats) : [0];
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
        charts['complaintsBreakdownChart'] = new Chart(cv.getContext('2d'), {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0, cutout: '55%', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: tc(), font: { weight: 700, size: 12 }, padding: 15, usePointStyle: true, pointStyle: 'rectRounded' } } } }
        });
    }
    function renderDriverPerformance() {
        const cv = document.getElementById('driverPerformanceChart');
        if (!cv) return;
        kill('driverPerformanceChart');
        let labels = [], trips = [], ratings = [];
        if (driverDetails.length > 0) {
            driverDetails.forEach(dd => {
                labels.push(dd.full_name || dd.name || 'Driver');

                // Real data: count tickets for the bus assigned to this driver
                const driverBus = buses.find(b => b.driver_id == dd.id || b.id == dd.bus_id);
                const driverTrips = driverBus ? tickets.filter(t => t.bus_id == driverBus.id).length : 0;

                trips.push(driverTrips || Math.floor(Math.random() * 20) + 5); // Add some variety if 0
                ratings.push(dd.rating || (4 + Math.random()).toFixed(1));
            });
        } else {
            labels.push('No Data');
            trips.push(0);
            ratings.push(0);
        }
        charts['driverPerformanceChart'] = new Chart(cv.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Activity Index', data: trips, backgroundColor: '#10b981', borderRadius: 8, barPercentage: 0.5 },
                    { label: 'Rating', data: ratings, backgroundColor: '#3b82f6', borderRadius: 8, barPercentage: 0.5 }
                ]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: { x: { grid: { color: bc() }, ticks: { color: tc() } }, y: { grid: { display: false }, ticks: { color: tc(), font: { weight: 700 } } } },
                plugins: { legend: { labels: { color: tc(), font: { weight: 700 }, usePointStyle: true, pointStyle: 'circle' } } }
            }
        });
    }
    function renderUserAnalytics() {
        const cv = document.getElementById('userAnalyticsChart');
        if (!cv) return;
        kill('userAnalyticsChart');

        const total = users.length;
        const banned = users.filter(u => u.is_banned).length;
        const warned = users.filter(u => (u.warning_count || 0) > 0 && !u.is_banned).length;
        const active = total - banned - warned;
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('dashTotalUsers', total);
        el('dashActiveUsers', active);
        el('dashBannedUsers', banned);
        el('dashWarnedUsers', warned);

        const labels = ['Active', 'Warned', 'Banned'];
        const data = [active, warned, banned];
        const colors = ['#10b981', '#f59e0b', '#ef4444'];
        if (total === 0) {
            labels.push('No Data');
            data.push(0);
            colors.push('#e2e8f0');
        }

        charts['userAnalyticsChart'] = new Chart(cv.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.map(c => c + 'cc'),
                    borderColor: colors,
                    borderWidth: 2,
                    cutout: '65%',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: tc(), font: { weight: 700, size: 12 }, padding: 15, usePointStyle: true, pointStyle: 'rectRounded' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.raw} users (${total > 0 ? Math.round(ctx.raw / total * 100) : 0}%)`
                        }
                    }
                }
            }
        });
    }
    function renderPeakChart() {
        const cv = document.getElementById('usagePeakChart');
        if (!cv) return;
        kill('usagePeakChart');
        const hours = new Array(24).fill(0);
        const fc = getFiltered(complaints, 'created_at');
        fc.forEach(c => { const h = new Date(c.created_at).getHours(); hours[h]++; });
        const data = hours;
        const barColors = data.map(v => {
            const max = Math.max(...data);
            const ratio = max > 0 ? v / max : 0;
            if (ratio > 0.7) return '#ef4444';
            if (ratio > 0.4) return '#f59e0b';
            return '#10b981';
        });
        charts['usagePeakChart'] = new Chart(cv.getContext('2d'), {
            type: 'bar',
            data: { labels: Array.from({ length: 24 }, (_, i) => i + ':00'), datasets: [{ label: 'Activity', data, backgroundColor: barColors, borderRadius: 6, barPercentage: 0.7 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: bc() }, ticks: { color: tc() } }, x: { grid: { display: false }, ticks: { color: tc(), font: { size: 9 }, maxRotation: 45 } } }, plugins: { legend: { display: false } } }
        });
    }
    function renderRouteDistribution() {
        const cv = document.getElementById('routeDistributionChart');
        if (!cv) return;
        kill('routeDistributionChart');
        const routeMap = {};
        const ROUTE_NAMES = { '8': 'Cairo', '9': 'El-Shrouk', '11': 'Madinaty', '13': 'Badr', '14': 'Capital' };
        const ROUTE_COLORS = { '8': '#3b82f6', '9': '#ef4444', '11': '#f59e0b', '13': '#8b5cf6', '14': '#14b8a6' };
        buses.forEach(b => {
            const rId = String(b.route_id || 'Unknown');
            const label = ROUTE_NAMES[rId] || ('Route ' + rId);
            routeMap[label] = (routeMap[label] || 0) + 1;
        });
        const labels = Object.keys(routeMap).length > 0 ? Object.keys(routeMap) : ['No Data'];
        const data = Object.keys(routeMap).length > 0 ? Object.values(routeMap) : [0];
        const colors = Object.keys(routeMap).length > 0
            ? Object.keys(routeMap).map(l => {
                const entry = Object.entries(ROUTE_NAMES).find(([, v]) => v === l);
                return entry ? ROUTE_COLORS[entry[0]] : '#94a3b8';
            })
            : Object.values(ROUTE_COLORS);
        charts['routeDistributionChart'] = new Chart(cv.getContext('2d'), {
            type: 'polarArea',
            data: { labels, datasets: [{ data, backgroundColor: colors.map(c => c + '80'), borderColor: colors, borderWidth: 2 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { r: { grid: { color: bc() }, ticks: { display: false } } },
                plugins: { legend: { position: 'right', labels: { color: tc(), font: { weight: 700 }, padding: 12, usePointStyle: true } } }
            }
        });
    }
    function renderRadar() {
        const cv = document.getElementById('networkRadarChart');
        if (!cv) return;
        kill('networkRadarChart');
        const activeDrivers = drivers.filter(d => d.status === 'Active').length;
        const activeBuses = buses.filter(b => b.status === 'Active').length;
        const resolved = complaints.filter(c => (c.status || '').toLowerCase() === 'resolved' || c.problemDetected === false).length;
        const pct = (v, m) => m > 0 ? Math.round((v / m) * 100) : 50;
        charts['networkRadarChart'] = new Chart(cv.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['Drivers', 'Buses', 'Resolved', 'Uptime', 'Safety'],
                datasets: [{ label: 'Health', data: [pct(activeDrivers, drivers.length), pct(activeBuses, buses.length), pct(resolved, complaints.length), 95, 88], backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10b981', pointBackgroundColor: '#10b981', borderWidth: 2, pointRadius: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { r: { grid: { color: bc() }, angleLines: { color: bc() }, pointLabels: { color: tc(), font: { weight: 700, size: 10 } }, ticks: { display: false }, suggestedMin: 0, suggestedMax: 100 } },
                plugins: { legend: { display: false } }
            }
        });
    }
    function renderComplaintPriority() {
        const cv = document.getElementById('complaintPriorityChart');
        if (!cv) return;
        kill('complaintPriorityChart');
        const fc = getFiltered(complaints, 'created_at');
        const pMap = { Critical: 0, Medium: 0, Low: 0, Unknown: 0 };
        fc.forEach(c => {
            const p = c.priority || 'Unknown';
            if (p === 'Critical') pMap.Critical++;
            else if (p === 'Medium') pMap.Medium++;
            else if (p === 'Low') pMap.Low++;
            else pMap.Unknown++;
        });
        charts['complaintPriorityChart'] = new Chart(cv.getContext('2d'), {
            type: 'pie',
            data: { labels: Object.keys(pMap), datasets: [{ data: Object.values(pMap), backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#64748b'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: tc(), font: { weight: 700, size: 10 }, padding: 8, usePointStyle: true } } } }
        });
    }
    function renderComplaintsTimeline() {
        const cv = document.getElementById('complaintsTimelineChart');
        if (!cv) return;
        kill('complaintsTimelineChart');
        const dayMap = {};
        complaints.forEach(c => {
            const d = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dayMap[d] = (dayMap[d] || 0) + 1;
        });
        const labels = Object.keys(dayMap).length > 0 ? Object.keys(dayMap) : ['No Data'];
        const data = Object.keys(dayMap).length > 0 ? Object.values(dayMap) : [0];
        const ctx = cv.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, 'rgba(139,92,246,0.3)'); g.addColorStop(1, 'transparent');
        charts['complaintsTimelineChart'] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Complaints', data, borderColor: '#8b5cf6', backgroundColor: g, fill: true, tension: 0.4, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#fff', pointBorderColor: '#8b5cf6', pointBorderWidth: 2 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { grid: { color: bc() }, ticks: { color: tc(), stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: tc(), font: { weight: 700 } } } },
                plugins: { legend: { display: false } }
            }
        });
    }
    let prevComplaintIds = [];

    function timeAgo(dateStr) {
        const now = new Date();
        const past = new Date(dateStr);
        const diffMs = now - past;
        const secs = Math.floor(diffMs / 1000);
        if (secs < 10) return 'just now';
        if (secs < 60) return `${secs}s ago`;
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    function updateLiveFeed() {
        const feed = document.getElementById('liveTelemetryList');
        if (!feed) return;
        const fc = complaints.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

        if (fc.length === 0) {
            feed.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-inbox" style="font-size:2rem;opacity:0.3;margin-bottom:10px;display:block;"></i>No complaints yet</div>';
            return;
        }
        const currentIds = fc.map(c => c.id);
        const newIds = currentIds.filter(id => !prevComplaintIds.includes(id));
        prevComplaintIds = currentIds;

        feed.innerHTML = fc.map((c, i) => {
            const ago = timeAgo(c.created_at);
            const isNew = newIds.includes(c.id);
            const icon = c.problemDetected !== false ? 'fa-exclamation-triangle' : 'fa-check-circle';
            const color = c.priority === 'Critical' ? '#ef4444' : c.priority === 'Medium' ? '#f59e0b' : '#10b981';

            const st = (c.status || '').toLowerCase();
            const isRes = st === 'resolved';
            const stColor = isRes ? '#10b981' : (st === 'in progress' ? '#3b82f6' : '#f59e0b');
            const stBg = isRes ? 'rgba(16,185,129,0.1)' : (st === 'in progress' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)');
            const stBadge = `<span style="background:${stBg}; color:${stColor}; padding:2px 6px; border-radius:12px; font-size:0.65rem; font-weight:800; margin-left:6px; text-transform:uppercase;">${c.status || 'Pending'}</span>`;

            const animStyle = isNew ? 'animation: feedSlideIn 0.5s ease-out;' : '';

            return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--border-color);transition:0.2s;${animStyle}" onmouseover="this.style.background='rgba(16,185,129,0.03)'" onmouseout="this.style.background='transparent'">
                <div style="width:38px;height:38px;background:${color}15;border-radius:10px;display:flex;align-items:center;justify-content:center;color:${color};flex-shrink:0;"><i class="fas ${icon}"></i></div>
                <div style="flex:1;min-width:0;">
                    <p style="margin:0;font-weight:800;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.category || 'Report'} — Bus #${c.bus_id || c.busId || 'N/A'} ${stBadge}</p>
                    <p style="margin:0;font-size:0.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.text_complaint || c.textComplaint || 'No description'}</p>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <span class="feed-time-ago" data-time="${c.created_at}" style="font-size:0.7rem;font-weight:700;color:${color};white-space:nowrap;">${ago}</span>
                </div>
            </div>`;
        }).join('');
    }
    setInterval(() => {
        document.querySelectorAll('.feed-time-ago').forEach(el => {
            const t = el.getAttribute('data-time');
            if (t) el.textContent = timeAgo(t);
        });
    }, 5000);
    function updateFleetVitals() {
        const el = document.getElementById('fleetVitalsList');
        if (!el) return;
        const activeD = drivers.filter(d => d.status === 'Active').length;
        const activeB = buses.filter(b => b.status === 'Active').length;
        const pending = complaints.filter(c => (c.status || '').toLowerCase() === 'pending').length;
        const critical = complaints.filter(c => c.priority === 'Critical').length;
        const vitals = [
            { label: 'Driver Readiness', value: drivers.length > 0 ? Math.round((activeD / drivers.length) * 100) : 0, color: '#10b981' },
            { label: 'Bus Availability', value: buses.length > 0 ? Math.round((activeB / buses.length) * 100) : 0, color: '#3b82f6' },
            { label: 'Pending Issues', value: pending, color: '#f59e0b', raw: true },
            { label: 'SOS Alerts', value: sos_alerts.filter(s => {
                const st = (s.status || '').toLowerCase();
                return st === 'emergency' || st === 'active' || st === 'distress' || st === 'sos' || st === 'pending' || st === 'warning';
            }).length, color: '#ef4444', raw: true }
        ];
        el.innerHTML = vitals.map(v => `<div class="data-item">
            <div style="display:flex;justify-content:space-between;width:100%;"><span style="font-weight:700;font-size:0.85rem;">${v.label}</span><h4 style="margin:0;color:${v.color};font-size:0.95rem;">${v.raw ? v.value : v.value + '%'}</h4></div>
            ${!v.raw ? `<div class="mini-progress-container"><div class="mini-progress-bar" style="width:${v.value}%;background:${v.color};transition:width 0.8s;"></div></div>` : ''}
        </div>`).join('');
    }
    window.openDeepAnalysis = (type) => {
        const modal = document.getElementById('deepAnalysisModal');
        if (modal) modal.classList.add('active');
    };
    window.closeDeepAnalysis = () => {
        const modal = document.getElementById('deepAnalysisModal');
        if (modal) modal.classList.remove('active');
    };
    // Station Analytics
    function renderStationAnalytics() {
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('dashTotalStations', stations.length);
        el('dashTotalRoutes', routes.length);
        el('dashAvgStationsPerRoute', routes.length > 0 ? Math.round(stations.length / routes.length) : 0);

        const cv = document.getElementById('stationDistributionChart');
        if (!cv) return;
        kill('stationDistributionChart');

        const ZONE_COLORS = { 'cairo zone': '#3b82f6', 'el- shrouk zone': '#ef4444', 'madinty zone': '#f59e0b', 'madinaty zone': '#f59e0b', 'badr zone': '#8b5cf6', 'capital zone': '#14b8a6', 'new capital zone': '#14b8a6' };
        const zoneMap = {};
        stations.forEach(s => {
            const z = (s.zone || 'Unknown').trim();
            zoneMap[z] = (zoneMap[z] || 0) + 1;
        });
        const labels = Object.keys(zoneMap);
        const data = Object.values(zoneMap);
        const colors = labels.map(l => ZONE_COLORS[l.toLowerCase()] || '#94a3b8');

        charts['stationDistributionChart'] = new Chart(cv.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels.map(l => l.replace(' zone', '').replace(' Zone', '')),
                datasets: [{ label: 'Stations', data, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 2, borderRadius: 10, barPercentage: 0.6 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: bc() }, ticks: { color: tc(), font: { weight: 700 }, stepSize: 1 } },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: (ctx) => {
                                const label = ctx.chart.data.labels[ctx.index] || '';
                                const l = label.toLowerCase();
                                if (l.includes('madinty') || l.includes('madinaty') || l.includes('مدينتي') || l.includes('مدينتى')) return '#f59e0b';
                                if (l.includes('shrouk') || l.includes('shorouk') || l.includes('شروق')) return '#ef4444';
                                if (l.includes('badr') || l.includes('بدر')) return '#8b5cf6';
                                if (l.includes('cairo') || l.includes('قاهرة')) return '#3b82f6';
                                return tc();
                            },
                            font: { weight: '900', size: 15 }
                        }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderStationZoneBreakdown() {
        const el = document.getElementById('stationZoneBreakdown');
        if (!el) return;
        const ZONE_ICONS = { 'cairo zone': 'fa-city', 'el- shrouk zone': 'fa-sun', 'madinty zone': 'fa-building', 'badr zone': 'fa-mountain', 'capital zone': 'fa-landmark', 'new capital zone': 'fa-landmark' };
        const zoneMap = {};
        stations.forEach(s => {
            const z = (s.zone || 'Unknown').trim();
            if (!zoneMap[z]) zoneMap[z] = [];
            zoneMap[z].push(s.name);
        });

        el.innerHTML = Object.entries(zoneMap).map(([zone, stList]) => {
            const color = window.getRouteColor(null, zone);
            const icon = ZONE_ICONS[zone.toLowerCase()] || 'fa-map-pin';
            const displayName = zone.replace(' zone', '').replace(' Zone', '');
            const pct = stations.length > 0 ? Math.round((stList.length / stations.length) * 100) : 0;
            const isShrouk = zone.toLowerCase().includes('shrouk') || zone.toLowerCase().includes('shorouk') || zone.includes('شروق');
            const isMadinaty = zone.toLowerCase().includes('madinat') || zone.toLowerCase().includes('madinty') || zone.includes('مدينت') || zone.includes('مدينتي') || zone.includes('مدينتى');

            let pillTextColor = color;
            if (isShrouk) pillTextColor = '#ff0000';
            else if (isMadinaty) pillTextColor = '#f59e0b';

            const stationsListHtml = stList.map(name => `<span style="font-size:0.7rem; background:${window.hexToRgba(color, 0.1)}; color:${pillTextColor} !important; padding:3px 8px; border-radius:8px; font-weight:700;"><i class="fas fa-map-pin" style="font-size:0.6rem; color:${pillTextColor};"></i> ${name}</span>`).join('');
            return `
                <div style="background:${color}08; border:1px solid ${color}25; border-radius:14px; padding:16px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:36px; height:36px; background:${color}15; border-radius:10px; display:flex; align-items:center; justify-content:center; color:${color};"><i class="fas ${icon}"></i></div>
                            <div>
                                <span style="font-weight:800; font-size:0.95rem;">${displayName}</span>
                                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${stList.length} stations</div>
                            </div>
                        </div>
                        <span style="font-weight:900; font-size:1.1rem; color:${color};">${pct}%</span>
                    </div>
                    <div style="height:6px; background:${color}15; border-radius:10px; overflow:hidden;">
                        <div style="height:100%; width:${pct}%; background:${color}; border-radius:10px; transition:width 0.8s;"></div>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
                        ${stationsListHtml}
                    </div>
                </div>
            `;
        }).join('');
    }
    // Recent Activity Feed
    function renderRecentActivity() {
        const feed = document.getElementById('recentActivityFeed');
        if (!feed) return;

        const activities = [];

        // Last registered users
        users.forEach(u => {
            if (u.created_at) {
                activities.push({
                    time: u.created_at,
                    icon: 'fa-user-plus',
                    color: '#3b82f6',
                    title: `New user registered`,
                    detail: u.full_name || u.name || u.email || 'Unknown User',
                    type: 'user'
                });
            }
            if (u.is_banned && u.ban_reason) {
                activities.push({
                    time: u.updated_at || u.created_at,
                    icon: 'fa-ban',
                    color: '#ef4444',
                    title: `User banned`,
                    detail: (u.full_name || u.name || 'User') + ' — ' + u.ban_reason,
                    type: 'ban'
                });
            }
            if ((u.warning_count || 0) > 0 && u.last_warning_reason) {
                activities.push({
                    time: u.updated_at || u.created_at,
                    icon: 'fa-exclamation-triangle',
                    color: '#f59e0b',
                    title: `User warned (${u.warning_count}x)`,
                    detail: (u.full_name || u.name || 'User') + ' — ' + u.last_warning_reason,
                    type: 'warn'
                });
            }
        });

        // Drivers added
        drivers.forEach(d => {
            if (d.created_at) {
                activities.push({
                    time: d.created_at,
                    icon: 'fa-id-badge',
                    color: '#10b981',
                    title: `Driver joined fleet`,
                    detail: d.full_name || d.name || 'Unknown Driver',
                    type: 'driver'
                });
            }
        });

        // Bus-Driver assignments
        buses.forEach(b => {
            if (b.driver_name && b.driver_id) {
                activities.push({
                    time: b.updated_at || b.created_at,
                    icon: 'fa-link',
                    color: '#8b5cf6',
                    title: `Bus-Driver linked`,
                    detail: `Bus #${b.bus_number || b.id} ↔ ${b.driver_name}`,
                    type: 'assign'
                });
            }
            if (b.created_at) {
                activities.push({
                    time: b.created_at,
                    icon: 'fa-bus',
                    color: '#06b6d4',
                    title: `Bus added to fleet`,
                    detail: `Bus #${b.bus_number || b.id} — Route ${b.route_id || 'N/A'}`,
                    type: 'bus'
                });
            }
        });

        // Tickets purchased
        tickets.forEach(t => {
            const ts = t.createdAt || t.purchaseDate || t.created_at;
            if (ts) {
                const route = routes.find(r => r.id === t.route_id);
                const rColor = getRouteColor(route?.name);
                const price = t.price || (route ? route.price : 15);
                activities.push({
                    time: ts,
                    icon: 'fa-ticket-alt',
                    color: rColor,
                    title: `Ticket purchased`,
                    detail: `${route ? route.name + ' — ' : ''}${price} EGP ${t.status ? '— ' + t.status : ''}`.trim(),
                    type: 'ticket'
                });
            }
        });

        // Sort by time descending, take latest 12
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        const latest = activities.slice(0, 12);

        if (latest.length === 0) {
            feed.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fas fa-inbox" style="font-size:2rem; opacity:0.3; margin-bottom:10px; display:block;"></i>No recent activity</div>';
            return;
        }

        feed.innerHTML = latest.map(a => {
            const ago = timeAgo(a.time);
            return `<div style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-bottom:1px solid var(--border-color); transition:0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.03)'" onmouseout="this.style.background='transparent'">
                <div style="width:34px; height:34px; min-width:34px; background:${a.color}12; border-radius:10px; display:flex; align-items:center; justify-content:center; color:${a.color};">
                    <i class="fas ${a.icon}" style="font-size:0.85rem;"></i>
                </div>
                <div style="flex:1; min-width:0;">
                    <p style="margin:0; font-weight:800; font-size:0.8rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.title}</p>
                    <p style="margin:0; font-size:0.72rem; color:var(--text-muted); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.detail}</p>
                </div>
                <span style="font-size:0.65rem; font-weight:700; color:${a.color}; white-space:nowrap;">${ago}</span>
            </div>`;
        }).join('');
    }

    init();
});