// linkedin.js

let currentUser = null;
let linkedinData = [];
let allUsersData = [];
const _now = new Date();
const todayStr = _now.getFullYear() + '-' + String(_now.getMonth() + 1).padStart(2, '0') + '-' + String(_now.getDate()).padStart(2, '0');


document.addEventListener('DOMContentLoaded', async () => {
    currentUser = requireAuth();
    if (!currentUser) return;
    
    populateHeader(currentUser);
    
    if (currentUser.Role === 'Admin' || currentUser.Role === 'Manager') {
        document.getElementById('admin-view').classList.remove('d-none');
        document.getElementById('filter-date').value = todayStr;
        document.getElementById('filter-date').addEventListener('change', renderAdminTable);
        await loadAdminData();
    } else {
        document.getElementById('user-view').classList.remove('d-none');
        document.getElementById('linkedin-form').addEventListener('submit', handleSubmission);
        await loadAllLinkedIn(); // Need this to check if already submitted
        checkUserStatus();
    }
});

async function loadAdminData() {
    try {
        const [resUsers, resLinkedIn] = await Promise.all([
            fetchAPI({ action: 'get_users', employeeId: currentUser.EmployeeID }),
            fetchAPI({ action: 'get_linkedin' })
        ]);

        if (resUsers.success && resLinkedIn.success) {
            allUsersData = resUsers.data.filter(u => u.Status === 'Active' && u.Role !== 'Admin' && u.Role !== 'Manager');
            linkedinData = resLinkedIn.data;
            renderAdminTable();
        } else {
            showToast('Failed to load data', 'error');
        }
    } catch (e) {
        showToast('Error loading data', 'error');
    }
}

async function loadAllLinkedIn() {
    try {
        const res = await fetchAPI({ action: 'get_linkedin' });
        if (res.success) {
            linkedinData = res.data;
        } else {
            showToast('Failed to load linkedin data', 'error');
        }
    } catch (e) {
        showToast('Error loading linkedin data', 'error');
    }
}

function checkUserStatus() {
    const todaySubmission = linkedinData.find(l => l.EmployeeID == currentUser.EmployeeID && l.Date === todayStr);
    const statusBanner = document.getElementById('submission-status');
    const form = document.getElementById('linkedin-form');
    
    // Sundays check
    const today = new Date();
    if (today.getDay() === 0) {
        statusBanner.className = 'status-banner status-submitted';
        statusBanner.innerText = 'Take a rest! No submission required on Sundays.';
        document.getElementById('linkedin-form').style.display = 'none';
        return;
    }

    if (todaySubmission) {
        if (todaySubmission.ApprovalStatus === 'Rejected') {
            statusBanner.className = 'status-banner status-pending';
            statusBanner.style.backgroundColor = 'var(--danger)';
            statusBanner.innerText = 'Status: Task Rejected. Please resubmit the correct post.';
            
            document.getElementById('post-url').value = todaySubmission.PostURL;
            
            document.getElementById('linkedin-form').style.display = 'block';
            document.getElementById('post-url').disabled = false;
            document.getElementById('btn-submit-linkedin').disabled = false;
            document.getElementById('btn-submit-linkedin').innerText = "Resubmit Post";
        } else if (todaySubmission.ApprovalStatus === 'Approved') {
            statusBanner.className = 'status-banner status-submitted';
            statusBanner.innerText = 'Status: Approved by Admin! 🎉';
            document.getElementById('linkedin-form').style.display = 'none';
        } else {
            statusBanner.className = 'status-banner status-submitted';
            statusBanner.style.backgroundColor = '#DD6B20'; // Orange
            statusBanner.innerText = 'Status: Pending Admin Approval ⏳';
            document.getElementById('linkedin-form').style.display = 'none';
        }
    } else {
        statusBanner.className = 'status-banner status-pending';
        statusBanner.innerText = 'Status: Pending submission today.';
        document.getElementById('linkedin-form').style.display = 'block';
        document.getElementById('btn-submit-linkedin').innerText = "Submit Today's Post";
        document.getElementById('post-url').disabled = false;
        document.getElementById('btn-submit-linkedin').disabled = false;
        document.getElementById('post-url').value = '';
    }
}

async function handleSubmission(e) {
    e.preventDefault();
    
    const postData = {
        EmployeeID: currentUser.EmployeeID,
        EmployeeName: currentUser.Name,
        Email: currentUser.Email,
        PostURL: document.getElementById('post-url').value,
        Note: '-'
    };
    
    const btn = document.getElementById('btn-submit-linkedin');
    btn.disabled = true;
    btn.innerText = 'Submitting...';

    try {
        const res = await fetchAPI({ action: 'submit_linkedin', postData });
        if (res.success) {
            showToast(res.message);
            await loadAllLinkedIn();
            checkUserStatus();
        } else {
            showToast(res.message, 'error');
            btn.disabled = false;
            btn.innerText = "Submit Today's Post";
        }
    } catch (e) {
        showToast('Error submitting post', 'error');
        btn.disabled = false;
        btn.innerText = "Submit Today's Post";
    }
}

function renderAdminTable() {
    const tbody = document.getElementById('admin-linkedin-tbody');
    const filterDate = document.getElementById('filter-date').value;
    
    tbody.innerHTML = '';
    
    if (allUsersData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No active team members found.</td></tr>';
        return;
    }

    allUsersData.forEach(user => {
        // Find if this user submitted on the selected date
        const submission = linkedinData.find(l => l.EmployeeID === user.EmployeeID && l.Date === filterDate);
        
        let statusBadge = '<span class="badge badge-pending">Pending</span>';
        let actionBtns = '-';
        
        if (submission) {
            if (submission.ApprovalStatus === 'Approved') {
                statusBadge = '<span class="badge badge-completed">Approved</span>';
            } else if (submission.ApprovalStatus === 'Rejected') {
                statusBadge = '<span class="badge badge-danger" style="background:var(--danger);color:white;padding:4px 8px;border-radius:12px;font-size:0.75rem;">Rejected</span>';
            } else {
                statusBadge = '<span class="badge badge-inprogress" style="background:#DD6B20;color:white;padding:4px 8px;border-radius:12px;font-size:0.75rem;">Waiting Approval</span>';
                actionBtns = `
                    <button class="btn btn-primary btn-sm" style="padding:4px 8px;font-size:0.75rem;margin-right:4px;" onclick="handleApproval('${user.EmployeeID}', '${filterDate}', 'Approved')">Approve</button>
                    <button class="btn btn-danger btn-sm" style="padding:4px 8px;font-size:0.75rem;color:white;background:var(--danger);" onclick="handleApproval('${user.EmployeeID}', '${filterDate}', 'Rejected')">Reject</button>
                `;
            }
        }
            
        const postLink = submission ? `<a href="${submission.PostURL}" target="_blank">View Post</a>` : '-';
        const timeStr = submission ? new Date(submission.SubmittedTime).toLocaleTimeString() : '-';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.Name}</strong></td>
            <td>${statusBadge}</td>
            <td>${postLink}</td>
            <td>${timeStr}</td>
            <td>${actionBtns}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleApproval(employeeId, date, status) {
    if (!confirm(`Are you sure you want to mark this task as ${status}?`)) return;
    
    try {
        const res = await fetchAPI({ action: 'approve_linkedin', employeeId, date, status });
        if (res.success) {
            showToast(`Task ${status} successfully!`);
            await loadAdminData();
        } else {
            showToast(res.message, 'error');
        }
    } catch (e) {
        showToast('Error approving task', 'error');
    }
}
