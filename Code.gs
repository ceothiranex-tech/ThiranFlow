// Google Apps Script Backend for TeamFlow
// Deploy this as a Web App: Publish -> Deploy as Web App -> Execute as "Me", Access "Anyone"

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doPost(e) {
  return processRequest(e);
}

function processRequest(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result = { success: false, message: "Unknown action" };
    
    switch(action) {
      case 'login':
        result = handleLogin(data.email, data.password);
        break;
      case 'get_users':
        result = getUsers();
        break;
      case 'add_user':
        result = addUser(data.user);
        break;
      case 'update_user':
        result = updateUser(data.user);
        break;
      case 'delete_user':
        result = deleteUser(data.employeeId);
        break;
      case 'get_tasks':
        result = getTasks(data.employeeId, data.role);
        break;
      case 'create_task':
        result = createTask(data.task);
        break;
      case 'update_task':
        result = updateTask(data.task);
        break;
      case 'delete_task':
        result = deleteTask(data.taskId);
        break;
      case 'submit_linkedin':
        result = submitLinkedIn(data.postData);
        break;
      case 'approve_linkedin':
        result = approveLinkedIn(data.employeeId, data.date, data.status);
        break;
      case 'get_linkedin':
        result = getLinkedIn();
        break;
      case 'get_dashboard_summary':
        result = getDashboardSummary(data.employeeId, data.role);
        break;
      case 'get_announcement':
        result = getAnnouncement();
        break;
      case 'update_announcement':
        result = updateAnnouncement(data.message);
        break;
      default:
        result = { success: false, message: "Invalid action." };
    }
    
    logActivity(data.employeeId || 'System', action, JSON.stringify(data).substring(0, 200));
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

function doGet(e) {
  if (e.parameter && e.parameter.data) {
    e.postData = { contents: e.parameter.data };
    return processRequest(e);
  }
  
  if (!getSheet('Users')) {
    initializeSystem();
    return createJsonResponse({ success: true, message: "System Initialized! Tabs and headers have been auto-populated." });
  }
  
  return createJsonResponse({ success: true, message: "ThiranFlow by Thirenex API is running." });
}

function initializeSystem() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const requiredSheets = {
    'Users': ['EmployeeID', 'Name', 'Email', 'Password', 'Department', 'Designation', 'Role', 'Status', 'JoiningDate'],
    'Tasks': ['TaskID', 'Title', 'Description', 'AssignedTo', 'Priority', 'Deadline', 'Status', 'CreatedDate', 'WorkLink', 'CompletionNote', 'Rating', 'Feedback'],
    'LinkedIn': ['EmployeeID', 'EmployeeName', 'Email', 'Date', 'SubmittedTime', 'PostURL', 'Note', 'ApprovalStatus'],
    'Settings': ['Key', 'Value'],
    'ActivityLogs': ['Timestamp', 'User', 'Action', 'Description']
  };

  for (const [sheetName, headers] of Object.entries(requiredSheets)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Sheet Helpers ---
function getSheet(sheetName) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
}

function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      // Fix for Google Sheets converting strings into Date objects
      if (val instanceof Date) {
        if (header.includes('Time') || header.includes('Created') || header.includes('Timestamp')) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
        } else {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
        }
      }
      obj[header] = val;
    });
    return obj;
  });
}

function writeRow(sheetName, dataObj, headers) {
  const sheet = getSheet(sheetName);
  const row = headers.map(h => dataObj[h] || '');
  sheet.appendRow(row);
}

// --- Handlers ---

function handleLogin(email, password) {
  const users = getSheetData('Users');
  const user = users.find(u => 
    String(u.Email).trim().toLowerCase() === String(email).trim().toLowerCase() && 
    String(u.Password) === String(password)
  );
  if (user) {
    if (user.Status === 'Inactive') {
      return { success: false, message: "Account is deactivated." };
    }
    const { Password, ...safeUser } = user;
    return { success: true, user: safeUser };
  }
  return { success: false, message: "Invalid email or password." };
}

function getUsers() {
  const users = getSheetData('Users');
  return { success: true, data: users.map(({Password, ...u}) => u) }; // hide passwords
}

function addUser(user) {
  const sheet = getSheet('Users');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  writeRow('Users', user, headers);
  return { success: true, message: "User added successfully" };
}

function updateUser(userUpdate) {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('EmployeeID')] == userUpdate.EmployeeID) {
      headers.forEach((h, colIdx) => {
        if (userUpdate[h] !== undefined) {
          sheet.getRange(i + 1, colIdx + 1).setValue(userUpdate[h]);
        }
      });
      return { success: true, message: "User updated" };
    }
  }
  return { success: false, message: "User not found" };
}

