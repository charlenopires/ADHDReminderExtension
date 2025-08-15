// Global tasks state
let tasksData = {
  currentProject: '',
  today: [],
  tomorrow: [],
  afterTomorrow: []
};

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', async function() {
  await initializeApp();
});

// Initialize application
async function initializeApp() {
  try {
    // Initialize database
    await window.taskDB.init();
    
    // Load data and setup UI
    await loadData();
    setupDateLabels();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Fallback to Chrome storage if IndexedDB fails
    loadDataFromChromeStorage();
  }
}

// Setup date labels
function setupDateLabels() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const afterTomorrow = new Date(today);
  afterTomorrow.setDate(afterTomorrow.getDate() + 2);

  const options = { weekday: 'long', day: 'numeric', month: 'short' };
  const shortOptions = { day: 'numeric', month: 'short' };
  
  // Today keeps full format
  document.getElementById('today-date').textContent = today.toLocaleDateString('en-US', options);
  
  // Tomorrow and day after tomorrow show date as title
  document.getElementById('tomorrow-title').textContent = tomorrow.toLocaleDateString('en-US', options);
  document.getElementById('tomorrow-date').textContent = tomorrow.toLocaleDateString('en-US', shortOptions);
  
  document.getElementById('after-tomorrow-title').textContent = afterTomorrow.toLocaleDateString('en-US', options);
  document.getElementById('after-tomorrow-date').textContent = afterTomorrow.toLocaleDateString('en-US', shortOptions);
}

// Setup event listeners
function setupEventListeners() {
  // Enter key to add tasks
  document.getElementById('today-task-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask('today');
  });
  
  document.getElementById('tomorrow-task-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask('tomorrow');
  });
  
  document.getElementById('after-tomorrow-task-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask('afterTomorrow');
  });

  // Save data
  document.getElementById('save-btn').addEventListener('click', saveData);
  
  // Auto-save current project on input
  document.getElementById('current-project').addEventListener('input', debounce(async function() {
    const projectName = this.value;
    try {
      await window.taskDB.saveProject(projectName);
      tasksData.currentProject = projectName;
      // Notify other tabs about project change
      notifyTabsOfChange();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  }, 500));
}

// Debounce function to limit API calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Load saved data from IndexedDB
async function loadData() {
  try {
    // Load current project
    const currentProject = await window.taskDB.getCurrentProject();
    document.getElementById('current-project').value = currentProject;
    tasksData.currentProject = currentProject;
    
    // Load all tasks
    const allTasks = await window.taskDB.getAllTasks();
    tasksData = { ...tasksData, ...allTasks };
    
    // Render tasks
    renderTasks('today');
    renderTasks('tomorrow');
    renderTasks('afterTomorrow');
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to Chrome storage
    loadDataFromChromeStorage();
  }
}

// Fallback to Chrome storage
function loadDataFromChromeStorage() {
  chrome.storage.local.get(['tasksData'], function(result) {
    if (result.tasksData) {
      tasksData = result.tasksData;
      
      // Load current project
      document.getElementById('current-project').value = tasksData.currentProject || '';
      
      // Load tasks
      renderTasks('today');
      renderTasks('tomorrow');
      renderTasks('afterTomorrow');
    }
  });
}

// Add task
async function addTask(day) {
  const inputId = day === 'afterTomorrow' ? 'after-tomorrow-task-input' : `${day}-task-input`;
  const input = document.getElementById(inputId);
  const taskText = input.value.trim();
  
  if (taskText) {
    try {
      // Save to IndexedDB
      const newTask = await window.taskDB.saveTask(day, taskText);
      
      // Update local state
      tasksData[day].push(newTask);
      
      // Clear input and re-render
      input.value = '';
      renderTasks(day);
      
      // Notify other tabs
      notifyTabsOfChange();
    } catch (error) {
      console.error('Error adding task:', error);
      // Fallback to local state only
      const fallbackTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        created: new Date().toISOString()
      };
      tasksData[day].push(fallbackTask);
      input.value = '';
      renderTasks(day);
    }
  }
}

// Remove task
async function removeTask(day, taskId) {
  try {
    // Remove from IndexedDB
    await window.taskDB.deleteTask(taskId);
    
    // Update local state
    tasksData[day] = tasksData[day].filter(task => task.id !== taskId);
    
    // Re-render
    renderTasks(day);
    
    // Notify other tabs
    notifyTabsOfChange();
  } catch (error) {
    console.error('Error removing task:', error);
    // Fallback to local state only
    tasksData[day] = tasksData[day].filter(task => task.id !== taskId);
    renderTasks(day);
  }
}

// Render tasks
function renderTasks(day) {
  const containerId = day === 'afterTomorrow' ? 'after-tomorrow-tasks' : `${day}-tasks`;
  const container = document.getElementById(containerId);
  
  container.innerHTML = '';
  
  if (tasksData[day] && tasksData[day].length > 0) {
    tasksData[day].forEach(task => {
      const taskElement = document.createElement('div');
      taskElement.className = 'task-item';
      taskElement.innerHTML = `
        <span>${task.text}</span>
        <button class="remove-task" onclick="removeTask('${day}', ${task.id})">×</button>
      `;
      container.appendChild(taskElement);
    });
  }
}

// Save data (mainly for the save button feedback)
async function saveData() {
  try {
    // Save current project
    const projectName = document.getElementById('current-project').value;
    await window.taskDB.saveProject(projectName);
    tasksData.currentProject = projectName;
    
    console.log('Data saved successfully');
    
    // Visual feedback
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    saveBtn.style.background = 'linear-gradient(135deg, #2ed573, #1e90ff)';
    
    // Notify other tabs
    notifyTabsOfChange();
    
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.background = 'linear-gradient(135deg, #4ecdc4, #44a08d)';
      window.close();
    }, 1000);
  } catch (error) {
    console.error('Error saving data:', error);
    
    // Fallback to Chrome storage
    chrome.storage.local.set({tasksData: tasksData}, function() {
      console.log('Data saved to Chrome storage as fallback');
      
      const saveBtn = document.getElementById('save-btn');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saved!';
      saveBtn.style.background = 'linear-gradient(135deg, #2ed573, #1e90ff)';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = 'linear-gradient(135deg, #4ecdc4, #44a08d)';
        window.close();
      }, 1000);
    });
  }
}

// Notify other tabs of changes
function notifyTabsOfChange() {
  // Use Chrome messaging to notify new tab
  chrome.runtime.sendMessage({
    type: 'TASKS_UPDATED',
    data: tasksData
  }).catch(() => {
    // Ignore errors if no listeners
  });
}