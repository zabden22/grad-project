function showPage(pageId) {    document.getElementById('signin-page').classList.add('hidden');
    document.getElementById('forgot-page').classList.add('hidden');    document.getElementById(pageId).classList.remove('hidden');
}function handleForgot(event) {
    event.preventDefault();
    alert("تم إرسال كود التحقق إلى بريدك الإلكتروني!");}function handleLogin(event) {
    event.preventDefault();}const changePassBtn = document.getElementById('changePassBtn');

if (changePassBtn) {
    changePassBtn.addEventListener('click', function() {        alert("جاري تغيير كلمة المرور...");
        
        setTimeout(() => {
            alert("تم تغيير كلمة المرور بنجاح! تمام 👍");            window.location.href = "index.html";
        }, 1000);
        alert("تم تغيير كلمة المرور بنجاح");
    });
}document.querySelectorAll('.icon-right').forEach(eyeIcon => {
    eyeIcon.addEventListener('click', function() {        const input = this.parentElement.querySelector('input');
        
        if (input.type === "password") {
            input.type = "text";
            this.classList.replace('fa-eye-slash', 'fa-eye');
        } else {
            input.type = "password";
            this.classList.replace('fa-eye', 'fa-eye-slash');
        }
    });
});window.onload = function() {const chartCanvas = document.getElementById('mainChart');
if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');}    const gradient1 = ctx.createLinearGradient(0, 0, 0, 400);
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
                    label: 'Series one',
                    data: [45, 82, 55, 45, 85, 45, 55, 75, 55, 65, 35, 85],
                    borderColor: '#3b4cb8',
                    backgroundColor: gradient1,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0 // إخفاء النقط عشان يبقى خط انسيابي
                },
                {
                    label: 'Series two',
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
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0' }
                }
            }
        }
    });
};const addNewBtn = document.querySelector('.btn-add');
const modal = document.getElementById('addAdminModal');

if (addNewBtn) {
    addNewBtn.onclick = function() {
        modal.style.display = 'flex';
    }
}function closeModal() {
    modal.style.display = 'none';
}window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}
async function loadAdmins() {
    const tableBody = document.getElementById('adminTableBody');
    
    try {
        const { data: admins, error } = await supabase.from('admins').select('*');
        if (error) throw new Error(error.message);
            tableBody.innerHTML = '';

            admins.forEach(admin => {
                const row = `
                    <tr>
                        <td>${admin.name}</td>
                        <td>${admin.id}</td>
                        <td>${admin.phoneNumber}</td>
                        <td>${admin.email}</td>
                        <td><span class="badge ${admin.status === 'Active' ? 'active' : 'inactive'}">${admin.status}</span></td>
                        <td><i class="fa-solid fa-trash btn-delete" onclick="deleteAdmin('${admin.id}')"></i></td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }
}document.addEventListener('DOMContentLoaded', loadAdmins);if (response.ok) {
    alert("تمت الإضافة!");
    closeModal();
    loadAdmins();
}
async function deleteAdmin(adminId) {
    if (confirm("هل أنت متأكد من مسح هذا المسؤول؟")) {
        try {
            const { error: delErr } = await supabase.from('admins').eq('id', adminId).delete();
            if (!delErr) {
                loadAdmins();
            }
        } catch (error) {
            alert("حدث خطأ أثناء الحذف");
        }
    }
}
async function displayAdmins() {
    const tableBody = document.getElementById('adminTableBody');
    if (!tableBody) return;

    try {
        const { data: admins } = await supabase.from('admins').select('*');

        tableBody.innerHTML = '';

        admins.forEach(admin => {
            const row = `
                <tr>
                    <td>${admin.name}</td>
                    <td>${admin.id}</td>
                    <td>${admin.phoneNumber}</td>
                    <td>${admin.email}</td>
                    <td><span class="badge active">Active</span></td>
                    <td><i class="fa-solid fa-trash btn-delete" onclick="deleteAdmin('${admin.id}')"></i></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (err) {
        console.log("فشل تحميل البيانات:", err);
    }
}document.addEventListener('DOMContentLoaded', displayAdmins);function openAssignModal() {
    document.getElementById('assignModal').style.display = 'flex';
}

function closeAssignModal() {
    document.getElementById('assignModal').style.display = 'none';
}const assignForm = document.getElementById('assignBusForm');
if (assignForm) {
    assignForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const busId = document.getElementById('assignBusId').value;
        const driverId = document.getElementById('assignDriverId').value;

        try {
            const { error: assignErr } = await supabase.from('drivers').eq('id', driverId).update({ bus_id: busId });

            if (!assignErr) {
                alert("تم تعيين الأتوبيس للسائق بنجاح!");
                closeAssignModal();
                location.reload();
            } else {
                alert("خطأ في عملية التعيين، تأكد من الـ IDs");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    });
}
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        try {
            const { data: admins, error: loginErr } = await supabase.from('admins').select('*').eq('email', email);
            const result = (admins && admins.length > 0) ? admins[0] : null;

            if (result && result.password_hash === password) {
                alert("تم تسجيل الدخول بنجاح!");
                window.location.href = 'dashboard.html'; 
            } else {
                errorMessage.innerText = "الباسورد غلط أو الحساب مش موجود!";
                errorMessage.style.color = "red";
            }
        } catch (error) {
            console.error("خطأ في الاتصال:", error);
            alert("السيرفر واقع حالياً، جرب تاني كمان شوية.");
        }
    });
}
