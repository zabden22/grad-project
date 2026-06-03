document.addEventListener('DOMContentLoaded', () => {    const adminName = localStorage.getItem('activeAdminName') || 'Moscow';    document.getElementById('topBarName').innerText = adminName;
    
    const lang = localStorage.getItem('transitLang') || 'en';
    document.getElementById('welcomeMessage').innerText = (lang === 'ar' ? '┘à╪▒╪¡╪¿╪º┘ï ' : 'Hello ') + adminName + ' !';    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);    const datePickerInput = document.getElementById('datePickerInput');
    const periodTabs = document.getElementById('periodTabs');
    const dateRangeLabel = document.getElementById('dateRangeLabel');    const today = new Date();
    datePickerInput.value = today.toISOString().split('T')[0];

    let selectedDate = new Date(today);
    let selectedPeriod = 'daily';    let allTickets = [];
    let allBuses = [];
    let allDrivers = [];
    let allStations = [];    datePickerInput.addEventListener('change', (e) => {
        selectedDate = new Date(e.target.value + 'T00:00:00');
        refreshDashboard();
    });    periodTabs.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            periodTabs.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedPeriod = tab.dataset.period;
            refreshDashboard();
        });
    });    function getDateRange() {
        const d = new Date(selectedDate);
        let start, end;

        switch (selectedPeriod) {
            case 'daily':
                start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
                end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
                break;
            case 'weekly':
                const dayOfWeek = d.getDay();
                start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek, 0, 0, 0);
                end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - dayOfWeek), 23, 59, 59);
                break;
            case 'monthly':
                start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
                end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'yearly':
                start = new Date(d.getFullYear(), 0, 1, 0, 0, 0);
                end = new Date(d.getFullYear(), 11, 31, 23, 59, 59);
                break;
        }
        return { start, end };
    }    function formatDateRange() {
        const { start, end } = getDateRange();
        const opts = { year: 'numeric', month: 'short', day: 'numeric' };
        const currentLang = localStorage.getItem('transitLang') || 'en';
        const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';

        switch (selectedPeriod) {
            case 'daily':
                return start.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            case 'weekly':
                return start.toLocaleDateString(locale, opts) + ' ΓåÆ ' + end.toLocaleDateString(locale, opts);
            case 'monthly':
                return start.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
            case 'yearly':
                return start.getFullYear().toString();
        }
    }    function filterTicketsByPeriod(tickets) {
        const { start, end } = getDateRange();
        return tickets.filter(t => {
            const ticketDate = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
            return ticketDate >= start && ticketDate <= end;
        });
    }    const API_BASE = 'https://transit-way.runasp.net/api';

    async function fetchAllData() {        document.querySelectorAll('.stat-loader').forEach(el => el.style.display = 'inline-block');

        try {            const [ticketsRes, busesRes, driversRes, stationsRes, ticketDashRes] = await Promise.allSettled([
                fetch(`${API_BASE}/Tickets`),
                fetch(`${API_BASE}/Bus`),
                fetch(`${API_BASE}/Driver`),
                fetch(`${API_BASE}/Stations`),
                fetch(`${API_BASE}/Tickets/dashboard`)
            ]);            if (ticketsRes.status === 'fulfilled' && ticketsRes.value.ok) {
                const data = await ticketsRes.value.json();
                allTickets = Array.isArray(data) ? data : (data.$values || []);
            }            if (busesRes.status === 'fulfilled' && busesRes.value.ok) {
                const data = await busesRes.value.json();
                allBuses = Array.isArray(data) ? data : (data.$values || []);
            }            if (driversRes.status === 'fulfilled' && driversRes.value.ok) {
                const data = await driversRes.value.json();
                allDrivers = Array.isArray(data) ? data : (data.$values || []);
            }            if (stationsRes.status === 'fulfilled' && stationsRes.value.ok) {
                const data = await stationsRes.value.json();
                allStations = Array.isArray(data) ? data : (data.$values || []);
            }            if (ticketDashRes.status === 'fulfilled' && ticketDashRes.value.ok) {
                ticketDashboardData = await ticketDashRes.value.json();
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        }        refreshDashboard();
    }    function refreshDashboard() {        dateRangeLabel.textContent = formatDateRange();        const filtered = filterTicketsByPeriod(allTickets);        const soldCount = filtered.length;
        const revenue = filtered.reduce((sum, t) => sum + (t.price || 15), 0);

        animateCount('ticketsCount', soldCount);
        animateCount('revenueCount', revenue.toLocaleString());        animateCount('busesCount', allBuses.length);
        animateCount('driversCount', allDrivers.length);
        animateCount('stationsCount', allStations.length);        document.querySelectorAll('.stat-loader').forEach(el => el.style.display = 'none');        updateChart(filtered);        updateSecondaryCharts();        renderRecentTickets(filtered);
    }    function animateCount(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;        el.innerHTML = '';

        const targetNum = typeof targetValue === 'number' ? targetValue : parseInt(String(targetValue).replace(/,/g, ''), 10);
        
        if (isNaN(targetNum)) {
            el.textContent = targetValue;
            return;
        }

        const duration = 600;
        const startTime = performance.now();
        const startVal = parseInt(el.textContent) || 0;

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);            const eased = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(startVal + (targetNum - startVal) * eased);
            el.textContent = current.toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }    const ctx = document.getElementById('myChart').getContext('2d');    const gradientSold = ctx.createLinearGradient(0, 0, 0, 400);
    gradientSold.addColorStop(0, 'rgba(86, 142, 116, 0.3)');
    gradientSold.addColorStop(1, 'rgba(86, 142, 116, 0.01)');

    const gradientRevenue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientRevenue.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradientRevenue.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    const gradientAvailable = ctx.createLinearGradient(0, 0, 0, 400);
    gradientAvailable.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    gradientAvailable.addColorStop(1, 'rgba(34, 197, 94, 0.01)');

    const gradientUsed = ctx.createLinearGradient(0, 0, 0, 400);
    gradientUsed.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    gradientUsed.addColorStop(1, 'rgba(239, 68, 68, 0.01)');

    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Sold Tickets',
                    data: [],
                    borderColor: '#568e74',
                    backgroundColor: gradientSold,
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#568e74',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                    fill: true
                },
                {
                    label: 'Revenue (EGP)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: gradientRevenue,
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false 
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Plus Jakarta Sans', weight: '700', size: 13 },
                    bodyFont: { family: 'Plus Jakarta Sans', weight: '600', size: 12 },
                    padding: 14,
                    cornerRadius: 12,
                    displayColors: true,
                    boxPadding: 6
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { font: { family: 'Plus Jakarta Sans', weight: '600' } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { font: { family: 'Plus Jakarta Sans', weight: '600' } },
                    grid: { display: false }
                }
            }
        }
    });    function buildCustomLegend() {
        const legendEl = document.getElementById('chartLegend');
        legendEl.innerHTML = `
            <span class="legend-item"><span class="legend-dot" style="background:#568e74;"></span> Sold</span>
            <span class="legend-item"><span class="legend-dot" style="background:#3b82f6;"></span> Revenue</span>
        `;
    }
    buildCustomLegend();    function updateChartColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f8fafc' : '#1e293b';
        const gridColor = isDark ? '#334155' : 'rgba(148, 163, 184, 0.15)';

        myChart.options.scales.x.ticks.color = textColor;
        myChart.options.scales.y.ticks.color = textColor;
        myChart.options.scales.y.grid.color = gridColor;
        myChart.update();
    }    function updateChart(filteredTickets) {
        let labels = [];
        let soldData = [];
        let revenueData = [];

        const { start, end } = getDateRange();
        const currentLang = localStorage.getItem('transitLang') || 'en';

        switch (selectedPeriod) {
            case 'daily': {                for (let h = 0; h < 24; h++) {
                    labels.push(h.toString().padStart(2, '0') + ':00');
                    const hourTickets = filteredTickets.filter(t => {
                        const d = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
                        return d.getHours() === h;
                    });
                    soldData.push(hourTickets.length);
                    revenueData.push(hourTickets.reduce((s, t) => s + (t.price || 15), 0));
                }
                break;
            }
            case 'weekly': {
                const dayNames = currentLang === 'ar'
                    ? ['╪º┘ä╪ú╪¡╪»', '╪º┘ä╪º╪½┘å┘è┘å', '╪º┘ä╪½┘ä╪º╪½╪º╪í', '╪º┘ä╪ú╪▒╪¿╪╣╪º╪í', '╪º┘ä╪«┘à┘è╪│', '╪º┘ä╪¼┘à╪╣╪⌐', '╪º┘ä╪│╪¿╪¬']
                    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(start);
                    dayDate.setDate(start.getDate() + i);
                    labels.push(dayNames[dayDate.getDay()]);
                    const dayTickets = filteredTickets.filter(t => {
                        const d = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
                        return d.toDateString() === dayDate.toDateString();
                    });
                    soldData.push(dayTickets.length);
                    revenueData.push(dayTickets.reduce((s, t) => s + (t.price || 15), 0));
                }
                break;
            }
            case 'monthly': {
                const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    labels.push(day.toString());
                    const dayDate = new Date(start.getFullYear(), start.getMonth(), day);
                    const dayTickets = filteredTickets.filter(t => {
                        const d = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
                        return d.toDateString() === dayDate.toDateString();
                    });
                    soldData.push(dayTickets.length);
                    revenueData.push(dayTickets.reduce((s, t) => s + (t.price || 15), 0));
                }
                break;
            }
            case 'yearly': {
                const monthNames = currentLang === 'ar'
                    ? ['┘è┘å╪º┘è╪▒', '┘ü╪¿╪▒╪º┘è╪▒', '┘à╪º╪▒╪│', '╪ú╪¿╪▒┘è┘ä', '┘à╪º┘è┘ê', '┘è┘ê┘å┘è┘ê', '┘è┘ê┘ä┘è┘ê', '╪ú╪║╪│╪╖╪│', '╪│╪¿╪¬┘à╪¿╪▒', '╪ú┘â╪¬┘ê╪¿╪▒', '┘å┘ê┘ü┘à╪¿╪▒', '╪»┘è╪│┘à╪¿╪▒']
                    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                for (let m = 0; m < 12; m++) {
                    labels.push(monthNames[m]);
                    const monthTickets = filteredTickets.filter(t => {
                        const d = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
                        return d.getMonth() === m;
                    });
                    soldData.push(monthTickets.length);
                    revenueData.push(monthTickets.reduce((s, t) => s + (t.price || 15), 0));
                }
                break;
            }
        }        const titleEl = document.getElementById('chartTitle');
        const subtitleEl = document.getElementById('chartSubtitle');
        const periodLabels = {
            daily: currentLang === 'ar' ? '┘à╪¿┘è╪╣╪º╪¬ ╪º┘ä╪¬╪░╪º┘â╪▒ ΓÇö ┘è┘ê┘à┘è' : 'Ticket Sales ΓÇö Daily',
            weekly: currentLang === 'ar' ? '┘à╪¿┘è╪╣╪º╪¬ ╪º┘ä╪¬╪░╪º┘â╪▒ ΓÇö ╪ú╪│╪¿┘ê╪╣┘è' : 'Ticket Sales ΓÇö Weekly',
            monthly: currentLang === 'ar' ? '┘à╪¿┘è╪╣╪º╪¬ ╪º┘ä╪¬╪░╪º┘â╪▒ ΓÇö ╪┤┘ç╪▒┘è' : 'Ticket Sales ΓÇö Monthly',
            yearly: currentLang === 'ar' ? '┘à╪¿┘è╪╣╪º╪¬ ╪º┘ä╪¬╪░╪º┘â╪▒ ΓÇö ╪│┘å┘ê┘è' : 'Ticket Sales ΓÇö Yearly'
        };
        titleEl.textContent = periodLabels[selectedPeriod];
        subtitleEl.textContent = formatDateRange();        myChart.data.labels = labels;
        myChart.data.datasets[0].data = soldData;
        myChart.data.datasets[1].data = revenueData;
        myChart.update('active');

        updateChartColors();
    }    let busStatusChart, driverStatusChart, stationStatusChart, statusTicketChart;
    let ticketDashboardData = { total: 0, sold: 0, cancelled: 0, expired: 0 };

    function initSecondaryCharts() {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    enabled: true,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 10,
                    cornerRadius: 8
                } 
            }
        };

        const busCtx = document.getElementById('statusBusChart').getContext('2d');
        statusBusChart = new Chart(busCtx, {
            type: 'doughnut',
            data: { labels: ['Moving', 'Idle', 'Inactive'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#3b82f6', '#22c55e', '#f97316'], borderWidth: 0 }] },
            options: commonOptions
        });

        const driverCtx = document.getElementById('statusDriverChart').getContext('2d');
        driverStatusChart = new Chart(driverCtx, {
            type: 'doughnut',
            data: { labels: ['On Duty', 'Available', 'Inactive'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#8b5cf6', '#10b981', '#94a3b8'], borderWidth: 0 }] },
            options: commonOptions
        });

        const ticketCtx = document.getElementById('statusTicketChart').getContext('2d');
        statusTicketChart = new Chart(ticketCtx, {
            type: 'doughnut',
            data: { labels: ['Sold', 'Expired', 'Cancelled'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#568e74', '#f59e0b', '#ef4444'], borderWidth: 0 }] },
            options: commonOptions
        });

        const stationCtx = document.getElementById('statusStationChart').getContext('2d');
        stationStatusChart = new Chart(stationCtx, {
            type: 'doughnut',
            data: { labels: ['Active', 'Maintenance'], datasets: [{ data: [0, 0], backgroundColor: ['#0ea5e9', '#f97316'], borderWidth: 0 }] },
            options: commonOptions
        });
    }
    function updateSecondaryCharts() {
        if (!statusBusChart || !driverStatusChart || !stationStatusChart || !statusTicketChart) {
            console.warn("Charts not initialized yet.");
            return;
        }

        const currentLang = localStorage.getItem('transitLang') || 'en';
        const totalText = currentLang === 'ar' ? '╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è' : 'Total';

        const labels = currentLang === 'ar' ? {
            moving: '┘à╪¬╪¡╪▒┘â', idle: '╪º┘å╪¬╪╕╪º╪▒', inactive: '╪║┘è╪▒ ┘å╪┤╪╖',
            onDuty: '┘ü┘è ╪º┘ä╪«╪»┘à╪⌐', available: '┘à╪¬┘ê┘ü╪▒',
            sold: '┘à╪¿╪º╪╣', expired: '┘à┘å╪¬┘ç┘è', cancelled: '┘à┘ä╪║┘è',
            active: '┘å╪┤╪╖', maintenance: '╪╡┘è╪º┘å╪⌐'
        } : {
            moving: 'Moving', idle: 'Idle', inactive: 'Inactive',
            onDuty: 'On Duty', available: 'Available',
            sold: 'Sold', expired: 'Expired', cancelled: 'Cancelled',
            active: 'Active', maintenance: 'Maintenance'
        };        const movingBuses = allBuses.filter(b => {
            const statusStr = String(b.status || 'Active').trim().toLowerCase();
            const speed = parseFloat(b.speed) || 0;
            return speed > 0 && statusStr === 'active';
        }).length;

        const idleBuses = allBuses.filter(b => {
            const statusStr = String(b.status || 'Active').trim().toLowerCase();
            const speed = parseFloat(b.speed) || 0;
            return speed <= 0 && statusStr === 'active';
        }).length;

        const inactiveBuses = allBuses.filter(b => {
            const statusStr = String(b.status || 'Active').trim().toLowerCase();
            return statusStr !== 'active';
        }).length;

        const busData = [movingBuses, idleBuses, inactiveBuses];
        statusBusChart.data.datasets[0].data = busData;
        statusBusChart.update('none');
        document.getElementById('busTotalLabel').textContent = `${totalText}: ${allBuses.length}`;
        
        renderCardLegend('busLegend', [
            { label: labels.moving, color: '#3b82f6', value: movingBuses },
            { label: labels.idle, color: '#22c55e', value: idleBuses },
            { label: labels.inactive, color: '#f97316', value: inactiveBuses }
        ]);        const activeStations = allStations.filter(s => {
             const statusStr = String(s.status || 'Active').trim().toLowerCase();
             return statusStr === 'active';
        }).length;
        const maintStations = allStations.length - activeStations;
        
        stationStatusChart.data.datasets[0].data = [activeStations, maintStations];
        stationStatusChart.update('none');
        document.getElementById('stationTotalLabel').textContent = `${totalText}: ${allStations.length}`;
        renderCardLegend('stationLegend', [
            { label: labels.active, color: '#0ea5e9', value: activeStations },
            { label: labels.maintenance, color: '#f97316', value: maintStations }
        ]);        const inactiveDrivers = allDrivers.filter(d => {
             const statusStr = String(d.status || 'Active').trim().toLowerCase();
             return statusStr !== 'active';
        }).length;
        const onDutyDrivers = allDrivers.filter(d => {
             const statusStr = String(d.status || 'Active').trim().toLowerCase();             const hasBus = d.busId || d.BusId || d.bus;
             return statusStr === 'active' && hasBus;
        }).length;
        const availableDrivers = allDrivers.length - (inactiveDrivers + onDutyDrivers);
        
        driverStatusChart.data.datasets[0].data = [onDutyDrivers, availableDrivers, inactiveDrivers];
        driverStatusChart.update('none');
        document.getElementById('driverTotalLabel').textContent = `${totalText}: ${allDrivers.length}`;
        renderCardLegend('driverLegend', [
            { label: labels.onDuty, color: '#8b5cf6', value: onDutyDrivers },
            { label: labels.available, color: '#10b981', value: availableDrivers },
            { label: labels.inactive, color: '#94a3b8', value: inactiveDrivers }
        ]);        const tTotal = ticketDashboardData.total || 0;
        const tSold = ticketDashboardData.sold || 0;
        const tExpired = ticketDashboardData.expired || 0;
        const tCancelled = ticketDashboardData.cancelled || 0;
        
        statusTicketChart.data.datasets[0].data = [tSold, tExpired, tCancelled];
        statusTicketChart.update('none');
        document.getElementById('ticketTotalLabel').textContent = `${totalText}: ${tTotal}`;
        renderCardLegend('ticketLegend', [
            { label: labels.sold, color: '#568e74', value: tSold },
            { label: labels.expired, color: '#f59e0b', value: tExpired },
            { label: labels.cancelled, color: '#ef4444', value: tCancelled }
        ]);
    }

    function renderCardLegend(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(item => `
            <div class="status-legend-item">
                <span class="status-legend-dot" style="background:${item.color};"></span>
                <span>${item.label}: <span style="color:var(--text-main); font-weight:800;">${item.value}</span></span>
            </div>
        `).join('');
    }    function renderRecentTickets(filteredTickets) {
        const tbody = document.getElementById('recentTicketsBody');        const sorted = [...filteredTickets].sort((a, b) => {
            return new Date(b.createdAt || b.purchaseDate || 0) - new Date(a.createdAt || a.purchaseDate || 0);
        });
        const recent = sorted.slice(0, 8);

        if (recent.length === 0) {
            const currentLang = localStorage.getItem('transitLang') || 'en';
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-ticket-alt" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        ${currentLang === 'ar' ? '┘ä╪º ╪¬┘ê╪¼╪» ╪¬╪░╪º┘â╪▒ ┘ü┘è ┘ç╪░┘ç ╪º┘ä┘ü╪¬╪▒╪⌐' : 'No tickets in this period'}
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = '';
        recent.forEach(t => {
            const status = t.status || (t.isUsed ? 'Used' : 'Valid');
            const statusLower = status.toLowerCase();
            let badgeClass = '';
            if (statusLower === 'valid' || statusLower === 'active') badgeClass = 'badge-valid';
            else if (statusLower === 'used') badgeClass = 'badge-used';
            else if (statusLower === 'expired') badgeClass = 'badge-expired';
            else badgeClass = 'badge-canceled';

            const routeName = t.routeName || 'General';
            const dateStr = new Date(t.createdAt || t.purchaseDate || new Date()).toLocaleString();
            const price = `${t.price || 15} EGP`;

            tbody.innerHTML += `
                <tr>
                    <td style="font-family:monospace; font-weight:800; color:var(--text-main);">
                        <i class="fas fa-qrcode" style="color:var(--text-muted); margin-right:5px;"></i> TCK-${t.id}
                    </td>
                    <td style="font-weight:700;">${t.userName || 'Passenger'}</td>
                    <td><span class="route-badge">${routeName}</span></td>
                    <td style="color:var(--text-muted); font-weight:600; font-size:0.88rem;">${dateStr}</td>
                    <td style="font-weight:900; color:var(--primary-color);">${price}</td>
                    <td><span class="ticket-badge ${badgeClass}">${status}</span></td>
                </tr>
            `;
        });
    }    function populateActivityFeed() {
        const feedList = document.getElementById('activityFeedList');
        if (!feedList) return;

        const now = new Date();
        const activities = [];        const busNames = allBuses.slice(0, 8).map(b => b.busNumber || `B-${b.id}`);
        const driverNames = allDrivers.slice(0, 8).map(d => d.fullName || d.name || 'Driver');        if (busNames.length > 0) {
            activities.push({
                type: 'bus', dot: 'dot-bus',
                text: `Bus <strong>${busNames[0]}</strong> started route at ${new Date(now - 15 * 60 * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`,
                time: '15 min ago'
            });
            if (busNames[2]) activities.push({
                type: 'bus', dot: 'dot-bus',
                text: `Bus <strong>${busNames[2]}</strong> completed daily inspection ΓÇö all clear`,
                time: '42 min ago'
            });
        }        if (driverNames.length > 0 && busNames.length > 1) {
            activities.push({
                type: 'driver', dot: 'dot-driver',
                text: `<strong>${driverNames[0]}</strong> assigned to Bus <strong>${busNames[1]}</strong>`,
                time: '28 min ago'
            });
            if (driverNames[3]) activities.push({
                type: 'driver', dot: 'dot-driver',
                text: `<strong>${driverNames[3]}</strong> started shift ΓÇö now on duty`,
                time: '1 hour ago'
            });
        }        const recentTicketCount = allTickets.length;
        if (recentTicketCount > 0) {
            activities.push({
                type: 'ticket', dot: 'dot-ticket',
                text: `<strong>${recentTicketCount}</strong> tickets sold today ΓÇö Revenue: <strong>${(recentTicketCount * 15).toLocaleString()} EGP</strong>`,
                time: '35 min ago'
            });
        }        if (allStations.length > 0) {
            const stationName = allStations[0]?.name || allStations[0]?.stationName || 'Main Station';
            activities.push({
                type: 'station', dot: 'dot-station',
                text: `Station <strong>${stationName}</strong> reported high traffic volume`,
                time: '1 hour ago'
            });
        }        activities.push({
            type: 'report', dot: 'dot-report',
            text: `New maintenance report received ΓÇö <strong>review pending</strong>`,
            time: '2 hours ago'
        });        activities.push({
            type: 'admin', dot: 'dot-admin',
            text: `System settings updated by <strong>${adminName}</strong>`,
            time: '3 hours ago'
        });        feedList.innerHTML = activities.slice(0, 8).map(act => `
            <div class="activity-item">
                <div class="activity-dot-wrap">
                    <div class="activity-dot ${act.dot}"></div>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${act.text}</div>
                    <div class="activity-time"><i class="fas fa-clock"></i> ${act.time}</div>
                </div>
            </div>
        `).join('');
    }    initSecondaryCharts();
    fetchAllData();    setTimeout(populateActivityFeed, 3000);    setInterval(() => {
        fetchAllData();
    }, 15000);    setInterval(populateActivityFeed, 60000);    window.addEventListener('langChanged', () => {
        const newLang = localStorage.getItem('transitLang') || 'en';
        document.getElementById('welcomeMessage').innerText = (newLang === 'ar' ? '┘à╪▒╪¡╪¿╪º┘ï ' : 'Hello ') + adminName + ' !';
        refreshDashboard();
        populateActivityFeed();
    });    const observer = new MutationObserver(() => {
        updateChartColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

});

