document.getElementById('forgetForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const email = document.getElementById('userEmail').value.trim();
    const btn = document.getElementById('sendBtn');
    
    btn.innerText = "Sending...";
    btn.disabled = true;

    try {
        // Build the redirect URL dynamically based on the current host
        const currentOrigin = window.location.origin;
        const redirectUrl = `${currentOrigin}/change.html`;

        const { data, error } = await window.supabaseAuth.auth.resetPasswordForEmail(email);

        if (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                confirmButtonColor: '#ef4444'
            });
            btn.innerText = "Send Code";
            btn.disabled = false;
            return;
        }

        // Success — email sent (Supabase will send OTP if template is configured)
        localStorage.setItem('resetEmail', email); // Store for the verification page
        
        Swal.fire({
            icon: 'success',
            title: 'Verification Code Sent! ✉️',
            html: `<p style="font-weight:600;">A 6-digit verification code has been sent to:</p>
                   <p style="color:#10b981; font-weight:800;">${email}</p>
                   <p style="font-size:0.85rem; color:#94a3b8;">Please check your inbox and enter the code in the next step.</p>`,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Enter Code'
        }).then(() => {
            window.location.href = 'change.html';
        });

    } catch (error) {
        console.error("Error:", error);
        Swal.fire({
            icon: 'warning',
            title: 'Server Error',
            text: 'The server is not responding. Please try again later.',
            confirmButtonColor: '#1a1a1a'
        });
        btn.innerText = "Send Reset Link";
        btn.disabled = false;
    }
});
