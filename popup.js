// Global tasks state
let tasksData = {
  currentProject: '',
  today: [],
  tomorrow: [],
  afterTomorrow: []
};

// Initialize when popup loads
function initializePopup() {
  initializePopupAsync();
}

async function initializePopupAsync() {
  try {
    await initializeApp();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    // Fallback initialization
    setupDateLabels();
    setupEventListeners();
    loadDataFromChromeStorage();
  }
}

// Start initialization
initializePopup();

// Initialize application
async function initializeApp() {
  try {
    // Check if taskDB is available
    if (!window.taskDB) {
      throw new Error('TaskDB not available');
    }
    
    // Initialize database
    await window.taskDB.init();
    
    // Load data and setup UI
    await loadData();
    setupDateLabels();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Fallback to Chrome storage if IndexedDB fails
    setupDateLabels();
    setupEventListeners();
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
  const todayDateEl = document.getElementById('today-date');
  if (todayDateEl) {
    todayDateEl.textContent = today.toLocaleDateString('en-US', options);
  }
  
  // Tomorrow and day after tomorrow show date as title
  const tomorrowTitleEl = document.getElementById('tomorrow-title');
  const tomorrowDateEl = document.getElementById('tomorrow-date');
  if (tomorrowTitleEl) {
    tomorrowTitleEl.textContent = tomorrow.toLocaleDateString('en-US', options);
  }
  if (tomorrowDateEl) {
    tomorrowDateEl.textContent = tomorrow.toLocaleDateString('en-US', shortOptions);
  }
  
  const afterTomorrowTitleEl = document.getElementById('after-tomorrow-title');
  const afterTomorrowDateEl = document.getElementById('after-tomorrow-date');
  if (afterTomorrowTitleEl) {
    afterTomorrowTitleEl.textContent = afterTomorrow.toLocaleDateString('en-US', options);
  }
  if (afterTomorrowDateEl) {
    afterTomorrowDateEl.textContent = afterTomorrow.toLocaleDateString('en-US', shortOptions);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Enter key to add tasks
  const todayTaskInput = document.getElementById('today-task-input');
  if (todayTaskInput) {
    todayTaskInput.addEventListener('keypress', handleTaskInputKeypress);
  }
  
  const tomorrowTaskInput = document.getElementById('tomorrow-task-input');
  if (tomorrowTaskInput) {
    tomorrowTaskInput.addEventListener('keypress', handleTaskInputKeypress);
  }
  
  const afterTomorrowTaskInput = document.getElementById('after-tomorrow-task-input');
  if (afterTomorrowTaskInput) {
    afterTomorrowTaskInput.addEventListener('keypress', handleTaskInputKeypress);
  }

  // Click events for add buttons
  const todayBtn = document.getElementById('today-add-btn');
  const tomorrowBtn = document.getElementById('tomorrow-add-btn');
  const afterTomorrowBtn = document.getElementById('after-tomorrow-add-btn');
  
  if (todayBtn) {
    todayBtn.addEventListener('click', handleAddTaskClick);
  }
  
  if (tomorrowBtn) {
    tomorrowBtn.addEventListener('click', handleAddTaskClick);
  }
  
  if (afterTomorrowBtn) {
    afterTomorrowBtn.addEventListener('click', handleAddTaskClick);
  }

  // Save data
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveData);
  }
  
  // Auto-save current project on input
  const currentProjectInput = document.getElementById('current-project');
  if (currentProjectInput) {
    currentProjectInput.addEventListener('input', handleProjectInput);
  }

  // Event delegation for task checkboxes and remove buttons
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('change', handleDocumentChange);
}

// Event Handlers
function handleTaskInputKeypress(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const day = e.target.id.split('-')[0];
    addTask(day);
  }
}

function handleAddTaskClick(e) {
  e.preventDefault();
  const day = e.target.id.split('-')[0];
  addTask(day);
}

async function handleProjectInput(e) {
  const projectName = e.target.value;
  try {
    if (window.taskDB) {
      await window.taskDB.saveProject(projectName);
    }
    tasksData.currentProject = projectName;
    // Notify other tabs about project change
    await notifyTabsOfChange();
  } catch (error) {
    console.error('Error saving project:', error);
  }
}

