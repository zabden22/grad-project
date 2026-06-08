document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || localStorage.getItem('adminName') || 'Commander';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    // Avatar is loaded from DB by user-dropdown.js

    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    let reportsData = [];
    let currentFilter = 'all';
    const tbody = document.getElementById('reportsTableBody');
    const searchInput = document.getElementById('reportSearchInput');
    const modal = document.getElementById('reportDetailModal');

    // Parse URL parameters for initial filters/search
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    const searchParam = urlParams.get('search');

    if (filterParam) {
        currentFilter = filterParam.toLowerCase();
        // Sync filter chips active state
        document.querySelectorAll('.filter-chip').forEach(chip => {
            if (chip.getAttribute('data-filter') === currentFilter) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    if (searchParam && searchInput) {
        searchInput.value = searchParam;
    }

    window.loadReports = async function() {
        try {
            // Use window.supabaseAuth (official client) to automatically pass the logged-in user's token and bypass RLS
            const client = window.supabaseAuth || window.supabase;
            const { data, error } = await client.from('complaints').select('*').order('id', { ascending: false });
            if (error) throw error;
            reportsData = data || [];
            updateStats();
            filterReports();
        } catch(e) {
            console.error('Error loading reports', e);
            if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:60px;color:#ef4444;font-weight:800;">${typeof t === 'function' ? t('failed_fetch_reports') : 'Failed to fetch reports from base console. Check connection.'}</td></tr>`;
        }
    };

    function updateStats() {
        const total = reportsData.length;
        const pending = reportsData.filter(r => (r.status || '').toLowerCase() === 'pending').length;
        const resolved = reportsData.filter(r => (r.status || '').toLowerCase() === 'resolved').length;
        const critical = reportsData.filter(r => r.problem_detected === true).length;

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

    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const heading = card.querySelector('h4');
            if (!heading) return;
            const id = heading.id;

            statCards.forEach(c => c.style.borderColor = 'var(--border-color)');
            card.style.borderColor = 'var(--primary-color)';

            let targetFilter = 'all';
            if (id === 'rptTotal') targetFilter = 'all';
            else if (id === 'rptPending') targetFilter = 'pending';
            else if (id === 'rptResolved') targetFilter = 'resolved';
            else if (id === 'rptCritical') targetFilter = 'detected';

            currentFilter = targetFilter;
            
            // Sync filter chips active state
            document.querySelectorAll('.filter-chip').forEach(chip => {
                if (chip.getAttribute('data-filter') === targetFilter) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });

            filterReports();
        });
    });

    function getSecureUrl(url) {
        if (!url) return url;
        if (url.startsWith('http://') && !url.includes('localhost')) {
            return 'https://wsrv.nl/?url=' + url.replace('http://', '');
        }
        return url;
    }

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
            if(currentFilter === 'detected') filtered = filtered.filter(r => r.problem_detected === true);
            if(currentFilter === 'resolved') filtered = filtered.filter(r => (r.status || '').toLowerCase() === 'resolved');
            if(currentFilter === 'clean') filtered = filtered.filter(r => r.problem_detected === false);
        }

        if(query) {
            filtered = filtered.filter(r => 
                (r.subject || '').toLowerCase().includes(query) ||
                (r.reporter_name || '').toLowerCase().includes(query) ||
                (r.description || r.text_complaint || '').toLowerCase().includes(query) ||
                (String(r.id)).includes(query)
            );
        }

        tbody.innerHTML = '';
        if(filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-muted);font-weight:700;"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;opacity:0.2;"></i>${typeof t === 'function' ? t('no_signals_found') : 'No signals found matching your parameters.'}</td></tr>`;
            return;
        }

        filtered.forEach(rpt => {
            const tr = document.createElement('tr');
            
            const status = (rpt.status || 'Pending').toLowerCase();
            let statusBadge = `<span class="priority-badge" style="color:#f59e0b; background:rgba(245,158,11,0.1); border-color:#f59e0b44;"><i class="fas fa-spinner fa-spin"></i> Pending</span>`;
            if(status === 'resolved') statusBadge = `<span class="priority-badge" style="color:#10b981; background:rgba(16,185,129,0.1); border-color:#10b98144;"><i class="fas fa-check-circle"></i> Resolved</span>`;
            if(status === 'in progress') statusBadge = `<span class="priority-badge" style="color:#3b82f6; background:rgba(59,130,246,0.1); border-color:#3b82f644;"><i class="fas fa-satellite"></i> Active</span>`;
            
            // No priority column in complaints - skip priority badge

            // Evidence thumbnail
            const thumbUrl = getSecureUrl(rpt.original_image || rpt.processed_image);
            const thumbHtml = thumbUrl 
                ? `<img src="${thumbUrl}" style="width:48px; height:36px; border-radius:8px; object-fit:cover; border:1px solid var(--border-color);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div style="display:none; width:48px; height:36px; border-radius:8px; background:var(--bg-main); border:1px solid var(--border-color); align-items:center; justify-content:center;"><i class="fas fa-image" style="font-size:0.7rem; opacity:0.3;"></i></div>`
                : `<div style="width:48px; height:36px; border-radius:8px; background:var(--bg-main); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;"><i class="fas fa-image" style="font-size:0.7rem; opacity:0.3;"></i></div>`;

            // Detection badge
            const detectBadge = rpt.problem_detected === true
                ? `<span class="priority-badge priority-critical" style="font-size:0.65rem;"><i class="fas fa-exclamation-triangle"></i> Detected</span>`
                : `<span class="priority-badge priority-low" style="font-size:0.65rem;"><i class="fas fa-check"></i> OK</span>`;

            tr.innerHTML = `
                <td><div style="font-weight:900; color:var(--primary-color);">#RPT-${String(rpt.id).padStart(3,'0')}</div></td>
                <td><div style="display:flex; align-items:center; gap:10px;">${thumbHtml}<div style="font-weight:800; color:var(--text-main);">${rpt.subject || (typeof t === 'function' ? t('general') : 'General')}</div></div></td>
                <td><div style="font-weight:700;">${rpt.reporter_name || (typeof t === 'function' ? t('guest_user') : 'Guest User')}</div></td>
                <td>${detectBadge}</td>
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
        if (typeof applyLang === 'function') applyLang();
    }

    if(searchInput) searchInput.addEventListener('input', filterReports);

    window.closeReportDetail = () => {
        if(modal) modal.classList.remove('active');
    };

    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.closeReportDetail();
            }
        });
    }

    window.viewReport = (id) => {
        const rpt = reportsData.find(r => String(r.id) === String(id));
        if(!rpt) return;
        
        const langHelper = typeof t === 'function';
        if(document.getElementById('rdTitle')) document.getElementById('rdTitle').innerText = rpt.subject || (langHelper ? t('strategic_reports') : 'Signal Analysis');
        if(document.getElementById('rdSubtitle')) document.getElementById('rdSubtitle').innerText = 'IDENTIFIER: RPT-' + String(rpt.id).padStart(3,'0');
        
        const summaryText = langHelper ? t('ai_obs_summary') : 'AI Observation Summary';
        const emptyText = langHelper ? t('no_evidence_data') : 'No detailed neural data available for this signal.';
        if(document.getElementById('rdMessage')) document.getElementById('rdMessage').innerHTML = `<p style="font-weight:900; font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:12px; letter-spacing:1px;">${summaryText}</p><div style="font-weight:700; line-height:1.7; color:var(--text-main); font-size:1.05rem;">${rpt.description || rpt.text_complaint || emptyText}</div>`;
        
        const originatorLabel = langHelper ? t('originator') : 'Originator';
        const interceptTimeLabel = langHelper ? t('intercept_time') : 'Intercept Time';
        const threatLevelLabel = langHelper ? t('threat_level') : 'Threat Level';
        const guestUserText = langHelper ? t('guest_user') : 'External Signal';
        
        let gridHtml = `
            <div class="rd-field"><p class="rd-label"><i class="fas fa-user-astronaut"></i> ${originatorLabel}</p><p class="rd-value">${rpt.reporter_name || rpt.user_id || guestUserText}</p></div>
            <div class="rd-field"><p class="rd-label"><i class="fas fa-clock"></i> ${interceptTimeLabel}</p><p class="rd-value">${rpt.created_at ? new Date(rpt.created_at).toLocaleString() : 'Timestamp Unknown'}</p></div>
            <div class="rd-field"><p class="rd-label"><i class="fas fa-shield-alt"></i> ${threatLevelLabel}</p><p class="rd-value" style="color:${(rpt.priority||'').toLowerCase()==='critical'?'#ef4444':'#3b82f6'}">${rpt.priority || 'Standard'}</p></div>
        `;
        if(document.getElementById('rdGrid')) document.getElementById('rdGrid').innerHTML = gridHtml;

        const actionBtnContainer = document.getElementById('rdActionBtnContainer');
        if(actionBtnContainer) {
            const status = (rpt.status || 'Pending').toLowerCase();
            if(status !== 'resolved') {
                const resolveText = langHelper ? t('mark_resolved') : 'Mark Resolved';
                actionBtnContainer.innerHTML = `<button class="btn-primary" style="padding:12px 30px; background:#10b981;" onclick="window.resolveReport('${rpt.id}')"><i class="fas fa-check-double"></i> ${resolveText}</button>`;
            } else {
                const archivedText = langHelper ? t('archived') : 'Archived';
                actionBtnContainer.innerHTML = `<button class="btn-primary" style="padding:12px 30px; background:#64748b; cursor:default;" disabled><i class="fas fa-archive"></i> ${archivedText}</button>`;
            }
        }

        const origImg = document.getElementById('rdImageOrig');
        const aiImg = document.getElementById('rdImageAI');
        const imgBox = document.getElementById('rdImageBox');
        
        // Reset image and fallback display states
        if (origImg) {
            origImg.style.display = 'block';
            if (origImg.nextElementSibling) origImg.nextElementSibling.style.display = 'none';
        }
        if (aiImg) {
            aiImg.style.display = 'block';
            if (aiImg.nextElementSibling) aiImg.nextElementSibling.style.display = 'none';
        }

        // Render AI Predictions Helper
        function renderPredictions(predictions) {
            const predContainer = document.getElementById('rdPredictionsContainer');
            const predList = document.getElementById('rdPredictionsList');
            if (predContainer && predList) {
                if (predictions && Array.isArray(predictions) && predictions.length > 0) {
                    predContainer.style.display = 'block';
                    predList.innerHTML = predictions.map(p => {
                        const confidence = Math.round((p.confidence || p.score || 0) * 100);
                        let color = '#3b82f6';
                        let bg = 'rgba(59,130,246,0.1)';
                        if (confidence > 80) {
                            color = '#10b981';
                            bg = 'rgba(16,185,129,0.1)';
                        } else if (confidence < 50) {
                            color = '#ef4444';
                            bg = 'rgba(239,68,68,0.1)';
                        }
                        return `<span class="priority-badge" style="color:${color}; background:${bg}; border-color:${color}44; text-transform:uppercase;"><i class="fas fa-tag"></i> ${p.class_name || p.label || 'Anomaly'} (${confidence}%)</span>`;
                    }).join('');
                } else {
                    predContainer.style.display = 'none';
                    predList.innerHTML = '';
                }
            }
        }

        renderPredictions(rpt.ai_predictions);

        if(imgBox) {
            const hasOrig = getSecureUrl(rpt.original_image);
            const hasAI = getSecureUrl(rpt.processed_image);
            
            if(hasOrig || hasAI) {
                imgBox.style.display = 'grid';
                
                // Original/Source image
                if(origImg) {
                    if(hasOrig) {
                        origImg.onerror = function() {
                            this.style.display = 'none';
                            const fb = this.nextElementSibling;
                            if(fb) { fb.style.display = 'flex'; fb.innerHTML = '<i class="fas fa-server" style="font-size:2rem; margin-bottom:10px; opacity:0.3; color:#ef4444;"></i><span style="font-size:0.8rem; font-weight:700;">Image Server Offline</span>'; }
                        };
                        origImg.src = hasOrig;
                    } else {
                        origImg.style.display = 'none';
                        const fb = origImg.nextElementSibling;
                        if(fb) { fb.style.display = 'flex'; }
                    }
                }
                
                // AI Processed image
                if(aiImg) {
                    if(hasAI) {
                        aiImg.onerror = function() {
                            this.style.display = 'none';
                            const fb = this.nextElementSibling;
                            if(fb) { fb.style.display = 'flex'; fb.innerHTML = '<i class="fas fa-robot" style="font-size:2rem; margin-bottom:10px; opacity:0.3;"></i><span style="font-size:0.8rem; font-weight:700;">AI Image Unavailable</span>'; }
                        };
                        aiImg.src = hasAI;
                    } else {
                        aiImg.style.display = 'none';
                        const fb = aiImg.nextElementSibling;
                        if(fb) {
                            fb.style.display = 'flex';
                            const hasProblem = rpt.problem_detected === true;
                            const subj = rpt.subject || 'Unknown';
                            if(hasProblem) {
                                fb.innerHTML = `<i class="fas fa-exclamation-triangle" style="font-size:2.5rem; margin-bottom:12px; color:#ef4444;"></i><span style="font-size:0.9rem; font-weight:900; color:#ef4444;">Problem Detected</span><span style="font-size:1.1rem; font-weight:800; margin-top:8px; color:var(--text-main);">${subj}</span>`;
                            } else {
                                fb.innerHTML = `<i class="fas fa-check-circle" style="font-size:2.5rem; margin-bottom:12px; color:#10b981;"></i><span style="font-size:0.9rem; font-weight:900; color:#10b981;">No Problem Detected</span>`;
                            }
                        }
                    }
                }
            } else {
                imgBox.style.display = 'none';
            }
        }

        if(modal) modal.classList.add('active');
    };

    window.resolveReport = async (id) => {
        const isAr = typeof getLang === 'function' && getLang() === 'ar';
        const res = await Swal.fire({
            title: isAr ? 'إغلاق البلاغ؟' : 'Close Signal?',
            text: isAr ? 'سيؤدي هذا إلى أرشفة التقرير وإعلام شبكة العمليات.' : 'This will archive the report and notify the intelligence network.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: isAr ? 'نعم، أرشفة' : 'Yes, Archive',
            cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
            background: 'var(--bg-card)', color: 'var(--text-main)'
        });

        if(res.isConfirmed) {
            try {
                const client = window.supabaseAuth || window.supabase;
                const { error } = await client.from('complaints').update({ status: 'Resolved' }).eq('id', id);
                if(error) throw error;
                Swal.fire({
                    icon: 'success', 
                    title: isAr ? 'تمت أرشفة البلاغ' : 'Signal Archived', 
                    timer: 1000, 
                    showConfirmButton: false, 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-main)'
                });
                window.closeReportDetail();
                window.loadReports();
            } catch(e) {
                Swal.fire(isAr ? 'خطأ' : 'Error', isAr ? 'حدث خطأ في النظام الداخلي' : 'Internal telemetry error', 'error');
            }
        }
    };

    window.loadReports();
    
    if (window.supabaseAuth) {
        window.supabaseAuth.channel('complaints_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    reportsData.unshift(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    const idx = reportsData.findIndex(r => r.id === payload.new.id);
                    if (idx !== -1) reportsData[idx] = { ...reportsData[idx], ...payload.new };
                } else if (payload.eventType === 'DELETE') {
                    const idx = reportsData.findIndex(r => r.id === payload.old.id);
                    if (idx !== -1) reportsData.splice(idx, 1);
                }
                updateStats();
                filterReports();
            })
            .subscribe();
    }
});
