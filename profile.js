// profile.js

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    currentUser = requireAuth();
    if (!currentUser) return;
    
    populateHeader(currentUser);
    populateProfileForm(currentUser);
    
    document.getElementById('profile-form').addEventListener('submit', handleProfileSave);
});

function populateProfileForm(user) {
    document.getElementById('prof-name').value = user.Name || '';
    document.getElementById('prof-email').value = user.Email || '';
    document.getElementById('prof-empid').value = user.EmployeeID || '';
    document.getElementById('prof-role').value = user.Role || '';
    document.getElementById('prof-dept').value = user.Department || '';
    document.getElementById('prof-desig').value = user.Designation || '';
    
    // Set Avatar Initials
    const initials = user.Name ? user.Name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    document.getElementById('profile-avatar').innerText = initials;
}

async function handleProfileSave(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true;
    btn.innerText = 'Saving Changes...';
    
    // We send an update_user request
    // The endpoint expects a 'user' object and 'employeeId' for logging
    const updatedData = {
        EmployeeID: currentUser.EmployeeID,
        Name: document.getElementById('prof-name').value.trim(),
        Email: document.getElementById('prof-email').value.trim()
    };
    
    const pwd = document.getElementById('prof-password').value;
    if (pwd) {
        updatedData.Password = pwd;
    }
    
    try {
        const res = await fetchAPI({
            action: 'update_user',
            user: updatedData,
            employeeId: currentUser.EmployeeID
        });
        
        if (res.success) {
            showToast('Profile updated successfully! 🎉');
            
            // Update local storage so the changes reflect immediately
            currentUser.Name = updatedData.Name;
            currentUser.Email = updatedData.Email;
            if (updatedData.Password) {
                currentUser.Password = updatedData.Password;
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update UI
            populateHeader(currentUser);
            populateProfileForm(currentUser);
            
            // Clear password field
            document.getElementById('prof-password').value = '';
            
        } else {
            showToast(res.message || 'Failed to update profile', 'error');
        }
    } catch (err) {
        showToast('An error occurred while saving', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save Changes';
    }
}
