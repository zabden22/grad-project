document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    /* ── Check if any admins exist — show Setup button if empty ── */
    (async function checkSetup() {
        try {
            const res = await fetch(window.SUPABASE_URL + '/rest/v1/admins?select=id&limit=1', {
                headers: { 'apikey': window.SUPABASE_KEY, 'Authorization': 'Bearer ' + window.SUPABASE_KEY }
            });
            const data = await res.json();
            if (Array.isArray(data) && data.length === 0) {
                const sec = document.getElementById('setupSection');
                if (sec) sec.style.display = 'block';
            }
        } catch (e) { console.warn('Setup check failed:', e); }
    })();

    /* ── Setup First Super Admin ── */
    const setupBtn = document.getElementById('setupFirstAdminBtn');
    if (setupBtn) {
        setupBtn.addEventListener('click', async () => {
            const { value: formData } = await Swal.fire({
                title: '<i class="fas fa-crown" style="color:#8b5cf6;margin-right:8px;"></i> Create Super Admin',
                html: `
                    <div style="text-align:left;">
                        <label style="font-size:0.75rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Full Name</label>
                        <input id="swal-name" class="swal2-input" placeholder="Your full name" style="margin-top:4px;">
                        <label style="font-size:0.75rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-top:12px;display:block;">Email</label>
                        <input id="swal-email" type="email" class="swal2-input" placeholder="admin@example.com" style="margin-top:4px;">
                        <label style="font-size:0.75rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-top:12px;display:block;">Phone</label>
                        <input id="swal-phone" class="swal2-input" placeholder="+20 1XX XXX XXXX" style="margin-top:4px;">
                        <label style="font-size:0.75rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-top:12px;display:block;">Password</label>
                        <input id="swal-pass" type="password" class="swal2-input" placeholder="Create secure password" style="margin-top:4px;">
                    </div>`,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-check"></i> Create Account',
                confirmButtonColor: '#8b5cf6',
                cancelButtonColor: '#64748b',
                background: '#1e293b',
                color: '#fff',
                preConfirm: () => {
                    const name = document.getElementById('swal-name').value.trim();
                    const email = document.getElementById('swal-email').value.trim();
                    const phone = document.getElementById('swal-phone').value.trim();
                    const pass = document.getElementById('swal-pass').value;
                    if (!name || !email || !pass) {
                        Swal.showValidationMessage('Please fill in Name, Email and Password');
                        return false;
                    }
                    if (pass.length < 6) {
                        Swal.showValidationMessage('Password must be at least 6 characters');
                        return false;
                    }
                    return { name, email, phone, pass };
                }
            });

            if (!formData) return;

            Swal.fire({ title: 'Creating account...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            try {
                const signUpRes = await fetch(window.SUPABASE_URL + '/auth/v1/signup', {
                    method: 'POST',
                    headers: { 'apikey': window.SUPABASE_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email, password: formData.pass })
                });
                const resText = await signUpRes.text();
                let authData = {};
                if (resText) { try { authData = JSON.parse(resText); } catch(e) {} }

                if (!signUpRes.ok) {
                    const errMsg = authData.msg || authData.message || authData.error_description || 'Signup failed';
                    throw new Error(errMsg);
                }

                const newUserId = authData.id || (authData.user && authData.user.id);
                if (!newUserId) throw new Error('Could not get user ID.');

                const insertRes = await fetch(window.SUPABASE_URL + '/rest/v1/admins', {
                    method: 'POST',
                    headers: {
                        'apikey': window.SUPABASE_KEY,
                        'Authorization': 'Bearer ' + window.SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        id: newUserId,
                        full_name: formData.name,
                        email: formData.email,
                        phone_number: formData.phone,
                        password_hash: formData.pass,
                        status: 'Active',
                        role: 'Super Admin'
                    })
                });

                if (!insertRes.ok) {
                    const errBody = await insertRes.json().catch(() => ({}));
                    throw new Error(errBody.message || 'Failed to insert admin record');
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'Super Admin Created! 🎉',
                    html: `<p style="font-weight:700;">Account: <span style="color:#8b5cf6;">${formData.email}</span></p>`,
                    confirmButtonColor: '#8b5cf6',
                    background: '#1e293b',
                    color: '#fff'
                });

                document.getElementById('email').value = formData.email;
                document.getElementById('password').value = formData.pass;
                document.getElementById('setupSection').style.display = 'none';

            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Creation Failed', text: err.message, background: '#1e293b', color: '#fff', confirmButtonColor: '#ef4444' });
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            try {
                let authData = null;
                let authError = null;
                
                try {
                    const res = await window.supabaseAuth.auth.signInWithPassword({ email, password });
                    authData = res.data;
                    authError = res.error;
                } catch(e) { authError = e; }

                let adminData = null;

                if (!authError && authData && authData.user) {
                    const { data } = await window.supabase.from('admins').select('*').eq('id', authData.user.id).single();
                    adminData = data;
                } else {
                    const { data: dbAdmins } = await window.supabase.from('admins').select('*');
                    const adminsList = Array.isArray(dbAdmins) ? dbAdmins : [];
                    adminData = adminsList.find(a => {
                        return (a.email || '').toLowerCase().trim() === email.toLowerCase() && a.password_hash === password;
                    });
                }

                if (adminData) {
                    const token = (authData && authData.session) ? authData.session.access_token : 'db-session';
                    localStorage.setItem('adminToken', token);
                    localStorage.setItem('adminName', adminData.full_name || adminData.email?.split('@')[0] || "Admin");
                    localStorage.setItem('adminEmail', email);
                    localStorage.setItem('activeAdminName', adminData.full_name || adminData.email?.split('@')[0] || "Admin");
                    localStorage.setItem('activeAdminId', adminData.id);
                    localStorage.setItem('adminRole', adminData.role || "Admin");
                    localStorage.setItem('isSuperAdmin', (adminData.role || '').toLowerCase().includes('super') ? 'true' : 'false');

                    Swal.fire({
                        icon: 'success',
                        title: '<div style="font-weight:900; letter-spacing:-0.5px;">Welcome Back, Commander!</div>',
                        html: `
                            <div style="margin-top:10px; font-weight:700; color:var(--text-muted);">
                                Secure link established. Redirecting to <span style="color:var(--primary-color);">Strategic Dashboard</span>...
                            </div>
                        `,
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true,
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        showClass: { popup: 'animate__animated animate__zoomIn animate__faster' },
                        hideClass: { popup: 'animate__animated animate__fadeOut animate__faster' },
                        didOpen: () => {
                            Swal.showLoading();
                            const b = Swal.getHtmlContainer().querySelector('b');
                            if (b) b.textContent = Swal.getTimerLeft();
                        }
                    });
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
                } else {
                    try { await window.supabaseAuth.auth.signOut(); } catch(e) {}
                    Swal.fire({
                        icon: 'error',
                        title: '<div style="font-weight:900; color:#ef4444;">Access Denied</div>',
                        text: 'Invalid credentials detected. Please verify your identity.',
                        confirmButtonColor: '#ef4444',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        showClass: { popup: 'animate__animated animate__headShake' }
                    });
                    resetBtn(submitBtn);
                }

            } catch (error) {
                console.error("Server Issue:", error);
                Swal.fire({ icon: 'warning', title: 'Server Error', text: 'The server is not responding.', confirmButtonColor: '#1a1a1a' });
                resetBtn(submitBtn);
            }
        });
    }
});
function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = 'Login';
}
