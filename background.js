// Background Service Worker for ADHD Task Manager
// Handles extension lifecycle, commands, and cross-tab communication

// Extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('ADHD Task Manager installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First time installation
    console.log('Welcome to ADHD Task Manager!');
    
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
    
    // Open welcome page (optional)
    // chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    console.log('ADHD Task Manager updated to version:', chrome.runtime.getManifest().version);
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  switch (command) {
    case 'open-popup':
      // Open the popup programmatically
      chrome.action.openPopup().catch(() => {
        console.log('Could not open popup - user interaction required');
      });
      break;
      
    case 'toggle-project-visibility':
      // Toggle project visibility in all new tab pages
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.url && tab.url.startsWith('chrome://newtab/')) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'TOGGLE_PROJECT_VISIBILITY'
            }).catch(() => {
              // Ignore errors for tabs that don't have the content script
            });
          }
        });
      });
      break;
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'TASKS_UPDATED':
      // Broadcast task updates to all tabs
      console.log('Broadcasting task updates to all tabs');
      broadcastToAllTabs(message);
      sendResponse({ success: true });
      break;
      
    case 'GET_SETTINGS':
      // Return current settings
      chrome.storage.local.get(['settings'], (result) => {
        sendResponse(result.settings || {});
      });
      return true; // Keep message channel open for async response
      
    case 'UPDATE_SETTINGS':
      // Update settings
      chrome.storage.local.set({ 'settings': message.settings }, () => {
        sendResponse({ success: true });
        // Broadcast settings update to all tabs
        broadcastToAllTabs({
          type: 'SETTINGS_UPDATED',
          settings: message.settings
        });
      });
      return true;
      
    case 'CLEANUP_OLD_TASKS':
      // Trigger cleanup of old tasks
      cleanupOldTasks().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

// Broadcast message to all tabs
function broadcastToAllTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    console.log(`Broadcasting to ${tabs.length} tabs`);
    tabs.forEach(tab => {
      // Focus on new tab pages
      if (tab.url && (tab.url.includes('chrome://newtab/') || tab.url.includes('newtab.html'))) {
        console.log('Sending message to new tab:', tab.id);
        chrome.tabs.sendMessage(tab.id, message).catch((error) => {
          console.log('Error sending message to tab:', tab.id, error);
        });
      }
    });
  });
}

// Cleanup old tasks periodically
async function cleanupOldTasks() {
  try {
    // This would typically interact with IndexedDB through a content script
    // For now, we'll just log the cleanup attempt
    console.log('Cleaning up old tasks...');
    
    // Send cleanup message to active tabs
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'CLEANUP_OLD_TASKS',
          daysOld: 30
        });
      } catch (error) {
        // Ignore errors
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

// Set up periodic cleanup (once per day)
chrome.alarms.create('cleanup-old-tasks', {
  delayInMinutes: 1440, // 24 hours
  periodInMinutes: 1440
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup-old-tasks') {
    console.log('Running scheduled cleanup...');
    cleanupOldTasks().catch(console.error);
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('ADHD Task Manager started');
});

// Handle tab updates to refresh new tab pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url === 'chrome://newtab/') {
    // New tab page loaded, send refresh message
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        type: 'REFRESH_DATA'
      }).catch(() => {
        // Ignore errors
      });
    }, 100);
  }
});

// Context menu items (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-task-today',
    title: 'Add task for today',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'add-task-tomorrow',
    title: 'Add task for tomorrow',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-task-today' || info.menuItemId === 'add-task-tomorrow') {
    const day = info.menuItemId === 'add-task-today' ? 'today' : 'tomorrow';
    const taskText = info.selectionText || 'New task';
    
    // Send message to add task
    chrome.tabs.sendMessage(tab.id, {
      type: 'ADD_TASK_FROM_CONTEXT',
      day: day,
      text: taskText
    }).catch(() => {
      // If no listener, try to open popup
      chrome.action.openPopup().catch(console.error);
    });
  }
});

// Error handling
chrome.runtime.onSuspend.addListener(() => {
  console.log('ADHD Task Manager suspended');
});

// Keep service worker alive
let keepAliveInterval;

function keepAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This keeps the service worker active
    });
  }, 20000); // Every 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Start keep alive when extension starts
keepAlive();

// Clean up on suspend
chrome.runtime.onSuspend.addListener(() => {
  stopKeepAlive();
});