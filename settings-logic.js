document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const adminId = localStorage.getItem('activeAdminId');
    if (adminId) {
        loadAdminProfile(adminId);
    }

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
                if(document.getElementById('adminLocationInput')) document.getElementById('adminLocationInput').value = localStorage.getItem('adminLocation_' + id) || '';
                
                // Fixed: database uses 'photo_url'
                const av = data.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name || 'Admin')}&background=10b981&color=fff&size=200&bold=true`;
                if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').src = av;
                if(document.getElementById('topAvatar')) document.getElementById('topAvatar').src = av;
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
            // Fixed: use 'phone_number'
            phone_number: document.getElementById('adminPhoneInput').value
        };

        try {
            const { error } = await supabase.from('admins').eq('id', adminId).update(payload);
            if (error) throw error;

            localStorage.setItem('activeAdminName', payload.full_name);
            localStorage.setItem('adminLocation_' + adminId, document.getElementById('adminLocationInput').value);
            
            document.getElementById('topBarName').innerText = payload.full_name;
            document.getElementById('sideProfileName').innerText = payload.full_name;

            Swal.fire({ icon: 'success', title: 'Dossier Synchronized', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } catch(e) { Swal.fire('Sync Error', e.message, 'error'); }
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
            document.getElementById('topAvatar').src = photoData;
            
            // Fixed: use 'photo_url' column and correct order (eq before update)
            const { error } = await supabase.from('admins').eq('id', adminId).update({ photo_url: photoData });
            if (error) {
                console.error(error);
                Swal.fire('Portrait Error', error.message, 'error');
            } else {
                Swal.fire({ icon: 'success', title: 'Portrait Updated', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
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
        Swal.fire({ icon: 'success', title: 'Access Keys Rotated', background: 'var(--bg-card)', color: 'var(--text-main)' });
    } catch(err) { Swal.fire('Security Error', err.message, 'error'); }
};

window.confirmClearData = async function() {
    const res = await Swal.fire({
        title: 'EXECUTE WIPE?',
        text: 'This will purge all local terminal configurations.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'CONFIRM WIPE',
        background: 'var(--bg-card)', color: 'var(--text-main)'
    });
    if (res.isConfirmed) {
        localStorage.clear();
        window.location.reload();
    }
};
