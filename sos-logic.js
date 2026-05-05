// sos-logic.js — Full Supabase-Connected SOS Intelligence
document.addEventListener('DOMContentLoaded', () => {
    // ─── DOM References ───
    const feedList = document.getElementById('feedList');
    const emptyState = document.getElementById('emptyState');
    const detailEmpty = document.getElementById('detailEmpty');
    const detailActive = document.getElementById('detailActive');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnRespond = document.getElementById('btnRespond');
    const btnResolve = document.getElementById('btnResolve');
    const realtimeBadge = document.getElementById('realtimeBadge');

    // ─── State ───
    let allAlerts = [];
    let driversMap = {};
    let busesMap = {};
    let routesMap = {};
    let selectedAlert = null;
    let realtimeChannel = null;

    // ═══════════════════════════════════════
    //  1. INITIALIZATION
    // ═══════════════════════════════════════
    async function init() {
        console.log('[SOS] Initializing...');
        await loadLookups();
        await loadAlerts();
        setupRealtime();
        bindEvents();
    }

    // ═══════════════════════════════════════
    //  2. DATA LOADING (Supabase REST)
    // ═══════════════════════════════════════
    async function loadLookups() {
        try {
            const [drRes, buRes, rtRes] = await Promise.all([
                supabase.from('drivers').select('id, full_name, photo_url'),
                supabase.from('buses').select('id, bus_number, plate_number, route_id'),
                supabase.from('routes').select('id, name')
            ]);
            if (drRes.data) drRes.data.forEach(d => driversMap[d.id] = d);
            if (buRes.data) buRes.data.forEach(b => busesMap[b.id] = b);
            if (rtRes.data) rtRes.data.forEach(r => routesMap[r.id] = r);
            console.log('[SOS] Lookups loaded:', Object.keys(driversMap).length, 'drivers,', Object.keys(busesMap).length, 'buses');
        } catch (e) {
            console.error('[SOS] Lookup fetch failed:', e);
        }
    }

    async function loadAlerts() {
        try {
            const { data, error } = await supabase
                .from('sos_alerts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            allAlerts = data || [];
            console.log('[SOS] Loaded', allAlerts.length, 'alerts from database');
            updateStats();
            renderFeed();
        } catch (err) {
            console.error('[SOS] Load failed:', err);
            if (window.Swal) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Failed to load SOS alerts', timer: 3000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        }
    }

    // ═══════════════════════════════════════
    //  3. STATS UPDATE
    // ═══════════════════════════════════════
    function updateStats() {
        const now = new Date();
        const todayStr = now.toDateString();

        let active = 0, pending = 0, resolvedToday = 0;
        allAlerts.forEach(a => {
            const s = (a.status || '').toLowerCase();
            if (['emergency', 'sos', 'distress', 'critical', 'active'].includes(s)) active++;
            else if (['pending', 'warning'].includes(s)) pending++;

            if (['resolved', 'safe', 'secured'].includes(s)) {
                const d = new Date(a.updated_at || a.created_at);
                if (d.toDateString() === todayStr) resolvedToday++;
            }
        });

        setText('statActive', active);
        setText('statPending', pending);
        setText('statResolved', resolvedToday);
        setText('statTotal', allAlerts.length);
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }

    // ═══════════════════════════════════════
    //  4. RENDER FEED
    // ═══════════════════════════════════════
    function renderFeed() {
        if (!feedList) return;

        // Show only unresolved first, then resolved
        const unresolved = allAlerts.filter(a => !isResolved(a));
        const resolved = allAlerts.filter(a => isResolved(a));
        const sorted = [...unresolved, ...resolved];

        if (sorted.length === 0) {
            feedList.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        feedList.innerHTML = '';

        sorted.forEach(alert => {
            const card = createAlertCard(alert);
            feedList.appendChild(card);
        });
    }

    function isResolved(alert) {
        return ['resolved', 'safe', 'secured'].includes((alert.status || '').toLowerCase());
    }

    function getStatusInfo(status) {
        const s = (status || '').toLowerCase();
        if (['emergency', 'sos', 'distress', 'critical'].includes(s))
            return { label: 'Emergency', class: 'badge-critical', cardClass: 'critical' };
        if (['active'].includes(s))
            return { label: 'Active', class: 'badge-critical', cardClass: 'critical' };
        if (['pending', 'warning'].includes(s))
            return { label: 'Pending', class: 'badge-warning', cardClass: 'warning' };
        if (['resolved', 'safe', 'secured'].includes(s))
            return { label: 'Resolved', class: 'badge-pending', cardClass: '' };
        return { label: status || 'Unknown', class: 'badge-pending', cardClass: '' };
    }

    function createAlertCard(alert) {
        const info = getStatusInfo(alert.status);
        const driver = driversMap[alert.driver_id] || { full_name: 'Unknown' };
        const bus = busesMap[alert.bus_id] || { bus_number: '—', plate_number: '—' };
        const time = new Date(alert.created_at);
        const timeStr = time.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.className = `alert-card ${info.cardClass}`;
        if (selectedAlert && selectedAlert.id === alert.id) card.classList.add('selected');

        card.innerHTML = `
            <div class="alert-top">
                <span class="alert-badge ${info.class}">${info.label}</span>
                <span class="alert-time"><i class="far fa-clock"></i> ${timeStr}</span>
            </div>
            <div class="alert-message">${alert.message || (info.cardClass === 'critical' ? 'Emergency distress signal received' : 'Assistance requested by driver')}</div>
            <div class="alert-meta">
                <div class="meta-item"><label>Driver</label><span>${driver.full_name}</span></div>
                <div class="meta-item"><label>Bus</label><span>#${bus.bus_number} (${bus.plate_number})</span></div>
            </div>
        `;

        card.addEventListener('click', () => selectAlertCard(alert));
        return card;
    }

    // ═══════════════════════════════════════
    //  5. DETAIL PANEL
    // ═══════════════════════════════════════
    function selectAlertCard(alert) {
        selectedAlert = alert;
        renderFeed(); // Re-render to update selected state

        const info = getStatusInfo(alert.status);
        const driver = driversMap[alert.driver_id] || { full_name: 'Unknown' };
        const bus = busesMap[alert.bus_id] || { bus_number: '—', plate_number: '—', route_id: null };
        const route = routesMap[bus.route_id] || { name: '—' };
        const time = new Date(alert.created_at);

        // Show detail
        detailEmpty.style.display = 'none';
        detailActive.classList.add('visible');

        // Fill data
        document.getElementById('detailTitle').innerText = alert.message || 'SOS Alert';
        document.getElementById('detailBadge').innerText = info.label;
        document.getElementById('detailBadge').className = `alert-badge ${info.class}`;
        document.getElementById('detailTime').innerText = time.toLocaleString();
        document.getElementById('detailBus').innerText = `#${bus.bus_number}`;
        document.getElementById('detailPlate').innerText = bus.plate_number;
        document.getElementById('detailDriver').innerText = driver.full_name;
        document.getElementById('detailLocation').innerText = alert.location || route.name || '—';
        document.getElementById('detailMessage').innerText = alert.message || '—';
        document.getElementById('detailLat').innerText = alert.latitude ? parseFloat(alert.latitude).toFixed(6) : '—';
        document.getElementById('detailLng').innerText = alert.longitude ? parseFloat(alert.longitude).toFixed(6) : '—';

        // Timeline
        const timeline = document.getElementById('detailTimeline');
        timeline.innerHTML = '';
        addTimelineItem(timeline, '#3b82f6', `<strong>Alert created</strong> at ${time.toLocaleTimeString()}`);

        if (alert.status && !isResolved(alert)) {
            addTimelineItem(timeline, '#f59e0b', `Status: <strong>${alert.status}</strong> — awaiting response`);
        }
        if (isResolved(alert)) {
            const resolvedTime = alert.updated_at ? new Date(alert.updated_at).toLocaleTimeString() : '—';
            addTimelineItem(timeline, '#10b981', `<strong>Resolved</strong> at ${resolvedTime}`);
        }

        // Toggle buttons
        btnRespond.style.display = isResolved(alert) ? 'none' : 'flex';
        btnResolve.style.display = isResolved(alert) ? 'none' : 'flex';
    }

    function addTimelineItem(container, color, html) {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `<div class="timeline-dot" style="background:${color};"></div><div class="timeline-text">${html}</div>`;
        container.appendChild(item);
    }

    // ═══════════════════════════════════════
    //  6. ACTIONS (Write to Supabase)
    // ═══════════════════════════════════════
    function bindEvents() {
        if (btnRefresh) btnRefresh.addEventListener('click', loadAlerts);

        if (btnRespond) btnRespond.addEventListener('click', async () => {
            if (!selectedAlert) return;

            const { value: service } = await Swal.fire({
                title: 'Dispatch Emergency Service',
                input: 'select',
                inputOptions: { Police: '🚔 Police', Medical: '🚑 Medical', Fire: '🚒 Fire Department' },
                inputPlaceholder: 'Select service...',
                showCancelButton: true,
                confirmButtonText: 'Dispatch Now',
                confirmButtonColor: '#ef4444',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });

            if (service) {
                // Update status in DB
                const { error } = await supabase
                    .from('sos_alerts')
                    .eq('id', selectedAlert.id)
                    .update({ status: 'ACTIVE', message: (selectedAlert.message || 'SOS') + ` [${service} dispatched]` });

                if (error) {
                    Swal.fire({ icon: 'error', title: 'Dispatch Failed', text: error.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: `${service} Dispatched`,
                        text: `Emergency ${service} unit has been dispatched to Bus #${busesMap[selectedAlert.bus_id]?.bus_number || '??'}.`,
                        timer: 2500,
                        showConfirmButton: false,
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                    });
                    await loadAlerts();
                    if (selectedAlert) selectAlertCard(allAlerts.find(a => a.id === selectedAlert.id) || selectedAlert);
                }
            }
        });

        if (btnResolve) btnResolve.addEventListener('click', async () => {
            if (!selectedAlert) return;

            const result = await Swal.fire({
                title: 'Resolve this alert?',
                text: 'This will mark the distress signal as resolved and remove it from the active feed.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, resolve it',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#10b981',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });

            if (result.isConfirmed) {
                const { error } = await supabase
                    .from('sos_alerts')
                    .eq('id', selectedAlert.id)
                    .update({ status: 'RESOLVED' });

                if (error) {
                    Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Alert Resolved',
                        text: 'The distress signal has been marked as resolved.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                    });
                    selectedAlert = null;
                    detailActive.classList.remove('visible');
                    detailEmpty.style.display = 'flex';
                    await loadAlerts();
                }
            }
        });
    }

    // ═══════════════════════════════════════
    //  7. REAL-TIME (Supabase SDK)
    // ═══════════════════════════════════════
    function setupRealtime() {
        // The REST wrapper is at window.supabase, but the SDK is at window.supabaseAuth
        const client = window.supabaseAuth;
        if (!client || !client.channel) {
            console.warn('[SOS] Supabase SDK not available for realtime. Using polling fallback.');
            setRealtimeStatus('polling');
            setInterval(loadAlerts, 15000); // Poll every 15s
            return;
        }

        console.log('[SOS] Setting up Supabase Realtime channel...');

        realtimeChannel = client.channel('sos-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, (payload) => {
                console.log('[SOS Realtime]', payload.eventType, payload);

                if (payload.eventType === 'INSERT') {
                    allAlerts.unshift(payload.new);
                    playAlertBeep();
                    showRealtimeToast('New SOS Alert', `A new distress signal has been received.`);
                } else if (payload.eventType === 'UPDATE') {
                    const idx = allAlerts.findIndex(a => a.id === payload.new.id);
                    if (idx !== -1) allAlerts[idx] = payload.new;
                    else allAlerts.unshift(payload.new);

                    // If we have this alert selected, refresh detail
                    if (selectedAlert && selectedAlert.id === payload.new.id) {
                        selectAlertCard(payload.new);
                    }
                } else if (payload.eventType === 'DELETE') {
                    allAlerts = allAlerts.filter(a => a.id !== payload.old.id);
                    if (selectedAlert && selectedAlert.id === payload.old.id) {
                        selectedAlert = null;
                        detailActive.classList.remove('visible');
                        detailEmpty.style.display = 'flex';
                    }
                }

                updateStats();
                renderFeed();
            })
            .subscribe((status) => {
                console.log('[SOS Realtime] Status:', status);
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus('live');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setRealtimeStatus('error');
                    // Fallback to polling
                    setInterval(loadAlerts, 15000);
                }
            });
    }

    function setRealtimeStatus(mode) {
        if (!realtimeBadge) return;
        if (mode === 'live') {
            realtimeBadge.className = 'connection-badge conn-live';
            realtimeBadge.innerHTML = '<i class="fas fa-wifi"></i> Real-time Connected';
        } else if (mode === 'polling') {
            realtimeBadge.className = 'connection-badge conn-offline';
            realtimeBadge.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Polling (15s)';
        } else {
            realtimeBadge.className = 'connection-badge conn-offline';
            realtimeBadge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Connection Error';
        }
    }

    // ═══════════════════════════════════════
    //  8. AUDIO & NOTIFICATIONS
    // ═══════════════════════════════════════
    function playAlertBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { /* Audio not allowed */ }
    }

    function showRealtimeToast(title, text) {
        if (!window.Swal) return;
        Swal.fire({
            title, text,
            icon: 'warning',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });
    }

    // ─── Expose for external use ───
    window.loadSOSIntelligence = loadAlerts;

    // ─── Start ───
    init();
});
