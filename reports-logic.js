document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    let reportsData = [];
    let currentFilter = 'all';
    const tbody = document.getElementById('reportsTableBody');
    const searchInput = document.getElementById('reportSearchInput');
    const modal = document.getElementById('reportDetailModal');

    window.loadReports = async function() {
        try {
            const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            reportsData = data || [];
            updateStats();
            filterReports();
        } catch(e) {
            console.error('Error loading reports', e);
            if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:60px;color:#ef4444;font-weight:800;">Failed to fetch reports from neural network. Check connection.</td></tr>`;
        }
    };

    function updateStats() {
        const total = reportsData.length;
        const pending = reportsData.filter(r => (r.status || '').toLowerCase() === 'pending').length;
        const resolved = reportsData.filter(r => (r.status || '').toLowerCase() === 'resolved').length;
        const critical = reportsData.filter(r => (r.priority || '').toLowerCase() === 'critical').length;

        if(document.getElementById('rptTotal')) document.getElementById('rptTotal').innerText = total;
        if(document.getElementById('rptPending')) document.getElementById('rptPending').innerText = pending;
        if(document.getElementById('rptResolved')) document.getElementById('rptResolved').innerText = resolved;
        if(document.getElementById('rptCritical')) document.getElementById('rptCritical').innerText = critical;
    }

    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            filterReports();
        });
    });

    function timeAgo(date) {
        if (!date) return '...';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (isNaN(seconds)) return '...';
        if (seconds < 60) return "Just now";
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    }

    function filterReports() {
        if(!tbody) return;
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        let filtered = reportsData;

        if(currentFilter !== 'all') {
            if(currentFilter === 'pending') filtered = filtered.filter(r => (r.status || '').toLowerCase() === 'pending');
            if(currentFilter === 'critical') filtered = filtered.filter(r => (r.priority || '').toLowerCase() === 'critical');
            if(currentFilter === 'resolved') filtered = filtered.filter(r => (r.status || '').toLowerCase() === 'resolved');
        }

        if(query) {
            filtered = filtered.filter(r => 
                (r.category || '').toLowerCase().includes(query) ||
                (r.reporter_name || '').toLowerCase().includes(query) ||
                (r.text_complaint || '').toLowerCase().includes(query) ||
                (String(r.id)).includes(query) ||
                (String(r.bus_id)).includes(query)
            );
        }

        tbody.innerHTML = '';
        if(filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-muted);font-weight:700;"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;opacity:0.2;"></i>No signals found matching your parameters.</td></tr>`;
            return;
        }

        filtered.forEach(rpt => {
            const tr = document.createElement('tr');
            
            const status = (rpt.status || 'Pending').toLowerCase();
            let statusBadge = `<span class="priority-badge" style="color:#f59e0b; background:rgba(245,158,11,0.1); border-color:#f59e0b44;"><i class="fas fa-spinner fa-spin"></i> Pending</span>`;
            if(status === 'resolved') statusBadge = `<span class="priority-badge" style="color:#10b981; background:rgba(16,185,129,0.1); border-color:#10b98144;"><i class="fas fa-check-circle"></i> Resolved</span>`;
            if(status === 'in progress') statusBadge = `<span class="priority-badge" style="color:#3b82f6; background:rgba(59,130,246,0.1); border-color:#3b82f644;"><i class="fas fa-satellite"></i> Active</span>`;
            
            const prio = (rpt.priority || 'Normal').toLowerCase();
            let prioBadge = `<span class="priority-badge priority-medium">${rpt.priority || 'Normal'}</span>`;
            if(prio === 'critical') prioBadge = `<span class="priority-badge priority-critical"><i class="fas fa-bolt"></i> CRITICAL</span>`;
            if(prio === 'high') prioBadge = `<span class="priority-badge priority-high">High Alert</span>`;
            if(prio === 'low') prioBadge = `<span class="priority-badge priority-low">Low</span>`;

            tr.innerHTML = `
                <td><div style="font-weight:900; color:var(--primary-color);">#RPT-${String(rpt.id).padStart(3,'0')}</div></td>
                <td><div style="font-weight:800; color:var(--text-main);">${rpt.category || 'General'}</div></td>
                <td><div style="font-weight:800;"><i class="fas fa-bus" style="margin-right:8px; color:var(--text-muted);"></i>Bus #${rpt.bus_id || 'N/A'}</div></td>
                <td><div style="font-weight:700;">${rpt.reporter_name || rpt.user_id || 'Guest User'}</div></td>
                <td>${prioBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-outline" style="width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:10px;" onclick="window.viewReport('${rpt.id}')"><i class="fas fa-eye"></i></button>
                        ${status !== 'resolved' ? `<button class="btn-primary" style="width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#10b981;" onclick="window.resolveReport('${rpt.id}')"><i class="fas fa-check"></i></button>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    if(searchInput) searchInput.addEventListener('input', filterReports);

    window.closeReportDetail = () => {
        if(modal) modal.classList.remove('active');
    };

    window.viewReport = (id) => {
        const rpt = reportsData.find(r => String(r.id) === String(id));
        if(!rpt) return;
        
        if(document.getElementById('rdTitle')) document.getElementById('rdTitle').innerText = rpt.category || 'Signal Analysis';
        if(document.getElementById('rdSubtitle')) document.getElementById('rdSubtitle').innerText = 'IDENTIFIER: RPT-' + String(rpt.id).padStart(3,'0');
        if(document.getElementById('rdMessage')) document.getElementById('rdMessage').innerHTML = `<p style="font-weight:900; font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:12px; letter-spacing:1px;">AI Observation Summary</p><div style="font-weight:700; line-height:1.7; color:var(--text-main); font-size:1.05rem;">${rpt.text_complaint || rpt.content || 'No detailed neural data available for this signal.'}</div>`;
        
        let gridHtml = `
            <div class="rd-field"><p class="rd-label"><i class="fas fa-user-astronaut"></i> Originator</p><p class="rd-value">${rpt.reporter_name || rpt.user_id || 'External Signal'}</p></div>
            <div class="rd-field"><p class="rd-label"><i class="fas fa-clock"></i> Intercept Time</p><p class="rd-value">${rpt.created_at ? new Date(rpt.created_at).toLocaleString() : 'Timestamp Unknown'}</p></div>
            <div class="rd-field"><p class="rd-label"><i class="fas fa-bus"></i> Target Asset</p><p class="rd-value">Bus #${rpt.bus_id || 'N/A'}</p></div>
            <div class="rd-field"><p class="rd-label"><i class="fas fa-shield-alt"></i> Threat Level</p><p class="rd-value" style="color:${(rpt.priority||'').toLowerCase()==='critical'?'#ef4444':'#3b82f6'}">${rpt.priority || 'Standard'}</p></div>
        `;
        if(document.getElementById('rdGrid')) document.getElementById('rdGrid').innerHTML = gridHtml;

        const actionBtnContainer = document.getElementById('rdActionBtnContainer');
        if(actionBtnContainer) {
            const status = (rpt.status || 'Pending').toLowerCase();
            if(status !== 'resolved') {
                actionBtnContainer.innerHTML = `<button class="btn-primary" style="padding:12px 30px; background:#10b981;" onclick="window.resolveReport('${rpt.id}')"><i class="fas fa-check-double"></i> Mark Resolved</button>`;
            } else {
                actionBtnContainer.innerHTML = `<button class="btn-primary" style="padding:12px 30px; background:#64748b; cursor:default;" disabled><i class="fas fa-archive"></i> Archived</button>`;
            }
        }

        const origImg = document.getElementById('rdImageOrig');
        const aiImg = document.getElementById('rdImageAI');
        const imgBox = document.getElementById('rdImageBox');
        
        if(imgBox) {
            const hasOrig = rpt.original_image || rpt.photo_url;
            const hasAI = rpt.result_image;

            if(hasOrig || hasAI) {
                imgBox.style.display = 'grid';
                if(origImg) origImg.src = hasOrig || 'https://via.placeholder.com/400x250?text=Signal+Feed+Missing';
                if(aiImg) aiImg.src = hasAI || 'https://via.placeholder.com/400x250?text=AI+Response+Pending';
                
                if(!hasAI) {
                    aiImg.parentElement.style.opacity = '0.3';
                    aiImg.style.filter = 'grayscale(1)';
                } else {
                    aiImg.parentElement.style.opacity = '1';
                    aiImg.style.filter = 'none';
                }
            } else {
                imgBox.style.display = 'none';
            }
        }

        if(modal) modal.classList.add('active');
    };

    window.resolveReport = async (id) => {
        const res = await Swal.fire({
            title: 'Close Signal?',
            text: "This will archive the report and notify the intelligence network.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, Archive',
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });

        if(res.isConfirmed) {
            try {
                const { error } = await supabase.from('complaints').eq('id', id).update({ status: 'Resolved' });
                if(error) throw error;
                Swal.fire({icon: 'success', title: 'Signal Archived', timer: 1000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)'});
                window.closeReportDetail();
                window.loadReports();
            } catch(e) {
                Swal.fire('Error', 'Internal telemetry error', 'error');
            }
        }
    };

    window.loadReports();
    setInterval(window.loadReports, 8000);
});
