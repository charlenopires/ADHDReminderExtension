// Background Service Worker for ADHD Task Manager
console.log('ADHD Task Manager background script loaded');

// Extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('ADHD Task Manager installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      'settings': {
        'theme': 'dark',
        'autoSave': true,
        'notifications': false,
        'projectVisibility': false,
        'version': '2.0.0'
      }
    });
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  if (command === 'open-popup') {
    chrome.action.openPopup().catch(() => {
      console.log('Could not open popup - user interaction required');
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'TASKS_UPDATED') {
    // Broadcast task updates to all tabs
    broadcastToAllTabs(message);
    sendResponse({ success: true });
  }
  
  return true;
});

// Broadcast message to all tabs
function broadcastToAllTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && tab.url.includes('newtab.html')) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore errors
        });
      }
    });
  });
}

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('ADHD Task Manager started');
});