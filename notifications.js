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

        async function pollNotifications() {
            if (typeof supabase === 'undefined') return;
            try {
                const { data, error } = await supabase
                    .from('complaints')
                    .select('*')
                    .eq('status', 'Pending')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) throw error;
                renderNotifications(data || []);
            } catch (err) {
                console.error('Intelligence Link Failure:', err);
            }
        }

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
        setInterval(pollNotifications, 5000);
    }

    initNotifications();
});
