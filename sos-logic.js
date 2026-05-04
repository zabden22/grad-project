// sos-logic.js
document.addEventListener('DOMContentLoaded', () => {
    const alertsGrid = document.getElementById('sosAlertsGrid');
    const criticalCountDisplay = document.getElementById('criticalCountDisplay');
    const warningCountDisplay = document.getElementById('warningCountDisplay');

    let activeAlerts = [];
    let driversMap = {};
    let busesMap = {};

    // 1. Data Fetching
    async function loadSOSIntelligence() {
        try {
            // Load lookups
            const [drRes, buRes] = await Promise.all([
                supabase.from('drivers').select('id, full_name, photo_url'),
                supabase.from('buses').select('id, bus_number, license_plate')
            ]);
            
            if (drRes.data) drRes.data.forEach(d => driversMap[d.id] = d);
            if (buRes.data) buRes.data.forEach(b => busesMap[b.id] = b);

            // Load active alerts
            const { data, error } = await supabase
                .from('sos_alerts')
                .select('*')
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false });

            if (error) throw error;
            activeAlerts = data || [];
            renderSOSAlerts();
        } catch (err) {
            console.error('[SOS] Matrix Sync Error:', err);
        }
    }

    // 2. Rendering
    function renderSOSAlerts() {
        const scanningState = document.getElementById('scanningState');
        if (!alertsGrid || !scanningState) return;

        if (activeAlerts.length === 0) {
            scanningState.style.display = 'flex';
            alertsGrid.innerHTML = '';
            criticalCountDisplay.innerText = '0';
            warningCountDisplay.innerText = '0';
            return;
        }

        scanningState.style.display = 'none';
        let crit = 0, warn = 0;
        alertsGrid.innerHTML = '';

        activeAlerts.forEach(alert => {
            const isCritical = alert.type === 'CRITICAL';
            if (isCritical) crit++; else warn++;

            const driver = driversMap[alert.driver_id] || { full_name: 'Unknown Driver' };
            const bus = busesMap[alert.bus_id] || { bus_number: 'N/A' };
            const timeStr = new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const card = document.createElement('div');
            card.className = `alert-card-minimal`;
            card.style = `
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid ${isCritical ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'};
                border-radius: 20px; padding: 25px;
                transition: 0.3s;
                position: relative;
            `;
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <div style="background:${isCritical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color:${isCritical ? '#ef4444' : '#f59e0b'}; padding:8px 15px; border-radius:50px; font-weight:900; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">
                        ${isCritical ? 'Priority Alpha' : 'Manual Signal'}
                    </div>
                    <span style="font-weight:800; font-size:0.85rem; opacity:0.5;">#BUS-${bus.bus_number}</span>
                </div>

                <h3 style="font-weight:900; font-size:1.4rem; margin-bottom:20px;">
                    ${isCritical ? 'CRITICAL COLLISION REPORT' : 'ASSISTANCE REQUESTED'}
                </h3>

                <div style="background:rgba(255,255,255,0.02); border-radius:15px; padding:15px; margin-bottom:25px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <div style="font-size:0.6rem; font-weight:800; text-transform:uppercase; opacity:0.4; margin-bottom:3px;">Personnel</div>
                        <div style="font-weight:800; font-size:0.9rem;">${driver.full_name}</div>
                    </div>
                    <div>
                        <div style="font-size:0.6rem; font-weight:800; text-transform:uppercase; opacity:0.4; margin-bottom:3px;">Intercept</div>
                        <div style="font-weight:800; font-size:0.9rem;">${timeStr}</div>
                    </div>
                </div>

                <div style="display:flex; gap:10px;">
                    <button style="flex:1; background:${isCritical ? '#ef4444' : '#3b82f6'}; color:#fff; border:none; padding:12px; border-radius:12px; font-weight:900; cursor:pointer;" onclick="interceptSOS('${alert.bus_id}', ${alert.latitude}, ${alert.longitude})">INTERCEPT</button>
                    <button style="background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.1); padding:12px 20px; border-radius:12px; font-weight:800; cursor:pointer;" onclick="resolveIncident('${alert.id}')">SECURE</button>
                </div>
            `;
            alertsGrid.appendChild(card);
        });

        const critCount = document.getElementById('criticalCountDisplay');
        const warnCount = document.getElementById('warningCountDisplay');
        if (critCount) critCount.innerText = crit;
        if (warnCount) warnCount.innerText = warn;
    }

    function addToIntelFeed(msg, type = 'LOG') {
        const feed = document.getElementById('liveFeedItems');
        if (!feed) return;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const item = document.createElement('div');
        item.className = 'log-bubble';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="font-weight:900; color:${type === 'CRITICAL_ALERT' ? '#ef4444' : 'var(--primary-color)'}; font-size:0.75rem;">${type}</span>
                <span style="font-size:0.7rem; color:var(--text-muted);">${time}</span>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">${msg}</p>
        `;
        feed.prepend(item);
        if (feed.children.length > 15) feed.lastElementChild.remove();
    }

    // 3. Operations
    window.dispatchEmergency = (unit, id) => {
        Swal.fire({
            title: `Dispatching ${unit}...`,
            text: 'Emergency units are being notified immediately.',
            icon: 'info',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            confirmButtonColor: '#ef4444'
        });
    };

    window.dispatchSupportBus = (id) => {
        Swal.fire({
            title: 'Support Bus Dispatched',
            text: 'Nearest available fleet asset has been rerouted.',
            icon: 'success',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            confirmButtonColor: '#3b82f6'
        });
    };

    window.resolveIncident = async (id) => {
        try {
            const { error } = await supabase.from('sos_alerts').update({ status: 'RESOLVED' }).eq('id', id);
            if (error) throw error;
            loadSOSIntelligence();
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    // 4. Real-time Subscription (Local)
    supabase.channel('sos_local_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, () => {
            loadSOSIntelligence();
        })
        .subscribe();

    // 5. Initial Load
    loadSOSIntelligence();
});
