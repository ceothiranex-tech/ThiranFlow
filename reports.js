// reports.js

let currentUser = null;
let aggregatedData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Only Admin can access reports
    currentUser = requireAuth(['Admin']);
    if (!currentUser) return;
    
    populateHeader(currentUser);
    await loadAndAggregateData();
});

async function loadAndAggregateData() {
    try {
        const [resUsers, resTasks, resLinkedIn] = await Promise.all([
            fetchAPI({ action: 'get_users', employeeId: currentUser.EmployeeID }),
            fetchAPI({ action: 'get_tasks', employeeId: currentUser.EmployeeID, role: 'Admin' }),
            fetchAPI({ action: 'get_linkedin', employeeId: currentUser.EmployeeID, role: 'Admin' })
        ]);

        if (resUsers.success && resTasks.success && resLinkedIn.success) {
            aggregatePerformance(resUsers.data, resTasks.data, resLinkedIn.data);
            renderPerformanceTable();
        } else {
            document.getElementById('performance-tbody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        }
    } catch (e) {
        document.getElementById('performance-tbody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error loading data.</td></tr>';
    }
}

function aggregatePerformance(users, tasks, linkedin) {
    aggregatedData = [];
    
    const activeUsers = users.filter(u => u.Status === 'Active' && u.Role !== 'Admin');
    
    activeUsers.forEach(user => {
        const userTasks = tasks.filter(t => t.AssignedTo === user.Name);
        const completedTasks = userTasks.filter(t => t.Status === 'Completed');
        
        // Avg Rating
        const ratedTasks = completedTasks.filter(t => t.Rating);
        let avgRating = 0;
        if (ratedTasks.length > 0) {
            const sum = ratedTasks.reduce((acc, t) => acc + Number(t.Rating), 0);
            avgRating = (sum / ratedTasks.length).toFixed(1);
        }
        
        // LinkedIn Approved
        const userLinkedIn = linkedin.filter(l => l.EmployeeID === user.EmployeeID && l.ApprovalStatus === 'Approved');
        
        aggregatedData.push({
            EmployeeID: user.EmployeeID,
            Name: user.Name,
            Department: user.Department,
            TasksAssigned: userTasks.length,
            TasksCompleted: completedTasks.length,
            AvgRating: avgRating > 0 ? avgRating : 'N/A',
            LinkedInPosts: userLinkedIn.length
        });
    });
}

function renderPerformanceTable() {
    const tbody = document.getElementById('performance-tbody');
    tbody.innerHTML = '';
    
    if (aggregatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No active team members found.</td></tr>';
        return;
    }
    
    aggregatedData.forEach(data => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${data.Name}</strong><br>
                <small class="text-muted">${data.Department || 'N/A'}</small>
            </td>
            <td>${data.TasksAssigned}</td>
            <td>${data.TasksCompleted}</td>
            <td>${data.AvgRating} ${data.AvgRating !== 'N/A' ? '⭐' : ''}</td>
            <td>${data.LinkedInPosts}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function downloadReport(type) {
    showToast('Preparing report...', 'success');
    try {
        if (type === 'performance') {
            if (aggregatedData.length > 0) {
                exportToCSV(aggregatedData, `performance_report_${new Date().toISOString().split('T')[0]}.csv`);
            } else {
                showToast('No performance data available', 'error');
            }
            return;
        }

        let action = '';
        if (type === 'tasks') action = 'get_tasks';
        else if (type === 'linkedin') action = 'get_linkedin';

        const res = await fetchAPI({ action, employeeId: currentUser.EmployeeID, role: currentUser.Role });
        
        if (res.success && res.data.length > 0) {
            exportToCSV(res.data, `${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
        } else {
            showToast('No data available to export', 'error');
        }
    } catch (e) {
        showToast('Failed to generate report', 'error');
    }
}

function exportToCSV(data, filename) {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    let csvContent = headers.join(',') + '\n';

    data.forEach(row => {
        const rowData = headers.map(header => {
            let val = row[header] === null || row[header] === undefined ? '' : row[header];
            // Escape quotes and commas
            val = val.toString().replace(/"/g, '""');
            if (val.search(/("|,|\n)/g) >= 0) {
                val = `"${val}"`;
            }
            return val;
        });
        csvContent += rowData.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

async function downloadScoreboardPNG() {
    const scoreboard = document.getElementById('scoreboard-container');
    if (!scoreboard) return;
    
    showToast('Generating PNG...', 'success');
    
    try {
        const canvas = await html2canvas(scoreboard, {
            scale: 2, // Higher resolution
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `Performance_Scoreboard_${new Date().toISOString().split('T')[0]}.png`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Scoreboard downloaded!', 'success');
    } catch (err) {
        console.error('Error generating PNG:', err);
        showToast('Failed to generate PNG', 'error');
    }
}
