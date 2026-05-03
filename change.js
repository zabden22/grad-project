document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('changePasswordForm');
    const btn = form.querySelector('.btn-continue');

    // Check if Supabase has a valid session from the reset link
    // When the user clicks the email link, Supabase redirects back with tokens in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
        // Set the session using the tokens from the URL
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

        btn.innerText = "Updating...";
        btn.disabled = true;

        try {
            // Update the password using Supabase Auth (official SDK)
            const { data, error } = await window.supabaseAuth.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw new Error(error.message);
            }

            // Success
            Swal.fire({
                icon: 'success',
                title: 'Password Changed! 🔒',
                text: 'Your password has been updated successfully. You can now login with your new password.',
                confirmButtonColor: '#10b981',
                confirmButtonText: 'Go to Login'
            }).then(() => {
                // Sign out to clear the recovery session
                window.supabaseAuth.auth.signOut();
                window.location.href = 'index.html';
            });

        } catch (error) {
            console.error("Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error.message || 'Could not update password. Please try again.',
                confirmButtonColor: '#ef4444'
            });
            btn.innerText = "Reset Password";
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
