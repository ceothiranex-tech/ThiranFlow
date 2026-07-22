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

    // Mobile Menu Toggle
    const topHeader = document.querySelector('.top-header');
    if (topHeader && !document.getElementById('mobile-menu-btn')) {
        const titleDiv = topHeader.querySelector('div:first-child');
        if (titleDiv) {
            titleDiv.style.display = 'flex';
            titleDiv.style.alignItems = 'center';
            
            const btn = document.createElement('button');
            btn.id = 'mobile-menu-btn';
            btn.innerHTML = '☰';
            btn.style.cssText = 'display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; margin-right: 15px; color: var(--text-main); line-height: 1;';
            titleDiv.insertBefore(btn, titleDiv.firstChild);
            
            const style = document.createElement('style');
            style.innerHTML = `
                @media (max-width: 992px) {
                    #mobile-menu-btn { display: inline-block !important; }
                    .sidebar-overlay.active { display: block !important; }
                }
            `;
            document.head.appendChild(style);

            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999;';
            document.body.appendChild(overlay);

            btn.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.add('mobile-open');
                overlay.classList.add('active');
            });
            
            overlay.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
        }
    }

    // Load and display announcement banner
    loadAnnouncement();
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('SW registration failed: ', err);
        });
    });
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
