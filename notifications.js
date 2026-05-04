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

    // Run and maintain
    ensureSOSLink();
    setInterval(ensureSOSLink, 1000);

    // Add discovery animation style if on reports
    if (isReportsPage && !document.getElementById('sos-discovery-style')) {
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

    // 1. Supabase & Audio Initialization
    let audioAlert = null;
    function initSupabaseListener() {
        if (!window.supabase) {
            setTimeout(initSupabaseListener, 500); // Retry until supabase is ready
            return;
        }

        audioAlert = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
        audioAlert.loop = true;

        const sosSubscription = supabase
            .channel('global_sos_alerts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, payload => {
                const newAlert = payload.new;
                if (newAlert.status === 'ACTIVE') {
                    if (newAlert.type === 'CRITICAL') {
                        showCriticalSOSOverlay(newAlert);
                    } else {
                        showStandardSOSToast(newAlert);
                    }
                }
            })
            .subscribe();
            
        console.log('[Notifications] Global SOS Listener Active.');
    }

    initSupabaseListener();

    // Diagnostic Test Function for User
    window.testSOS = (type = 'CRITICAL') => {
        console.log('[Diagnostic] Simulating SOS Alert...');
        const mockAlert = {
            id: 'TEST-' + Date.now(),
            bus_id: '888',
            driver_id: 'TEST-DRIVER',
            type: type,
            status: 'ACTIVE',
            latitude: 30.0444,
            longitude: 31.2357,
            created_at: new Date().toISOString()
        };
        if (type === 'CRITICAL') showCriticalSOSOverlay(mockAlert);
        else showStandardSOSToast(mockAlert);
    };

    // 3. UI Components
    function showCriticalSOSOverlay(alert) {
        removeSOSOverlay();
        try { audioAlert.play(); } catch(e) {}

        const overlay = document.createElement('div');
        overlay.id = 'critical-sos-overlay';
        overlay.style = `
            position: fixed; inset: 0; z-index: 999999;
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(15px);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Plus Jakarta Sans', sans-serif;
            animation: fadeIn 0.3s ease;
        `;

        overlay.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .sos-modal {
                    width: 500px; background: #fff; border-radius: 32px;
                    padding: 40px; text-align: center; box-shadow: 0 40px 100px rgba(0,0,0,0.5);
                    animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border: 1px solid rgba(255,255,255,0.1);
                    position: relative;
                }
                [data-theme='dark'] .sos-modal { background: #1e293b; color: #fff; }
                .sos-icon-ring {
                    width: 100px; height: 100px; border-radius: 50%;
                    background: rgba(239, 68, 68, 0.1); color: #ef4444;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 3rem; margin: 0 auto 25px;
                    animation: pulseRing 1.5s infinite;
                }
                @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
                .sos-modal h2 { font-size: 2rem; font-weight: 900; margin-bottom: 10px; }
                .sos-modal p { color: #64748b; font-weight: 600; line-height: 1.6; margin-bottom: 30px; }
                [data-theme='dark'] .sos-modal p { color: #94a3b8; }
                .sos-modal-actions { display: flex; flex-direction: column; gap: 12px; }
                .btn-intercept-now {
                    padding: 16px; background: #ef4444; color: #fff;
                    border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem;
                    cursor: pointer; transition: 0.3s; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
                }
                .btn-intercept-now:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(239, 68, 68, 0.4); }
                .btn-ignore-sos {
                    padding: 12px; background: transparent; border: none;
                    color: #64748b; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .btn-ignore-sos:hover { color: #ef4444; }
            </style>
            <div class="sos-modal">
                <div class="sos-icon-ring"><i class="fas fa-exclamation-triangle"></i></div>
                <h2>Critical SOS Signal</h2>
                <p>Emergency distress signal received from <br><b>Bus #ID-${alert.bus_id}</b>. Collision protocol active.</p>
                <div class="sos-modal-actions">
                    <button class="btn-intercept-now" onclick="interceptSOS('${alert.bus_id}', ${alert.latitude}, ${alert.longitude})">
                        <i class="fas fa-satellite"></i> Intercept Position
                    </button>
                    <button class="btn-ignore-sos" onclick="removeSOSOverlay()">Dismiss Alert</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

        document.body.appendChild(overlay);
    }

    function showStandardSOSToast(alert) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: `SOS Signal: Bus #${alert.bus_id}`,
            text: 'Breakdown or assistance requested.',
            showConfirmButton: true,
            confirmButtonText: 'Respond',
            timer: 10000,
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'sos.html';
            }
        });
    }

    // 4. Action Handlers
    window.interceptSOS = (busId, lat, lng) => {
        localStorage.setItem('sos_focus_bus', busId);
        localStorage.setItem('map_focus_lat', lat);
        localStorage.setItem('map_focus_lng', lng);
        window.location.href = 'map.html';
    };

    window.removeSOSOverlay = () => {
        const overlay = document.getElementById('critical-sos-overlay');
        if (overlay) overlay.remove();
        audioAlert.pause();
        audioAlert.currentTime = 0;
    };

});
