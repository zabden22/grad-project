document.addEventListener('DOMContentLoaded', () => {
    fetchBuses();
});

async function fetchBuses() {
    const token = localStorage.getItem('adminToken');

    if (!token) {
        alert("يجب تسجيل الدخول أولاً!");
        window.location.href = 'index.html';
        return;
    }

    try {
        
        

const response = await fetch('https://transit-way.runasp.net/api/buses', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

        console.log("Status Code:", response.status);

        if (response.ok) {
            const buses = await response.json();
            console.log("البيانات وصلت بنجاح!");
            displaybuses(buses);
        } else if (response.status === 404) {
             
             
             alert("المسار غير موجود، تأكد من الـ Swagger.");
        } else {
            throw new Error(`خطأ رقم ${response.status}`);
        }
    } catch (error) {
        console.error("فشل التحميل:", error);
        alert("فشل تحميل البيانات. افتح الـ Console لرؤية تفاصيل الخطأ.");
    }
}

function displaybuses(buses) {
    const tableBody = document.getElementById('busTableBody');
    if (!tableBody) return; 
    
    tableBody.innerHTML = ""; 

    buses.forEach(bus => {
        const row = `
            <tr>
                <td>${bus.id || 'N/A'}</td>
                <td>${bus.busNumber || 'غير معروف'}</td>
                <td>${bus.capacity || 0}</td>
                <td>${bus.driverName || 'لم يحدد'}</td>
                <td>
                    <button class="btn-edit" onclick="editBus(${bus.id})">تعديل</button>
                    <button class="btn-delete" onclick="deleteBus(${bus.id})">حذف</button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}