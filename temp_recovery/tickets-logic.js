document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. نظام الاسم الدايناميك والدارك مود
    // ==========================================
    const adminName = localStorage.getItem('activeAdminName') || 'Moscow';
    document.getElementById('topBarName').innerText = adminName;

    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = themeToggleBtn.querySelector('i');
    
    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    function updateThemeUI(theme) {
        if(theme === 'dark') {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            themeIcon.style.color = '#f1c40f';
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            themeIcon.style.color = 'var(--text-main)';
        }
    }
    updateThemeUI(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('siteTheme', currentTheme);
        updateThemeUI(currentTheme);
    });

    // ==========================================
    // 2. إدارة التذاكر - Full API Integration
    // ==========================================
    const API_BASE_URL = 'http://transit-way.runasp.net';
    const ticketTableBody = document.getElementById('ticketTableBody');
    const searchInput = document.getElementById('ticketSearchInput');

    let ticketsData = [];
    const busIdSelect = document.getElementById('busIdSelect');

    // ─────────────────────────────────────────
    // GET /api/Bus — تحميل الباصات في الـ dropdown
    // ─────────────────────────────────────────
    async function loadBuses() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/Bus`);
            if (res.ok) {
                const buses = await res.json();
                busIdSelect.innerHTML = '<option value="">Select Bus</option>';
                buses.forEach(bus => {
                    const opt = document.createElement('option');
                    opt.value = bus.id;
                    opt.textContent = `Bus #${bus.id} — Plate: ${bus.plateNumber}${bus.driverName ? ' (Driver: ' + bus.driverName + ')' : ''}`;
                    busIdSelect.appendChild(opt);
                });
            } else {
                busIdSelect.innerHTML = '<option value="">Failed to load buses</option>';
            }
        } catch (e) {
            busIdSelect.innerHTML = '<option value="">Network error</option>';
        }
    }
    loadBuses();

    // ─────────────────────────────────────────
    // GET /api/Routes — تحميل الخطوط في الـ dropdown
    // ─────────────────────────────────────────
    const routeSelect = document.getElementById('routeSelect');
    let routesData = [];
    async function loadRoutes() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/Routes`);
            if (res.ok) {
                routesData = await res.json();
                routeSelect.innerHTML = '<option value="">Select Route</option>';
                routesData.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = `${r.name} (Route #${r.id})`;
                    routeSelect.appendChild(opt);
                });
            } else {
                routeSelect.innerHTML = '<option value="">Failed to load routes</option>';
            }
        } catch (e) {
            routeSelect.innerHTML = '<option value="">Network error</option>';
        }
    }
    loadRoutes();

    // ─────────────────────────────────────────
    // GET /api/Tickets — جلب كل التذاكر
    // ─────────────────────────────────────────
    async function loadTickets(silent = false) {
        try {
            if (!silent) {
                ticketTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                            <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                            Loading tickets from server...
                        </td>
                    </tr>`;
            }

            const res = await fetch(`${API_BASE_URL}/api/Tickets`);
            if (res.ok) {
                const data = await res.json();
                
                ticketsData = data.map(t => {
                    let status = t.status || (t.isUsed ? "Used" : "Valid");
                    
                    let color = "var(--primary-color)";
                    let routeName = t.routeName || "General Route";
                    if (routeName.toLowerCase().includes('blue')) color = "#3b82f6";
                    else if (routeName.toLowerCase().includes('orange')) color = "#f59e0b";

                    return {
                        id: t.id,
                        displayId: `TCK-${t.id}`,
                        userId: t.passengerID,
                        busId: t.busPlate || t.busId || '—',
                        name: t.passengerID,
                        route: routeName,
                        routeId: t.routeId || 1,
                        date: new Date(t.createdAt || t.purchaseDate || new Date()).toLocaleString(),
                        price: `${t.price || 15}.00 EGP`,
                        rawPrice: t.price || 15,
                        status: status,
                        color: color,
                        qrToken: t.qrToken || null,
                        validHours: t.expireAt ? Math.round((new Date(t.expireAt) - new Date(t.createdAt || new Date())) / 3600000) : (t.validHours || 24)
                    };
                });
                // Preserve search state if active
                const term = searchInput.value.toLowerCase();
                renderTable();
                if (term) {
                    const rows = ticketTableBody.querySelectorAll('tr');
                    rows.forEach(row => {
                        row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
                    });
                }
            } else {
                console.error("Failed to load tickets, status:", res.status);
                if (!silent) {
                    ticketTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align:center; padding:40px; color:#ef4444;">
                                <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                                Failed to load tickets (${res.status})
                            </td>
                        </tr>`;
                }
            }
        } catch (error) {
            console.error("Error connecting to API:", error);
            if (!silent) {
                ticketTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding:40px; color:#ef4444;">
                            <i class="fas fa-wifi" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                            Network error — Could not reach server
                        </td>
                    </tr>`;
            }
        }
    }

    // ─────────────────────────────────────────
    // GET /api/Tickets/user/{userId} — جلب تذاكر يوزر معين
    // ─────────────────────────────────────────
    async function loadTicketsByUser(userId) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/Tickets/user/${userId}`);
            if (res.ok) {
                const data = await res.json();
                ticketsData = data.map(t => {
                    let status = t.status || (t.isUsed ? "Used" : "Valid");
                    
                    let color = "var(--primary-color)";
                    let routeName = t.routeName || "General Route";
                    if (routeName.toLowerCase().includes('blue')) color = "#3b82f6";
                    else if (routeName.toLowerCase().includes('orange')) color = "#f59e0b";

                    return {
                        id: t.id,
                        displayId: `TCK-${t.id}`,
                        userId: t.userId,
                        busId: t.busPlate || t.busId || '—',
                        name: t.userId,
                        route: routeName,
                        routeId: t.routeId || 1,
                        date: new Date(t.createdAt || t.purchaseDate || new Date()).toLocaleString(),
                        price: `${t.price || 15}.00 EGP`,
                        rawPrice: t.price || 15,
                        status: status,
                        color: color,
                        qrToken: t.qrToken || null,
                        validHours: t.expireAt ? Math.round((new Date(t.expireAt) - new Date(t.createdAt || new Date())) / 3600000) : (t.validHours || 24)
                    };
                });
                // Preserve search state
                const term = searchInput.value.toLowerCase();
                renderTable();
                if (term) {
                    const rows = ticketTableBody.querySelectorAll('tr');
                    rows.forEach(row => {
                        row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
                    });
                }
                if (!silent) Swal.fire({ icon: 'info', title: `User #${userId} Tickets`, text: `Found ${ticketsData.length} ticket(s) for this user.`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
            } else {
                if (!silent) Swal.fire({ icon: 'error', title: 'Error', text: `Could not load tickets for user #${userId}`, background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        } catch (error) {
            console.error("Error loading user tickets:", error);
            if (!silent) Swal.fire({ icon: 'error', title: 'Network Error', text: 'Could not connect to server.', background: 'var(--bg-card)', color: 'var(--text-main)' });
        }
    }

    // ─────────────────────────────────────────
    // Render Table
    // ─────────────────────────────────────────
    function renderTable() {
        ticketTableBody.innerHTML = "";

        if (ticketsData.length === 0) {
            ticketTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-ticket-alt" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        No tickets found
                    </td>
                </tr>`;
            return;
        }

        ticketsData.forEach(tck => {
            let statusBadge = '';
            const statusLower = tck.status.toLowerCase();

            if (statusLower === "valid" || statusLower === "active") {
                statusBadge = `<span class="status active" style="background: rgba(34, 197, 94, 0.1); color: #22c55e; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">${tck.status}</span>`;
            } else if (statusLower === "used" || statusLower === "expired") {
                statusBadge = `<span class="status" style="background: rgba(148, 163, 184, 0.1); color: #64748b; font-weight:800; padding:6px 14px; border-radius:20px; font-size:0.85rem; text-transform:uppercase;">${tck.status}</span>`;
            } else {
                statusBadge = `<span class="status inactive" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">${tck.status}</span>`;
            }

            const row = `
                <tr>
                    <td style="font-family: monospace; font-weight:bold; color:var(--text-main); font-size: 1.05rem;" data-id="${tck.id}">
                        <i class="fas fa-qrcode" style="color:var(--text-muted); margin-right:5px;"></i> ${tck.displayId}
                    </td>
                    <td style="font-weight:700;">${tck.name}</td>
                    <td><span style="background:${tck.color}15; color:${tck.color}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:0.85rem; border: 1px solid ${tck.color}30;">${tck.route}</span></td>
                    <td style="color: var(--text-muted); font-weight: 600;">${tck.date}</td>
                    <td style="font-weight:900; color:var(--primary-color);">${tck.price}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <i class="fas fa-eye view-ticket" style="color:var(--text-muted); cursor:pointer; margin-right:10px; font-size:1.1rem; transition:0.3s;" title="View Details" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-muted)'" data-id="${tck.id}"></i>
                        <i class="fas fa-exchange-alt change-status" style="color:#3b82f6; cursor:pointer; margin-right:10px; font-size:1.1rem; transition:0.3s;" title="Change Status" onmouseover="this.style.filter='brightness(0.7)'" onmouseout="this.style.filter='brightness(1)'" data-id="${tck.id}"></i>
                        <i class="fas fa-ban cancel-ticket" style="color:#f59e0b; cursor:pointer; margin-right:10px; font-size:1.1rem; transition:0.3s;" title="Cancel Ticket" onmouseover="this.style.filter='brightness(0.8)'" onmouseout="this.style.filter='brightness(1)'" data-id="${tck.id}"></i>
                        <i class="fas fa-trash-alt delete-ticket" style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;" title="Delete Ticket" onmouseover="this.style.filter='brightness(0.8)'" onmouseout="this.style.filter='brightness(1)'" data-id="${tck.id}"></i>
                    </td>
                </tr>
            `;
            ticketTableBody.innerHTML += row;
        });
    }
    
    // Load all tickets on initial page load
    loadTickets();

    // Auto-refresh logic => silent polling
    let currentFilterUserId = null;
    setInterval(() => {
        if (currentFilterUserId) {
            loadTicketsByUser(currentFilterUserId, true);
        } else {
            loadTickets(true);
        }
    }, 10000);

    // ==========================================
    // 3. التفاعل - Search / Modals / Actions
    // ==========================================
    
    // البحث في الجدول
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = ticketTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    // Modals
    window.openModal = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    document.getElementById('openAddTicketModalBtn').onclick = () => openModal('addTicketModal');

    // ─────────────────────────────────────────
    // POST /api/Tickets — إصدار تذكرة جديدة
    // ─────────────────────────────────────────
    document.getElementById('addTicketForm').onsubmit = async (e) => {
        e.preventDefault();
        const Btn = e.target.querySelector('button[type="submit"]');
        Btn.disabled = true;
        Btn.innerText = "Processing...";

        const formData = new FormData(e.target);

        const userIdRaw     = formData.get('userId');
        const busIdRaw      = formData.get('busId');
        const validHoursRaw = formData.get('validHours');

        // تحويل صريح لأرقام صحيحة — parseInt+NaN يتحول لـ null في JSON
        const userId     = userIdRaw     ? Math.floor(Number(userIdRaw))     : 0;
        const busId      = busIdRaw      ? Math.floor(Number(busIdRaw))      : 0;
        const validHours = validHoursRaw ? Math.floor(Number(validHoursRaw)) : 24;

        if (!userId || isNaN(userId) || userId < 1) {
            Swal.fire({ icon: 'warning', title: 'Missing Data', text: 'Please enter a valid User ID (must be a positive number).', background: 'var(--bg-card)', color: 'var(--text-main)' });
            Btn.disabled = false;
            Btn.innerText = 'Issue Ticket';
            return;
        }
        if (!busId || isNaN(busId) || busId < 1) {
            Swal.fire({ icon: 'warning', title: 'Missing Data', text: 'Please select a Bus.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            Btn.disabled = false;
            Btn.innerText = 'Issue Ticket';
            return;
        }

        const routeId = parseInt(formData.get('route'), 10) || 0;

        if (!routeId) {
            Swal.fire({ icon: 'warning', title: 'Missing Route', text: 'Please select a route.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            Btn.disabled = false;
            Btn.innerText = 'Issue Ticket';
            return;
        }

        let price = 15;
        // Price can be dynamic in the future based on route data

        // إرسال الـ minimal payload — بس الفيلدات الإجبارية
        const payload = {
            userId:  parseInt(userId,  10),
            busId:   parseInt(busId,   10),
            routeId: parseInt(routeId, 10)
        };
        console.log('Sending ticket payload:', JSON.stringify(payload));

        try {
            const res = await fetch(`${API_BASE_URL}/api/Tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const result = await res.json().catch(() => null);
                Swal.fire({ 
                    icon: 'success', 
                    title: 'Ticket Generated ✅', 
                    html: `<p style="margin:0; font-weight:600;">Ticket created successfully!</p>
                           <p style="margin:5px 0 0 0; color:var(--text-muted); font-size:0.9rem;">User ID: ${userId} | Route ID: ${routeId}</p>`, 
                    timer: 2500, 
                    showConfirmButton: false, 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-main)' 
                });
                closeModal('addTicketModal');
                e.target.reset();
                loadTickets();
            } else {
                const errorBody = await res.text().catch(() => '');
                Swal.fire({
                    icon: 'error',
                    title: 'Error 400',
                    html: `<p style="font-weight:700; color:#ef4444;">Server: ${errorBody}</p>
                           <p style="font-size:0.8rem; color:var(--text-muted); word-break:break-all; margin-top:10px;">
                               <strong>Payload sent:</strong><br>
                               ${JSON.stringify(payload)}
                           </p>`,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            }
        } catch(error) {
            console.error("Error creating ticket:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: `Failed to create ticket: ${error.message}`, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } finally {
            Btn.disabled = false;
            Btn.innerText = "Issue Ticket";
        }
    };

    // ─────────────────────────────────────────
    // Table Click Events — Cancel / Delete / View / Status
    // ─────────────────────────────────────────
    ticketTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const ticketId = target.getAttribute('data-id');
        if (!ticketId) return;

        const ticketObj = ticketsData.find(t => t.id == ticketId);

        // ───── View Ticket Details ─────
        if (target.classList.contains('view-ticket')) {
            if (!ticketObj) return;
            Swal.fire({
                title: `<i class="fas fa-ticket-alt" style="color:var(--primary-color);"></i> ${ticketObj.displayId}`,
                html: `
                    <div style="text-align:left; font-size:0.95rem; line-height:2; padding: 10px 0;">
                        <p><strong><i class="fas fa-id-badge" style="width:20px; color:var(--text-muted);"></i> User ID:</strong> ${ticketObj.userId}</p>
                        <p><strong><i class="fas fa-bus" style="width:20px; color:var(--text-muted);"></i> Bus ID:</strong> ${ticketObj.busId}</p>
                        <p><strong><i class="fas fa-route" style="width:20px; color:var(--text-muted);"></i> Route:</strong> <span style="color:${ticketObj.color}; font-weight:800;">${ticketObj.route}</span></p>
                        <p><strong><i class="fas fa-calendar" style="width:20px; color:var(--text-muted);"></i> Purchased:</strong> ${ticketObj.date}</p>
                        <p><strong><i class="fas fa-money-bill" style="width:20px; color:var(--text-muted);"></i> Price:</strong> <span style="color:var(--primary-color); font-weight:900;">${ticketObj.price}</span></p>
                        <p><strong><i class="fas fa-clock" style="width:20px; color:var(--text-muted);"></i> Valid Hours:</strong> ${ticketObj.validHours}h</p>
                        <p><strong><i class="fas fa-info-circle" style="width:20px; color:var(--text-muted);"></i> Status:</strong> <span style="font-weight:800; text-transform:uppercase;">${ticketObj.status}</span></p>
                        ${ticketObj.qrToken ? `<p><strong><i class="fas fa-qrcode" style="width:20px; color:var(--text-muted);"></i> QR Token:</strong> <code style="background:var(--bg-main); padding:2px 8px; border-radius:6px; font-size:0.8rem;">${ticketObj.qrToken}</code></p>` : ''}
                    </div>
                `,
                showCloseButton: true,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                width: 480
            });
        }

        // ───── PUT /api/Tickets/cancel/{id} — إلغاء تذكرة ─────
        if (target.classList.contains('cancel-ticket')) {
            const displayId = ticketObj ? ticketObj.displayId : `#${ticketId}`;
            Swal.fire({
                title: 'Void Ticket?',
                text: `Are you sure you want to cancel ticket ${displayId}? This cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: 'var(--text-muted)',
                confirmButtonText: 'Yes, void it!',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/Tickets/cancel/${ticketId}`, {
                            method: 'PUT'
                        });
                        if (res.ok) {
                            Swal.fire({ title: 'Voided!', text: `Ticket ${displayId} has been canceled.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            loadTickets(); // Refresh
                        } else {
                            const errorBody = await res.text().catch(() => '');
                            throw new Error(`Server: ${res.status} — ${errorBody}`);
                        }
                    } catch (error) {
                        console.error("Cancel error:", error);
                        Swal.fire({ title: 'Error!', text: `Could not cancel ticket: ${error.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    }
                }
            });
        }

        // ───── PUT /api/Tickets/status/{id}?status= — تغيير حالة التذكرة ─────
        if (target.classList.contains('change-status')) {
            const displayId = ticketObj ? ticketObj.displayId : `#${ticketId}`;
            Swal.fire({
                title: `Change Status — ${displayId}`,
                input: 'select',
                inputOptions: {
                    'Valid': 'Valid',
                    'Used': 'Used',
                    'Expired': 'Expired',
                    'Canceled': 'Canceled'
                },
                inputValue: ticketObj ? ticketObj.status : 'Valid',
                inputPlaceholder: 'Select new status',
                showCancelButton: true,
                confirmButtonText: 'Update',
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                inputValidator: (value) => {
                    if (!value) return 'Please select a status!';
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const newStatus = result.value;
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/Tickets/status/${ticketId}?status=${encodeURIComponent(newStatus)}`, {
                            method: 'PUT'
                        });
                        if (res.ok) {
                            Swal.fire({ title: 'Updated!', text: `Status changed to "${newStatus}".`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            loadTickets();
                        } else {
                            const errorBody = await res.text().catch(() => '');
                            throw new Error(`Server: ${res.status} — ${errorBody}`);
                        }
                    } catch (error) {
                        console.error("Status update error:", error);
                        Swal.fire({ title: 'Error!', text: `Could not update status: ${error.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    }
                }
            });
        }

        // ───── DELETE /api/Tickets/{id} — حذف التذكرة نهائياً ─────
        if (target.classList.contains('delete-ticket')) {
            const displayId = ticketObj ? ticketObj.displayId : `#${ticketId}`;
            Swal.fire({
                title: 'Delete Ticket Permanently?',
                html: `<p style="color:#ef4444; font-weight:700;">⚠ This will permanently delete ticket <strong>${displayId}</strong> from the database.</p><p style="color:var(--text-muted);">This action CANNOT be undone.</p>`,
                icon: 'error',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: 'var(--text-muted)',
                confirmButtonText: 'Yes, DELETE it!',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/Tickets/${ticketId}`, {
                            method: 'DELETE'
                        });
                        if (res.ok) {
                            Swal.fire({ title: 'Deleted!', text: `Ticket ${displayId} has been deleted from the database.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            loadTickets();
                        } else {
                            const errorBody = await res.text().catch(() => '');
                            throw new Error(`Server: ${res.status} — ${errorBody}`);
                        }
                    } catch (error) {
                        console.error("Delete error:", error);
                        Swal.fire({ title: 'Error!', text: `Could not delete ticket: ${error.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    }
                }
            });
        }
    });

    // ─────────────────────────────────────────
    // POST /api/Tickets/use/{qrToken} — استخدام تذكرة بـ QR
    // ─────────────────────────────────────────
    window.useTicketByQR = async function() {
        const { value: qrToken } = await Swal.fire({
            title: 'Use Ticket via QR',
            input: 'text',
            inputLabel: 'Enter or scan the QR Token',
            inputPlaceholder: 'e.g. abc123-xyz-token',
            showCancelButton: true,
            confirmButtonText: 'Use Ticket',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            inputValidator: (value) => {
                if (!value) return 'Please enter a QR token!';
            }
        });

        if (qrToken) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/Tickets/use/${encodeURIComponent(qrToken)}`, {
                    method: 'POST'
                });
                if (res.ok) {
                    Swal.fire({ title: 'Ticket Used!', text: `QR ticket validated successfully.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                    loadTickets();
                } else {
                    const errorBody = await res.text().catch(() => '');
                    throw new Error(`Server: ${res.status} — ${errorBody}`);
                }
            } catch (error) {
                console.error("Use ticket error:", error);
                Swal.fire({ title: 'Error!', text: `Could not use ticket: ${error.message}`, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        }
    };

    // ─────────────────────────────────────────
    // Filter by User ID — GET /api/Tickets/user/{userId}
    // ─────────────────────────────────────────
    window.filterByUser = async function() {
        const result = await Swal.fire({
            title: 'Filter by User ID',
            input: 'number',
            inputLabel: 'Enter User ID to view their tickets',
            inputPlaceholder: 'e.g. 5',
            showCancelButton: true,
            confirmButtonText: 'Search',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            showDenyButton: true,
            denyButtonText: 'Show All',
            denyButtonColor: '#64748b',
            inputValidator: (value) => {
                if (!value || value < 1) return 'Please enter a valid User ID!';
            }
        });

        if (result.isConfirmed && result.value) {
            currentFilterUserId = result.value;
            loadTicketsByUser(result.value);
        } else if (result.isDenied) {
            currentFilterUserId = null;
            loadTickets();
        }
    };

    // ─────────────────────────────────────────
    // Export CSV — Real data export
    // ─────────────────────────────────────────
    window.exportData = function() {
        if (ticketsData.length === 0) {
            Swal.fire({ title: 'No Data', text: 'No tickets to export.', icon: 'info', background: 'var(--bg-card)', color: 'var(--text-main)' });
            return;
        }

        Swal.fire({
            title: 'Exporting Data...',
            text: 'Generating CSV file from ticket data.',
            icon: 'info',
            timer: 1000,
            showConfirmButton: false,
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        }).then(() => {
            // Build CSV
            const headers = ['Ticket ID', 'User ID', 'Passenger Name', 'Route', 'Route ID', 'Purchase Date', 'Price (EGP)', 'Status'];
            const csvRows = [headers.join(',')];

            ticketsData.forEach(t => {
                const row = [
                    t.displayId,
                    t.userId,
                    `"${t.name}"`,
                    `"${t.route}"`,
                    t.routeId,
                    `"${t.date}"`,
                    t.rawPrice,
                    t.status
                ];
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tickets_report_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);

            Swal.fire({ title: 'Export Complete! ✅', text: `${ticketsData.length} tickets exported to CSV.`, icon: 'success', background: 'var(--bg-card)', color: 'var(--text-main)' });
        });
    };
});