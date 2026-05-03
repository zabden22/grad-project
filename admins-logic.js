document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;

    let adminsData = [];
    const grid = document.getElementById('adminCardsGrid');
    const searchInput = document.getElementById('adminSearchInput');

    async function loadAdmins() {
        if (grid && adminsData.length === 0) {
            grid.innerHTML = Array(4).fill('<div class="admin-card"><div class="skeleton" style="width:100%;height:300px;border-radius:16px;"></div></div>').join('');
        }
        try {
            const { data, error } = await supabase.from('admins').select('*');
            if (error) throw error;
            adminsData = data || [];
            updateStats();
            renderAdmins();
        } catch (e) {
            console.error('Error loading admins:', e);
        }
    }

    function updateStats() {
        const total = adminsData.length;
        // Case-insensitive check for 'active' or 'online'
        const active = adminsData.filter(a => {
            const s = (a.status || '').toLowerCase();
            return !s || s === 'online' || s === 'active';
        }).length;
        const inactive = total - active;
        const superAdmins = adminsData.filter(a => a.role === 'Super Admin').length;

        if (document.getElementById('admStatTotal')) document.getElementById('admStatTotal').innerText = total;
        if (document.getElementById('admStatActive')) document.getElementById('admStatActive').innerText = active;
        if (document.getElementById('admStatInactive')) document.getElementById('admStatInactive').innerText = inactive;
        if (document.getElementById('admStatSuper')) document.getElementById('admStatSuper').innerText = superAdmins;
    }

    let currentFilter = 'all';

    function renderAdmins() {
        if (!grid) return;
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const isAr = (typeof getLang === 'function' && getLang() === 'ar');

        let filtered = adminsData;

        // Apply Status Filter
        if (currentFilter === 'active') {
            filtered = filtered.filter(a => {
                const s = (a.status || '').toLowerCase();
                return !s || s === 'online' || s === 'active';
            });
        } else if (currentFilter === 'inactive') {
            filtered = filtered.filter(a => {
                const s = (a.status || '').toLowerCase();
                return s && s !== 'online' && s !== 'active';
            });
        } else if (currentFilter === 'super') {
            filtered = filtered.filter(a => a.role === 'Super Admin');
        }

        if (query) {
            filtered = filtered.filter(a => 
                (a.full_name || '').toLowerCase().includes(query) ||
                (a.email || '').toLowerCase().includes(query) ||
                (a.role || '').toLowerCase().includes(query) ||
                (a.serial_number || '').toString().includes(query)
            );
        }

        grid.innerHTML = '';
        filtered.forEach(admin => {
            const s = (admin.status || '').toLowerCase();
            const status = (!s || s === 'online' || s === 'active') ? 'online' : 'offline';
            const statusText = isAr ? (status === 'online' ? 'متصل' : 'غير متصل') : (status === 'online' ? 'Online' : 'Offline');
            const roleClass = admin.role === 'Super Admin' ? 'role-superadmin' : 'role-admin';
            const roleText = admin.role || 'Admin';
            const serial = admin.serial_number || '---';
            
            const avatarUrl = admin.photo_url || admin.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.full_name || 'Admin')}&background=10b981&color=fff&bold=true`;

            const card = document.createElement('div');
            card.className = 'admin-card';
            card.style.animation = 'fadeInUp 0.5s ease-out';
            card.innerHTML = `
                <div class="admin-card-banner"></div>
                <div class="status-dot ${status}" title="${statusText}"></div>
                <div class="admin-card-body">
                    <div class="admin-card-avatar-wrap">
                        <img src="${avatarUrl}" alt="${admin.full_name}">
                    </div>
                    <h3 class="admin-card-name">${admin.full_name || 'Unnamed Admin'}</h3>
                    <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:8px;">
                        <p class="admin-card-code" style="margin:0; font-family:'JetBrains Mono', monospace;">#${serial}</p>
                        <button onclick="copyToClipboard('${serial}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.7rem;" title="${isAr ? 'نسخ الرقم' : 'Copy Serial'}"><i class="fas fa-copy"></i></button>
                    </div>
                    <div class="admin-card-role ${roleClass}">${roleText}</div>
                    
                    <div class="admin-card-details">
                        <div class="admin-card-detail">
                            <i class="fas fa-envelope"></i>
                            <span title="${admin.email}">${admin.email || 'No Email'}</span>
                        </div>
                        <div class="admin-card-detail">
                            <i class="fas fa-phone"></i>
                            <span>${admin.phone_number || admin.phone || 'No Phone'}</span>
                        </div>
                    </div>
                    
                    <div class="admin-card-actions">
                        <button class="btn-view" onclick="window.viewAdmin('${admin.id}')">
                            <i class="fas fa-id-badge"></i> ${isAr ? 'الملف الشخصي' : 'Profile'}
                        </button>
                        <button class="btn-del" onclick="window.deleteAdmin('${admin.id}')" title="${isAr ? 'حذف' : 'Delete'}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            const isAr = (typeof getLang === 'function' && getLang() === 'ar');
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                icon: 'success',
                title: isAr ? 'تم النسخ!' : 'Copied!',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });
        });
    };

    if (searchInput) searchInput.addEventListener('input', renderAdmins);

    const statCards = document.querySelectorAll('.admin-stat-card');
    statCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const h3 = card.querySelector('h3');
            if (!h3) return;
            const id = h3.id;
            
            statCards.forEach(c => c.style.border = '1px solid var(--border-color)');
            card.style.border = '2px solid var(--primary-color)';
            
            if (id === 'admStatTotal') currentFilter = 'all';
            else if (id === 'admStatActive') currentFilter = 'active';
            else if (id === 'admStatInactive') currentFilter = 'inactive';
            else if (id === 'admStatSuper') currentFilter = 'super';
            
            renderAdmins();
        });
    });

    window.viewAdmin = (id) => {
        const admin = adminsData.find(a => a.id === id);
        if (!admin) return;
        
        const isAr = (typeof getLang === 'function' && getLang() === 'ar');
        const avatarUrl = admin.photo_url || admin.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.full_name || 'Admin')}&background=10b981&color=fff&bold=true`;
        const serial = admin.serial_number || '---';

        Swal.fire({
            html: `
                <div style="text-align: left; overflow: hidden; border-radius: 24px; margin: -1.25em;">
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); height: 120px; position: relative;">
                        <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(16,185,129,0.3), transparent);"></div>
                    </div>
                    <div style="text-align: center; margin-top: -60px; position: relative; z-index: 2;">
                        <img src="${avatarUrl}" style="width: 120px; height: 120px; border-radius: 50%; border: 6px solid var(--bg-card); object-fit: cover; box-shadow: 0 15px 35px rgba(0,0,0,0.3);">
                    </div>
                    <div style="padding: 25px 35px 35px;">
                        <h2 style="margin: 10px 0 5px; font-weight: 900; font-size: 2.2rem; text-align: center; color:var(--text-main); letter-spacing: -0.5px;">${admin.full_name}</h2>
                        <div style="text-align: center; margin-bottom: 30px;">
                            <span style="padding: 6px 20px; border-radius: 50px; background: ${admin.role === 'Super Admin' ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)'}; color: ${admin.role === 'Super Admin' ? '#8b5cf6' : '#10b981'}; font-weight: 900; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; border: 2px solid ${admin.role === 'Super Admin' ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.2)'};">
                                <i class="fas ${admin.role === 'Super Admin' ? 'fa-crown' : 'fa-user-shield'}" style="margin-right: 8px;"></i> ${admin.role}
                            </span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr; gap: 18px; direction: ${isAr ? 'rtl' : 'ltr'};">
                            <div style="background: var(--bg-main); padding: 20px; border-radius: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 20px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                                <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(59,130,246,0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="fas fa-envelope"></i></div>
                                <div style="flex: 1;">
                                    <p style="font-size: 0.7rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; margin: 0; letter-spacing: 1px;">${isAr ? 'البريد الإلكتروني' : 'Email Address'}</p>
                                    <p style="font-weight: 800; margin: 4px 0 0; font-size: 1.1rem; color: var(--text-main); word-break: break-all;">${admin.email}</p>
                                </div>
                            </div>
                            
                            <div style="background: var(--bg-main); padding: 20px; border-radius: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 20px;">
                                <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(245,158,11,0.1); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="fas fa-phone"></i></div>
                                <div style="flex: 1;">
                                    <p style="font-size: 0.7rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; margin: 0; letter-spacing: 1px;">${isAr ? 'رقم الهاتف' : 'Phone Number'}</p>
                                    <p style="font-weight: 800; margin: 4px 0 0; font-size: 1.1rem; color: var(--text-main);">${admin.phone_number || 'N/A'}</p>
                                </div>
                            </div>
                            
                            <div style="background: var(--bg-main); padding: 20px; border-radius: 20px; border: 1.5px dashed var(--primary-color); display: flex; align-items: center; gap: 20px; background: rgba(16,185,129,0.02);">
                                <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(16,185,129,0.1); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="fas fa-fingerprint"></i></div>
                                <div style="flex: 1;">
                                    <p style="font-size: 0.7rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; margin: 0; letter-spacing: 1px;">${isAr ? 'الرقم التسلسلي' : 'Serial Number'}</p>
                                    <p style="font-weight: 900; margin: 4px 0 0; font-size: 1.4rem; font-family: 'JetBrains Mono', monospace; color: var(--primary-color); letter-spacing: 2px;">#${serial}</p>
                                </div>
                                <button onclick="copyToClipboard('${serial}')" style="background:var(--bg-card); border:1px solid var(--border-color); width:36px; height:36px; border-radius:10px; color:var(--primary-color); cursor:pointer;"><i class="fas fa-copy"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: isAr ? 'إغلاق' : 'Close',
            confirmButtonColor: '#10b981',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            width: '520px',
            padding: '0',
            customClass: {
                popup: 'tactical-profile-modal',
                confirmButton: 'premium-close-btn'
            }
        });
    };

    window.deleteAdmin = async (id) => {
        const isAr = (typeof getLang === 'function' && getLang() === 'ar');
        
        const res = await Swal.fire({
            title: isAr ? 'حذف المسؤول؟' : 'Delete Admin?',
            text: isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3085d6',
            confirmButtonText: isAr ? 'نعم، احذف!' : 'Yes, delete it!',
            cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });
        
        if (res.isConfirmed) {
            try {
                const { error } = await supabase.from('admins').eq('id', id).delete();
                if (error) throw error;
                
                Swal.fire({
                    title: isAr ? 'تم الحذف!' : 'Deleted!',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
                
                loadAdmins();
            } catch (e) {
                console.error('Delete error:', e);
                Swal.fire({
                    title: isAr ? 'خطأ!' : 'Error!',
                    text: isAr ? 'فشل حذف المسؤول.' : 'Failed to delete admin.',
                    icon: 'error',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            }
        }
    };

    // Modal logic
    const modal = document.getElementById('adminModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const addForm = document.getElementById('addAdminForm');

    if (openBtn) openBtn.onclick = () => modal.classList.add('active');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
    
    if (addForm) {
        addForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('adminSubmitBtn');
            if (btn) btn.disabled = true;

            const newAdmin = {
                full_name: document.getElementById('adminFormName').value,
                email: document.getElementById('adminFormEmail').value,
                phone_number: document.getElementById('adminFormPhone').value,
                role: document.getElementById('adminFormRole').value,
                status: 'offline'
            };

            try {
                const { error } = await supabase.from('admins').insert([newAdmin]);
                if (error) throw error;

                modal.classList.remove('active');
                addForm.reset();
                loadAdmins();
                
                Swal.fire({
                    title: isAr ? 'تمت الإضافة!' : 'Success!',
                    text: isAr ? 'تمت إضافة المسؤول بنجاح.' : 'Admin added successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            } catch (err) {
                console.error('Insert error:', err);
                Swal.fire({
                    title: isAr ? 'خطأ!' : 'Error!',
                    text: err.message,
                    icon: 'error',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            } finally {
                if (btn) btn.disabled = false;
            }
        };
    }

    loadAdmins();

    if (window.supabaseAuth) {
        window.supabaseAuth.channel('admins_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, () => {
                loadAdmins();
            })
            .subscribe();
    }
});