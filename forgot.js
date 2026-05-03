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

        // Use Supabase Auth (official SDK) to send password reset email
        const { data, error } = await window.supabaseAuth.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                confirmButtonColor: '#76a08a'
            });
            btn.innerText = "Send Reset Link";
            btn.disabled = false;
            return;
        }

        // Success — email sent
        Swal.fire({
            icon: 'success',
            title: 'Email Sent! ✉️',
            html: `<p style="font-weight:600;">A password reset link has been sent to:</p>
                   <p style="color:#10b981; font-weight:800;">${email}</p>
                   <p style="font-size:0.85rem; color:#94a3b8;">Please check your inbox (and spam folder) and click the link to reset your password.</p>`,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Got it!'
        }).then(() => {
            window.location.href = 'index.html';
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
