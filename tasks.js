// tasks.js

let currentUser = null;
let tasksData = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = requireAuth();
    if (!currentUser) return;
    
    populateHeader(currentUser);
    
    if (currentUser.Role === 'Admin' || currentUser.Role === 'Manager') {
        if (currentUser.Role === 'Admin') {
            document.getElementById('btn-create-task').classList.remove('d-none');
        }
        document.querySelectorAll('.admin-only-field').forEach(el => el.classList.remove('d-none'));
    }

    await loadTasks();
    
    if (currentUser.Role === 'Admin' || currentUser.Role === 'Manager') {
        fetchAPI({ action: 'get_users', employeeId: currentUser.EmployeeID }).then(res => {
            if (res.success) {
                const select = document.getElementById('task-assignee');
                res.data.filter(u => u.Status === 'Active').forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.EmployeeID;
                    option.textContent = `${user.Name} (${user.EmployeeID})`;
                    select.appendChild(option);
                });
            }
        });
    }

    // Event Listeners
    document.getElementById('btn-create-task').addEventListener('click', openCreateModal);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('task-form').addEventListener('submit', handleTaskSave);
    document.getElementById('filter-status').addEventListener('change', renderTasks);
    document.getElementById('search-task').addEventListener('input', renderTasks);
    document.getElementById('btn-start-task').addEventListener('click', startTask);
    
    // Star Rating Logic
    document.querySelectorAll('#star-rating-container .star').forEach(star => {
        star.addEventListener('click', (e) => {
            if (document.getElementById('task-rating').disabled) return;
            const val = parseInt(e.target.getAttribute('data-value'));
            setStarRatingUI(val);
        });
    });
});

async function loadTasks() {
    try {
        const res = await fetchAPI({ action: 'get_tasks', employeeId: currentUser.EmployeeID, role: currentUser.Role });
        if (res.success) {
            tasksData = res.data;
            renderTasks();
        } else {
            showToast('Failed to load tasks', 'error');
        }
    } catch (e) {
        showToast('Error loading tasks', 'error');
    }
}

