document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    let adminId = localStorage.getItem('activeAdminId');
    const adminEmail = localStorage.getItem('activeAdminEmail') || localStorage.getItem('adminEmail');

    async function initSettings() {
        if (!adminId && adminEmail) {
            try {
                const { data } = await supabase.from('admins').select('id').eq('email', adminEmail).single();
                if (data) {
                    adminId = data.id;
                    localStorage.setItem('activeAdminId', adminId);
                }
            } catch (e) { console.warn('Could not resolve adminId from email', e); }
        }

        if (adminId) {
            loadAdminProfile(adminId);
        } else {
            console.warn('No active admin session found for settings.');
        }
    }

    initSettings();

    // Advanced Tabs logic
    const navItems = document.querySelectorAll('.nav-item');
    const tabWraps = document.querySelectorAll('.settings-content-wrap');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            
            navItems.forEach(i => i.classList.remove('active'));
            tabWraps.forEach(w => w.classList.remove('active'));

            item.classList.add('active');
            const target = document.getElementById('tab-' + tabId);
            if(target) target.classList.add('active');
        });
    });

    async function loadAdminProfile(id) {
        try {
            const { data, error } = await supabase.from('admins').select('*').eq('id', id).single();
            if (data) {
                if(document.getElementById('sideProfileName')) document.getElementById('sideProfileName').innerText = data.full_name || 'Commander';
                if(document.getElementById('adminNameInput')) document.getElementById('adminNameInput').value = data.full_name || '';
                if(document.getElementById('adminEmailInput')) document.getElementById('adminEmailInput').value = data.email || '';
                // Fixed: database uses 'phone_number'
                if(document.getElementById('adminPhoneInput')) document.getElementById('adminPhoneInput').value = data.phone_number || '';
                // Fixed: database uses 'photo_url'
                const av = data.photo_url || data.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name || 'Admin')}&background=10b981&color=fff&size=200&bold=true`;
                if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').src = av;
                if(document.getElementById('topAvatar')) document.getElementById('topAvatar').src = av;
                
                // Fetch location from DB
                if(document.getElementById('adminLocationInput')) {
                    document.getElementById('adminLocationInput').value = data.location || localStorage.getItem('adminLocation_' + id) || '';
                }
            }
        } catch(e) { console.error('Intelligence Link Failure', e); }
    }

    // Profile Update
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating Matrix...';

        const payload = {
            full_name: document.getElementById('adminNameInput').value,
            phone_number: document.getElementById('adminPhoneInput').value,
            location: document.getElementById('adminLocationInput').value
        };

        try {
            const { data, error } = await supabase.from('admins').eq('id', adminId).update(payload);
            if (error) {
                console.error('Database Sync Error:', error);
                throw new Error(error.message || 'Failed to update database record.');
            }

            localStorage.setItem('activeAdminName', payload.full_name);
            localStorage.setItem('activeAdminPhone', payload.phone_number);
            localStorage.setItem('activeAdminLocation', payload.location);
            localStorage.setItem('adminLocation_' + adminId, payload.location);
            
            document.getElementById('topBarName').innerText = payload.full_name;
            document.getElementById('sideProfileName').innerText = payload.full_name;

            Swal.fire({ 
                icon: 'success', 
                title: 'Dossier Synchronized', 
                text: 'Your profile has been updated in the central database.',
                timer: 2000, 
                showConfirmButton: false 
            });
        } catch(e) { 
            console.error('Sync Error Details:', e);
            Swal.fire({
                icon: 'error',
                title: 'Sync Protocol Failure',
                text: 'Error: ' + e.message + '. Please ensure the database schema supports all fields.',
                footer: '<p style="font-size:0.8rem; color:#ef4444;">Note: If "location" field fails, contact system administrator to update the "admins" table schema.</p>'
            });
        }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save" style="margin-right:8px;"></i> Update Dossier'; }
    });

    // Theme Selection
    const themeOptions = document.querySelectorAll('.theme-option[data-theme-val]');
    themeOptions.forEach(opt => {
        if(opt.getAttribute('data-theme-val') === currentTheme) opt.classList.add('active');
        else opt.classList.remove('active');

        opt.addEventListener('click', () => {
            const val = opt.getAttribute('data-theme-val');
            themeOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            localStorage.setItem('siteTheme', val);
            document.documentElement.setAttribute('data-theme', val);
            // Broadcast theme change if needed
        });
    });

    // Language Selection
    const langOptions = document.querySelectorAll('.theme-option[data-lang-val]');
    const currentLang = localStorage.getItem('transitLang') || 'en';
    langOptions.forEach(opt => {
        if(opt.getAttribute('data-lang-val') === currentLang) opt.classList.add('active');
        else opt.classList.remove('active');

        opt.addEventListener('click', () => {
            const val = opt.getAttribute('data-lang-val');
            localStorage.setItem('transitLang', val);
            window.location.reload();
        });
    });

    // Toggle Buttons (Alerts & Preferences)
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
        const key = btn.getAttribute('data-toggle');
        const isActive = localStorage.getItem(key) !== 'false';
        if(isActive) btn.classList.add('active');
        else btn.classList.remove('active');

        btn.addEventListener('click', () => {
            const nowActive = btn.classList.toggle('active');
            localStorage.setItem(key, nowActive);
            if (key === 'particlesEnabled' && typeof window.injectNeuralBackground === 'function') {
                window.injectNeuralBackground();
            }
        });
    });

    // Avatar Update
    document.getElementById('adminPhotoInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const photoData = ev.target.result;
            document.getElementById('profileAvatar').src = photoData;
            localStorage.setItem('adminProfilePhoto', photoData);
            
            // Update in DB
            try {
                // Try to update both possible column names for compatibility
                const { error } = await supabase.from('admins').eq('id', adminId).update({ 
                    photo_url: photoData,
                    photo: photoData 
                });
                
                if (error) throw error;
                
                // Manually trigger a UI refresh for other avatars on this page
                document.querySelectorAll('.admin-avatar-small, #topAvatar, #welcomeAvatar, .ud-avatar').forEach(img => {
                    if (img) img.src = photoData;
                });
                
                Swal.fire({ 
                    icon: 'success', 
                    title: 'Portrait Updated', 
                    text: 'Your image has been saved to the database.',
                    timer: 1500, 
                    showConfirmButton: false 
                });
            } catch (err) {
                console.error('Portrait Update Failure:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Portrait Sync Failed',
                    text: 'Error: ' + err.message,
                    footer: '<p style="font-size:0.8rem; color:#ef4444;">Try a smaller image or check database columns.</p>'
                });
            }
        };
        reader.readAsDataURL(file);
    });

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if(sidebarToggle) {
        sidebarToggle.onclick = () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
            document.querySelector('.main-viewport').classList.toggle('expanded');
        };
    }
});

window.handlePasswordChange = async function() {
    const cur = document.getElementById('currentPassword').value;
    const newP = document.getElementById('newPassword').value;
    const conf = document.getElementById('confirmPassword').value;

    if(!cur || !newP || !conf) return Swal.fire({ icon: 'warning', title: 'Protocol Incomplete', text: 'Fill all key fields.' });
    if(newP !== conf) return Swal.fire({ icon: 'error', title: 'Mismatch', text: 'New keys do not match.' });

    try {
        await supabase.auth.updateUser({ password: newP });
        Swal.fire({ icon: 'success', title: 'Access Keys Rotated' });
    } catch(err) { Swal.fire('Security Error', err.message, 'error'); }
};

window.confirmClearData = async function() {
    const res = await Swal.fire({
        title: 'EXECUTE WIPE?',
        text: 'This will purge all local terminal configurations.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'CONFIRM WIPE'
    });
    if (res.isConfirmed) {
        localStorage.clear();
        window.location.reload();
    }
};
