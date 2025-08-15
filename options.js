// Options page functionality for ADHD Task Manager

let settings = {
  autoSave: true,
  projectPrivacy: false,
  notifications: false,
  theme: 'dark'
};

// Initialize options page
document.addEventListener('DOMContentLoaded', async function() {
  await loadSettings();
  setupEventListeners();
});

// Load current settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    if (result.settings) {
      settings = { ...settings, ...result.settings };
    }
    updateUI();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Update UI with current settings
function updateUI() {
  const autoSaveToggle = document.getElementById('auto-save-toggle');
  const projectPrivacyToggle = document.getElementById('project-privacy-toggle');
  const notificationsToggle = document.getElementById('notifications-toggle');

  autoSaveToggle.classList.toggle('active', settings.autoSave);
  projectPrivacyToggle.classList.toggle('active', settings.projectPrivacy);
  notificationsToggle.classList.toggle('active', settings.notifications);
}

// Setup event listeners
function setupEventListeners() {
  // Toggle switches
  document.getElementById('auto-save-toggle').addEventListener('click', () => {
    settings.autoSave = !settings.autoSave;
    saveSettings();
  });

  document.getElementById('project-privacy-toggle').addEventListener('click', () => {
    settings.projectPrivacy = !settings.projectPrivacy;
    saveSettings();
  });

  document.getElementById('notifications-toggle').addEventListener('click', async () => {
    if (!settings.notifications) {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        settings.notifications = true;
        saveSettings();
      } else {
        showStatus('Notification permission denied', 'error');
        return;
      }
    } else {
      settings.notifications = false;
      saveSettings();
    }
  });

  // Action buttons
  document.getElementById('cleanup-btn').addEventListener('click', cleanupOldTasks);
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', importData);
}

// Save settings
async function saveSettings() {
  try {
    await chrome.storage.local.set({ settings: settings });
    updateUI();
    showStatus('Settings saved successfully!', 'success');
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: settings
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// Cleanup old tasks
async function cleanupOldTasks() {
  const button = document.getElementById('cleanup-btn');
  const originalText = button.textContent;
  
  button.textContent = 'Cleaning...';
  button.disabled = true;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CLEANUP_OLD_TASKS'
    });
    
    if (response.success) {
      showStatus('Old tasks cleaned up successfully!', 'success');
    } else {
      showStatus('Error cleaning up tasks', 'error');
    }
  } catch (error) {
    console.error('Error cleaning up tasks:', error);
    showStatus('Error cleaning up tasks', 'error');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Export data
async function exportData() {
  try {
    // Get all data from storage
    const result = await chrome.storage.local.get(null);
    
    // Create export object
    const exportData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      data: result
    };
    
    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adhd-tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('Data exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showStatus('Error exporting data', 'error');
  }
}

// Import data
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data
      if (!importData.version || !importData.data) {
        throw new Error('Invalid backup file format');
      }
      
      // Confirm import
      if (!confirm('This will replace all your current data. Are you sure?')) {
        return;
      }
      
      // Clear existing data and import new data
      await chrome.storage.local.clear();
      await chrome.storage.local.set(importData.data);
      
      // Reload settings
      await loadSettings();
      
      showStatus('Data imported successfully!', 'success');
      
      // Notify other parts of the extension
      chrome.runtime.sendMessage({
        type: 'DATA_IMPORTED'
      });
      
    } catch (error) {
      console.error('Error importing data:', error);
      showStatus('Error importing data: ' + error.message, 'error');
    }
  });
  
  input.click();
}

// Show status message
function showStatus(message, type = 'success') {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.className = `status-message ${type} show`;
  
  setTimeout(() => {
    statusElement.classList.remove('show');
  }, 3000);
}

// Handle keyboard shortcuts display for Mac
if (navigator.platform.includes('Mac')) {
  document.querySelectorAll('.shortcut-key').forEach(key => {
    key.textContent = key.textContent.replace('Ctrl', 'Cmd');
  });
}