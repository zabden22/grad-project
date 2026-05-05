window.resendCode = async (e) => {
    if (e) e.preventDefault();
    const email = localStorage.getItem('resetEmail');
    if (!email) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Email not found. Please start over.' });
        return;
    }

    try {
        const { error } = await window.supabaseAuth.auth.resetPasswordForEmail(email);
        if (error) throw error;
        Swal.fire({ icon: 'success', title: 'Code Resent! ✉️', text: 'A new 6-digit code has been sent to your email.' });
    } catch (error) {
        console.error("Resend error:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('changePasswordForm');
    const btn = form.querySelector('.btn-continue');

    // Auto-focus next input logic for OTP fields
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 1. Get Values
        let code = "";
        otpInputs.forEach(input => code += input.value);
        
        const newPassword = document.getElementById('newPass').value;
        const confirmPassword = document.getElementById('confirmPass').value;
        const email = localStorage.getItem('resetEmail');

        // 2. Validation
        if (code.length < 6) {
            Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'Please enter the 6-digit code sent to your email.' });
            return;
        }

        if (!email) {
            Swal.fire({ icon: 'error', title: 'Session Expired', text: 'Email not found. Please start over.' }).then(() => window.location.href = 'forgot.html');
            return;
        }

        if (newPassword !== confirmPassword) {
            Swal.fire({ icon: 'error', title: 'Mismatch!', text: 'Passwords do not match.' });
            return;
        }

        if (newPassword.length < 6) {
            Swal.fire({ icon: 'warning', title: 'Too Short', text: 'Password must be at least 6 characters.' });
            return;
        }

        btn.innerText = "Processing...";
        btn.disabled = true;

        try {
            // 3. Step 1: Verify OTP (This creates the recovery session)
            const { data: verifyData, error: verifyError } = await window.supabaseAuth.auth.verifyOtp({
                email: email,
                token: code,
                type: 'recovery'
            });

            if (verifyError) {
                throw new Error("Verification Failed: " + verifyError.message);
            }

            // 4. Step 2: Update User Password
            const { data: updateData, error: updateError } = await window.supabaseAuth.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                throw new Error("Update Failed: " + updateError.message);
            }

            // Success
            Swal.fire({
                icon: 'success',
                title: 'Password Updated! 🔒',
                text: 'Your password has been changed successfully. You can now login.',
                confirmButtonColor: '#10b981'
            }).then(() => {
                window.supabaseAuth.auth.signOut(); // Clear the recovery session
                window.location.href = 'index.html';
            });

        } catch (error) {
            console.error("Reset Error:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
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