function handleDocumentClick(e) {
  // Handle remove task buttons
  if (e.target.classList.contains('remove-task')) {
    const day = e.target.getAttribute('data-day');
    const taskId = parseInt(e.target.getAttribute('data-task-id'));
    removeTask(day, taskId);
  }
}

function handleDocumentChange(e) {
  // Handle task checkboxes
  if (e.target.classList.contains('task-checkbox')) {
    const day = e.target.getAttribute('data-day');
    const taskId = parseInt(e.target.getAttribute('data-task-id'));
    toggleTask(day, taskId);
  }
}


// Functions are now handled via event delegation, no need for global exposure

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
    if (!window.taskDB) {
      throw new Error('TaskDB not available');
    }
    
    console.log('Loading data from IndexedDB...');
    
    // Load current project
    const currentProject = await window.taskDB.getCurrentProject();
    const projectInput = document.getElementById('current-project');
    if (projectInput) {
      projectInput.value = currentProject || '';
    }
    tasksData.currentProject = currentProject || '';
    
    // Load all tasks
    const allTasks = await window.taskDB.getAllTasks();
    console.log('Loaded tasks from IndexedDB:', allTasks);
    
    // Ensure arrays exist
    tasksData.today = allTasks.today || [];
    tasksData.tomorrow = allTasks.tomorrow || [];
    tasksData.afterTomorrow = allTasks.afterTomorrow || [];
    
    console.log('Final tasksData:', tasksData);
    
    // Render tasks
    renderTasks('today');
    renderTasks('tomorrow');
    renderTasks('afterTomorrow');
  } catch (error) {
    console.error('Error loading data:', error);
    // Initialize empty arrays
    tasksData.today = [];
    tasksData.tomorrow = [];
    tasksData.afterTomorrow = [];
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
  const timeInputId = day === 'afterTomorrow' ? 'after-tomorrow-time-input' : `${day}-time-input`;
  const taskInputId = day === 'afterTomorrow' ? 'after-tomorrow-task-input' : `${day}-task-input`;
  
  const timeInput = document.getElementById(timeInputId);
  const taskInput = document.getElementById(taskInputId);
  
  const time = timeInput.value;
  const taskText = taskInput.value.trim();
  
  if (taskText && time) {
    try {
      console.log('Adding task:', { day, taskText, time });
      
      // Disable button temporarily to prevent double-clicks
      const buttonId = day === 'afterTomorrow' ? 'after-tomorrow-add-btn' : `${day}-add-btn`;
      const addButton = document.getElementById(buttonId);
      if (addButton) {
        addButton.disabled = true;
        addButton.textContent = '...';
      }
      
      // Save to IndexedDB
      const savedTask = await window.taskDB.saveTaskWithTime(day, taskText, time);
      console.log('Task saved to IndexedDB:', savedTask);
      
      // Update local state
      if (!tasksData[day]) {
        tasksData[day] = [];
      }
      tasksData[day].push(savedTask);
      
      // Sort tasks by time
      sortTasksByTime(day);
      
      // Clear inputs for next task
      taskInput.value = '';
      timeInput.value = '';
      
      // Re-render tasks
      renderTasks(day);
      
      // Notify other tabs with fresh data
      await notifyTabsOfChange();
      
      // Focus back on task input for easy multiple additions
      taskInput.focus();
      
      console.log('Task added successfully and tabs notified');
      
      // Re-enable button
      if (addButton) {
        addButton.disabled = false;
        addButton.textContent = '+';
      }
      
    } catch (error) {
      console.error('Error adding task:', error);
      
      // Re-enable button
      const buttonId = day === 'afterTomorrow' ? 'after-tomorrow-add-btn' : `${day}-add-btn`;
      const addButton = document.getElementById(buttonId);
      if (addButton) {
        addButton.disabled = false;
        addButton.textContent = '+';
      }
      
      // Show error to user
      showErrorMessage('Error saving task');
    }
  } else {
    // Show validation message
    if (!taskText) {
      taskInput.style.borderColor = '#ff4757';
      taskInput.focus();
      setTimeout(() => {
        taskInput.style.borderColor = '#333';
      }, 2000);
    }
    if (!time) {
      timeInput.style.borderColor = '#ff4757';
      setTimeout(() => {
        timeInput.style.borderColor = '#333';
      }, 2000);
    }
  }
}

