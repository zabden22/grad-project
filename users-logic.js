document.addEventListener('DOMContentLoaded', () => {
    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';

    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    let usersData = [];
    let banCounter = parseInt(localStorage.getItem('banCounter')) || 0;

    const grid = document.getElementById('usersGrid');
    const searchInput = document.getElementById('userSearchInput');

    function updateStats() {
        const total = usersData.length;
        const banned = usersData.filter(u => u.is_banned === true).length;
        const warned = usersData.filter(u => (u.warning_count || 0) > 0).length;
        const active = total - banned;

        if (document.getElementById('statTotalUsers')) document.getElementById('statTotalUsers').innerText = total;
        if (document.getElementById('statActiveUsers')) document.getElementById('statActiveUsers').innerText = active;
        if (document.getElementById('statBannedUsers')) document.getElementById('statBannedUsers').innerText = banned;
        if (document.getElementById('statWarnedUsers')) document.getElementById('statWarnedUsers').innerText = warned;
    }

    function renderUsers(dataToRender) {
        if (!grid) return;
        grid.innerHTML = '';
        if (dataToRender.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">
                <i class="fas fa-users-slash" style="font-size:40px;margin-bottom:15px;color:var(--border-color);"></i>
                <p>No users found in the system.</p>
            </div>`;
            return;
        }

        dataToRender.forEach((user, index) => {
            const serialNum = String(index + 1).padStart(4, '0');
            const isBanned = user.is_banned === true;
            const isWarned = (user.warning_count || 0) > 0;
            
            let statusBadge = `<span class="user-badge badge-active"><i class="fas fa-check-circle"></i> Active</span>`;
            if (isBanned) {
                statusBadge = `<span class="user-badge badge-banned"><i class="fas fa-ban"></i> Banned</span>`;
            } else if (isWarned) {
                statusBadge = `<span class="user-badge badge-warned"><i class="fas fa-exclamation-triangle"></i> Warned</span>`;
            }

            const displayName = user.name || user.full_name || 'User';
            const avatarUrl = user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=568e74&color=fff`;

            const card = document.createElement('div');
            card.className = `user-card ${isBanned ? 'banned' : ''}`;
            card.innerHTML = `
                <div class="user-card-header">
                    <img src="${avatarUrl}" class="user-avatar" alt="Avatar" onerror="this.src='https://ui-avatars.com/api/?name=User&background=568e74&color=fff'">
                    <div class="user-info-block">
                        <h3 class="user-name">${displayName}</h3>
                        <p class="user-email">${user.email || 'No email'}</p>
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-detail-item">
                        <label>Serial ID</label>
                        <span>#${serialNum}</span>
                    </div>
                    <div class="user-detail-item">
                        <label>Wallet Balance</label>
                        <span style="color: #10b981;">EGP ${(user.wallet_balance || 0).toFixed(2)}</span>
                    </div>
                    <div class="user-detail-item">
                        <label>Status</label>
                        <span>${statusBadge}</span>
                    </div>
                </div>
                
                <div class="user-actions">
                    ${isSuperAdmin ? `
                    <button class="user-action-btn btn-warn" onclick="window.warnUser('${user.id}', '${displayName}')" ${isBanned ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                        <i class="fas fa-exclamation-triangle"></i> Warn
                    </button>
                    ${isBanned 
                        ? `<button class="user-action-btn btn-unban" onclick="window.unbanUser('${user.id}', '${displayName}')"><i class="fas fa-unlock"></i> Unban</button>`
                        : `<button class="user-action-btn btn-ban" onclick="window.banUser('${user.id}', '${displayName}')"><i class="fas fa-ban"></i> Ban</button>`
                    }
                    <button class="user-action-btn btn-delete" onclick="window.deleteUser('${user.id}', '${displayName}')" style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2);">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                    ` : ''}
                    <button class="user-action-btn btn-info" onclick="window.viewUserDetails('${user.id}')" style="margin-left:auto;">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    async function loadUsers(silent = false) {
        try {
            if (!silent && grid && usersData.length === 0) {
                grid.innerHTML = Array(6).fill('<div class="user-card"><div class="skeleton" style="width:100%;height:150px;border-radius:12px;"></div></div>').join('');
            }
            const [uRes, wRes] = await Promise.all([
                supabase.from('users').select('*'),
                supabase.from('wallets').select('*')
            ]);
            if (uRes.error) throw uRes.error;
            
            const wallets = wRes.data || [];
            usersData = (uRes.data || []).map(u => {
                const w = wallets.find(wall => wall.user_id === u.id);
                return {
                    id: u.id,
                    name: u.name || u.full_name || 'User',
                    email: u.email,
                    phone: u.phone || u.phone_number || 'N/A',
                    role: u.role,
                    created_at: u.created_at,
                    photo: u.photo || null,
                    wallet_balance: (w && typeof w.balance === 'number') ? w.balance : (typeof u.balance === 'number' ? u.balance : 0),
                    is_banned: u.is_banned === true || localStorage.getItem('user_banned_' + u.id) === 'true',
                    ban_reason: u.ban_reason || localStorage.getItem('user_ban_reason_' + u.id) || null,
                    warning_count: parseInt(localStorage.getItem('user_warn_count_' + u.id)) || 0,
                    last_warning_reason: localStorage.getItem('user_warn_reason_' + u.id) || null
                };
            });
            
            updateStats();
            filterUsers();
        } catch (e) {
            console.error('Error loading users:', e);
            if (!usersData.length && grid) grid.innerHTML = `<div style="padding:20px;color:var(--danger-color);grid-column:1/-1;text-align:center;">Error loading users from server.</div>`;
        }
    }

    let currentFilter = 'all';

    function filterUsers() {
        let filtered = usersData;

        if (currentFilter === 'active') {
            filtered = filtered.filter(u => !(u.is_banned === true));
        } else if (currentFilter === 'banned') {
            filtered = filtered.filter(u => u.is_banned === true);
        } else if (currentFilter === 'warned') {
            filtered = filtered.filter(u => (u.warning_count || 0) > 0);
        }

        if (searchInput) {
            const query = searchInput.value.toLowerCase().trim();
            if (query) {
                filtered = filtered.filter(u => 
                    (u.name || '').toLowerCase().includes(query) ||
                    (u.email || '').toLowerCase().includes(query) ||
                    (u.phone || '').toLowerCase().includes(query) ||
                    (u.id || '').toLowerCase().includes(query)
                );
            }
        }
        
        renderUsers(filtered);
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterUsers);
    }

    const statCards = document.querySelectorAll('.users-stat-card');
    statCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const h4 = card.querySelector('h4');
            if (!h4) return;
            const id = h4.id;
            
            statCards.forEach(c => c.style.border = '1px solid var(--border-color)');
            card.style.border = '2px solid var(--primary-color)';
            
            if (id === 'statTotalUsers') currentFilter = 'all';
            else if (id === 'statActiveUsers') currentFilter = 'active';
            else if (id === 'statBannedUsers') currentFilter = 'banned';
            else if (id === 'statWarnedUsers') currentFilter = 'warned';
            
            filterUsers();
        });
    });

    async function sendUserNotification(userId, title, body) {
        try {
            await supabase.from('notifications').insert({
                user_id: userId,
                title: title,
                message: body,
                is_read: false
            });
        } catch (err) {
            console.error('[Notifications] Failed to send signal:', err);
        }
    }

    window.warnUser = async (userId, userName) => {
        const userObj = usersData.find(u => String(u.id) === String(userId));
        const currentCount = userObj ? (userObj.warning_count || 0) : 0;

        const { value: reason } = await Swal.fire({
            title: 'Warn User',
            input: 'text',
            inputLabel: `Send a warning to ${userName || 'this user'}`,
            inputPlaceholder: 'Enter warning reason...',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            background: 'var(--bg-card)', color: 'var(--text-main)',
            inputValidator: (val) => !val && 'You need to write something!'
        });

        if (reason) {
            try {
                const newCount = currentCount + 1;
                localStorage.setItem('user_warn_count_' + userId, newCount);
                localStorage.setItem('user_warn_reason_' + userId, reason);
                
                await sendUserNotification(userId, 'Warning Issued ⚠️', reason);

                Swal.fire({ icon: 'success', title: 'Warning Sent!', text: `${userName || 'User'} has been warned.`, timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                loadUsers(true);
            } catch (err) {
                console.error(err);
                Swal.fire('Error', `Could not warn user: ${err.message}`, 'error');
            }
        }
    };

    window.banUser = async (userId, userName) => {
        const { value: reason } = await Swal.fire({
            title: 'Ban User',
            input: 'text',
            inputLabel: `Reason for banning ${userName || 'this user'}`,
            inputPlaceholder: 'e.g. Violation of terms',
            showCancelButton: true,
            confirmButtonText: 'Yes, Ban',
            confirmButtonColor: '#ef4444',
            background: 'var(--bg-card)', color: 'var(--text-main)',
            inputValidator: (val) => !val && 'Please provide a reason'
        });

        if (reason) {
            try {
                const { error: dbError } = await supabase
                    .from('users')
                    .update({ 
                        is_banned: true,
                        ban_reason: reason
                    })
                    .eq('id', userId);

                if (dbError) throw dbError;

                localStorage.setItem('user_banned_' + userId, 'true');
                localStorage.setItem('user_ban_reason_' + userId, reason);
                
                await sendUserNotification(userId, 'Account Suspended 🚫', reason);

                banCounter++;
                localStorage.setItem('banCounter', banCounter);

                Swal.fire({ 
                    icon: 'success', 
                    title: 'User Banned', 
                    html: `<p>${userName || 'User'} has been banned.</p><p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">Total Bans Issued: <strong style="color:#ef4444;">${banCounter}</strong></p>`, 
                    timer: 1500, 
                    showConfirmButton: false, 
                    background: 'var(--bg-card)', color: 'var(--text-main)' 
                });
                loadUsers(true);
            } catch (err) {
                console.error(err);
                Swal.fire('Error', `Could not ban user: ${err.message}`, 'error');
            }
        }
    };

    window.unbanUser = async (userId, userName) => {
        const result = await Swal.fire({
            title: 'Unban User?',
            text: `Are you sure you want to restore access for ${userName || 'this user'}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Unban',
            confirmButtonColor: '#10b981',
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });

        if (result.isConfirmed) {
            try {
                const { error: dbError } = await supabase
                    .from('users')
                    .update({ 
                        is_banned: false,
                        ban_reason: null
                    })
                    .eq('id', userId);

                if (dbError) throw dbError;

                localStorage.setItem('user_banned_' + userId, 'false');
                localStorage.removeItem('user_ban_reason_' + userId);
                
                await sendUserNotification(userId, 'Account Restored ✅', 'Your account restriction has been lifted.');

                Swal.fire({ icon: 'success', title: 'User Unbanned!', text: `${userName || 'User'} can now access the system.`, timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                loadUsers(true);
            } catch (err) {
                console.error(err);
                Swal.fire('Error', `Could not unban user: ${err.message}`, 'error');
            }
        }
    };

    window.deleteUser = async (userId, userName) => {
        const isAr = (typeof getLang === 'function' && getLang() === 'ar');
        const result = await Swal.fire({
            title: isAr ? 'حذف المستخدم؟' : 'Delete User?',
            html: isAr 
                ? `<p style="color:#ef4444; font-weight:700;">⚠ هل أنت متأكد من حذف <strong>"${userName}"</strong> وجميع بياناته؟</p>
                   <p style="color:var(--text-muted); font-size:0.85rem;">سيؤدي ذلك إلى حذف محفظتهم، وتذاكرهم، واشتراكاتهم، وشكاويهم بشكل نهائي.</p>`
                : `<p style="color:#ef4444; font-weight:700;">⚠ Remove <strong>"${userName}"</strong> and all their data?</p>
                   <p style="color:var(--text-muted); font-size:0.85rem;">This will permanently delete their wallet, tickets, subscriptions, and complaints.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: isAr ? 'نعم، احذف!' : 'Yes, delete it!',
            cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (result.isConfirmed) {
            try {
                // Fetch user's wallets to clean up transactions
                const { data: wallets } = await supabase.from('wallets').select('id').eq('user_id', userId);
                const walletIds = (wallets || []).map(w => w.id);

                const deletePromises = [];
                if (walletIds.length > 0) {
                    walletIds.forEach(wId => {
                        deletePromises.push(supabase.from('transactions').delete().eq('wallet_id', wId));
                    });
                }
                deletePromises.push(supabase.from('wallets').delete().eq('user_id', userId));
                deletePromises.push(supabase.from('subscriptions').delete().eq('user_id', userId));
                deletePromises.push(supabase.from('tickets').delete().eq('user_id', userId));
                deletePromises.push(supabase.from('notifications').delete().eq('user_id', userId));
                deletePromises.push(supabase.from('reports').delete().eq('user_id', userId));
                deletePromises.push(supabase.from('sos').delete().eq('user_id', userId));

                await Promise.all(deletePromises);
                
                // Now delete the user
                const { error } = await supabase.from('users').delete().eq('id', userId);
                if (error) throw error;

                // Clean local storage cache keys
                localStorage.removeItem('user_banned_' + userId);
                localStorage.removeItem('user_ban_reason_' + userId);
                localStorage.removeItem('user_warn_count_' + userId);
                localStorage.removeItem('user_warn_reason_' + userId);

                Swal.fire({
                    title: isAr ? 'تم الحذف!' : 'Deleted!',
                    text: isAr ? `تمت إزالة "${userName}" بنجاح.` : `"${userName}" has been removed.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
                loadUsers();
            } catch (err) {
                console.error(err);
                Swal.fire({
                    title: isAr ? 'خطأ!' : 'Error!',
                    text: isAr ? `فشل حذف المستخدم: ${err.message}` : `Could not delete user: ${err.message}`,
                    icon: 'error',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            }
        }
    };

    window.viewUserDetails = (userId) => {
        const index = usersData.findIndex(u => String(u.id) === String(userId));
        const user = usersData[index];
        if (!user) return;
        
        const isAr = (typeof getLang === 'function' && getLang() === 'ar');
        const serialNum = String(index + 1).padStart(4, '0');
        const isBanned = user.is_banned === true;
        const isWarned = (user.warning_count || 0) > 0;
        const balance = (user.wallet_balance || 0).toFixed(2);
        
        const displayName = user.name || 'User';
        const avatarUrl = user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0ea5e9&color=fff&bold=true`;

        let statusText = isAr ? 'نشط' : 'Active';
        let statusColor = '#10b981';
        let statusIcon = 'fa-check-circle';
        
        if (isBanned) {
            statusText = isAr ? 'محظور' : 'Banned';
            statusColor = '#ef4444';
            statusIcon = 'fa-ban';
        } else if (isWarned) {
            statusText = isAr ? 'منذر' : 'Warned';
            statusColor = '#f59e0b';
            statusIcon = 'fa-exclamation-triangle';
        }

        Swal.fire({
            html: `
                <div style="text-align: left; overflow: hidden; border-radius: 24px; margin: -1.25em;">
                    <div style="background: linear-gradient(135deg, #075985 0%, #0c4a6e 100%); height: 120px; position: relative;">
                        <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(14,165,233,0.3), transparent);"></div>
                    </div>
                    <div style="text-align: center; margin-top: -60px; position: relative; z-index: 2;">
                        <img src="${avatarUrl}" style="width: 120px; height: 120px; border-radius: 50%; border: 6px solid var(--bg-card); object-fit: cover; box-shadow: 0 15px 35px rgba(0,0,0,0.3);" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0ea5e9&color=fff&bold=true'">
                    </div>
                    <div style="padding: 25px 35px 35px;">
                        <h2 style="margin: 10px 0 5px; font-weight: 900; font-size: 2rem; text-align: center; color:var(--text-main); letter-spacing: -0.5px;">${displayName}</h2>
                        <div style="text-align: center; margin-bottom: 30px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            <span style="padding: 6px 18px; border-radius: 50px; background: rgba(14,165,233,0.1); color: #0ea5e9; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; border: 1.5px solid rgba(14,165,233,0.2);">
                                #${serialNum}
                            </span>
                            <span style="padding: 6px 18px; border-radius: 50px; background: ${statusColor}15; color: ${statusColor}; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; border: 1.5px solid ${statusColor}30;">
                                <i class="fas ${statusIcon}" style="margin-right: 5px;"></i> ${statusText}
                            </span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr; gap: 15px; direction: ${isAr ? 'rtl' : 'ltr'};">
                            <div style="background: var(--bg-main); padding: 18px; border-radius: 18px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 18px;">
                                <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(14,165,233,0.1); color: #0ea5e9; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;"><i class="fas fa-envelope"></i></div>
                                <div style="flex: 1;">
                                    <p style="font-size: 0.65rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; margin: 0; letter-spacing: 0.8px;">${isAr ? 'البريد الإلكتروني' : 'Email Address'}</p>
                                    <p style="font-weight: 800; margin: 2px 0 0; font-size: 1rem; color: var(--text-main); word-break: break-all;">${user.email || 'N/A'}</p>
                                </div>
                            </div>

                            <div style="background: var(--bg-main); padding: 18px; border-radius: 18px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 18px;">
                                <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(59,130,246,0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;"><i class="fas fa-phone"></i></div>
                                <div style="flex: 1;">
                                    <p style="font-size: 0.65rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; margin: 0; letter-spacing: 0.8px;">${isAr ? 'رقم الهاتف' : 'Phone Number'}</p>
                                    <p style="font-weight: 800; margin: 2px 0 0; font-size: 1.1rem; color: var(--text-main);">${user.phone || 'N/A'}</p>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div style="background: rgba(16,185,129,0.05); padding: 18px; border-radius: 18px; border: 1.5px solid rgba(16,185,129,0.2); display: flex; flex-direction: column; gap: 5px;">
                                    <p style="font-size: 0.65rem; font-weight: 900; color: #10b981; text-transform: uppercase; margin: 0; letter-spacing: 0.8px;">${isAr ? 'الرصيد' : 'Wallet Balance'}</p>
                                    <p style="font-weight: 900; margin: 0; font-size: 1.3rem; color: #10b981;">EGP ${balance}</p>
                                </div>
                                <div style="background: rgba(245,158,11,0.05); padding: 18px; border-radius: 18px; border: 1.5px solid rgba(245,158,11,0.2); display: flex; flex-direction: column; gap: 5px;">
                                    <p style="font-size: 0.65rem; font-weight: 900; color: #f59e0b; text-transform: uppercase; margin: 0; letter-spacing: 0.8px;">${isAr ? 'الإنذارات' : 'Warnings'}</p>
                                    <p style="font-weight: 900; margin: 0; font-size: 1.3rem; color: #f59e0b;">${user.warning_count || 0}</p>
                                </div>
                            </div>

                            ${user.last_warning_reason ? `
                            <div style="background: rgba(245,158,11,0.05); padding: 15px 18px; border-radius: 15px; border-left: 4px solid #f59e0b;">
                                <p style="font-size: 0.65rem; font-weight: 900; color: #f59e0b; text-transform: uppercase; margin: 0 0 5px; letter-spacing: 0.8px;">${isAr ? 'آخر إنذار' : 'Last Warning Reason'}</p>
                                <p style="font-weight: 600; margin: 0; font-size: 0.85rem; color: var(--text-main);">${user.last_warning_reason}</p>
                            </div>` : ''}

                            <div style="padding-top: 10px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;"><i class="fas fa-calendar-alt" style="margin-right: 5px;"></i> ${isAr ? 'انضم في:' : 'Joined:'} ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                                <span style="font-size: 0.7rem; font-family: monospace; color: var(--text-muted); opacity: 0.5;">ID: ${user.id.slice(0,8)}...</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: isAr ? 'إغلاق' : 'Close',
            confirmButtonColor: '#0ea5e9',
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

    async function initUsers() {
        await loadUsers();
        const jumpTo = localStorage.getItem('jumpToUserId');
        if (jumpTo && searchInput) {
            searchInput.value = jumpTo;
            filterUsers();
            localStorage.removeItem('jumpToUserId');
            
            Swal.fire({
                icon: 'info',
                title: 'User Profile Located',
                text: 'Filtered by associated ticket signal.',
                timer: 2000,
                showConfirmButton: false,
                background: 'var(--bg-card)', color: 'var(--text-main)',
                toast: true, position: 'top-end'
            });
        }
    }

    initUsers();

    if (window.supabaseAuth) {
        window.supabaseAuth.channel('users_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
                loadUsers(true);
            })
            .subscribe();
    }
});
