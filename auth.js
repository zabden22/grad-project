/* ══════════════════════════════════════════════════
   TransitWay — Global Auth Helper
   Handles: Logout from any page + Login with DB
   Loaded on EVERY page via <script src="auth.js">
   ══════════════════════════════════════════════════ */

/* ── Logout — works immediately, no DOMContentLoaded needed ── */
window.confirmLogout = function () {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Log Out?',
            text: 'Are you sure you want to sign out?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Log Out',
            cancelButtonText: 'Cancel',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await performLogout();
            }
        });
    } else {
        if (confirm('Log out?')) {
            performLogout();
        }
    }
};

async function performLogout() {
    // Sign out from Supabase Auth
    try {
        if (window.supabaseAuth && window.supabaseAuth.auth) {
            await window.supabaseAuth.auth.signOut();
        }
    } catch (e) { console.warn('Auth signout:', e); }

    // Clear ALL admin session data from localStorage
    const keysToRemove = [
        'adminToken', 'adminName', 'adminEmail', 'adminRole',
        'activeAdminName', 'activeAdminId', 'activeAdminEmail',
        'activeAdminPhone', 'activeAdminDept', 'activeAdminLocation',
        'isSuperAdmin', 'adminProfilePhoto', '_photoCacheCleared'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Redirect to login
    window.location.href = 'index.html';
}

/* ── Login with Database — fallback when GoTrue Auth fails ── */
window.loginWithDatabase = async function (email, password) {
    try {
        // Try GoTrue Auth first
        if (window.supabaseAuth && window.supabaseAuth.auth) {
            const { data: authData, error: authError } = await window.supabaseAuth.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (!authError && authData && authData.user) {
                // GoTrue login successful — fetch admin profile
                const { data: adminData } = await window.supabase
                    .from('admins')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                if (adminData) {
                    saveAdminSession(adminData, authData.session?.access_token);
                    return { success: true, admin: adminData };
                }
            }
        }

        // Fallback: Direct DB check (match email + password_hash)
        const { data: admins, error: dbErr } = await window.supabase
            .from('admins')
            .select('*');

        if (dbErr) throw new Error(dbErr.message || 'Database error');

        const adminsList = Array.isArray(admins) ? admins : [];
        const matched = adminsList.find(a => {
            const aEmail = (a.email || '').toLowerCase().trim();
            const aPass = a.password_hash || '';
            return aEmail === email.toLowerCase().trim() && aPass === password;
        });

        if (matched) {
            saveAdminSession(matched, null);
            return { success: true, admin: matched };
        }

        return { success: false, error: 'Invalid email or password. Please check your credentials.' };

    } catch (err) {
        console.error('Login error:', err);
        return { success: false, error: err.message || 'Login failed' };
    }
};

function saveAdminSession(adminData, token) {
    const name = adminData.full_name || adminData.email?.split('@')[0] || 'Admin';
    const email = adminData.email || '';
    const role = adminData.role || 'Admin';

    if (token) localStorage.setItem('adminToken', token);
    localStorage.setItem('adminName', name);
    localStorage.setItem('adminEmail', email);
    localStorage.setItem('activeAdminName', name);
    localStorage.setItem('activeAdminId', adminData.id);
    localStorage.setItem('activeAdminEmail', email);
    localStorage.setItem('adminRole', role);
    localStorage.setItem('isSuperAdmin', role.toLowerCase().includes('super') ? 'true' : 'false');
}
