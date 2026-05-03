document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. نظام الاسم الدايناميك والدارك مود
    // ==========================================
    const adminName = localStorage.getItem('activeAdminName') || 'Moscow';
    document.getElementById('topBarName').innerText = adminName;

    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = themeToggleBtn.querySelector('i');

    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    function updateThemeUI(theme) {
        if (theme === 'dark') {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            themeIcon.style.color = '#f1c40f';
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            themeIcon.style.color = 'var(--text-main)';
        }
    }
    updateThemeUI(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('siteTheme', currentTheme);
        updateThemeUI(currentTheme);
    });

    // ==========================================
    // 2. إدارة الأدمنز - Full API Integration
    // ==========================================
    const API_BASE_URL = 'http://transit-way.runasp.net';
    const adminTableBody = document.getElementById('adminTableBody');
    const searchInput    = document.getElementById('adminSearchInput');
    const adminModal     = document.getElementById('adminModal');
    const addAdminForm   = document.getElementById('addAdminForm');

    let adminsData = [];

    // ─────────────────────────────────────────
    // GET /api/admin — جلب كل الأدمنز
    // ─────────────────────────────────────────
    async function loadAdmins(silent = false) {
        try {
            if (!silent) {
                adminTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                            <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                            Loading admins from server...
                        </td>
                    </tr>`;
            }

            const res = await fetch(`${API_BASE_URL}/api/admin`);
            if (res.ok) {
                const data = await res.json();
                adminsData = data.map(a => ({
                    id:     a.id,
                    name:   a.fullName   || a.name  || 'Admin',
                    email:  a.email      || '—',
                    phone:  a.phoneNumber || a.phone || '—',
                    status: a.isActive === false ? 'Inactive' : (a.status || 'Active')
                }));
                renderTable();
            } else {
                if (!silent) showError(`Failed to load admins (${res.status})`);
            }
        } catch (err) {
            console.error('Error loading admins:', err);
            if (!silent) showError('Network error — Could not reach server');
        }
    }

    function showError(msg) {
        adminTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px; color:#ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    ${msg}
                </td>
            </tr>`;
    }

    // ─────────────────────────────────────────
    // Render Table
    // ─────────────────────────────────────────
    function renderTable() {
        adminTableBody.innerHTML = '';

        if (adminsData.length === 0) {
            adminTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-user-shield" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        No admins found
                    </td>
                </tr>`;
            return;
        }

        adminsData.forEach(admin => {
            const isActive   = admin.status === 'Active';
            const statusBadge = isActive
                ? `<span class="status active" style="background:rgba(34,197,94,0.1); color:#22c55e; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Active</span>`
                : `<span class="status inactive" style="background:rgba(239,68,68,0.1); color:#ef4444; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Inactive</span>`;

            const row = `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:35px; height:35px; border-radius:50%; background:var(--primary-color); color:white; display:flex; justify-content:center; align-items:center; font-weight:bold; flex-shrink:0;">
                                ${admin.name.charAt(0).toUpperCase()}
                            </div>
                            <span style="font-weight:700;">${admin.name}</span>
                        </div>
                    </td>
                    <td style="color:var(--primary-color); font-family:monospace; font-weight:bold;">#${admin.id}</td>
                    <td>${admin.email}</td>
                    <td>${admin.phone}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <i class="fas fa-eye view-admin"
                           style="color:var(--text-muted); cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                           title="View Details"
                           onmouseover="this.style.color='var(--primary-color)'"
                           onmouseout="this.style.color='var(--text-muted)'"
                           data-id="${admin.id}"></i>
                        <i class="fas fa-toggle-${isActive ? 'on' : 'off'} toggle-status"
                           style="color:${isActive ? '#22c55e' : '#ef4444'}; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                           title="${isActive ? 'Deactivate' : 'Activate'} Admin"
                           onmouseover="this.style.filter='brightness(0.75)'"
                           onmouseout="this.style.filter='brightness(1)'"
                           data-id="${admin.id}"></i>
                        <i class="fas fa-trash-alt delete-admin"
                           style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;"
                           title="Delete Admin"
                           onmouseover="this.style.filter='brightness(0.8)'"
                           onmouseout="this.style.filter='brightness(1)'"
                           data-id="${admin.id}"></i>
                    </td>
                </tr>`;
            adminTableBody.innerHTML += row;
        });
    }

    loadAdmins();

    // Auto-refresh (silent) كل 15 ثانية
    setInterval(() => loadAdmins(true), 15000);

    // ==========================================
    // 3. التفاعل — Search / Modal / Actions
    // ==========================================

    // البحث
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        adminTableBody.querySelectorAll('tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    // فتح / قفل المودال
    document.getElementById('openModalBtn').onclick = () => adminModal.classList.add('active');
    document.getElementById('closeModalBtn').onclick = () => {
        adminModal.classList.remove('active');
        addAdminForm.reset();
    };

    // ─────────────────────────────────────────
    // POST /api/admin — إضافة أدمن جديد
    // ─────────────────────────────────────────
    addAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const Btn = addAdminForm.querySelector('button[type="submit"]');
        Btn.disabled = true;
        Btn.innerText = 'Processing...';

        const inputs = addAdminForm.querySelectorAll('input');

        const payload = {
            fullName:    inputs[0].value.trim(),
            email:       inputs[1].value.trim(),
            phoneNumber: inputs[2].value.trim(),
            password:    inputs[3].value.trim()
        };

        if (!payload.fullName || !payload.email || !payload.password) {
            Swal.fire({ icon: 'warning', title: 'Missing Data', text: 'Please fill in Full Name, Email, and Password.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            Btn.disabled = false;
            Btn.innerText = 'Add Admin';
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });

            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Admin Added! ✅', text: `${payload.fullName} has been added successfully.`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                adminModal.classList.remove('active');
                addAdminForm.reset();
                loadAdmins();
            } else {
                const errorBody = await res.text().catch(() => '');
                throw new Error(`Server ${res.status}: ${errorBody}`);
            }
        } catch (err) {
            console.error('Add admin error:', err);
            Swal.fire({ icon: 'error', title: 'Error', text: `Failed to add admin: ${err.message}`, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } finally {
            Btn.disabled = false;
            Btn.innerText = 'Add Admin';
        }
    });

    // ─────────────────────────────────────────
    // Table Click Events — View / Toggle Status / Delete
    // ─────────────────────────────────────────
    adminTableBody.addEventListener('click', async (e) => {
        const target   = e.target;
        const adminId  = target.getAttribute('data-id');
        if (!adminId) return;

        const adminObj = adminsData.find(a => a.id == adminId);

        // ───── GET /api/admin/{id} — عرض التفاصيل ─────
        if (target.classList.contains('view-admin')) {
            if (!adminObj) return;
            Swal.fire({
                title: `<i class="fas fa-user-shield" style="color:var(--primary-color);"></i> ${adminObj.name}`,
                html: `
                    <div style="text-align:left; font-size:0.95rem; line-height:2.2; padding:10px 0;">
                        <p><strong><i class="fas fa-hashtag" style="width:20px; color:var(--text-muted);"></i> ID:</strong> #${adminObj.id}</p>
                        <p><strong><i class="fas fa-user" style="width:20px; color:var(--text-muted);"></i> Full Name:</strong> ${adminObj.name}</p>
                        <p><strong><i class="fas fa-envelope" style="width:20px; color:var(--text-muted);"></i> Email:</strong> ${adminObj.email}</p>
                        <p><strong><i class="fas fa-phone" style="width:20px; color:var(--text-muted);"></i> Phone:</strong> ${adminObj.phone}</p>
                        <p><strong><i class="fas fa-circle" style="width:20px; color:var(--text-muted);"></i> Status:</strong>
                            <span style="font-weight:800; color:${adminObj.status === 'Active' ? '#22c55e' : '#ef4444'}; text-transform:uppercase;">${adminObj.status}</span>
                        </p>
                    </div>`,
                showCloseButton:  true,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color:      'var(--text-main)',
                width:      460
            });
        }

        // ───── PUT /api/admin/status/{id} — تغيير الحالة ─────
        if (target.classList.contains('toggle-status')) {
            const displayName = adminObj ? adminObj.name : `Admin #${adminId}`;
            const isActive    = adminObj && adminObj.status === 'Active';
            const action      = isActive ? 'Deactivate' : 'Activate';

            const confirm = await Swal.fire({
                title:             `${action} Admin?`,
                text:              `Are you sure you want to ${action.toLowerCase()} ${displayName}?`,
                icon:              'question',
                showCancelButton:  true,
                confirmButtonColor: isActive ? '#ef4444' : '#22c55e',
                cancelButtonColor: 'var(--text-muted)',
                confirmButtonText: `Yes, ${action}!`,
                background: 'var(--bg-card)',
                color:      'var(--text-main)'
            });

            if (confirm.isConfirmed) {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/admin/status/${adminId}`, {
                        method: 'PUT'
                    });
                    if (res.ok) {
                        Swal.fire({ title: 'Updated!', text: `${displayName} is now ${isActive ? 'Inactive' : 'Active'}.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                        loadAdmins();
                    } else {
                        const errorBody = await res.text().catch(() => '');
                        throw new Error(`Server ${res.status}: ${errorBody}`);
                    }
                } catch (err) {
                    console.error('Toggle status error:', err);
                    Swal.fire({ title: 'Error!', text: `Could not update status: ${err.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }

        // ───── DELETE /api/admin/{id} — حذف أدمن ─────
        if (target.classList.contains('delete-admin')) {
            const displayName = adminObj ? adminObj.name : `Admin #${adminId}`;
            const confirm = await Swal.fire({
                title:             'Delete Admin?',
                html:              `<p style="color:#ef4444; font-weight:700;">⚠ Remove <strong>${displayName}</strong> from the system?</p><p style="color:var(--text-muted);">This action cannot be undone.</p>`,
                icon:              'error',
                showCancelButton:  true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: 'var(--text-muted)',
                confirmButtonText: 'Yes, DELETE!',
                background: 'var(--bg-card)',
                color:      'var(--text-main)'
            });

            if (confirm.isConfirmed) {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/admin/${adminId}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        adminsData = adminsData.filter(a => a.id != adminId);
                        renderTable();
                        Swal.fire({ title: 'Deleted!', text: `${displayName} has been permanently deleted.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                    } else {
                        const errorBody = await res.text().catch(() => '');
                        throw new Error(`Server ${res.status}: ${errorBody}`);
                    }
                } catch (err) {
                    console.error('Delete admin error:', err);
                    Swal.fire({ title: 'Error!', text: `Could not delete admin: ${err.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }
    });
});