function renderTasks() {
    const tbody = document.getElementById('tasks-tbody');
    const filterStatus = document.getElementById('filter-status').value;
    const searchQuery = document.getElementById('search-task').value.toLowerCase();
    
    tbody.innerHTML = '';
    
    let filtered = tasksData.filter(t => {
        const matchesStatus = filterStatus ? t.Status === filterStatus : true;
        const matchesSearch = t.Title.toLowerCase().includes(searchQuery) || (t.TaskID && t.TaskID.toLowerCase().includes(searchQuery));
        return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No tasks found.</td></tr>';
        return;
    }

    filtered.forEach(task => {
        const badgeClass = task.Status === 'Pending' ? 'badge-pending' : (task.Status === 'In Progress' ? 'badge-inprogress' : 'badge-completed');
        
        let priorityClass = 'priority-medium';
        if (task.Priority === 'High') priorityClass = 'priority-high';
        if (task.Priority === 'Low') priorityClass = 'priority-low';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${task.TaskID}</strong></td>
            <td style="font-weight: 500;">${task.Title}</td>
            <td><span class="priority-badge ${priorityClass}">${task.Priority}</span></td>
            <td style="color:var(--text-muted); font-size: 0.9rem;">${task.Deadline}</td>
            <td>${task.AssignedTo ? `<span style="font-weight: 600;">${task.AssignedTo}</span>` : '<span class="text-muted">Unassigned</span>'}</td>
            <td><span class="badge ${badgeClass}">${task.Status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openEditModal('${task.TaskID}')">View / Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openCreateModal() {
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
    setStarRatingUI(0);
    document.getElementById('modal-title').innerText = 'Create Task';
    
    document.getElementById('user-submit-fields').classList.add('d-none');
    document.getElementById('admin-review-fields').classList.add('d-none');
    document.getElementById('btn-start-task').style.display = 'none';
    
    // Enable all inputs for admin
    document.querySelectorAll('#task-form input, #task-form select, #task-form textarea').forEach(el => el.disabled = false);
    document.getElementById('btn-save-task').style.display = 'inline-block';

    document.getElementById('task-modal').style.display = 'flex';
}

function openEditModal(taskId) {
    const task = tasksData.find(t => t.TaskID === taskId);
    if (!task) return;

    document.getElementById('task-id').value = task.TaskID;
    document.getElementById('task-title').value = task.Title;
    document.getElementById('task-desc').value = task.Description;
    document.getElementById('task-priority').value = task.Priority;
    document.getElementById('task-deadline').value = task.Deadline || '';
    if (currentUser.Role === 'Admin') {
        document.getElementById('task-assignee').value = task.AssignedTo || '';
    }

    document.getElementById('modal-title').innerText = `Task: ${task.TaskID}`;
    
    // Reset displays
    document.getElementById('user-submit-fields').classList.add('d-none');
    document.getElementById('admin-review-fields').classList.add('d-none');
    document.getElementById('btn-start-task').style.display = 'none';
    
    const isAdmin = currentUser.Role === 'Admin';
    const isManager = currentUser.Role === 'Manager';
    const isAssignee = currentUser.EmployeeID === task.AssignedTo;
    
    // Admin View
    if (isAdmin) {
        document.querySelectorAll('#task-form input, #task-form select, #task-form textarea').forEach(el => el.disabled = false);
        
        if (task.Status === 'Completed' || task.Status === 'Waiting For Review') {
            document.getElementById('admin-review-fields').classList.remove('d-none');
            setStarRatingUI(task.Rating || 0);
            document.getElementById('task-feedback').value = task.Feedback || '';
            
            document.getElementById('user-submit-fields').classList.remove('d-none');
            document.getElementById('task-note').value = task.CompletionNote || '';
            document.getElementById('task-link').value = task.WorkLink || '';
            document.getElementById('task-note').disabled = false;
            document.getElementById('task-link').disabled = false;
        }
        document.getElementById('btn-save-task').style.display = 'inline-block';
        document.getElementById('btn-save-task').innerText = 'Update Task';
    } 
    // Manager View
    else if (isManager) {
        document.querySelectorAll('#task-form input, #task-form select, #task-form textarea').forEach(el => el.disabled = true);
        
        if (task.Status === 'Completed' || task.Status === 'Waiting For Review') {
            document.getElementById('admin-review-fields').classList.remove('d-none');
            setStarRatingUI(task.Rating || 0);
            document.getElementById('task-feedback').value = task.Feedback || '';
            
            document.getElementById('user-submit-fields').classList.remove('d-none');
            document.getElementById('task-note').value = task.CompletionNote || '';
            document.getElementById('task-link').value = task.WorkLink || '';
        }
        document.getElementById('btn-save-task').style.display = 'none';
    }
    // User View
    else if (isAssignee) {
        // Users can't edit core details
        document.getElementById('task-title').disabled = true;
        document.getElementById('task-desc').disabled = true;
        document.getElementById('task-priority').disabled = true;
        document.getElementById('task-deadline').disabled = true;

        if (task.Status === 'Pending') {
            document.getElementById('btn-start-task').style.display = 'inline-block';
            document.getElementById('btn-save-task').style.display = 'none';
        } else if (task.Status === 'In Progress') {
            document.getElementById('user-submit-fields').classList.remove('d-none');
            document.getElementById('task-note').disabled = false;
            document.getElementById('task-link').disabled = false;
            document.getElementById('btn-save-task').style.display = 'inline-block';
            document.getElementById('btn-save-task').innerText = 'Submit Work';
        } else if (task.Status === 'Completed' || task.Status === 'Waiting For Review') {
            document.getElementById('user-submit-fields').classList.remove('d-none');
            document.getElementById('task-note').value = task.CompletionNote || '';
            document.getElementById('task-link').value = task.WorkLink || '';
            document.getElementById('task-note').disabled = true;
            document.getElementById('task-link').disabled = true;
            
            if (task.Rating) {
                document.getElementById('admin-review-fields').classList.remove('d-none');
                setStarRatingUI(task.Rating || 0);
                document.getElementById('task-feedback').value = task.Feedback;
                document.getElementById('task-rating').disabled = true;
                document.getElementById('task-feedback').disabled = true;
            }
            document.getElementById('btn-save-task').style.display = 'none';
        }
    }

    document.getElementById('task-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('task-modal').style.display = 'none';
}

async function handleTaskSave(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    const isCreate = !taskId;
    
    const taskData = {
        Title: document.getElementById('task-title').value,
        Description: document.getElementById('task-desc').value,
        Priority: document.getElementById('task-priority').value,
        Deadline: document.getElementById('task-deadline').value
    };

    if (currentUser.Role === 'Admin') {
        taskData.AssignedTo = document.getElementById('task-assignee').value;
        if (!isCreate) {
            taskData.TaskID = taskId;
            taskData.Rating = document.getElementById('task-rating').value;
            taskData.Feedback = document.getElementById('task-feedback').value;
            taskData.CompletionNote = document.getElementById('task-note').value;
            taskData.WorkLink = document.getElementById('task-link').value;
            // If admin rates it, it might mean review is done
            if (taskData.Rating) {
                taskData.Status = 'Completed';
            }
        }
    } else {
        // User submitting work
        taskData.TaskID = taskId;
        taskData.CompletionNote = document.getElementById('task-note').value;
        taskData.WorkLink = document.getElementById('task-link').value;
        taskData.Status = 'Waiting For Review'; // Or Completed
        taskData.SubmittedDate = new Date().toISOString();
    }

    const action = isCreate ? 'create_task' : 'update_task';
    const payload = { action, task: taskData, employeeId: currentUser.EmployeeID, role: currentUser.Role };
    
    const btn = document.getElementById('btn-save-task');
    btn.disabled = true;
    btn.innerText = 'Saving...';

    try {
        const res = await fetchAPI(payload);
        if (res.success) {
            showToast(res.message);
            closeModal();
            loadTasks();
        } else {
            showToast(res.message, 'error');
        }
    } catch (e) {
        showToast('Error saving task', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save';
    }
}

async function startTask() {
    const taskId = document.getElementById('task-id').value;
    try {
        const res = await fetchAPI({
            action: 'update_task',
            task: { TaskID: taskId, Status: 'In Progress' },
            employeeId: currentUser.EmployeeID,
            role: currentUser.Role
        });
        
        if (res.success) {
            showToast('Task started!');
            closeModal();
            loadTasks();
        } else {
            showToast(res.message, 'error');
        }
    } catch (e) {
        showToast('Error starting task', 'error');
    }
}

function setStarRatingUI(rating) {
    const val = parseInt(rating) || 0;
    const ratingInput = document.getElementById('task-rating');
    if (ratingInput) ratingInput.value = val;
    document.querySelectorAll('#star-rating-container .star').forEach(star => {
        if (parseInt(star.getAttribute('data-value')) <= val) {
            star.style.color = '#f39c12'; // gold
        } else {
            star.style.color = '#ccc'; // gray
        }
    });
}
