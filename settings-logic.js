document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const adminId = localStorage.getItem('activeAdminId');
    if (adminId) {
        loadAdminProfile(adminId);
    }

    
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
                if(document.getElementById('sideProfileName')) document.getElementById('sideProfileName').innerText = data.name || data.full_name || 'Commander';
                if(document.getElementById('adminNameInput')) document.getElementById('adminNameInput').value = data.name || data.full_name || '';
                if(document.getElementById('adminEmailInput')) document.getElementById('adminEmailInput').value = data.email || '';
                
                if(document.getElementById('adminPhoneInput')) document.getElementById('adminPhoneInput').value = data.phone || data.phone_number || '';
                if(document.getElementById('adminLocationInput')) document.getElementById('adminLocationInput').value = localStorage.getItem('adminLocation_' + id) || '';
                
                const displayName = data.name || data.full_name || 'Admin';
                const cachedPhoto = sessionStorage.getItem('adminPhoto_' + id);
                const av = data.profile_image || data.photo_url || data.photo || cachedPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff&size=200&bold=true`;
                if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').src = av;
                if(document.getElementById('topAvatar')) document.getElementById('topAvatar').src = av;
            }
        } catch(e) { console.error('Intelligence Link Failure', e); }
    }

    
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating Matrix...';

        const phoneVal = document.getElementById('adminPhoneInput').value;
        const payload = {
            name: document.getElementById('adminNameInput').value
        };
        // Include phone if provided
        if (phoneVal) payload.phone = phoneVal;

        try {
            const { error } = await supabase.from('admins').update(payload).eq('id', adminId);
            if (error) throw error;

            localStorage.setItem('activeAdminName', payload.name);
            localStorage.setItem('adminLocation_' + adminId, document.getElementById('adminLocationInput').value);
            if (phoneVal) {
                localStorage.setItem('activeAdminPhone', phoneVal);
                localStorage.setItem('adminPhone_' + adminId, phoneVal);
            }
            
            document.getElementById('topBarName').innerText = payload.name;
            document.getElementById('sideProfileName').innerText = payload.name;

            Swal.fire({ icon: 'success', title: 'Dossier Synchronized', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } catch(e) { Swal.fire('Sync Error', e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save" style="margin-right:8px;"></i> Update Dossier'; }
    });

    
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
            
        });
    });

    
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

    
    document.getElementById('adminPhotoInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const photoData = ev.target.result;
            document.getElementById('profileAvatar').src = photoData;
            document.getElementById('topAvatar').src = photoData;
            
            // Save to sessionStorage as reliable cache
            try { sessionStorage.setItem('adminPhoto_' + adminId, photoData); } catch(e) { /* quota */ }

            // Save to database using correct column name: profile_image
            try {
                await supabase.from('admins').update({ profile_image: photoData }).eq('id', adminId);
            } catch(err) { console.warn('Photo DB save error:', err); }
            
            Swal.fire({ icon: 'success', title: 'Portrait Updated', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
        };
        reader.readAsDataURL(file);
    });

    
    const sidebarToggle = document.getElementById('sidebarToggle');
    if(sidebarToggle) {
        sidebarToggle.onclick = () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
            document.querySelector('.main-viewport').classList.toggle('expanded');
        };
    }
});


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