function deleteUser(employeeId) {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == employeeId) { // Assuming EmployeeID is first col
      sheet.deleteRow(i + 1);
      return { success: true, message: "User deleted" };
    }
  }
  return { success: false, message: "User not found" };
}

// --- Email Helpers ---
function getUserEmail(employeeId) {
  const users = getSheetData('Users');
  const user = users.find(u => u.EmployeeID == employeeId);
  return user ? user.Email : null;
}

function sendEmailNotification(toEmail, subject, body) {
  if (!toEmail) return;
  try {
    MailApp.sendEmail({
      to: toEmail,
      subject: subject,
      htmlBody: body
    });
  } catch (e) {
    console.error('Email failed:', e);
  }
}

function getTasks(employeeId, role) {
  const tasks = getSheetData('Tasks');
  if (role === 'Admin' || role === 'Manager') {
    return { success: true, data: tasks };
  } else {
    const userTasks = tasks.filter(t => t.AssignedTo === employeeId);
    return { success: true, data: userTasks };
  }
}

function createTask(task) {
  task.TaskID = 'TSK-' + new Date().getTime();
  task.CreatedDate = new Date().toISOString();
  task.Status = 'Pending';
  
  const sheet = getSheet('Tasks');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  writeRow('Tasks', task, headers);
  
  if (task.AssignedTo) {
    const email = getUserEmail(task.AssignedTo);
    if (email) {
      sendEmailNotification(
        email, 
        `New Task Assigned: ${task.Title}`, 
        `You have been assigned a new task (<b>${task.TaskID}</b>) on ThiranFlow by Thirenex.<br><br><b>Title:</b> ${task.Title}<br><b>Priority:</b> ${task.Priority}<br><b>Deadline:</b> ${task.Deadline}<br><br>Please login to your dashboard to view details.`
      );
    }
  }
  
  return { success: true, message: "Task created" };
}

function updateTask(taskUpdate) {
  const sheet = getSheet('Tasks');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('TaskID')] == taskUpdate.TaskID) {
      let oldAssignedTo = data[i][headers.indexOf('AssignedTo')];
      
      headers.forEach((h, colIdx) => {
        if (taskUpdate[h] !== undefined) {
          sheet.getRange(i + 1, colIdx + 1).setValue(taskUpdate[h]);
        }
      });
      
      if (taskUpdate.AssignedTo && taskUpdate.AssignedTo !== oldAssignedTo) {
         const email = getUserEmail(taskUpdate.AssignedTo);
         if (email) {
            sendEmailNotification(
              email, 
              `Task Assigned: ${taskUpdate.TaskID}`, 
              `You have been assigned a task on ThiranFlow by Thirenex.<br><br><b>Task:</b> ${taskUpdate.TaskID}<br>Please login to your dashboard to view details.`
            );
         }
      }
      
      if (taskUpdate.Rating) {
         const assignee = taskUpdate.AssignedTo || oldAssignedTo;
         const email = getUserEmail(assignee);
         if (email) {
            sendEmailNotification(
              email, 
              `Task Reviewed: ${taskUpdate.TaskID}`, 
              `Your task <b>${taskUpdate.TaskID}</b> has been reviewed.<br><br><b>Rating:</b> ${taskUpdate.Rating}/5<br><b>Feedback:</b> ${taskUpdate.Feedback || 'No feedback'}<br><br>Please login to view details.`
            );
         }
      }
      
      return { success: true, message: "Task updated" };
    }
  }
  return { success: false, message: "Task not found" };
}

function deleteTask(taskId) {
  const sheet = getSheet('Tasks');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == taskId) { 
      sheet.deleteRow(i + 1);
      return { success: true, message: "Task deleted" };
    }
  }
  return { success: false, message: "Task not found" };
}

function submitLinkedIn(postData) {
  postData.SubmittedTime = new Date().toISOString();
  // Get date in script timezone (usually matches sheet timezone)
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  postData.Date = today;
  postData.ApprovalStatus = 'Pending';
  
  const sheet = getSheet('LinkedIn');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    let rowDate = data[i][headers.indexOf('Date')];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    if (data[i][headers.indexOf('EmployeeID')] == postData.EmployeeID && rowDate == today) {
      if (data[i][headers.indexOf('ApprovalStatus')] === 'Rejected') {
        // Overwrite the rejected row
        headers.forEach((h, colIdx) => {
          if (postData[h] !== undefined) {
            sheet.getRange(i + 1, colIdx + 1).setValue(postData[h]);
          }
        });
        return { success: true, message: "LinkedIn post resubmitted!" };
      }
      return { success: false, message: "Already submitted today." };
    }
  }
  
  writeRow('LinkedIn', postData, headers);
  return { success: true, message: "LinkedIn post submitted!" };
}