// Show error message
function showErrorMessage(message) {
  const saveBtn = document.getElementById('save-btn');
  const originalText = saveBtn.textContent;
  const originalBackground = saveBtn.style.background;
  
  saveBtn.textContent = message;
  saveBtn.style.background = 'linear-gradient(135deg, #ff4757, #ff3742)';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.background = originalBackground || 'linear-gradient(135deg, #4ecdc4, #44a08d)';
  }, 2000);
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

// Sort tasks by time
function sortTasksByTime(day) {
  if (tasksData[day]) {
    tasksData[day].sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }
}

// Check if task is overdue
function isTaskOverdue(task, day) {
  if (!task.time || task.completed) return false;
  
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let taskDate = new Date(today);
  if (day === 'tomorrow') {
    taskDate.setDate(taskDate.getDate() + 1);
  } else if (day === 'afterTomorrow') {
    taskDate.setDate(taskDate.getDate() + 2);
  }
  
  const [hours, minutes] = task.time.split(':');
  taskDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return now > taskDate && day === 'today';
}

// Toggle task completion
async function toggleTask(day, taskId) {
  try {
    const task = tasksData[day].find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      
      // Update in IndexedDB
      await window.taskDB.updateTask(taskId, { completed: task.completed });
      
      // Re-render
      renderTasks(day);
      
      // Notify other tabs
      notifyTabsOfChange();
    }
  } catch (error) {
    console.error('Error toggling task:', error);
    // Update local state anyway
    const task = tasksData[day].find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      renderTasks(day);
    }
  }
}

// Render tasks
function renderTasks(day) {
  const containerId = day === 'afterTomorrow' ? 'after-tomorrow-tasks' : `${day}-tasks`;
  const container = document.getElementById(containerId);
  
  // Clear container safely
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  if (tasksData[day] && tasksData[day].length > 0) {
    // Sort tasks by time before rendering
    sortTasksByTime(day);
    
    tasksData[day].forEach(task => {
      const taskElement = document.createElement('div');
      const isOverdue = isTaskOverdue(task, day);
      const completedClass = task.completed ? ' completed' : '';
      const overdueClass = isOverdue ? ' task-overdue' : '';
      
      taskElement.className = `task-item${completedClass}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('data-day', day);
      checkbox.setAttribute('data-task-id', task.id);
      taskElement.appendChild(checkbox);
      
      const timeDiv = document.createElement('div');
      timeDiv.className = `task-time${overdueClass}`;
      timeDiv.textContent = task.time || '--:--';
      taskElement.appendChild(timeDiv);
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'task-content';
      const textSpan = document.createElement('span');
      textSpan.className = 'task-text';
      textSpan.textContent = task.text;
      contentDiv.appendChild(textSpan);
      taskElement.appendChild(contentDiv);
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-task';
      removeBtn.setAttribute('data-day', day);
      removeBtn.setAttribute('data-task-id', task.id);
      removeBtn.textContent = '×';
      taskElement.appendChild(removeBtn);
      
      container.appendChild(taskElement);
    });
  }
}

// Save data (mainly for the save button feedback)
async function saveData() {
  try {
    // Save any pending tasks from input fields
    const days = ['today', 'tomorrow', 'afterTomorrow'];
    for (const day of days) {
      const taskInputId = day === 'afterTomorrow' ? 'after-tomorrow-task-input' : `${day}-task-input`;
      const taskInput = document.getElementById(taskInputId);
      const timeInputId = day === 'afterTomorrow' ? 'after-tomorrow-time-input' : `${day}-time-input`;
      const timeInput = document.getElementById(timeInputId);

      if (taskInput && taskInput.value.trim() && timeInput && timeInput.value) {
        await addTask(day);
      }
    }

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
    await notifyTabsOfChange();
    
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
async function notifyTabsOfChange() {
  try {
    // Reload fresh data from IndexedDB before notifying
    const currentProject = await window.taskDB.getCurrentProject();
    const allTasks = await window.taskDB.getAllTasks();
    
    const freshData = {
      currentProject: currentProject,
      ...allTasks
    };
    
    // Update local state
    tasksData = freshData;
    
    // Use Chrome messaging to notify new tab
    chrome.runtime.sendMessage({
      type: 'TASKS_UPDATED',
      data: freshData
    }).catch(() => {
      // Ignore errors if no listeners
    });
    
  } catch (error) {
    console.error('Error notifying tabs of changes:', error);
  }
}