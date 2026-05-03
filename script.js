/* ── TransitWay Global UI Script ── */

function showPage(pageId) {
    const pages = ['signin-page', 'forgot-page'];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(pageId);
    if (target) target.classList.remove('hidden');
}

function handleForgot(event) {
    event.preventDefault();
    alert("تم إرسال كود التحقق إلى بريدك الإلكتروني!");
}

function handleLogin(event) {
    event.preventDefault();
}

// Password Visibility Toggle
document.querySelectorAll('.icon-right').forEach(eyeIcon => {
    eyeIcon.addEventListener('click', function() {
        const input = this.parentElement.querySelector('input');
        if (!input) return;
        
        if (input.type === "password") {
            input.type = "text";
            this.classList.replace('fa-eye-slash', 'fa-eye');
        } else {
            input.type = "password";
            this.classList.replace('fa-eye', 'fa-eye-slash');
        }
    });
});

// Admin Management Logic
async function loadAdmins() {
    const tableBody = document.getElementById('adminTableBody');
    if (!tableBody) return;
    
    try {
        const { data: admins, error } = await supabase.from('admins').select('*');
        if (error) throw error;

        tableBody.innerHTML = '';
        (admins || []).forEach(admin => {
            const row = `
                <tr>
                    <td>${admin.name || 'Admin'}</td>
                    <td>${admin.id}</td>
                    <td>${admin.phoneNumber || '—'}</td>
                    <td>${admin.email}</td>
                    <td><span class="badge ${admin.status === 'Active' ? 'active' : 'inactive'}">${admin.status || 'Active'}</span></td>
                    <td><i class="fa-solid fa-trash btn-delete" style="cursor:pointer;" onclick="deleteAdmin('${admin.id}')"></i></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("[TransitWay] Failed to load admins:", error);
    }
}

async function deleteAdmin(adminId) {
    if (confirm("هل أنت متأكد من مسح هذا المسؤول؟")) {
        try {
            const { error } = await supabase.from('admins').eq('id', adminId).delete();
            if (error) throw error;
            loadAdmins();
        } catch (error) {
            alert("حدث خطأ أثناء الحذف: " + error.message);
        }
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadAdmins();

    // Modal Handlers
    const addNewBtn = document.querySelector('.btn-add');
    const modal = document.getElementById('addAdminModal');
    if (addNewBtn && modal) {
        addNewBtn.onclick = () => modal.style.display = 'flex';
        window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }

    // Chart Initialization (Placeholder for index chart)
    const chartCanvas = document.getElementById('mainChart');
    if (chartCanvas && typeof Chart !== 'undefined') {
        const ctx = chartCanvas.getContext('2d');
        const gradient1 = ctx.createLinearGradient(0, 0, 0, 400);
        gradient1.addColorStop(0, 'rgba(59, 76, 184, 0.2)');
        gradient1.addColorStop(1, 'rgba(59, 76, 184, 0)');

        const gradient2 = ctx.createLinearGradient(0, 0, 0, 400);
        gradient2.addColorStop(0, 'rgba(91, 163, 142, 0.2)');
        gradient2.addColorStop(1, 'rgba(91, 163, 142, 0)');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: 'Operational Fleet',
                        data: [45, 82, 55, 45, 85, 45, 55, 75, 55, 65, 35, 85],
                        borderColor: '#3b4cb8',
                        backgroundColor: gradient1,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Active Personnel',
                        data: [35, 65, 15, 45, 65, 25, 35, 95, 35, 45, 15, 55],
                        borderColor: '#5ba38e',
                        backgroundColor: gradient2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
                }
            }
        });
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-message');

            try {
                const { data: admins, error } = await supabase.from('admins').select('*').eq('email', email).single();
                if (error || !admins) throw new Error("الحساب غير موجود");

                if (admins.password_hash === password || admins.password === password) {
                    alert("تم تسجيل الدخول بنجاح!");
                    localStorage.setItem('adminToken', 'active-session');
                    localStorage.setItem('adminEmail', email);
                    localStorage.setItem('activeAdminName', admins.name);
                    window.location.href = 'dashboard.html';
                } else {
                    if (errorMsg) {
                        errorMsg.innerText = "كلمة المرور غير صحيحة";
                        errorMsg.style.color = "#ef4444";
                    }
                }
            } catch (error) {
                console.error("Login error:", error);
                alert("خطأ في تسجيل الدخول: " + error.message);
            }
        });
    }
});
