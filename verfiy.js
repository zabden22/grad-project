async function handleVerifyAndRedirect() {
    const inputs = document.querySelectorAll('.otp-input');
    let code = "";
    inputs.forEach(input => {
        code += input.value;
    });

    if (code.length < 6) {
        Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'Please enter the full 6-digit code.' });
        return;
    }

    const email = localStorage.getItem('resetEmail');
    if (!email) {
        Swal.fire({ icon: 'error', title: 'Session Expired', text: 'Email not found. Please try again.' }).then(() => {
            window.location.href = 'forgot.html';
        });
        return;
    }

    const btn = document.querySelector('.btn-continue');
    if (btn) { btn.innerText = "Verifying..."; btn.disabled = true; }

    try {
        const { data, error } = await window.supabaseAuth.auth.verifyOtp({
            email: email,
            token: code,
            type: 'recovery'
        });

        if (error) {
            Swal.fire({ icon: 'error', title: 'Verification Failed', text: error.message });
            if (btn) { btn.innerText = "Verify Code"; btn.disabled = false; }
            return;
        }

        // Success — User is now signed in with a recovery session
        Swal.fire({
            icon: 'success',
            title: 'Verified! ✅',
            text: 'Your code is correct. You can now set a new password.',
            confirmButtonColor: '#10b981'
        }).then(() => {
            window.location.href = "change.html";
        });

    } catch (err) {
        console.error("Verification Error:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred.' });
        if (btn) { btn.innerText = "Verify Code"; btn.disabled = false; }
    }
}

// Auto-focus next input logic
document.querySelectorAll('.otp-input').forEach((input, index, array) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < array.length - 1) {
            array[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
            array[index - 1].focus();
        }
    });
});