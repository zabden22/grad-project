// sos-logic.js — Full Supabase-Connected SOS Intelligence (Adapted for New Schema)
document.addEventListener('DOMContentLoaded', () => {
    // ─── DOM References ───
    const feedList = document.getElementById('feedList');
    const emptyState = document.getElementById('emptyState');
    const detailEmpty = document.getElementById('detailEmpty');
    const detailActive = document.getElementById('detailActive');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnRespond = document.getElementById('btnRespond');
    const btnResolve = document.getElementById('btnResolve');
    const btnMapTrack = document.getElementById('btnMapTrack');
    const realtimeBadge = document.getElementById('realtimeBadge');

    // ─── State ───
    let allAlerts = [];
    let driversMap = {};
    let busesMap = {};
    let routesMap = {};
    let tripsMap = {};
    let selectedAlert = null;
    let realtimeChannel = null;
    let currentFilter = 'all'; // 'all', 'active', 'pending', 'resolved'

    // ═══════════════════════════════════════
    //  1. INITIALIZATION
    // ═══════════════════════════════════════
    async function init() {
        console.log('[SOS] Initializing (New Schema)...');
        await loadLookups();
        await loadAlerts();
        setupRealtime();
        bindEvents();
        updateFilterVisuals();
    }

    // ═══════════════════════════════════════
    //  2. DATA LOADING (Supabase REST)
    // ═══════════════════════════════════════
    async function loadLookups() {
        try {
            const [drRes, buRes, rtRes, trRes] = await Promise.all([
                supabase.from('drivers').select('id, name, full_name'),
                supabase.from('buses').select('id, plate_number, route_id'),
                supabase.from('routes').select('id, name'),
                supabase.from('trips').select('id, bus_id, driver_id, route_id')
            ]);
            
            if (drRes.data) {
                drRes.data.forEach(d => {
                    driversMap[d.id] = { id: d.id, full_name: d.name || d.full_name || `Driver #${d.id.substring(0, 5)}` };
                });
            }
            if (buRes.data) {
                buRes.data.forEach(b => {
                    busesMap[b.id] = { id: b.id, bus_number: b.id.substring(0, 5).toUpperCase(), plate_number: b.plate_number, route_id: b.route_id };
                });
            }
            if (rtRes.data) {
                rtRes.data.forEach(r => {
                    routesMap[r.id] = r;
                });
            }
            if (trRes.data) {
                trRes.data.forEach(t => {
                    tripsMap[t.id] = t;
                });
            }
            console.log('[SOS] Lookups loaded:', Object.keys(driversMap).length, 'drivers,', Object.keys(busesMap).length, 'buses,', Object.keys(tripsMap).length, 'trips');
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

            console.log('[SOS] Loaded', allAlerts.length, 'distress signals from sos_alerts');
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
            if (['emergency', 'breakdown', 'critical', 'active'].includes(s)) active++;
            else if (['pending', 'warning', 'responding'].includes(s)) pending++;

            if (['resolved', 'safe', 'secured'].includes(s)) {
                const d = new Date(a.created_at);
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

        // Apply filter
        let filteredAlerts = allAlerts;
        const todayStr = new Date().toDateString();

        if (currentFilter === 'active') {
            filteredAlerts = allAlerts.filter(a => {
                const s = (a.status || '').toLowerCase();
                return ['emergency', 'breakdown', 'critical', 'active'].includes(s);
            });
        } else if (currentFilter === 'pending') {
            filteredAlerts = allAlerts.filter(a => {
                const s = (a.status || '').toLowerCase();
                return ['pending', 'warning', 'responding'].includes(s);
            });
        } else if (currentFilter === 'resolved') {
            filteredAlerts = allAlerts.filter(a => {
                const s = (a.status || '').toLowerCase();
                return ['resolved', 'safe', 'secured'].includes(s) && new Date(a.created_at).toDateString() === todayStr;
            });
        }

        // Show only unresolved first, then resolved
        const unresolved = filteredAlerts.filter(a => !isResolved(a));
        const resolved = filteredAlerts.filter(a => isResolved(a));
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

    function getStatusInfo(status, message = '') {
        const s = (status || '').toLowerCase();
        
        if (['emergency', 'critical', 'sos'].includes(s))
            return { label: 'Emergency', class: 'badge-critical', cardClass: 'critical' };
        if (['breakdown'].includes(s))
            return { label: 'Breakdown', class: 'badge-warning', cardClass: 'warning' };
        if (['responding', 'active'].includes(s))
            return { label: 'Responding', class: 'badge-pending', cardClass: 'warning' };
        if (['resolved', 'safe', 'secured'].includes(s))
            return { label: 'Resolved', class: 'badge-pending', cardClass: '' };
        return { label: status || 'Pending', class: 'badge-warning', cardClass: 'warning' };
    }

    function createAlertCard(alert) {
        const info = getStatusInfo(alert.status, alert.message);
        
        const driver = driversMap[alert.driver_id] || { full_name: 'Unknown Driver' };
        const bus = busesMap[alert.bus_id] || { bus_number: '—', plate_number: '—' };
        
        const time = new Date(alert.created_at);
        const timeStr = time.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.className = `alert-card ${info.cardClass}`;
        if (selectedAlert && selectedAlert.id === alert.id) card.classList.add('selected');

        const displayMessage = alert.message || `${info.label} distress signal received.`;

        card.innerHTML = `
            <div class="alert-top">
                <span class="alert-badge ${info.class}">${info.label}</span>
                <span class="alert-time"><i class="far fa-clock"></i> ${timeStr}</span>
            </div>
            <div class="alert-message">${displayMessage}</div>
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
    async function selectAlertCard(alert) {
        selectedAlert = alert;
        renderFeed(); // Re-render to update selected state

        const info = getStatusInfo(alert.status, alert.message);
        
        const driver = driversMap[alert.driver_id] || { full_name: 'Unknown Driver' };
        const bus = busesMap[alert.bus_id] || { bus_number: '—', plate_number: '—', route_id: null };
        const route = routesMap[bus.route_id] || { name: '—' };
        
        const time = new Date(alert.created_at);

        // Show detail
        detailEmpty.style.display = 'none';
        detailActive.classList.add('visible');

        // Fill data
        document.getElementById('detailTitle').innerText = alert.message ? (alert.status + ' Alert') : 'Distress Signal';
        document.getElementById('detailBadge').innerText = info.label;
        document.getElementById('detailBadge').className = `alert-badge ${info.class}`;
        document.getElementById('detailTime').innerText = time.toLocaleString();
        document.getElementById('detailBus').innerText = `#${bus.bus_number}`;
        document.getElementById('detailPlate').innerText = bus.plate_number;
        document.getElementById('detailDriver').innerText = driver.full_name;
        document.getElementById('detailLocation').innerText = route.name || '—';
        document.getElementById('detailMessage').innerText = alert.message || 'No details provided.';

        // Coordinates load directly from the alert
        document.getElementById('detailLat').innerText = alert.latitude !== null && alert.latitude !== undefined ? parseFloat(alert.latitude).toFixed(6) : '—';
        document.getElementById('detailLng').innerText = alert.longitude !== null && alert.longitude !== undefined ? parseFloat(alert.longitude).toFixed(6) : '—';

        // Timeline
        const timeline = document.getElementById('detailTimeline');
        timeline.innerHTML = '';
        addTimelineItem(timeline, '#3b82f6', `<strong>Alert created</strong> at ${time.toLocaleTimeString()}`);

        if (alert.status && !isResolved(alert)) {
            addTimelineItem(timeline, '#f59e0b', `Status: <strong>${alert.status}</strong> — awaiting response`);
        }
        if (alert.resolved_at) {
            addTimelineItem(timeline, '#10b981', `<strong>Resolved</strong> at ${new Date(alert.resolved_at).toLocaleTimeString()}`);
        } else if (isResolved(alert)) {
            addTimelineItem(timeline, '#10b981', `<strong>Resolved</strong>`);
        }

        // Toggle buttons
        btnRespond.style.display = isResolved(alert) ? 'none' : 'flex';
        btnResolve.style.display = isResolved(alert) ? 'none' : 'flex';
        if (btnMapTrack) {
            btnMapTrack.style.display = (!isResolved(alert) && alert.latitude && alert.longitude) ? 'flex' : 'none';
        }
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

        const cardActive = document.getElementById('cardActive');
        const cardPending = document.getElementById('cardPending');
        const cardResolved = document.getElementById('cardResolved');
        const cardTotal = document.getElementById('cardTotal');

        if (cardActive) cardActive.addEventListener('click', () => setFilter('active'));
        if (cardPending) cardPending.addEventListener('click', () => setFilter('pending'));
        if (cardResolved) cardResolved.addEventListener('click', () => setFilter('resolved'));
        if (cardTotal) cardTotal.addEventListener('click', () => setFilter('all'));

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
                    .update({ 
                        status: selectedAlert.status || 'Emergency', 
                        message: (selectedAlert.message || 'Distress Signal') + ` [${service} dispatched]` 
                    })
                    .eq('id', selectedAlert.id);

                if (error) {
                    Swal.fire({ icon: 'error', title: 'Dispatch Failed', text: error.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                } else {
                    const bus = busesMap[selectedAlert.bus_id] || { bus_number: '??' };
                    Swal.fire({
                        icon: 'success',
                        title: `${service} Dispatched`,
                        text: `Emergency ${service} unit has been dispatched to Bus #${bus.bus_number}.`,
                        timer: 2500,
                        showConfirmButton: false,
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                    });
                    await loadAlerts();
                    if (selectedAlert) {
                        const updated = allAlerts.find(a => a.id === selectedAlert.id);
                        if (updated) selectAlertCard(updated);
                    }
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
                    .update({ 
                        status: 'Resolved',
                        resolved_at: new Date().toISOString()
                    })
                    .eq('id', selectedAlert.id);

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

        if (btnMapTrack) {
            btnMapTrack.addEventListener('click', () => {
                if (selectedAlert && selectedAlert.latitude && selectedAlert.longitude) {
                    window.location.href = `map.html?focus_bus_id=${selectedAlert.bus_id}&lat=${selectedAlert.latitude}&lng=${selectedAlert.longitude}&sos_id=${selectedAlert.id}`;
                }
            });
        }
    }

    // ═══════════════════════════════════════
    //  7. REAL-TIME (Supabase SDK)
    // ═══════════════════════════════════════
    function setupRealtime() {
        const client = window.supabaseAuth;
        if (!client || !client.channel) {
            console.warn('[SOS] Supabase SDK not available for realtime. Using polling fallback.');
            setRealtimeStatus('polling');
            setInterval(loadAlerts, 15000); // Poll every 15s
            return;
        }

        console.log('[SOS] Setting up Supabase Realtime channel (sos_alerts)...');

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

    function setFilter(filterName) {
        currentFilter = filterName;
        updateFilterVisuals();
        renderFeed();
    }

    function updateFilterVisuals() {
        const cardActive = document.getElementById('cardActive');
        const cardPending = document.getElementById('cardPending');
        const cardResolved = document.getElementById('cardResolved');
        const cardTotal = document.getElementById('cardTotal');

        if (cardActive) cardActive.classList.toggle('selected-active', currentFilter === 'active');
        if (cardPending) cardPending.classList.toggle('selected-pending', currentFilter === 'pending');
        if (cardResolved) cardResolved.classList.toggle('selected-resolved', currentFilter === 'resolved');
        if (cardTotal) cardTotal.classList.toggle('selected-total', currentFilter === 'all');
    }

    // ─── Expose for external use ───
    window.loadSOSIntelligence = loadAlerts;

    // ─── Start ───
    init();
});
