// Central API configuration and fetching logic
// The user MUST replace this URL with their deployed Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxSPseCzuByENuiMzQ0VnEoejuz3IOcwaItb6ZlzD4akJLDyAOag6N0SRfSIgGbNgw/exec';

/**
 * Make a POST request to the Google Apps Script backend.
 * @param {Object} data - The payload containing the action and required data.
 * @returns {Promise<Object>} - The JSON response from the server.
 */
async function fetchAPI(data) {
    if (API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
        throw new Error('API URL is not set. Please update API_URL in js/api.js');
    }
    
    try {
        // Use GET instead of POST to avoid CORS preflight/redirect blocking in browser
        const url = new URL(API_URL);
        url.searchParams.append('data', JSON.stringify(data));
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            cache: 'no-store'
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}

// Toast Notification System
function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '30px';
        toastContainer.style.right = '30px';
        toastContainer.style.zIndex = '9999';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '10px';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.padding = '16px 24px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#ffffff';
    toast.style.fontWeight = '500';
    toast.style.fontSize = '0.95rem';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    // Set custom modern colors
    if (type === 'error') {
        toast.style.backgroundColor = '#E53E3E'; // Red
        toast.style.borderLeft = '5px solid #9B2C2C';
    } else if (type === 'warning') {
        toast.style.backgroundColor = '#DD6B20'; // Orange
        toast.style.borderLeft = '5px solid #9C4221';
    } else {
        toast.style.backgroundColor = '#319795'; // Teal/Green
        toast.style.borderLeft = '5px solid #234E52';
    }
    
    toast.innerText = message;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Theme Toggle System
function initThemeToggle() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    document.addEventListener('DOMContentLoaded', () => {
        const headerRight = document.querySelector('.header-right');
        if (headerRight) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn btn-secondary';
            toggleBtn.style.padding = '8px 12px';
            toggleBtn.style.marginRight = '10px';
            toggleBtn.style.borderRadius = '50%';
            toggleBtn.style.display = 'flex';
            toggleBtn.style.alignItems = 'center';
            toggleBtn.style.justifyContent = 'center';
            toggleBtn.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
            toggleBtn.title = 'Toggle Dark Mode';
            
            toggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                toggleBtn.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
                
                // If Chart.js is loaded, we might need to refresh it for colors (optional)
            });
            
            // Insert before the logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                headerRight.insertBefore(toggleBtn, logoutBtn);
            } else {
                headerRight.appendChild(toggleBtn);
            }
        }
    });
}
initThemeToggle();
