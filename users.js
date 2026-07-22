// users.js

let currentUser = null;
let usersData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Only Admin or Manager can access
    currentUser = requireAuth(['Admin', 'Manager']);
    if (!currentUser) return;
    
    populateHeader(currentUser);
    
    if (currentUser.Role === 'Manager') {
        document.getElementById('btn-add-user').classList.add('d-none');
    }
    
    await loadUsers();

    // Check if we need to auto-open the add modal (from dashboard quick action)
    if (window.location.hash === '#add' && currentUser.Role === 'Admin') {
        openCreateModal();
        // Remove hash so it doesn't reopen on refresh
        history.replaceState(null, null, ' ');
    }

    // Event Listeners
    if (currentUser.Role !== 'Manager') {
        document.getElementById('btn-add-user').addEventListener('click', openCreateModal);
    }
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('user-form').addEventListener('submit', handleUserSave);
    document.getElementById('search-user').addEventListener('input', renderUsers);
});

async function loadUsers() {
    try {
        const res = await fetchAPI({ action: 'get_users', employeeId: currentUser.EmployeeID });
        if (res.success) {
            usersData = res.data;
            renderUsers();
        } else {
            showToast('Failed to load users', 'error');
        }
    } catch (e) {
        showToast('Error loading users', 'error');
    }
}

function renderUsers() {
    const tbody = document.getElementById('users-tbody');
    const searchQuery = document.getElementById('search-user').value.toLowerCase();
    
    tbody.innerHTML = '';
    
    let filtered = usersData.filter(u => {
        return u.Name.toLowerCase().includes(searchQuery) || 
               u.Email.toLowerCase().includes(searchQuery) ||
               u.EmployeeID.toLowerCase().includes(searchQuery);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No team members found.</td></tr>';
        return;
    }

    filtered.forEach(user => {
        const statusBadge = user.Status === 'Active' ? 'badge-completed' : 'badge-danger';
        const roleBadge = user.Role === 'Admin' ? 'badge-pending' : (user.Role === 'Manager' ? 'badge-inprogress' : 'badge-completed');
        const initials = user.Name ? user.Name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.EmployeeID}</strong></td>
            <td>
                <div class="user-name-cell">
                    <div class="avatar-circle">${initials}</div>
                    <span>${user.Name}</span>
                </div>
            </td>
            <td style="color:var(--text-muted);">${user.Email}</td>
            <td>${user.Department}</td>
            <td><span class="badge ${roleBadge}" style="background:transparent; border:1px solid currentColor;">${user.Role}</span></td>
            <td><span class="badge ${statusBadge}">${user.Status || 'Active'}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openEditModal('${user.EmployeeID}')">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openCreateModal() {
    document.getElementById('user-form').reset();
    document.getElementById('form-mode').value = 'create';
    document.getElementById('modal-title').innerText = 'Add Team Member';
    document.getElementById('user-empid').disabled = false; // Can edit ID on create
    document.getElementById('user-password').required = true;
    document.getElementById('password-hint').style.display = 'none';
    
    document.getElementById('user-modal').style.display = 'flex';
}

function openEditModal(empId) {
    const user = usersData.find(u => u.EmployeeID === empId);
    if (!user) return;

    document.getElementById('form-mode').value = 'edit';
    document.getElementById('modal-title').innerText = 'Edit Team Member';
    
    document.getElementById('user-empid').value = user.EmployeeID;
    document.getElementById('user-empid').disabled = true; // Can't change ID
    
    document.getElementById('user-name').value = user.Name;
    document.getElementById('user-email').value = user.Email;
    document.getElementById('user-dept').value = user.Department || '';
    document.getElementById('user-desig').value = user.Designation || '';
    document.getElementById('user-role').value = user.Role;
    document.getElementById('user-status').value = user.Status || 'Active';
    
    document.getElementById('user-password').value = '';
    document.getElementById('user-password').required = false;
    document.getElementById('password-hint').style.display = 'block';
    
    if (currentUser.Role === 'Manager') {
        document.querySelectorAll('#user-form input, #user-form select').forEach(el => el.disabled = true);
        document.getElementById('btn-save-user').style.display = 'none';
        document.getElementById('password-group').style.display = 'none';
    } else {
        document.querySelectorAll('#user-form input, #user-form select').forEach(el => el.disabled = false);
        document.getElementById('user-empid').disabled = true; // EmpID always disabled in edit
        document.getElementById('btn-save-user').style.display = 'inline-block';
        document.getElementById('password-group').style.display = 'block';
    }

    document.getElementById('user-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('user-modal').style.display = 'none';
}

async function handleUserSave(e) {
    e.preventDefault();
    
    const mode = document.getElementById('form-mode').value;
    const isCreate = mode === 'create';
    
    const userData = {
        EmployeeID: document.getElementById('user-empid').value,
        Name: document.getElementById('user-name').value,
        Email: document.getElementById('user-email').value,
        Department: document.getElementById('user-dept').value,
        Designation: document.getElementById('user-desig').value,
        Role: document.getElementById('user-role').value,
        Status: document.getElementById('user-status').value
    };

    const pwd = document.getElementById('user-password').value;
    if (pwd) {
        userData.Password = pwd;
    }
    
    if(isCreate) {
        userData.JoiningDate = new Date().toISOString().split('T')[0];
    }

    const action = isCreate ? 'add_user' : 'update_user';
    const payload = { action, user: userData, employeeId: currentUser.EmployeeID };
    
    const btn = document.getElementById('btn-save-user');
    btn.disabled = true;
    btn.innerText = 'Saving...';

    try {
        const res = await fetchAPI(payload);
        if (res.success) {
            showToast(res.message);
            closeModal();
            loadUsers();
        } else {
            showToast(res.message, 'error');
        }
    } catch (e) {
        showToast('Error saving user', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save';
    }
}
