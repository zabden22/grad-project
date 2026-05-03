document.addEventListener('DOMContentLoaded', () => {
    /* ── Intelligence Feed Synchronization ── */
    function initNotifications() {
        const notifBtn = document.getElementById('notifBtn');
        const notifDropdown = document.getElementById('notifDropdown');
        const notifList = document.getElementById('notifList');
        const badge = document.getElementById('notifBadge');
        const markReadBtn = document.getElementById('markAllRead');

        if (!notifBtn || !notifDropdown) {
            // Wait for user-dropdown.js to inject elements if they aren't there yet
            setTimeout(initNotifications, 300);
            return;
        }

        console.log('[TransitWay] Notifications system online.');

        // Toggle Dropdown
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
        const notifSound = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_78385764d7.mp3');
        notifSound.volume = 0.5;

        let baselineTime = Date.now();
        let alertedIds = new Set();

        async function initIntelligence() {
            if (typeof supabase === 'undefined') return;
            
            // 1. Fetch latest report to set a solid baseline
            try {
                const { data } = await supabase
                    .from('complaints')
                    .select('created_at, id')
                    .order('created_at', { ascending: false })
                    .limit(1);
                
                if (data && data.length > 0) {
                    baselineTime = new Date(data[0].created_at).getTime();
                    // Mark existing ones as already "seen" for alerts
                    alertedIds.add(data[0].id);
                }
                console.log('[TransitWay] Intelligence Link Established. Baseline:', new Date(baselineTime).toLocaleTimeString());
            } catch (e) { 
                console.warn('[TransitWay] Baseline sync failed, using client time.');
            }

            // 2. Start Polling
            setInterval(pollNotifications, 3000);
            pollNotifications();
        }

        function triggerAlert(report) {
            const text = report.text_complaint || report.textComplaint || 'Signal anomaly detected';
            const category = report.category || 'System Alert';
            const user = report.user_name || report.userName || 'Anonymous User';
            
            console.log('[TransitWay] TRIGGERING ALERT for report:', report.id);

            // Play sound
            notifSound.play().then(() => console.log('[TransitWay] Alert sound played.'))
                      .catch(e => console.warn('[TransitWay] Audio play blocked by browser. Interaction required.'));

            // Ping the badge
            if (badge) {
                badge.classList.add('notif-ping');
                setTimeout(() => badge.classList.remove('notif-ping'), 2000);
            }

            // Add Red Badge to Reports Sidebar Tab
            const reportsLink = document.querySelector('a[href="reports.html"]');
            if (reportsLink) {
                let sBadge = reportsLink.querySelector('.sidebar-notif-badge');
                if (!sBadge) {
                    sBadge = document.createElement('span');
                    sBadge.className = 'sidebar-notif-badge';
                    sBadge.style.cssText = `
                        background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 900;
                        padding: 2px 6px; border-radius: 50px; margin-left: auto;
                        box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
                        animation: pulse-red-badge 1.5s infinite;
                    `;
                    reportsLink.appendChild(sBadge);
                    
                    if (!document.getElementById('badgePulseStyle')) {
                        const style = document.createElement('style');
                        style.id = 'badgePulseStyle';
                        style.innerHTML = `@keyframes pulse-red-badge { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }`;
                        document.head.appendChild(style);
                    }
                }
                const currentCount = parseInt(sBadge.innerText || '0');
                sBadge.innerText = currentCount + 1;
            }

            // Show High-End Popup
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: `<div style="display:flex; align-items:center; gap:10px; color:#ef4444; font-weight:900;">
                                <i class="fas fa-satellite-dish fa-spin" style="font-size:1.2rem;"></i> 
                                <span>INTELLIGENCE ALERT</span>
                            </div>`,
                    html: `
                        <div style="text-align:left; padding:15px; background:rgba(239,68,68,0.03); border-radius:12px; border:1px solid rgba(239,68,68,0.1);">
                            <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--primary-color); background:rgba(16,185,129,0.1); padding:4px 10px; border-radius:20px;">${category}</span>
                                <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;"><i class="far fa-user"></i> ${user}</span>
                            </div>
                            <p style="font-size:0.95rem; font-weight:600; line-height:1.6; color:var(--text-main); margin:0;">"${text}"</p>
                        </div>
                        <div style="margin-top:15px; font-size:0.75rem; color:var(--text-muted); text-align:center; font-weight:600;">Click to investigate signal source</div>
                    `,
                    toast: true,
                    position: 'top-end',
                    timer: 8000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    showClass: { popup: 'animate__animated animate__fadeInRight animate__faster' },
                    hideClass: { popup: 'animate__animated animate__fadeOutRight animate__faster' },
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

        async function pollNotifications() {
            if (typeof supabase === 'undefined') return;
            try {
                const { data, error } = await supabase
                    .from('complaints')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;
                
                if (data && data.length > 0) {
                    const pendingReports = data.filter(r => (r.status || '').toLowerCase() === 'pending');
                    
                    pendingReports.forEach(report => {
                        const reportTime = new Date(report.created_at || report.createdAt).getTime();
                        
                        // LOG FOR DEBUGGING
                        console.log(`[TransitWay] Checking Report ${report.id}: Time=${new Date(reportTime).toLocaleTimeString()}, Baseline=${new Date(baselineTime).toLocaleTimeString()}`);

                        if (reportTime > baselineTime && !alertedIds.has(report.id)) {
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

        // Add a "Test Intelligence" hidden function
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
                        
                        const text = item.text_complaint || item.textComplaint || 'Signal anomaly detected';
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
        setInterval(pollNotifications, 1000);
    }

    initNotifications();
});