function approveLinkedIn(employeeId, date, status) {
  const sheet = getSheet('LinkedIn');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusIdx = headers.indexOf('ApprovalStatus');
  
  for (let i = 1; i < data.length; i++) {
    let rowDate = data[i][headers.indexOf('Date')];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    if (data[i][headers.indexOf('EmployeeID')] == employeeId && rowDate == date) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(status);
      
      const email = getUserEmail(employeeId);
      if (email && status === 'Rejected') {
         sendEmailNotification(
           email, 
           `LinkedIn Task Rejected`, 
           `Your Daily LinkedIn post for ${date} was rejected. Please login and resubmit your correct post link.`
         );
      }
      return { success: true, message: `Post marked as ${status}` };
    }
  }
  return { success: false, message: "Submission not found" };
}

function getLinkedIn() {
  return { success: true, data: getSheetData('LinkedIn') };
}

function getDashboardSummary(employeeId, role) {
  const tasks = getSheetData('Tasks');
  const users = getSheetData('Users');
  const linkedin = getSheetData('LinkedIn');
  
  let summary = {};
  
  if (role === 'Admin' || role === 'Manager') {
    summary.totalMembers = users.length;
    summary.activeMembers = users.filter(u => u.Status === 'Active').length;
    summary.totalTasks = tasks.length;
    summary.pendingTasks = tasks.filter(t => t.Status === 'Pending').length;
    summary.inProgressTasks = tasks.filter(t => t.Status === 'In Progress').length;
    summary.completedTasks = tasks.filter(t => t.Status === 'Completed').length;
    
    // Calculate today's LinkedIn submissions (ignore Rejected)
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    const todaySubmissions = linkedin.filter(l => l.Date === today && l.ApprovalStatus !== 'Rejected');
    summary.todayLinkedIn = todaySubmissions.length;
    
    // Provide actual data for the bar chart
    const activeMembersList = users.filter(u => u.Status === 'Active' && u.Role !== 'Admin' && u.Role !== 'Manager');
    summary.overallLinkedInCompletion = Math.round((summary.todayLinkedIn / (activeMembersList.length || 1)) * 100) || 0;
    
    summary.linkedinChartData = activeMembersList.map(u => {
        const submitted = todaySubmissions.find(l => l.EmployeeID === u.EmployeeID);
        return {
            name: u.Name.split(' ')[0], // First name
            completed: submitted ? 100 : 0
        };
    });
    
  } else {
    const myTasks = tasks.filter(t => t.AssignedTo === employeeId);
    summary.myTasks = myTasks.length;
    summary.pendingTasks = myTasks.filter(t => t.Status === 'Pending').length;
    summary.inProgressTasks = myTasks.filter(t => t.Status === 'In Progress').length;
    summary.completedTasks = myTasks.filter(t => t.Status === 'Completed').length;
    
    // Average rating
    const ratedTasks = myTasks.filter(t => t.Rating);
    const sumRatings = ratedTasks.reduce((acc, curr) => acc + Number(curr.Rating), 0);
    summary.averageRating = ratedTasks.length ? (sumRatings / ratedTasks.length).toFixed(1) : 'N/A';
  }
  
  // Get recent activity
  const logs = getSheetData('ActivityLogs');
  if (logs && logs.length > 0) {
    logs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    summary.recentActivity = logs.slice(0, 5);
  } else {
    summary.recentActivity = [];
  }
  
  return { success: true, data: summary };
}

function logActivity(user, action, desc) {
  const sheet = getSheet('ActivityLogs');
  if(sheet) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      writeRow('ActivityLogs', {
        Timestamp: new Date().toISOString(),
        User: user,
        Action: action,
        Description: desc
      }, headers);
  }
}

function getAnnouncement() {
  const settingsData = getSheetData('Settings');
  const ann = settingsData.find(s => s.Key === 'Announcement');
  return { success: true, data: ann ? ann.Value : '' };
}

function updateAnnouncement(message) {
  const sheet = getSheet('Settings');
  if (!sheet) return { success: false, message: 'Settings sheet not found.' };
  
  const data = sheet.getDataRange().getValues();
  let found = false;
  // Row 1 is header
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'Announcement') {
      sheet.getRange(i + 1, 2).setValue(message);
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow(['Announcement', message]);
  }
  
  return { success: true, message: 'Announcement updated successfully.' };
}
