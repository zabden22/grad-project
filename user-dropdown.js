
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        // --- GLOBAL THEME INITIALIZATION ---
        const initTheme = () => {
            const currentTheme = localStorage.getItem('siteTheme') || 'light';
            document.documentElement.setAttribute('data-theme', currentTheme);
            if (currentTheme === 'dark') injectNeuralBackground();
        };
        initTheme();

        // Observe theme changes to trigger background
        const themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    const newTheme = document.documentElement.getAttribute('data-theme');
                    if (newTheme === 'dark') injectNeuralBackground();
                }
            });
        });
        themeObserver.observe(document.documentElement, { attributes: true });

        const triggers = document.querySelectorAll('.user-info, .profile-pill, .dropdown-trigger');
        if (triggers.length === 0) return;

        triggers.forEach(trigger => {
            const adminName = localStorage.getItem('activeAdminName') || localStorage.getItem('adminName') || 'Admin';
            const adminEmail = localStorage.getItem('activeAdminEmail') || localStorage.getItem('adminEmail') || '';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
            let adminPhoto = '';

            const updateAvatarUI = (url) => {
                const avatarImg = trigger.querySelector('.admin-avatar-small, #topAvatar');
                if (avatarImg) avatarImg.src = url;
                const udAvatar = trigger.querySelector('.ud-avatar');
                if (udAvatar) udAvatar.src = url;
            };

            const initialAvatarUrl = adminPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=568e74&color=fff&size=80&bold=true`;
            
            // Sync from DB
            if (adminEmail && typeof supabase !== 'undefined') {
                supabase.from('admins').select('photo_url, photo').eq('email', adminEmail).single().then(({data}) => {
                    if (data) {
                        const dbPhoto = data.photo_url || data.photo;
                        if (dbPhoto) {
                            adminPhoto = dbPhoto;
                            updateAvatarUI(dbPhoto);
                        }
                    }
                }).catch(e => console.warn('Dropdown sync error:', e));
            }

            const roleColor = isSuperAdmin ? '#8b5cf6' : '#10b981';
            const roleIcon = isSuperAdmin ? 'fa-crown' : 'fa-shield-alt';
            const roleText = isSuperAdmin ? 'Super Administrator' : 'Administrator';

            const dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown';
            dropdown.innerHTML = `
                <div class="ud-header" style="background: linear-gradient(135deg, ${roleColor}15 0%, ${roleColor}08 100%); padding: 20px; border-radius: 16px 16px 0 0; text-align: center; border-bottom: 1px solid var(--border-color);">
                    <div style="position:relative; display:inline-block;">
                        <img class="ud-avatar" src="${initialAvatarUrl}" alt="${adminName}" style="width: 72px; height: 72px; border-radius: 50%; border: 3px solid ${roleColor}; margin-bottom: 10px; object-fit: cover; box-shadow: 0 4px 15px ${roleColor}30;">
                        <span style="position:absolute; bottom:8px; right:-2px; width:14px; height:14px; background:#22c55e; border:2.5px solid var(--bg-card); border-radius:50;"></span>
                    </div>
                    <div>
                        <p class="ud-name" style="font-weight: 900; font-size: 1.1rem; margin: 0; color: var(--text-main);">${adminName}</p>
                        <p style="font-size:0.78rem; color:var(--text-muted); margin:2px 0 8px; font-weight:600;">${adminEmail}</p>
                        <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.72rem; font-weight:800; color:${roleColor}; background:${roleColor}12; padding:4px 12px; border-radius:20px; border:1px solid ${roleColor}25;">
                            <i class="fas ${roleIcon}"></i> ${roleText}
                        </span>
                    </div>
                </div>
                <div style="padding: 8px;">
                    <a href="dashboard.html" class="ud-item" style="border-radius:10px;"><i class="fas fa-th-large" style="width:20px; color:#3b82f6;"></i> Dashboard</a>
                    <a href="settings.html" class="ud-item" style="border-radius:10px;"><i class="fas fa-cog" style="width:20px; color:#8b5cf6;"></i> Settings</a>
                    <a href="admins.html" class="ud-item" style="border-radius:10px;"><i class="fas fa-users-cog" style="width:20px; color:#f59e0b;"></i> Admin Panel</a>
                    <div class="ud-divider" style="height: 1px; background: var(--border-color); margin: 6px 12px;"></div>
                    <div class="ud-item danger" id="udLogout" style="color: #ef4444; font-weight: 700; cursor: pointer; border-radius:10px;"><i class="fas fa-sign-out-alt" style="width: 20px;"></i> Log Out</div>
                </div>
            `;
            trigger.appendChild(dropdown);
            trigger.style.cursor = 'pointer';

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.user-dropdown.show').forEach(d => {
                    if (d !== dropdown) d.classList.remove('show');
                });
                dropdown.classList.toggle('show');
            });
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.user-dropdown.show').forEach(d => d.classList.remove('show'));
        });

        const logoutBtn = document.getElementById('udLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof window.confirmLogout === 'function') window.confirmLogout();
            });
        }

        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');

        if (sidebar && sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const isMobile = window.innerWidth <= 900;
                if (isMobile) {
                    sidebar.classList.toggle('open');
                } else {
                    sidebar.classList.toggle('collapsed');
                }
            });
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {
                    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                        sidebar.classList.remove('open');
                    }
                }
            });
        }

        // --- DYNAMIC HEADER TOGGLES INJECTION ---
        const headerRight = document.querySelector('.header-right');
        if (headerRight) {
            const profilePill = headerRight.querySelector('.profile-pill, .dropdown-trigger');
            
            // 1. Language Toggle
            if (!document.getElementById('headerLangToggle') && !document.getElementById('langToggle')) {
                const langBtn = document.createElement('button');
                langBtn.id = 'headerLangToggle';
                langBtn.className = 'lang-toggle-btn';
                langBtn.title = 'Switch Language / تغيير اللغة';
                langBtn.style.marginRight = '10px';
                langBtn.innerHTML = '<i class="fas fa-globe"></i>';
                if (profilePill) headerRight.insertBefore(langBtn, profilePill);
                else headerRight.appendChild(langBtn);
            }

            // 2. Theme Toggle
            if (!document.getElementById('headerThemeToggle') && !document.getElementById('themeToggle')) {
                const themeBtn = document.createElement('button');
                themeBtn.id = 'themeToggle';
                themeBtn.className = 'theme-toggle-btn';
                themeBtn.title = 'Toggle Theme / تغيير المظهر';
                themeBtn.style.marginRight = '10px';
                
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                themeBtn.innerHTML = isDark ? '<i class="fas fa-sun" style="color:#f1c40f;"></i>' : '<i class="fas fa-moon"></i>';
                
                if (profilePill) headerRight.insertBefore(themeBtn, profilePill);
                else headerRight.appendChild(themeBtn);
            }

        }

        // --- GLOBAL LISTENERS (Theme & Language) ---
        document.addEventListener('click', (e) => {
            const themeBtn = e.target.closest('#themeToggle, #headerThemeToggle');
            if (themeBtn) {
                const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('siteTheme', newTheme);
                
                const icon = themeBtn.querySelector('i');
                if (icon) {
                    if (newTheme === 'dark') {
                        icon.className = 'fas fa-sun';
                        icon.style.color = '#f1c40f';
                    } else {
                        icon.className = 'fas fa-moon';
                        icon.style.color = 'inherit';
                    }
                }
            }

            const langBtn = e.target.closest('#headerLangToggle, #langToggle');
            if (langBtn) {
                const currentLang = localStorage.getItem('transitLang') || 'en';
                const nextLang = currentLang === 'en' ? 'ar' : 'en';
                localStorage.setItem('transitLang', nextLang);
                window.location.reload();
            }
        });

        if (headerRight) {
            const profilePill = headerRight.querySelector('.profile-pill, .dropdown-trigger');
            
            // 3. Notification Toggle (NEW PREMIUM)
            if (!document.getElementById('notifBtn')) {
                const notifWrap = document.createElement('div');
                notifWrap.className = 'notif-wrapper';
                notifWrap.style.marginRight = '10px';
                notifWrap.innerHTML = `
                    <button class="notif-btn" id="notifBtn" title="System Notifications">
                        <i class="fas fa-bell"></i>
                        <span class="notif-badge" id="notifBadge">0</span>
                    </button>
                    <div class="notif-dropdown" id="notifDropdown">
                        <div class="notif-header">
                            <h4 data-i18n="notifications_title">System Alerts</h4>
                            <span id="markAllRead" style="cursor:pointer;" data-i18n="mark_all_read">Mark all as read</span>
                        </div>
                        <div class="notif-list" id="notifList">
                            <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                                <i class="fas fa-circle-notch fa-spin" style="font-size: 1.5rem; margin-bottom: 10px; display: block;"></i>
                                <p style="font-size: 0.8rem; font-weight: 700;">Synchronizing neural feed...</p>
                            </div>
                        </div>
                        <div class="notif-footer">
                            <a href="reports.html">
                                <span data-i18n="view_all_alerts">View All System Intelligence</span>
                                <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                `;
                if (profilePill) headerRight.insertBefore(notifWrap, profilePill);
                else headerRight.appendChild(notifWrap);
            }
        }
    });

    /* ── confirmLogout — GLOBAL SCOPE (accessible from onclick in HTML) ── */
    window.confirmLogout = function() {
        if (typeof Swal !== 'undefined') {
            const isAr = (typeof getLang === 'function' && getLang() === 'ar');
            Swal.fire({
                title: isAr ? 'تسجيل الخروج؟' : 'Log Out?',
                text: isAr ? 'هل أنت متأكد؟' : 'Are you sure you want to sign out?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: isAr ? 'نعم' : 'Yes, Log Out',
                cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        if (window.supabaseAuth && window.supabaseAuth.auth) {
                            await window.supabaseAuth.auth.signOut();
                        }
                    } catch(e) { console.warn('Auth signout:', e); }

                    const keysToRemove = [
                        'adminToken', 'adminName', 'adminEmail', 'adminRole',
                        'activeAdminName', 'activeAdminId', 'activeAdminEmail',
                        'activeAdminPhone', 'activeAdminDept', 'activeAdminLocation',
                        'isSuperAdmin', 'adminProfilePhoto', '_photoCacheCleared'
                    ];
                    keysToRemove.forEach(k => localStorage.removeItem(k));

                    window.location.href = 'index.html';
                }
            });
        } else {
            if (confirm('Log out?')) {
                const keysToRemove = [
                    'adminToken', 'adminName', 'adminEmail', 'adminRole',
                    'activeAdminName', 'activeAdminId', 'activeAdminEmail',
                    'isSuperAdmin', 'adminProfilePhoto', '_photoCacheCleared'
                ];
                keysToRemove.forEach(k => localStorage.removeItem(k));
                window.location.href = 'index.html';
            }
            });
        }
    };

    function injectNeuralBackground() {
        if (document.querySelector('.neural-bg')) return;
        const bg = document.createElement('div');
        bg.className = 'neural-bg';
        
        const particleCount = 25; // Slightly fewer but larger and more premium
        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'neural-particle';
            
            // Randomize properties
            const size = Math.random() * 8 + 4; // 4px to 12px
            const animIndex = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = Math.random() * 100 + 'vw';
            p.style.top = Math.random() * 100 + 'vh';
            p.style.animationName = `neuralFloatVar${animIndex}`;
            p.style.animationDuration = (Math.random() * 15 + 20) + 's';
            p.style.animationDelay = (Math.random() * -30) + 's'; // Negative delay to start mid-animation
            
            // Varied glow intensity
            const glowOpacity = (Math.random() * 0.4 + 0.2);
            p.style.boxShadow = `0 0 15px #10b981, 0 0 30px rgba(16, 185, 129, ${glowOpacity})`;
            
            bg.appendChild(p);
        }
        
        document.body.appendChild(bg);
    }
})();
