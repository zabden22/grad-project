document.addEventListener('DOMContentLoaded', () => {
    
    function initNotifications() {
        const notifBtn = document.getElementById('notifBtn');
        const notifDropdown = document.getElementById('notifDropdown');
        const notifList = document.getElementById('notifList');
        const badge = document.getElementById('notifBadge');
        const markReadBtn = document.getElementById('markAllRead');

        if (!notifBtn || !notifDropdown) {
            
            setTimeout(initNotifications, 300);
            return;
        }

        console.log('[TransitWay] Notifications system online.');

        
        notifBtn.onclick = (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('active');
            document.querySelector('.user-dropdown')?.classList.remove('show');
        };

        document.addEventListener('click', (e) => {
            if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                notifDropdown.classList.remove('active');
            }
        });
        const notifSound = new Audio('https://cdn.pixabay.com/audio/2022/12/12/audio_e3abc0b017.mp3');
        notifSound.volume = 0.35;

        // Hide SOS sidebar link if not on dashboard, reports, or sos page
        const path = window.location.pathname.toLowerCase();
        const isDashboardOrReportsOrSOS = path.includes('dashboard.html') || path.includes('reports.html') || path.includes('sos.html');
        const sosLink = document.querySelector('aside.sidebar a[href*="sos.html"], aside.sidebar a[data-i18n="sos_intelligence"], #sos-sidebar-link');
        if (!isDashboardOrReportsOrSOS && sosLink) {
            sosLink.style.display = 'none';
        }

        async function checkActiveSOS() {
            if (typeof supabase === 'undefined') return;
            try {
                const { data } = await supabase
                    .from('sos_alerts')
                    .select('id, status');
                
                const activeSOS = data && data.some(a => ['emergency', 'breakdown', 'critical', 'active', 'sos'].includes((a.status || '').toLowerCase()));
                updateSOSLinkPulse(activeSOS);
            } catch (e) {
                console.error('[Notifications] Failed to check active SOS status:', e);
            }
        }

        function updateSOSLinkPulse(isActive) {
            const link = document.querySelector('aside.sidebar a[href*="sos.html"], aside.sidebar a[data-i18n="sos_intelligence"], #sos-sidebar-link');
            if (!link) return;

            if (isActive) {
                link.classList.add('sos-heartbeat-pulse');
                
                if (!document.getElementById('sosHeartbeatStyle')) {
                    const styleEl = document.createElement('style');
                    styleEl.id = 'sosHeartbeatStyle';
                    styleEl.textContent = `
                        .sos-heartbeat-pulse {
                            animation: sosHeartbeat 1.5s infinite !important;
                            border: 1px solid rgba(239, 68, 68, 0.4) !important;
                            color: #ef4444 !important;
                        }
                        @keyframes sosHeartbeat {
                            0% { background-color: rgba(239, 68, 68, 0.05); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                            50% { background-color: rgba(239, 68, 68, 0.25); box-shadow: 0 0 10px 4px rgba(239, 68, 68, 0.2); }
                            100% { background-color: rgba(239, 68, 68, 0.05); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                        }
                    `;
                    document.head.appendChild(styleEl);
                }
            } else {
                link.classList.remove('sos-heartbeat-pulse');
            }
        }

        let baselineTime = Date.now();
        let alertedIds = new Set();

        async function initIntelligence() {
            if (typeof supabase === 'undefined') return;
            
            try {
                // Fetch latest reports to populate alertedIds
                const { data: compData } = await supabase
                    .from('reports')
                    .select('id');
                if (compData) {
                    compData.forEach(c => alertedIds.add(c.id));
                }

                // Fetch latest sos_alerts to populate alertedIds
                const { data: sosData } = await supabase
                    .from('sos_alerts')
                    .select('id');
                if (sosData) {
                    sosData.forEach(a => alertedIds.add(a.id));
                }

                console.log('[TransitWay] Intelligence Link Established. Known IDs populated:', alertedIds.size);
            } catch (e) { 
                console.warn('[TransitWay] Baseline sync failed.', e);
            }

            pollNotifications();
            checkActiveSOS();

            if (window.supabaseAuth) {
                console.log('[TransitWay] Using Realtime for notifications.');
                window.supabaseAuth.channel('notifications_realtime')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
                        console.log('[TransitWay Realtime Notif]', payload);
                        const report = payload.new;
                        if (!alertedIds.has(report.id)) {
                            alertedIds.add(report.id);
                            triggerAlert(report);
                        }
                        pollNotifications();
                    })
                    .subscribe();

                window.supabaseAuth.channel('notifications_sos_realtime')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, (payload) => {
                        console.log('[TransitWay Realtime SOS Notif]', payload);
                        const alert = payload.new;
                        if (!alertedIds.has(alert.id)) {
                            alertedIds.add(alert.id);
                            triggerSOSAlert(alert);
                        }
                        updateSOSLinkPulse(true);
                    })
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts' }, (payload) => {
                        checkActiveSOS();
                    })
                    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sos_alerts' }, (payload) => {
                        checkActiveSOS();
                    })
                    .subscribe();
            } else {
                console.log('[TransitWay] Realtime not available. Using polling.');
                setInterval(() => {
                    pollNotifications();
                    checkActiveSOS();
                }, 5000);
            }
        }

        function triggerAlert(report) {
            const text = report.text_complain || report.text_complaint || report.textComplaint || 'Signal anomaly detected';
            const category = report.category || 'System Alert';
            const user = report.user_name || report.userName || report.user_id || 'Anonymous User';
            
            console.log('[TransitWay] TRIGGERING ALERT for report:', report.id);

            notifSound.play().then(() => console.log('[TransitWay] Alert sound played.'))
                      .catch(e => console.warn('[TransitWay] Audio play blocked by browser. Interaction required.'));

            if (badge) {
                badge.classList.add('notif-ping');
                setTimeout(() => badge.classList.remove('notif-ping'), 2000);
            }

            addReportsSidebarBadge();

            if (typeof Swal !== 'undefined') {
                const isAr = (localStorage.getItem('transitLang') || 'en') === 'ar';
                const titleText = isAr ? 'تنبيه بلاغ جديد' : 'INTELLIGENCE ALERT';
                const footerText = isAr ? 'اضغط للتحقق من مصدر البلاغ' : 'Click to investigate signal source';
                const dir = isAr ? 'rtl' : 'ltr';
                const align = isAr ? 'right' : 'left';

                Swal.fire({
                    title: `<div style="display:flex; align-items:center; gap:10px; color:#ef4444; font-weight:900; direction:${dir};">
                                <i class="fas fa-satellite-dish fa-spin" style="font-size:1.2rem;"></i> 
                                <span>${titleText}</span>
                            </div>`,
                    html: `
                        <div style="text-align:${align}; padding:15px; background:rgba(239,68,68,0.03); border-radius:12px; border:1px solid rgba(239,68,68,0.1); direction:${dir};">
                            <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-direction:${isAr ? 'row-reverse' : 'row'};">
                                <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--primary-color); background:rgba(16,185,129,0.1); padding:4px 10px; border-radius:20px;">${category}</span>
                                <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;"><i class="far fa-user"></i> ${user}</span>
                            </div>
                            <p style="font-size:0.95rem; font-weight:600; line-height:1.6; color:var(--text-main); margin:0;">"${text}"</p>
                        </div>
                        <div style="margin-top:15px; font-size:0.75rem; color:var(--text-muted); text-align:center; font-weight:600;">${footerText}</div>
                    `,
                    toast: true,
                    position: 'bottom-end',
                    timer: 8000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
                    hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' },
                    didOpen: (toast) => {
                        toast.style.boxShadow = '0 10px 40px rgba(239,68,68,0.2), 0 0 0 1px rgba(239,68,68,0.1)';
                        toast.style.borderRadius = '20px';
                        toast.style.cursor = 'pointer';
                        toast.onclick = () => window.location.href = 'reports.html';
                    }
                });
            } else {
                console.error('[TransitWay] SweetAlert2 (Swal) not found! Popup aborted.');
            }
        }

        function triggerSOSAlert(alert) {
            const text = alert.message || 'Distress signal received';
            const category = alert.status || 'Emergency';
            
            console.log('[TransitWay] TRIGGERING SOS ALERT for alert:', alert.id);

            notifSound.play().then(() => console.log('[TransitWay] SOS Alert sound played.'))
                      .catch(e => console.warn('[TransitWay] Audio play blocked by browser. Interaction required.'));

            addSOSSidebarBadge();

            if (typeof Swal !== 'undefined') {
                const isAr = (localStorage.getItem('transitLang') || 'en') === 'ar';
                const titleText = isAr ? 'تنبيه طوارئ عاجل' : 'CRITICAL SOS ALERT';
                const footerText = isAr ? 'اضغط للتحقق من مصدر الاستغاثة' : 'Click to investigate SOS source';
                const dir = isAr ? 'rtl' : 'ltr';
                const align = isAr ? 'right' : 'left';

                Swal.fire({
                    title: `<div style="display:flex; align-items:center; gap:10px; color:#ef4444; font-weight:900; direction:${dir};">
                                <i class="fas fa-heartbeat fa-pulse" style="font-size:1.2rem;"></i> 
                                <span>${titleText}</span>
                            </div>`,
                    html: `
                        <div style="text-align:${align}; padding:15px; background:rgba(239,68,68,0.05); border-radius:12px; border:2px solid #ef4444; direction:${dir};">
                            <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-direction:${isAr ? 'row-reverse' : 'row'};">
                                <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:#ef4444; background:rgba(239,68,68,0.1); padding:4px 10px; border-radius:20px;">${category}</span>
                            </div>
                            <p style="font-size:0.95rem; font-weight:800; line-height:1.6; color:#ef4444; margin:0;">"${text}"</p>
                        </div>
                        <div style="margin-top:15px; font-size:0.75rem; color:var(--text-muted); text-align:center; font-weight:600;">${footerText}</div>
                    `,
                    toast: true,
                    position: 'bottom-end',
                    timer: 10000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    showClass: { popup: 'animate__animated animate__headShake animate__faster' },
                    hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' },
                    didOpen: (toast) => {
                        toast.style.boxShadow = '0 10px 40px rgba(239,68,68,0.3), 0 0 0 2px #ef4444';
                        toast.style.borderRadius = '20px';
                        toast.style.cursor = 'pointer';
                        toast.onclick = () => window.location.href = 'sos.html';
                    }
                });
            }
        }

        function addSOSSidebarBadge() {
            const sosLinks = document.querySelectorAll('.nav-link');
            let sosLink = null;
            sosLinks.forEach(link => {
                if (link.getAttribute('href') === 'sos.html' || link.id === 'sos-sidebar-link') {
                    sosLink = link;
                }
            });
            if (!sosLink) return;
            if (window.location.pathname.includes('sos.html') && sosLink.classList.contains('active')) return;

            let existingBadge = sosLink.querySelector('.sidebar-sos-badge');
            if (!existingBadge) {
                sosLink.style.position = 'relative';
                const badgeEl = document.createElement('span');
                badgeEl.className = 'sidebar-sos-badge';
                badgeEl.innerHTML = 'SOS';
                badgeEl.style.cssText = `
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    padding: 2px 6px;
                    background: #ef4444;
                    color: #fff;
                    font-size: 0.6rem;
                    font-weight: 900;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: sosBadgePulse 1s infinite;
                `;
                sosLink.appendChild(badgeEl);

                if (!document.getElementById('sosBadgePulseStyle')) {
                    const styleEl = document.createElement('style');
                    styleEl.id = 'sosBadgePulseStyle';
                    styleEl.textContent = `
                        @keyframes sosBadgePulse {
                            0% { transform: translateY(-50%) scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                            50% { transform: translateY(-50%) scale(1.15); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                            100% { transform: translateY(-50%) scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                        }
                    `;
                    document.head.appendChild(styleEl);
                }
            }
            sosLink.style.transition = 'background 0.3s';
            sosLink.style.background = 'rgba(239, 68, 68, 0.15)';
        }

        
        function addReportsSidebarBadge() {
            
            const reportsLinks = document.querySelectorAll('.nav-link');
            let reportsLink = null;
            reportsLinks.forEach(link => {
                if (link.getAttribute('href') === 'reports.html' || (link.getAttribute('data-i18n') === 'reports')) {
                    reportsLink = link;
                }
            });
            if (!reportsLink) return;

            
            if (window.location.pathname.includes('reports.html') && reportsLink.classList.contains('active')) return;

            
            let existingBadge = reportsLink.querySelector('.sidebar-report-badge');
            if (!existingBadge) {
                reportsLink.style.position = 'relative';
                const badgeEl = document.createElement('span');
                badgeEl.className = 'sidebar-report-badge';
                badgeEl.innerHTML = '!';
                badgeEl.style.cssText = `
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 22px;
                    height: 22px;
                    background: #ef4444;
                    color: #fff;
                    font-size: 0.7rem;
                    font-weight: 900;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                    animation: reportBadgePulse 1.5s infinite;
                `;
                reportsLink.appendChild(badgeEl);

                
                if (!document.getElementById('reportBadgePulseStyle')) {
                    const styleEl = document.createElement('style');
                    styleEl.id = 'reportBadgePulseStyle';
                    styleEl.textContent = `
                        @keyframes reportBadgePulse {
                            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); transform: translateY(-50%) scale(1); }
                            50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); transform: translateY(-50%) scale(1.1); }
                            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); transform: translateY(-50%) scale(1); }
                        }
                    `;
                    document.head.appendChild(styleEl);
                }
            }

            
            reportsLink.style.transition = 'background 0.3s';
            reportsLink.style.background = 'rgba(239, 68, 68, 0.12)';
            setTimeout(() => {
                if (!reportsLink.classList.contains('active')) {
                    reportsLink.style.background = '';
                }
            }, 3000);
        }

        async function pollNotifications() {
            if (typeof supabase === 'undefined') return;
            try {
                const { data, error } = await supabase
                    .from('reports')
                    .select('*')
                    .order('id', { ascending: false })
                    .limit(10);

                if (error) throw error;
                
                if (data && data.length > 0) {
                    const pendingReports = data.filter(r => (r.status || '').toLowerCase() === 'pending');
                    
                    pendingReports.forEach(report => {
                        if (!alertedIds.has(report.id)) {
                            alertedIds.add(report.id);
                            triggerAlert(report);
                        }
                    });
                }

                renderNotifications(data || []);
            } catch (err) {
                console.error('[TransitWay] Intelligence Feed Error:', err);
            }
        }

        
        window.testIntelligenceAlert = () => {
            triggerAlert({
                id: 'TEST-' + Date.now(),
                text_complaint: 'This is a test of the emergency broadcast system.',
                category: 'DEBUG',
                user_name: 'System Admin'
            });
        };

        initIntelligence();

        function renderNotifications(items) {
            if (!notifList) return;
            notifList.style.opacity = '0.5';

            setTimeout(() => {
                if (items.length === 0) {
                    badge.style.display = 'none';
                    notifList.innerHTML = `
                        <div style="padding: 60px 40px; text-align: center; color: var(--text-muted);">
                            <div style="width: 80px; height: 80px; background: rgba(16, 185, 129, 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                                <i class="fas fa-shield-check" style="font-size: 2.5rem; opacity: 0.3; color: var(--primary-color);"></i>
                            </div>
                            <p style="font-weight: 900; font-size: 1rem; color: var(--text-main); margin-bottom: 5px;">All Systems Green</p>
                            <p style="font-size: 0.8rem; font-weight: 600;">No anomalies detected in the current sector.</p>
                        </div>
                    `;
                } else {
                    badge.innerText = items.length;
                    badge.style.display = 'flex';

                    notifList.innerHTML = items.map((item, index) => {
                        const time = timeAgo(item.created_at || item.createdAt);
                        const priority = (item.priority || 'Medium').toLowerCase();
                        const color = priority === 'critical' ? '#ef4444' : (priority === 'high' ? '#f59e0b' : '#3b82f6');
                        const icon = priority === 'critical' ? 'fa-radiation-alt' : (priority === 'high' ? 'fa-exclamation-triangle' : 'fa-info-circle');
                        
                        const text = item.text_complain || item.text_complaint || item.textComplaint || 'Signal anomaly detected';
                        const category = item.category || 'System Alert';

                        return `
                            <div class="notif-item unread" style="animation: slideInNotif 0.4s ease forwards ${index * 0.1}s; opacity: 0;" onclick="window.location.href='reports.html'">
                                <div class="notif-icon-circle" style="background: ${color}15; color: ${color}; border: 1px solid ${color}25;">
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div class="notif-info">
                                    <p><strong>${category}</strong>: ${text}</p>
                                    <span class="time"><i class="far fa-clock"></i> ${time}</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
                notifList.style.opacity = '1';
                if (typeof applyLang === 'function') applyLang();
            }, 200);
        }

        function timeAgo(date) {
            if (!date) return 'Unknown';
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);
            if (seconds < 60) return 'Just now';
            if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
            if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
            return Math.floor(seconds / 86400) + 'd ago';
        }

        if (markReadBtn) {
            markReadBtn.onclick = (e) => {
                e.stopPropagation();
                badge.style.display = 'none';
                document.querySelectorAll('.notif-item').forEach(i => i.classList.remove('unread'));
            };
        }

        pollNotifications();
    }

    initNotifications();
});
