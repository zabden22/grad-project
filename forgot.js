document.getElementById('forgetForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const email = document.getElementById('userEmail').value.trim();
    const btn = document.getElementById('sendBtn');
    
    btn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const currentOrigin = window.location.origin;
        const redirectUrl = `${currentOrigin}/change.html`;

        const { data, error } = await window.supabaseAuth.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                confirmButtonColor: '#10b981'
            });
            btn.innerHTML = 'Send Reset Link <i class="fas fa-paper-plane"></i>';
            btn.disabled = false;
            return;
        }

        // Save email to localStorage for OTP page reference
        localStorage.setItem('resetEmail', email);

        Swal.fire({
            icon: 'success',
            title: 'Verification Code Sent! 📧',
            html: `<p style="font-weight:600;">We've sent a 6-digit OTP code to your email:</p>
                   <p style="color:#10b981; font-weight:800;">${email}</p>
                   <p style="font-size:0.85rem; color:#94a3b8;">Please enter the 6-digit verification code sent to your email on the next page to proceed.</p>`,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Enter Code'
        }).then(() => {
            window.location.href = 'otp.html';
        });

    } catch (error) {
        console.error("Error:", error);
        Swal.fire({
            icon: 'warning',
            title: 'Server Error',
            text: 'The server is not responding. Please try again later.',
            confirmButtonColor: '#0f172a'
        });
        btn.innerHTML = 'Send Reset Link <i class="fas fa-paper-plane"></i>';
        btn.disabled = false;
    }
});
