// auth.js
// Handles authentication and route protection

function getCurrentUser() {
    const userStr = localStorage.getItem('teamflow_user');
    if (userStr) {
        return JSON.parse(userStr);
    }
    return null;
}

function requireAuth(allowedRoles = ['Admin', 'Manager', 'Team Member']) {
    const user = getCurrentUser();
    if (!user) {
        window.location.replace('login.html');
        return null;
    }
    
    if (!allowedRoles.includes(user.Role)) {
        showToast('Unauthorized access', 'error');
        setTimeout(() => window.location.replace('dashboard.html'), 1000);
        return null;
    }
    
    return user;
}

function logout() {
    localStorage.removeItem('teamflow_user');
    window.location.replace('login.html');
}

// Utility to populate user info in header
function populateHeader(user) {
    const userNameEl = document.getElementById('header-user-name');
    const userRoleEl = document.getElementById('header-user-role');
    
    if(userNameEl) userNameEl.innerText = user.Name;
    if(userRoleEl) userRoleEl.innerText = user.Role;
    
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Handle admin only menu items
    const adminItems = document.querySelectorAll('.admin-only');
    if (user.Role === 'Admin' || user.Role === 'Manager') {
        adminItems.forEach(item => item.classList.remove('d-none'));
    } else {
        adminItems.forEach(item => item.classList.add('d-none'));
    }

    // Reports access is strictly for Admin only
    if (user.Role === 'Manager') {
        const reportLinks = document.querySelectorAll('a[href="reports.html"]');
        reportLinks.forEach(link => {
            if (link.parentElement.tagName === 'LI') {
                link.parentElement.classList.add('d-none');
            }
        });
    }

    // Load and display announcement banner
    loadAnnouncement();
}

async function loadAnnouncement() {
    try {
        const res = await fetchAPI({ action: 'get_announcement' });
        if (res.success && res.data) {
            const banner = document.createElement('div');
            banner.id = 'announcement-banner';
            banner.style.cssText = 'background: #ffeaa7; color: #d35400; padding: 10px 20px; text-align: center; font-weight: 500; font-size: 0.95rem; border-bottom: 1px solid #fdcb6e; position: sticky; top: 0; z-index: 999;';
            banner.innerHTML = `<strong>📢 Announcement:</strong> ${res.data}`;
            
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.insertBefore(banner, mainContent.firstChild);
            }
        }
    } catch (e) {
        console.error('Failed to load announcement', e);
    }
}
