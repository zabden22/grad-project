(function () {
    document.addEventListener('DOMContentLoaded', () => {
        
        const initTheme = () => {
            const currentTheme = localStorage.getItem('siteTheme') || 'light';
            document.documentElement.setAttribute('data-theme', currentTheme);
            if (window.injectNeuralBackground) window.injectNeuralBackground();
        };
        initTheme();

        
        const themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    if (window.injectNeuralBackground) window.injectNeuralBackground();
                }
            });
        });
        themeObserver.observe(document.documentElement, { attributes: true });

        
        const udStyles = document.createElement('style');
        udStyles.innerHTML = `
            .user-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                width: 280px;
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                z-index: 9999;
                margin-top: 15px;
            }
            .user-dropdown.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            .ud-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                color: var(--text-main);
                font-size: 0.9rem;
                font-weight: 700;
                text-decoration: none;
                transition: background 0.2s;
            }
            .ud-item:hover {
                background: var(--bg-main);
            }
        `;
        document.head.appendChild(udStyles);

        const triggers = document.querySelectorAll('.user-info, .profile-pill, .dropdown-trigger');
        
        triggers.forEach((trigger, index) => {
            const adminName = localStorage.getItem('activeAdminName') || localStorage.getItem('adminName') || 'Commander';
            const adminEmail = localStorage.getItem('activeAdminEmail') || localStorage.getItem('adminEmail') || 'admin@transitway.com';
            const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
            
            const roleColor = isSuperAdmin ? '#8b5cf6' : '#10b981';
            const roleIcon = isSuperAdmin ? 'fa-crown' : 'fa-shield-alt';
            const roleText = isSuperAdmin ? 'Super Administrator' : 'Administrator';

            const currentLang = localStorage.getItem('transitLang') || 'en';
            const langLabel = currentLang === 'ar' ? 'العربية' : 'English';
            const langNext = currentLang === 'ar' ? 'EN' : 'AR';

            
            const dropId = 'udDrop_' + index;
            trigger.setAttribute('data-target-drop', dropId);
            trigger.style.cursor = 'pointer';

            const dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown';
            dropdown.id = dropId;
            
            
            const initialAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=568e74&color=fff&size=80&bold=true`;

            dropdown.innerHTML = `
                <div class="ud-header" style="background: linear-gradient(135deg, ${roleColor}15 0%, ${roleColor}08 100%); padding: 20px; border-radius: 16px 16px 0 0; text-align: center; border-bottom: 1px solid var(--border-color);">
                    <div style="position:relative; display:inline-block;">
                        <img class="ud-avatar" src="${initialAvatarUrl}" alt="${adminName}" style="width: 72px; height: 72px; border-radius: 50%; border: 3px solid ${roleColor}; margin-bottom: 10px; object-fit: cover; box-shadow: 0 4px 15px ${roleColor}30;">
                        <span style="position:absolute; bottom:8px; right:-2px; width:14px; height:14px; background:#22c55e; border:2.5px solid var(--bg-card); border-radius:50%;"></span>
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
                    <a href="settings.html" class="ud-item" style="border-radius:10px;"><i class="fas fa-user-circle" style="width:20px; color:#06b6d4;"></i> My Profile</a>
                    <a href="dashboard.html" class="ud-item" style="border-radius:10px;"><i class="fas fa-th-large" style="width:20px; color:#3b82f6;"></i> Dashboard</a>
                    <a href="settings.html" class="ud-item" style="border-radius:10px;"><i class="fas fa-cog" style="width:20px; color:#8b5cf6;"></i> Settings</a>
                    <div class="ud-divider" style="height: 1px; background: var(--border-color); margin: 6px 12px;"></div>
                    <div class="ud-item ud-lang-switch" style="border-radius:10px; cursor:pointer; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:10px;"><i class="fas fa-globe" style="width:20px; color:#f59e0b;"></i> Language</div>
                        <span style="background:rgba(245,158,11,0.1); color:#f59e0b; font-size:0.72rem; font-weight:900; padding:3px 10px; border-radius:20px; border:1px solid rgba(245,158,11,0.2);">${langLabel} → ${langNext}</span>
                    </div>
                    <div class="ud-item ud-theme-switch" style="border-radius:10px; cursor:pointer; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:10px;"><i class="fas ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'fa-sun' : 'fa-moon'}" style="width:20px; color:#a855f7;"></i> Theme</div>
                        <span style="background:rgba(168,85,247,0.1); color:#a855f7; font-size:0.72rem; font-weight:900; padding:3px 10px; border-radius:20px; border:1px solid rgba(168,85,247,0.2);">${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
                    </div>
                    <div class="ud-divider" style="height: 1px; background: var(--border-color); margin: 6px 12px;"></div>
                    <div class="ud-item danger ud-logout-btn" style="color: #ef4444; font-weight: 700; cursor: pointer; border-radius:10px;"><i class="fas fa-sign-out-alt" style="width: 20px;"></i> Log Out</div>
                </div>
            `;
            
            
            trigger.appendChild(dropdown);

            
            const updateAvatarUI = (url) => {
                // Photo used in-memory only, not stored in localStorage (quota issues)
                const avatars = document.querySelectorAll('.admin-avatar-small, #topAvatar, #welcomeAvatar, .ud-avatar');
                avatars.forEach(img => {
                    if (img) img.src = url;
                });
                
                const pillImg = trigger.querySelector('img');
                if (pillImg) pillImg.src = url;
            };

            if (typeof window.supabaseAuth !== 'undefined' && window.supabaseAuth) {
                try {
                    window.supabaseAuth.auth.getUser().then(({data: {user}}) => {
                        if (user?.user_metadata?.avatar_url) {
                            updateAvatarUI(user.user_metadata.avatar_url);
                        }
                    }).catch(()=>{});
                } catch(e){}

                if (adminEmail && adminEmail !== 'admin@transitway.com') {
                    supabase.from('admins').select('*').eq('email', adminEmail).single().then(({data}) => {
                        if (data) {
                            const dbPhoto = data.profile_image || data.photo_url || data.photo;
                            const cachedPhoto = localStorage.getItem('adminPhoto_' + data.id) || sessionStorage.getItem('adminPhoto_' + data.id);
                            const photo = dbPhoto || cachedPhoto;
                            if (photo) updateAvatarUI(photo);
                        }
                    }).catch(()=>{});
                }
            }
        });

        
        document.addEventListener('click', (e) => {
            const isClickInsideTrigger = e.target.closest('.profile-pill, .dropdown-trigger');
            const isClickInsideDropdown = e.target.closest('.user-dropdown');
            
            
            if (!isClickInsideTrigger && !isClickInsideDropdown) {
                document.querySelectorAll('.user-dropdown.show').forEach(d => d.classList.remove('show'));
                return;
            }

            
            if (isClickInsideTrigger) {
                
                if (isClickInsideDropdown) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                const dropdown = isClickInsideTrigger.querySelector('.user-dropdown');
                if (dropdown) {
                    const wasShowing = dropdown.classList.contains('show');
                    document.querySelectorAll('.user-dropdown.show').forEach(d => d.classList.remove('show'));
                    if (!wasShowing) dropdown.classList.add('show');
                }
            }
        });

        
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ud-logout-btn')) {
                if (typeof window.confirmLogout === 'function') window.confirmLogout();
            }
            if (e.target.closest('.ud-lang-switch')) {
                const nextLang = (localStorage.getItem('transitLang') || 'en') === 'en' ? 'ar' : 'en';
                localStorage.setItem('transitLang', nextLang);
                window.location.reload();
            }
            if (e.target.closest('.ud-theme-switch')) {
                const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('siteTheme', newTheme);
                document.querySelectorAll('.user-dropdown.show').forEach(d => d.classList.remove('show'));
            }
        });

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

        
        const headerRight = document.querySelector('.header-right');
        if (headerRight) {
            const profilePill = headerRight.querySelector('.profile-pill, .dropdown-trigger');
            
            
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
        }
    };

    window.injectNeuralBackground = function() {
        const particlesEnabled = localStorage.getItem('particlesEnabled') !== 'false';
        const existingBg = document.querySelector('.neural-bg');
        
        if (!particlesEnabled) {
            if (existingBg) existingBg.remove();
            return;
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const baseColor = '#10b981';
        const rgbColor = '16, 185, 129';

        if (existingBg) {
            const particles = existingBg.querySelectorAll('.neural-particle');
            particles.forEach(p => {
                const glowIntensity = p.dataset.glowIntensity || (Math.random() * 15 + 10);
                const secondaryGlow = glowIntensity * 2;
                const opacity = p.dataset.opacity || (Math.random() * 0.5 + 0.3);
                
                p.style.backgroundColor = baseColor;
                p.style.boxShadow = `0 0 ${glowIntensity}px ${baseColor}, 0 0 ${secondaryGlow}px rgba(${rgbColor}, ${opacity})`;
            });
            return;
        }

        const bg = document.createElement('div');
        bg.className = 'neural-bg';
        bg.style.position = 'fixed';
        bg.style.inset = '0';
        bg.style.pointerEvents = 'none';
        bg.style.zIndex = '-1';
        bg.style.overflow = 'hidden';
        
        const particleCount = 40; 
        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'neural-particle';
            p.style.position = 'absolute';
            p.style.borderRadius = '50%';
            
            
            const size = Math.random() * 10 + 2; 
            const animIndex = Math.floor(Math.random() * 3) + 1;
            const duration = (Math.random() * 20 + 25) + 's';
            const delay = (Math.random() * -40) + 's';
            const blur = Math.random() * 2 + 1;
            
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = Math.random() * 100 + 'vw';
            p.style.top = Math.random() * 100 + 'vh';
            p.style.filter = `blur(${blur}px)`;
            p.style.animation = `neuralFloatVar${animIndex} ${duration} linear infinite ${delay}`;
            
            
            const glowIntensity = (Math.random() * 15 + 10);
            const secondaryGlow = glowIntensity * 2;
            const opacity = (Math.random() * 0.5 + 0.3);
            
            p.dataset.glowIntensity = glowIntensity;
            p.dataset.opacity = opacity;
            
            p.style.backgroundColor = baseColor;
            p.style.boxShadow = `0 0 ${glowIntensity}px ${baseColor}, 0 0 ${secondaryGlow}px rgba(${rgbColor}, ${opacity})`;
            
            bg.appendChild(p);
        }
        
        document.body.appendChild(bg);
    }
})();
