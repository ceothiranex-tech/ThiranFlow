// dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const user = requireAuth();
    if (!user) return; // Not authenticated, auth.js redirects
    
    populateHeader(user);
    if(document.getElementById('banner-user-name')) {
        document.getElementById('banner-user-name').innerText = user.Name ? user.Name.split(' ')[0] : 'User';
    }
    
    if (user.Role !== 'Admin' && user.Role !== 'Manager') {
        document.getElementById('lbl-total-tasks').innerText = 'My Tasks';
        document.getElementById('user-stats').classList.remove('d-none');
    }
    
    // Load current announcement for admin
    if (user.Role === 'Admin') {
        const annInput = document.getElementById('admin-announcement-input');
        if (annInput) {
            fetchAPI({ action: 'get_announcement' }).then(res => {
                if (res.success && res.data) {
                    annInput.value = res.data;
                }
            });
            
            document.getElementById('btn-update-announcement').addEventListener('click', async () => {
                const btn = document.getElementById('btn-update-announcement');
                const prevText = btn.innerText;
                btn.innerText = 'Updating...';
                btn.disabled = true;
                
                try {
                    const msg = annInput.value.trim();
                    const r = await fetchAPI({ action: 'update_announcement', message: msg });
                    if (r.success) {
                        showToast(msg ? 'Banner updated!' : 'Banner removed!', 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        showToast(r.message, 'error');
                    }
                } catch(e) {
                    showToast('Failed to update banner', 'error');
                } finally {
                    btn.innerText = prevText;
                    btn.disabled = false;
                }
            });
        }
    }

    try {
        const response = await fetchAPI({
            action: 'get_dashboard_summary',
            employeeId: user.EmployeeID,
            role: user.Role
        });
        
        if (response.success) {
            updateDashboard(response.data, user.Role);
        } else {
            showToast('Failed to load dashboard data', 'error');
        }
    } catch(err) {
        showToast('Error connecting to backend', 'error');
    } finally {
        document.getElementById('loading-overlay').classList.add('d-none');
    }
});

function updateDashboard(data, role) {
    if (role === 'Admin' || role === 'Manager') {
        document.getElementById('stat-total-members').innerText = data.totalMembers || 0;
        document.getElementById('stat-active-members').innerText = data.activeMembers || 0;
        document.getElementById('stat-today-linkedin').innerText = data.todayLinkedIn || 0;
        document.getElementById('stat-overall-linkedin').innerText = (data.overallLinkedInCompletion || 0) + '%';
        document.getElementById('stat-total-tasks').innerText = data.totalTasks || 0;
    } else {
        document.getElementById('stat-total-tasks').innerText = data.myTasks || 0;
        document.getElementById('stat-avg-rating').innerText = data.averageRating || 0;
    }
    
    document.getElementById('stat-pending-tasks').innerText = data.pendingTasks || 0;
    document.getElementById('stat-inprogress-tasks').innerText = data.inProgressTasks || 0;
    document.getElementById('stat-completed-tasks').innerText = data.completedTasks || 0;
    
    renderTaskChart(data);
    if(role === 'Admin' || role === 'Manager') {
        renderLinkedInChart(data);
        renderTimeline(data.recentActivity);
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + ' min ago';
    if (diffHours < 24) return diffHours + ' hours ago';
    if (diffDays === 1) return '1 day ago';
    return diffDays + ' days ago';
}

function renderTimeline(activities) {
    const timeline = document.getElementById('activity-timeline');
    if (!timeline) return;
    timeline.innerHTML = '';
    
    if (!activities || activities.length === 0) {
        timeline.innerHTML = '<li class="timeline-item"><div class="timeline-content">No recent activity.</div></li>';
        return;
    }
    
    activities.forEach((act, idx) => {
        // Change colors for variation
        let color = 'var(--primary-blue)';
        if (act.Action.includes('create') || act.Action.includes('add')) color = 'var(--success)';
        else if (act.Action.includes('update')) color = 'var(--warning)';
        else if (act.Action.includes('delete')) color = 'var(--danger)';
        
        const li = document.createElement('li');
        li.className = 'timeline-item';
        li.innerHTML = `
            <div class="timeline-icon" style="background-color: ${color};"></div>
            <div class="timeline-content">
                <strong>${act.User !== 'System' ? act.User : 'System'}</strong> ${act.Description || act.Action}
                <span class="timeline-time">${formatTimeAgo(act.Timestamp)}</span>
            </div>
        `;
        timeline.appendChild(li);
    });
}

function renderTaskChart(data) {
    const ctx = document.getElementById('taskStatusChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'In Progress', 'Completed'],
            datasets: [{
                data: [data.pendingTasks, data.inProgressTasks, data.completedTasks],
                backgroundColor: [
                    '#F59E0B', // Warning (Amber)
                    '#3B82F6', // Info (Blue)
                    '#10B981'  // Success (Emerald)
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderLinkedInChart(data) {
    const ctx = document.getElementById('linkedinChart').getContext('2d');
    
    // Extract labels and data from backend response
    let labels = ['No Team Members'];
    let chartData = [0];
    
    if (data.linkedinChartData && data.linkedinChartData.length > 0) {
        labels = data.linkedinChartData.map(u => u.name);
        chartData = data.linkedinChartData.map(u => u.completed);
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completion %',
                data: chartData,
                backgroundColor: 'var(--success)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100 }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
