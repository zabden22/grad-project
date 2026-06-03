document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;

    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
    const activeAdminId = localStorage.getItem('activeAdminId');
    let newAdminPhotoBase64 = null;

    if (!isSuperAdmin) {
        const openBtn = document.getElementById('openModalBtn');
        if (openBtn) openBtn.style.display = 'none';
    }

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
        
        const active = total;
        const inactive = 0;
        const superAdmins = adminsData.filter(a => (a.role || '').toLowerCase().includes('super')).length;

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

        
        if (currentFilter === 'active') {
            // All admins considered active in new schema
        } else if (currentFilter === 'inactive') {
            filtered = [];
        } else if (currentFilter === 'super') {
            filtered = filtered.filter(a => (a.role || '').toLowerCase().includes('super'));
        }

        if (query) {
            filtered = filtered.filter(a => 
                (a.name || a.full_name || '').toLowerCase().includes(query) ||
                (a.email || '').toLowerCase().includes(query) ||
                (a.role || '').toLowerCase().includes(query)
            );
        }

        grid.innerHTML = '';
        filtered.forEach(admin => {
            const status = 'online';
            const statusText = isAr ? 'متصل' : 'Online';
            const roleClass = (admin.role || '').toLowerCase().includes('super') ? 'role-superadmin' : 'role-admin';
            const roleText = admin.role || 'Admin';
            const adminDisplayName = admin.name || admin.full_name || 'Admin';
            
            // Try DB photo first, then localStorage/sessionStorage cache, then fallback to generated avatar
            const cachedPhoto = localStorage.getItem('adminPhoto_' + admin.id) || sessionStorage.getItem('adminPhoto_' + admin.id);
            const avatarUrl = admin.profile_image || admin.photo_url || admin.photo || cachedPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminDisplayName)}&background=10b981&color=fff&bold=true`;

            const card = document.createElement('div');
            card.className = 'admin-card';
            card.style.animation = 'fadeInUp 0.5s ease-out';
            card.innerHTML = `
                <div class="admin-card-banner"></div>
                <div class="status-dot ${status}" title="${statusText}"></div>
                <div class="admin-card-body">
                    <div class="admin-card-avatar-wrap">
                        <img src="${avatarUrl}" alt="${adminDisplayName}">
                    </div>
                    <h3 class="admin-card-name">${adminDisplayName}</h3>
                    <div class="admin-card-role ${roleClass}">${roleText}</div>
                    
                    <div class="admin-card-details">
                        <div class="admin-card-detail">
                            <i class="fas fa-envelope"></i>
                            <span title="${admin.email}">${admin.email || 'No Email'}</span>
                        </div>
                        <div class="admin-card-detail">
                            <i class="fas fa-phone"></i>
                            <span>${admin.phone || admin.phone_number || localStorage.getItem('adminPhone_' + admin.id) || 'No Phone'}</span>
                        </div>
                    </div>
                    
                    <div class="admin-card-actions">
                        <button class="btn-view" onclick="window.viewAdmin('${admin.id}')">
                            <i class="fas fa-id-badge"></i> ${isAr ? 'الملف الشخصي' : 'Profile'}
                        </button>
                        ${isSuperAdmin ? `
                        <button class="btn-del" onclick="window.deleteAdmin('${admin.id}')" title="${isAr ? 'حذف' : 'Delete'}">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
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
        const adminDisplayName = admin.name || admin.full_name || 'Admin';
        const cachedPhoto = localStorage.getItem('adminPhoto_' + admin.id) || sessionStorage.getItem('adminPhoto_' + admin.id);
        const avatarUrl = admin.profile_image || admin.photo_url || admin.photo || cachedPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminDisplayName)}&background=10b981&color=fff&bold=true`;
        const canEditPhoto = isSuperAdmin || admin.id === activeAdminId;

        Swal.fire({
            html: `
                <div style="text-align: left; overflow: hidden; border-radius: 24px; margin: -1.25em;">
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); height: 120px; position: relative;">
                        <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(16,185,129,0.3), transparent);"></div>
                    </div>
                    <div style="text-align: center; margin-top: -60px; position: relative; z-index: 2; display: flex; justify-content: center;">
                        <div style="position: relative; display: inline-block;">
                            <img id="adminDetailsAvatar" src="${avatarUrl}" style="width: 120px; height: 120px; border-radius: 50%; border: 6px solid var(--bg-card); object-fit: cover; box-shadow: 0 15px 35px rgba(0,0,0,0.3); cursor: ${canEditPhoto ? 'pointer' : 'default'};" ${canEditPhoto ? 'onclick="document.getElementById(\'adminPhotoUploadInput\').click()"' : ''} title="${canEditPhoto ? (isAr ? 'تغيير الصورة' : 'Change Photo') : ''}">
                            ${canEditPhoto ? `
                            <div onclick="document.getElementById('adminPhotoUploadInput').click()" style="position: absolute; bottom: 5px; right: 5px; background: #10b981; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 3px solid var(--bg-card); box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="${isAr ? 'تغيير الصورة' : 'Change Photo'}">
                                <i class="fas fa-camera" style="font-size: 0.9rem;"></i>
                            </div>
                            <input type="file" id="adminPhotoUploadInput" style="display:none;" accept="image/*" onchange="window.uploadAdminPhoto('${admin.id}')">
                            ` : ''}
                        </div>
                    </div>
                    <div style="padding: 25px 35px 35px;">
                        <h2 style="margin: 10px 0 5px; font-weight: 900; font-size: 2.2rem; text-align: center; color:var(--text-main); letter-spacing: -0.5px;">${adminDisplayName}</h2>
                        <div style="text-align: center; margin-bottom: 30px;">
                            <span style="padding: 6px 20px; border-radius: 50px; background: ${(admin.role || '').toLowerCase().includes('super') ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)'}; color: ${(admin.role || '').toLowerCase().includes('super') ? '#8b5cf6' : '#10b981'}; font-weight: 900; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; border: 2px solid ${(admin.role || '').toLowerCase().includes('super') ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.2)'};">
                                <i class="fas ${(admin.role || '').toLowerCase().includes('super') ? 'fa-crown' : 'fa-user-shield'}" style="margin-right: 8px;"></i> ${admin.role}
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
                                    <p style="font-weight: 800; margin: 4px 0 0; font-size: 1.1rem; color: var(--text-main);">${admin.phone || admin.phone_number || localStorage.getItem('adminPhone_' + admin.id) || 'N/A'}</p>
                                </div>
                            </div>
                            
                            <div style="background: var(--bg-main); padding: 20px; border-radius: 20px; border: 1.5px dashed var(--primary-color); display: flex; align-items: center; gap: 20px; background: rgba(16,185,129,0.02);">
                                <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(16,185,129,0.1); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="fas fa-user-shield"></i></div>
                                <div style="flex: 1;">
                                    <p style="font-size: 0.7rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; margin: 0; letter-spacing: 1px;">${isAr ? 'الدور' : 'Role'}</p>
                                    <p style="font-weight: 900; margin: 4px 0 0; font-size: 1.4rem; font-family: 'JetBrains Mono', monospace; color: var(--primary-color); letter-spacing: 2px;">${admin.role || 'Admin'}</p>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 24px; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                            ${canEditPhoto ? `
                            <button onclick="document.getElementById('adminPhotoUploadInput').click()" style="background:#10b981; color:white; border:none; padding:12px 24px; border-radius:14px; font-weight:800; font-size:0.9rem; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:0.3s; box-shadow:0 6px 16px rgba(16,185,129,0.25);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><i class="fas fa-camera"></i> ${isAr ? 'تغيير الصورة' : 'Change Photo'}</button>
                            ` : ''}
                            ${isSuperAdmin ? `
                            <button onclick="window.editAdminDetails('${admin.id}')" style="background:#8b5cf6; color:white; border:none; padding:12px 24px; border-radius:14px; font-weight:800; font-size:0.9rem; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:0.3s; box-shadow:0 6px 16px rgba(139,92,246,0.25);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><i class="fas fa-edit"></i> ${isAr ? 'تعديل البيانات' : 'Edit Details'}</button>
                            ` : ''}
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

    window.uploadAdminPhoto = async (adminId) => {
        const isAr = (typeof getLang === 'function' && getLang() === 'ar');
        const input = document.getElementById('adminPhotoUploadInput');
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target.result;
                // Save to localStorage and sessionStorage as reliable cache
                try {
                    localStorage.setItem('adminPhoto_' + adminId, base64);
                    sessionStorage.setItem('adminPhoto_' + adminId, base64);
                } catch(e) { /* quota */ }
                
                // Save to database using correct column name: profile_image
                try {
                    await supabase.from('admins').update({ profile_image: base64 }).eq('id', adminId);
                } catch(dbErr) { console.warn('Admin photo DB save error:', dbErr); }
                
                // Sync topbar if modifying self
                if (adminId === localStorage.getItem('activeAdminId')) {
                    // Photo synced via DB, not localStorage
                    if (document.getElementById('topAvatar')) {
                        document.getElementById('topAvatar').src = base64;
                    }
                }
                
                // Update active profile modal image
                if (document.getElementById('adminDetailsAvatar')) {
                    document.getElementById('adminDetailsAvatar').src = base64;
                }
                
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    icon: 'success',
                    title: isAr ? 'تم تحديث الصورة الشخصية!' : 'Portrait Updated!',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
                
                loadAdmins();
            };
            reader.readAsDataURL(file);
        } catch (err) {
            Swal.fire(isAr ? 'خطأ' : 'Error', err.message, 'error');
        }
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
                const { error } = await supabase.from('admins').delete().eq('id', id);
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

    
    const modal = document.getElementById('adminModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const addForm = document.getElementById('addAdminForm');

    const newPhotoInput = document.getElementById('newAdminPhotoInput');
    const newPhotoPreview = document.getElementById('newAdminPhotoPreview');
    if (newPhotoInput && newPhotoPreview) {
        newPhotoInput.onchange = () => {
            if (newPhotoInput.files && newPhotoInput.files[0]) {
                const file = newPhotoInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    newAdminPhotoBase64 = e.target.result;
                    newPhotoPreview.src = newAdminPhotoBase64;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if (openBtn) openBtn.onclick = () => {
        newAdminPhotoBase64 = null;
        if (newPhotoPreview) {
            newPhotoPreview.src = 'https://ui-avatars.com/api/?name=New+Admin&background=10b981&color=fff&size=100';
        }
        modal.classList.add('active');
    };
    if (closeBtn) closeBtn.onclick = () => {
        newAdminPhotoBase64 = null;
        if (newPhotoPreview) {
            newPhotoPreview.src = 'https://ui-avatars.com/api/?name=New+Admin&background=10b981&color=fff&size=100';
        }
        modal.classList.remove('active');
    };
    
    if (addForm) {
        addForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('adminSubmitBtn');
            if (btn) btn.disabled = true;

            const newAdmin = {
                name: document.getElementById('adminFormName').value,
                email: document.getElementById('adminFormEmail').value,
                password_hash: document.getElementById('adminFormPassword').value || 'changeme123',
                role: document.getElementById('adminFormRole').value,
                phone: document.getElementById('adminFormPhone').value,
                status: 'Active',
                profile_image: newAdminPhotoBase64
            };

            const isAr = (typeof getLang === 'function' && getLang() === 'ar');

            try {
                let result = await supabase.from('admins').insert([newAdmin]);
                
                if (result.error) {
                    const errMsg = result.error.message || '';
                    if (errMsg.includes('phone') || errMsg.includes('profile_image') || errMsg.includes('photo_url') || errMsg.includes('column')) {
                        console.warn('DB schema mismatch, retrying insert with core fields only...', errMsg);
                        
                        const coreAdmin = {
                            name: newAdmin.name,
                            full_name: newAdmin.name,
                            email: newAdmin.email,
                            password_hash: newAdmin.password_hash,
                            role: newAdmin.role,
                            status: newAdmin.status
                        };
                        
                        const retryResult = await supabase.from('admins').insert([coreAdmin]);
                        if (retryResult.error) throw retryResult.error;
                        
                        let inserted = retryResult.data && retryResult.data[0];
                        if (!inserted) {
                            const { data: fetched } = await supabase.from('admins').select('id').eq('email', newAdmin.email).single();
                            inserted = fetched;
                        }
                        
                        if (inserted && inserted.id) {
                            if (newAdmin.profile_image) {
                                try {
                                    localStorage.setItem('adminPhoto_' + inserted.id, newAdmin.profile_image);
                                } catch(e) {}
                            }
                            if (newAdmin.phone) {
                                localStorage.setItem('adminPhone_' + inserted.id, newAdmin.phone);
                            }
                        }
                    } else {
                        throw result.error;
                    }
                } else {
                    const inserted = result.data && result.data[0];
                    if (inserted && inserted.id) {
                        if (newAdmin.profile_image) {
                            try {
                                localStorage.setItem('adminPhoto_' + inserted.id, newAdmin.profile_image);
                            } catch(e) {}
                        }
                        if (newAdmin.phone) {
                            localStorage.setItem('adminPhone_' + inserted.id, newAdmin.phone);
                        }
                    }
                }

                modal.classList.remove('active');
                addForm.reset();
                newAdminPhotoBase64 = null;
                if (newPhotoPreview) {
                    newPhotoPreview.src = 'https://ui-avatars.com/api/?name=New+Admin&background=10b981&color=fff&size=100';
                }
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
                let msg = err.message || '';
                if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('admins_email_key')) {
                    msg = isAr ? 'هذا البريد الإلكتروني مسجل بالفعل لمشرف آخر.' : 'This email address is already registered for another administrator.';
                }
                Swal.fire({
                    title: isAr ? 'خطأ!' : 'Error!',
                    text: msg,
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

    // Super Admin edit details handler
    window.editAdminDetails = async (adminId) => {
        const admin = adminsData.find(a => a.id === adminId);
        if (!admin) return;

        const isAr = (typeof getLang === 'function' && getLang() === 'ar');
        const adminDisplayName = admin.name || admin.full_name || 'Admin';

        const { value: formValues } = await Swal.fire({
            title: isAr ? 'تعديل بيانات المشرف' : 'Edit Admin Details',
            html: `
                <div style="text-align:left; margin-bottom:15px; direction:${isAr ? 'rtl' : 'ltr'};">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${isAr ? 'الاسم الكامل' : 'Full Name'}</label>
                    <input id="swal-editName" class="swal2-input" value="${adminDisplayName}" style="margin-top:5px; width:100%; box-sizing:border-box;">
                </div>
                <div style="text-align:left; margin-bottom:15px; direction:${isAr ? 'rtl' : 'ltr'};">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${isAr ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input id="swal-editPhone" class="swal2-input" value="${admin.phone || admin.phone_number || localStorage.getItem('adminPhone_' + admin.id) || ''}" style="margin-top:5px; width:100%; box-sizing:border-box;">
                </div>
                <div style="text-align:left; margin-bottom:15px; direction:${isAr ? 'rtl' : 'ltr'};">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${isAr ? 'الدور (الصلاحيات)' : 'Role (Access)'}</label>
                    <select id="swal-editRole" class="swal2-select" style="margin-top:5px; width:100%; box-sizing:border-box; height: 50px;">
                        <option value="Admin" ${admin.role === 'Admin' ? 'selected' : ''}>Admin</option>
                        <option value="Super Admin" ${admin.role === 'Super Admin' ? 'selected' : ''}>Super Admin</option>
                    </select>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: isAr ? 'حفظ التغييرات' : 'Save Changes',
            confirmButtonColor: '#3b82f6',
            cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
            background: 'var(--bg-card)', 
            color: 'var(--text-main)',
            preConfirm: () => {
                const name = document.getElementById('swal-editName').value.trim();
                const phone = document.getElementById('swal-editPhone').value.trim();
                const role = document.getElementById('swal-editRole').value;
                if (!name || !phone) {
                    Swal.showValidationMessage(isAr ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please enter Name and Phone Number');
                    return false;
                }
                return { name, phone, role };
            }
        });

        if (formValues) {
            try {
                localStorage.setItem('adminPhone_' + adminId, formValues.phone);

                const { error } = await supabase.from('admins').update({
                    name: formValues.name,
                    full_name: formValues.name,
                    phone: formValues.phone,
                    role: formValues.role
                }).eq('id', adminId);

                if (error) {
                    const errMsg = error.message || '';
                    if (errMsg.includes('phone') || errMsg.includes('column')) {
                        console.warn('DB schema mismatch, retrying update without phone column...', errMsg);
                        const { error: retryErr } = await supabase.from('admins').update({
                            name: formValues.name,
                            full_name: formValues.name,
                            role: formValues.role
                        }).eq('id', adminId);
                        if (retryErr) throw retryErr;
                    } else {
                        throw error;
                    }
                }

                // Also update local cache for profile details
                if (adminId === localStorage.getItem('activeAdminId')) {
                    localStorage.setItem('activeAdminName', formValues.name);
                    localStorage.setItem('adminName', formValues.name);
                    localStorage.setItem('adminRole', formValues.role);
                    localStorage.setItem('isSuperAdmin', formValues.role.toLowerCase().includes('super') ? 'true' : 'false');
                    
                    if (document.getElementById('topBarName')) {
                        document.getElementById('topBarName').innerText = formValues.name;
                    }
                }

                Swal.fire({
                    icon: 'success',
                    title: isAr ? 'تم التحديث بنجاح!' : 'Updated Successfully!',
                    timer: 1500,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });

                loadAdmins();
            } catch (err) {
                console.error('Update details error:', err);
                Swal.fire({
                    title: isAr ? 'خطأ!' : 'Error!',
                    text: err.message,
                    icon: 'error',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            }
        }
    };
});