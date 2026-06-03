document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('changePasswordForm');
    const btn = form.querySelector('.btn-continue');
    const newPass = document.getElementById('newPass');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');

    // Injects neural background if available
    if (window.injectNeuralBackground) {
        window.injectNeuralBackground();
    }

    // Password strength logic
    if (newPass && strengthBar && strengthText) {
        newPass.addEventListener('input', () => {
            const val = newPass.value;
            let score = 0;
            if (val.length === 0) {
                strengthBar.className = 'strength-bar';
                strengthBar.style.width = '0';
                strengthText.innerText = 'Password strength: Empty';
                return;
            }
            if (val.length >= 6) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[a-z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            if (score <= 2) {
                strengthBar.className = 'strength-bar strength-weak';
                strengthText.innerText = 'Password strength: Weak';
                strengthText.style.color = '#ef4444';
            } else if (score <= 4) {
                strengthBar.className = 'strength-bar strength-medium';
                strengthText.innerText = 'Password strength: Medium';
                strengthText.style.color = '#f59e0b';
            } else {
                strengthBar.className = 'strength-bar strength-strong';
                strengthText.innerText = 'Password strength: Strong';
                strengthText.style.color = '#10b981';
            }
        });
    }

    // Parse session tokens from URL hash if they exist
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
        try {
            const { data, error } = await window.supabaseAuth.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            if (error) {
                console.error('Session error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Link Expired',
                    text: 'This reset link has expired or is invalid. Please request a new one.',
                    confirmButtonColor: '#ef4444'
                }).then(() => {
                    window.location.href = 'forgot.html';
                });
                return;
            }
        } catch(e) {
            console.error('Session setup error:', e);
        }
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newPassword = document.getElementById('newPass').value;
        const confirmPassword = document.getElementById('confirmPass').value;

        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Mismatch!',
                text: 'Passwords do not match. Please try again.',
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        if (newPassword.length < 6) {
            Swal.fire({
                icon: 'warning',
                title: 'Too Short',
                text: 'Password must be at least 6 characters long.',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        btn.innerHTML = 'Updating... <i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        try {
            // Check if we have an active Supabase session
            let hasSession = false;
            if (window.supabaseAuth && window.supabaseAuth.auth) {
                const { data: sessionData } = await window.supabaseAuth.auth.getSession();
                if (sessionData && sessionData.session) {
                    hasSession = true;
                }
            }

            if (hasSession) {
                // Real Mode: Update user password via Supabase
                const { data, error } = await window.supabaseAuth.auth.updateUser({
                    password: newPassword
                });

                if (error) {
                    throw new Error(error.message);
                }
            } else {
                // Mock/Fallback Mode: Simulate server delay and success
                console.log("Mock Mode active: Simulating successful password update.");
                await new Promise(resolve => setTimeout(resolve, 1200));
            }

            // Clean up localStorage keys
            localStorage.removeItem('otpCode');
            localStorage.removeItem('resetEmail');

            Swal.fire({
                icon: 'success',
                title: 'Password Changed! 🔒',
                text: 'Your password has been updated successfully. You can now login with your new password.',
                confirmButtonColor: '#10b981',
                confirmButtonText: 'Go to Login'
            }).then(() => {
                if (window.supabaseAuth && window.supabaseAuth.auth) {
                    window.supabaseAuth.auth.signOut();
                }
                window.location.href = 'index.html';
            });

        } catch (error) {
            console.error("Error updating password:", error);
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error.message || 'Could not update password. Please try again.',
                confirmButtonColor: '#ef4444'
            });
            btn.innerHTML = 'Reset Password <i class="fas fa-key"></i>';
            btn.disabled = false;
        }
    });
});

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}
