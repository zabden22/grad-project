document.addEventListener('DOMContentLoaded', () => {
    
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

        if (!document.getElementById('neural-keyframes')) {
            const style = document.createElement('style');
            style.id = 'neural-keyframes';
            style.innerHTML = `
                @keyframes neuralFloatVar1 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(40px, -60px) scale(1.3); } 66% { transform: translate(-30px, -120px) scale(0.8); } 100% { transform: translate(0, -180px) scale(1); } }
                @keyframes neuralFloatVar2 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-50px, -50px) scale(1.2); } 66% { transform: translate(40px, -100px) scale(0.9); } 100% { transform: translate(0, -160px) scale(1); } }
                @keyframes neuralFloatVar3 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -70px) scale(1.1); } 66% { transform: translate(-40px, -140px) scale(0.85); } 100% { transform: translate(0, -200px) scale(1); } }
            `;
            document.head.appendChild(style);
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
    };

    
    window.injectNeuralBackground();

    const loginForm = document.getElementById('loginForm');

    
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
                        name: formData.name,
                        email: formData.email,
                        password_hash: formData.pass,
                        role: 'super_admin'
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
                    localStorage.setItem('adminName', adminData.name || adminData.full_name || adminData.email?.split('@')[0] || "Admin");
                    localStorage.setItem('adminEmail', email);
                    localStorage.setItem('activeAdminName', adminData.name || adminData.full_name || adminData.email?.split('@')[0] || "Admin");
                    localStorage.setItem('activeAdminId', adminData.id);
                    localStorage.setItem('adminRole', adminData.role || "Admin");
                    localStorage.setItem('isSuperAdmin', (adminData.role || '').toLowerCase().includes('super') ? 'true' : 'false');

                    const displayName = adminData.name || adminData.full_name || adminData.email?.split('@')[0] || "Commander";
                    const roleLabel = (adminData.role || '').toLowerCase().includes('super') ? 'Super Administrator' : 'Administrator';
                    const roleIcon = (adminData.role || '').toLowerCase().includes('super') ? 'fa-crown' : 'fa-shield-alt';
                    const roleColor = (adminData.role || '').toLowerCase().includes('super') ? '#8b5cf6' : '#10b981';
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

                    
                    Swal.fire({
                        html: `
                            <div class="login-welcome-container">
                                <!-- Animated Background Particles -->
                                <div class="welcome-particles">
                                    ${Array.from({length: 20}, (_, i) => `<div class="w-particle" style="--i:${i};--x:${Math.random()*100}%;--y:${Math.random()*100}%;--s:${Math.random()*4+2}px;--d:${Math.random()*6+4}s;--delay:${Math.random()*-10}s;"></div>`).join('')}
                                </div>

                                <!-- Success Checkmark Animation -->
                                <div class="welcome-check-ring">
                                    <svg class="checkmark-svg" viewBox="0 0 52 52">
                                        <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                        <path class="checkmark-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                    </svg>
                                </div>

                                <!-- Welcome Text -->
                                <h2 class="welcome-title">Welcome Back</h2>
                                <div class="welcome-name-row">
                                    <span class="welcome-name">${displayName}</span>
                                </div>

                                <!-- Role Badge -->
                                <div class="welcome-role-badge" style="--role-color:${roleColor};">
                                    <i class="fas ${roleIcon}"></i>
                                    <span>${roleLabel}</span>
                                </div>

                                <!-- Session Info -->
                                <div class="welcome-session">
                                    <div class="session-item">
                                        <i class="far fa-clock"></i>
                                        <span>${timeStr}</span>
                                    </div>
                                    <div class="session-divider"></div>
                                    <div class="session-item">
                                        <i class="far fa-calendar-alt"></i>
                                        <span>${dateStr}</span>
                                    </div>
                                </div>

                                <!-- Loading Bar -->
                                <div class="welcome-progress-track">
                                    <div class="welcome-progress-bar"></div>
                                </div>
                                <p class="welcome-redirect-text">Initializing Fleet Command Center...</p>
                            </div>

                            <style>
                                .login-welcome-container {
                                    text-align: center;
                                    position: relative;
                                    overflow: hidden;
                                    padding: 10px 0;
                                }

                                /* Particles */
                                .welcome-particles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
                                .w-particle {
                                    position: absolute;
                                    width: var(--s); height: var(--s);
                                    background: ${roleColor};
                                    border-radius: 50%;
                                    left: var(--x); top: var(--y);
                                    opacity: 0;
                                    animation: floatParticle var(--d) linear infinite var(--delay);
                                    filter: blur(1px);
                                }
                                @keyframes floatParticle {
                                    0% { transform: translateY(0) scale(0); opacity: 0; }
                                    20% { opacity: 0.6; transform: translateY(-30px) scale(1); }
                                    80% { opacity: 0.3; }
                                    100% { transform: translateY(-120px) scale(0.5); opacity: 0; }
                                }

                                /* Checkmark */
                                .welcome-check-ring {
                                    width: 80px; height: 80px;
                                    margin: 0 auto 20px;
                                    animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                                }
                                .checkmark-svg { width: 80px; height: 80px; display: block; }
                                .checkmark-circle {
                                    stroke: ${roleColor};
                                    stroke-width: 2;
                                    stroke-dasharray: 166;
                                    stroke-dashoffset: 166;
                                    animation: strokeCircle 0.6s 0.3s ease forwards;
                                }
                                .checkmark-path {
                                    stroke: ${roleColor};
                                    stroke-width: 3;
                                    stroke-linecap: round;
                                    stroke-linejoin: round;
                                    stroke-dasharray: 48;
                                    stroke-dashoffset: 48;
                                    animation: strokeCheck 0.4s 0.7s ease forwards;
                                }
                                @keyframes strokeCircle { to { stroke-dashoffset: 0; } }
                                @keyframes strokeCheck { to { stroke-dashoffset: 0; } }
                                @keyframes scaleIn { from { transform: scale(0) rotate(-90deg); opacity:0; } to { transform: scale(1) rotate(0); opacity:1; } }

                                /* Title */
                                .welcome-title {
                                    font-size: 1.1rem;
                                    font-weight: 600;
                                    color: #94a3b8;
                                    margin: 0 0 4px;
                                    letter-spacing: 3px;
                                    text-transform: uppercase;
                                    animation: fadeSlideUp 0.6s 0.4s both;
                                }
                                .welcome-name-row {
                                    margin-bottom: 16px;
                                    animation: fadeSlideUp 0.6s 0.5s both;
                                }
                                .welcome-name {
                                    font-size: 2rem;
                                    font-weight: 900;
                                    background: linear-gradient(135deg, #f8fafc 0%, ${roleColor} 100%);
                                    -webkit-background-clip: text;
                                    -webkit-text-fill-color: transparent;
                                    background-clip: text;
                                    letter-spacing: -0.5px;
                                }

                                /* Role Badge */
                                .welcome-role-badge {
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 8px;
                                    background: color-mix(in srgb, var(--role-color) 12%, transparent);
                                    border: 1px solid color-mix(in srgb, var(--role-color) 25%, transparent);
                                    color: var(--role-color);
                                    padding: 8px 20px;
                                    border-radius: 50px;
                                    font-size: 0.78rem;
                                    font-weight: 800;
                                    letter-spacing: 0.5px;
                                    animation: fadeSlideUp 0.6s 0.6s both;
                                }
                                .welcome-role-badge i { font-size: 0.9rem; }

                                /* Session Info */
                                .welcome-session {
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    gap: 16px;
                                    margin: 22px 0;
                                    animation: fadeSlideUp 0.6s 0.7s both;
                                }
                                .session-item {
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                    color: #64748b;
                                    font-size: 0.82rem;
                                    font-weight: 700;
                                }
                                .session-item i { color: ${roleColor}; font-size: 0.9rem; }
                                .session-divider {
                                    width: 4px; height: 4px;
                                    border-radius: 50%;
                                    background: #334155;
                                }

                                /* Progress */
                                .welcome-progress-track {
                                    height: 4px;
                                    background: #1e293b;
                                    border-radius: 10px;
                                    overflow: hidden;
                                    margin: 0 40px 12px;
                                    animation: fadeSlideUp 0.6s 0.8s both;
                                }
                                .welcome-progress-bar {
                                    height: 100%;
                                    background: linear-gradient(90deg, ${roleColor}, #3b82f6, ${roleColor});
                                    background-size: 200% 100%;
                                    border-radius: 10px;
                                    animation: progressFill 2s 0.9s ease forwards, shimmer 1.5s infinite;
                                    width: 0%;
                                }
                                @keyframes progressFill { to { width: 100%; } }
                                @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

                                .welcome-redirect-text {
                                    font-size: 0.78rem;
                                    color: #475569;
                                    font-weight: 700;
                                    letter-spacing: 0.5px;
                                    animation: fadeSlideUp 0.6s 1s both, textPulse 2s 1s infinite;
                                }
                                @keyframes fadeSlideUp {
                                    from { opacity: 0; transform: translateY(15px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                                @keyframes textPulse {
                                    0%, 100% { opacity: 0.6; }
                                    50% { opacity: 1; }
                                }
                            </style>
                        `,
                        showConfirmButton: false,
                        timer: 2800,
                        background: '#0f172a',
                        color: '#f8fafc',
                        width: 480,
                        padding: '40px 30px',
                        customClass: {
                            popup: 'premium-login-popup'
                        },
                        showClass: { popup: 'animate__animated animate__fadeIn animate__faster' },
                        hideClass: { popup: 'animate__animated animate__fadeOut' },
                        didOpen: (popup) => {
                            popup.style.borderRadius = '32px';
                            popup.style.border = '1px solid rgba(255,255,255,0.06)';
                            popup.style.boxShadow = '0 50px 100px -20px rgba(0,0,0,0.7), 0 0 80px -30px ' + roleColor + '40';
                            popup.style.overflow = 'hidden';
                        }
                    });

                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 2800);
                } else {
                    try { await window.supabaseAuth.auth.signOut(); } catch(e) {}
                    const siteTheme = localStorage.getItem('siteTheme') || 'light';
                    const isDark = siteTheme === 'dark';
                    Swal.fire({ 
                        icon: 'error', 
                        title: 'Login Failed', 
                        text: 'Invalid email or password.', 
                        confirmButtonColor: '#000',
                        background: '#ef4444',
                        color: '#ffffff'
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

    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const { data, error } = await window.supabaseAuth.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/dashboard.html'
                    }
                });
                if (error) throw error;
            } catch (err) {
                console.error("Google login failed:", err);
                const siteTheme = localStorage.getItem('siteTheme') || 'light';
                const isDark = siteTheme === 'dark';
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Login Failed', 
                    text: err.message, 
                    confirmButtonColor: '#000', 
                    background: '#ef4444',
                    color: '#ffffff' 
                });
            }
        });
    }
});
function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = 'Login';
}
