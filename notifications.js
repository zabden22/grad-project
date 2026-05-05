// notifications.js - Global SOS Alert Listener
document.addEventListener('DOMContentLoaded', () => {

    // 0. Ultra-Resilient SOS Sidebar Integration
    function ensureSOSLink() {
        const path = window.location.pathname.toLowerCase();
        const isDashboard = path.includes('dashboard.html') || path.endsWith('/') || path === '';
        const isReports = path.includes('reports.html');
        const isSos = path.includes('sos.html');

        const navGroup = document.querySelector('.nav-group');
        if (!navGroup) return;

        let sosLink = document.getElementById('sos-sidebar-link') || document.querySelector('a[href*="sos.html"]');

        // If it doesn't exist, CREATE IT dynamically
        if (!sosLink) {
            const linkWrapper = document.createElement('a');
            linkWrapper.id = 'sos-sidebar-link';
            linkWrapper.href = 'sos.html';
            linkWrapper.className = 'nav-link';
            linkWrapper.innerHTML = `<i class="fas fa-heartbeat"></i> <span data-i18n="sos_intelligence">SOS Intelligence</span>`;

            // Insert after Reports if possible
            const reportsLink = document.querySelector('a[href*="reports.html"]');
            if (reportsLink && reportsLink.parentNode === navGroup) {
                reportsLink.after(linkWrapper);
            } else {
                navGroup.appendChild(linkWrapper);
            }
            sosLink = linkWrapper;
        }

        // Apply Visibility and Pulse
        if (sosLink) {
            if (isDashboard || isReports || isSos) {
                sosLink.style.display = 'flex';
                sosLink.style.setProperty('display', 'flex', 'important');

                if (isDashboard || isReports) {
                    sosLink.classList.add('sos-discovery-pulse');
                } else {
                    sosLink.classList.remove('sos-discovery-pulse');
                }

                if (isSos) sosLink.classList.add('active');
            } else {
                sosLink.style.display = 'none';
                sosLink.style.setProperty('display', 'none', 'important');
            }
        }
    }

    // Add pulse animation styles (Ensuring they are always present)
    if (!document.getElementById('sos-visibility-styles')) {
        const style = document.createElement('style');
        style.id = 'sos-visibility-styles';
        style.innerHTML = `
            @keyframes sosDiscoveryPulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
                70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            .sos-discovery-pulse {
                animation: sosDiscoveryPulse 1.5s infinite !important;
                position: relative;
                z-index: 10;
                border: 1px solid rgba(239, 68, 68, 0.4) !important;
                background: rgba(239, 68, 68, 0.1) !important;
                border-radius: 12px !important;
            }
        `;
        document.head.appendChild(style);
    }

    const path = window.location.pathname.toLowerCase();
    const isReports = path.includes('reports.html');

    // Run and maintain
    ensureSOSLink();
    setInterval(ensureSOSLink, 1000);

    if (isReports && !document.getElementById('sos-discovery-style')) {
        const style = document.createElement('style');
        style.id = 'sos-discovery-style';
        style.innerHTML = `
            @keyframes pulseDiscovery {
                0% { background: transparent; }
                50% { background: rgba(239, 68, 68, 0.2); }
                100% { background: transparent; }
            }
            .pulse-sos-discovery {
                animation: pulseDiscovery 2s infinite;
                border-left: 3px solid #ef4444 !important;
            }
        `;
        document.head.appendChild(style);
    }

    initSupabaseListener();

    // Diagnostic Check: Verify if we can actually READ the table
    async function testSOSConnectivity() {
        if (!window.supabase) return;
        console.log('[SOS Diagnostic] Testing connectivity to sos_alerts table...');
        const { data, error } = await window.supabase.from('sos_alerts').select('id').limit(1);
        if (error) {
            console.error('[SOS Diagnostic] Connectivity Failed:', error.message);
            if (error.message.includes('RLS') || error.message.includes('permission')) {
                console.warn('[SOS Diagnostic] Possible RLS Blocker detected. Ensure "anon" or authenticated users have SELECT access.');
            }
        } else {
            console.log('[SOS Diagnostic] Connectivity Success. Table is readable.');
        }
    }

    // Wait for Supabase to be ready then test
    const checkReady = setInterval(() => {
        if (window.supabase) {
            clearInterval(checkReady);
            testSOSConnectivity();
        }
    }, 1000);

    // 1. Supabase & Audio Initialization
    let audioAlert = null;
    function initSupabaseListener() {
        if (!window.supabase) {
            setTimeout(initSupabaseListener, 500); // Retry until supabase is ready
            return;
        }

        audioAlert = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
        audioAlert.loop = true;

        if (!window.supabaseAuth) {
            console.warn('[Notifications] Supabase SDK not ready for real-time.');
            return;
        }

        const sosSubscription = window.supabaseAuth
            .channel('global_sos_alerts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, payload => {
                console.log('[SOS Realtime] New event received:', payload.eventType, payload);
                const alert = payload.new;
                if (!alert) {
                    console.warn('[SOS Realtime] Empty payload received.');
                    return;
                }

                const status = (alert.status || '').toLowerCase();
                console.log('[SOS Realtime] Processing alert with status:', status, alert);
                
                const isCritical = status === 'emergency' || status === 'active' || status === 'distress' || status === 'sos' || status === 'critical';
                const isPending = status === 'pending' || status === 'warning';

                if (isCritical) {
                    console.log('[SOS Realtime] Triggering Critical Overlay');
                    showCriticalSOSOverlay(alert);
                } else if (isPending && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
                    console.log('[SOS Realtime] Triggering Standard Toast');
                    showStandardSOSToast(alert);
                } else if (status === 'safe' || status === 'resolved' || status === 'secured') {
                    console.log('[SOS Realtime] Removing SOS Overlay');
                    removeSOSOverlay();
                }
            })
            .subscribe((status) => {
                console.log('[SOS Realtime] Subscription status:', status);
                if (status === 'CHANNEL_ERROR') {
                    console.error('[SOS Realtime] Subscription failed. Check RLS or Realtime settings in Supabase.');
                }
            });

        console.log('[Notifications] Global SOS Listener initialized.');
    }

    initSupabaseListener();

    // Diagnostic Test Function for User
    window.testSOS = (status = 'Emergency') => {
        console.log('[Diagnostic] Simulating SOS Alert...');
        const mockAlert = {
            id: 'TEST-' + Date.now(),
            bus_id: '888',
            driver_id: 'TEST-DRIVER',
            status: status,
            latitude: 30.0444,
            longitude: 31.2357,
            created_at: new Date().toISOString()
        };
        if (status === 'Emergency' || status === 'ACTIVE') showCriticalSOSOverlay(mockAlert);
        else showStandardSOSToast(mockAlert);
    };

    // 3. UI Components (Tactical Intelligence Upgrade)
    function showCriticalSOSOverlay(alert) {
        removeSOSOverlay();
        try { audioAlert.play(); } catch (e) { }

        const overlay = document.createElement('div');
        overlay.id = 'critical-sos-overlay';
        overlay.style = `
            position: fixed; inset: 0; z-index: 999999;
            background: rgba(10, 15, 30, 0.85);
            backdrop-filter: blur(20px);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Plus Jakarta Sans', sans-serif;
            animation: fadeIn 0.4s ease;
        `;

        const timeStr = new Date(alert.created_at).toLocaleTimeString();

        overlay.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes tacticalSlide { from { transform: scale(0.9) translateY(40px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                
                .tactical-modal {
                    width: 580px; background: #fff; border-radius: 40px;
                    padding: 45px; text-align: center; box-shadow: 0 50px 100px rgba(0,0,0,0.6);
                    animation: tacticalSlide 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                    border: 1px solid rgba(255,255,255,0.1);
                    position: relative; overflow: hidden;
                }
                [data-theme='dark'] .tactical-modal { background: #0f172a; color: #fff; border: 1px solid rgba(255,255,255,0.05); }

                .tactical-header { margin-bottom: 30px; }
                .tactical-icon-hub {
                    width: 120px; height: 120px; border-radius: 50%;
                    background: rgba(239, 68, 68, 0.1); color: #ef4444;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 3.5rem; margin: 0 auto 20px;
                    border: 2px solid rgba(239, 68, 68, 0.2);
                    animation: heartbeat 1s infinite ease-in-out;
                }
                @keyframes heartbeat { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 50% { transform: scale(1.1); box-shadow: 0 0 40px 10px rgba(239, 68, 68, 0.2); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

                .tactical-title { font-size: 2.2rem; font-weight: 900; letter-spacing: -1px; margin-bottom: 8px; color: #ef4444; }
                .tactical-subtitle { font-size: 1rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 2px; }

                .telemetry-box {
                    background: rgba(241, 245, 249, 0.5); border-radius: 24px; padding: 25px;
                    display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 35px;
                    text-align: left; border: 1px solid rgba(0,0,0,0.05);
                }
                [data-theme='dark'] .telemetry-box { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.05); }

                .tel-field label { display: block; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; opacity: 0.5; margin-bottom: 4px; letter-spacing: 1px; }
                .tel-field span { font-weight: 800; font-size: 1.1rem; color: var(--text-main); }

                .tactical-actions { display: grid; grid-template-columns: 1fr; gap: 15px; }
                .btn-intercept {
                    padding: 20px; background: #ef4444; color: #fff;
                    border: none; border-radius: 20px; font-weight: 900; font-size: 1.2rem;
                    cursor: pointer; transition: 0.3s; box-shadow: 0 15px 30px rgba(239, 68, 68, 0.3);
                    display: flex; align-items: center; justify-content: center; gap: 12px;
                }
                .btn-intercept:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(239, 68, 68, 0.4); background: #dc2626; }
                
                .btn-secondary-tactical {
                    padding: 15px; background: transparent; border: 2px solid var(--border-color);
                    border-radius: 18px; color: var(--text-muted); font-weight: 800; cursor: pointer; transition: 0.2s;
                }
                .btn-secondary-tactical:hover { background: var(--bg-main); color: var(--text-main); }

                .glitch-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: #ef4444; animation: glitch 2s infinite; }
                @keyframes glitch { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
            </style>
            
            <div class="tactical-modal">
                <div class="tactical-header">
                    <div class="tactical-icon-hub"><i class="fas fa-satellite-dish"></i></div>
                    <div class="tactical-subtitle">Fleet Intrusion Alert</div>
                    <h2 class="tactical-title">CRITICAL SOS</h2>
                </div>

                <div class="telemetry-box">
                    <div class="tel-field">
                        <label>Asset ID</label>
                        <span>#BUS-${alert.bus_id || 'UNK'}</span>
                    </div>
                    <div class="tel-field">
                        <label>Intercept Time</label>
                        <span>${timeStr}</span>
                    </div>
                    <div class="tel-field">
                        <label>Sector Status</label>
                        <span style="color:#ef4444;">ACTIVE DISTRESS</span>
                    </div>
                    <div class="tel-field">
                        <label>Coordinates</label>
                        <span style="font-size:0.9rem;">${alert.latitude?.toFixed(4) || '—'}, ${alert.longitude?.toFixed(4) || '—'}</span>
                    </div>
                </div>

                <div class="tactical-actions">
                    <button class="btn-intercept" onclick="window.location.href='sos.html'">
                        <i class="fas fa-crosshairs"></i> INITIALIZE INTERCEPT
                    </button>
                    <button class="btn-secondary-tactical" onclick="removeSOSOverlay()">
                        ACKNOWLEDGE & MINIMIZE
                    </button>
                </div>
                <div class="glitch-bar"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function showStandardSOSToast(alert) {
        if (!window.Swal) return;
        Swal.fire({
            title: 'Tactical Signal',
            text: `Manual alert from Bus #${alert.bus_id}. Operator assistance requested.`,
            icon: 'warning',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            didOpen: (toast) => {
                toast.onclick = () => window.location.href = 'sos.html';
            }
        });
    }

    // 4. Action Handlers
    window.removeSOSOverlay = () => {
        const overlay = document.getElementById('critical-sos-overlay');
        if (overlay) overlay.remove();
        if (typeof audioAlert !== 'undefined' && audioAlert) {
            audioAlert.pause();
            audioAlert.currentTime = 0;
        }
    };

    window.interceptSOS = (busId, lat, lng) => {
        localStorage.setItem('sos_focus_bus', busId);
        localStorage.setItem('map_focus_lat', lat);
        localStorage.setItem('map_focus_lng', lng);
        window.location.href = 'map.html';
    };

});
