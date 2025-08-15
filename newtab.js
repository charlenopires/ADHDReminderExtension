(function () {
  let tasksData = {
    currentProject: '',
    today: [],
    tomorrow: [],
    afterTomorrow: []
  };

  let isProjectVisible = false;

  document.addEventListener("DOMContentLoaded", async function () {
    await initializeNewTab();
  });

  // Initialize new tab
  async function initializeNewTab() {
    try {
      // Initialize database
      await window.taskDB.init();
      
      // Setup UI and load data
      setupDateLabels();
      await loadTasksData();
      setupToggler();
      setupMessageListener();
    } catch (error) {
      console.error('Failed to initialize new tab:', error);
      // Fallback to Chrome storage
      setupDateLabels();
      loadTasksDataFromChromeStorage();
      setupToggler();
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

  // Load tasks data from IndexedDB
  async function loadTasksData() {
    try {
      console.log('New tab loading data from IndexedDB...');
      
      // Load current project
      const currentProject = await window.taskDB.getCurrentProject();
      tasksData.currentProject = currentProject || '';
      
      // Load all tasks
      const allTasks = await window.taskDB.getAllTasks();
      console.log('New tab loaded tasks:', allTasks);
      
      // Ensure arrays exist
      tasksData.today = allTasks.today || [];
      tasksData.tomorrow = allTasks.tomorrow || [];
      tasksData.afterTomorrow = allTasks.afterTomorrow || [];
      
      console.log('New tab final tasksData:', tasksData);
      
      // Display data
      displayCurrentProject();
      displayTasks();
    } catch (error) {
      console.error('Error loading tasks data:', error);
      // Initialize empty arrays
      tasksData.today = [];
      tasksData.tomorrow = [];
      tasksData.afterTomorrow = [];
      // Fallback to Chrome storage
      loadTasksDataFromChromeStorage();
    }
  }

  // Fallback to Chrome storage
  function loadTasksDataFromChromeStorage() {
    chrome.storage.local.get(['tasksData'], function(result) {
      if (result.tasksData) {
        tasksData = result.tasksData;
      }
      
      displayCurrentProject();
      displayTasks();
    });
  }

  // Display current project
  function displayCurrentProject() {
    const projectDisplay = document.getElementById('current-project-display');
    
    if (tasksData.currentProject) {
      if (isProjectVisible) {
        projectDisplay.textContent = tasksData.currentProject;
        projectDisplay.className = '';
      } else {
        projectDisplay.textContent = '●'.repeat(Math.max(tasksData.currentProject.length, 10));
        projectDisplay.className = 'project-hidden';
      }
    } else {
      projectDisplay.textContent = 'No project defined';
      projectDisplay.style.color = '#666';
      projectDisplay.style.fontSize = '1.5rem';
    }
  }

  // Display tasks
  function displayTasks() {
    displayDayTasks('today', 'today-tasks');
    displayDayTasks('tomorrow', 'tomorrow-tasks');
    displayDayTasks('afterTomorrow', 'after-tomorrow-tasks');
  }

  // Sort tasks by time
  function sortTasksByTime(tasks) {
    return tasks.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
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
  async function toggleTaskCompletion(day, taskId) {
    try {
      const task = tasksData[day].find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        
        // Update in IndexedDB
        await window.taskDB.updateTask(taskId, { completed: task.completed });
        
        // Re-render
        displayDayTasks(day, day === 'afterTomorrow' ? 'after-tomorrow-tasks' : `${day}-tasks`);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      // Update local state anyway
      const task = tasksData[day].find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        displayDayTasks(day, day === 'afterTomorrow' ? 'after-tomorrow-tasks' : `${day}-tasks`);
      }
    }
  }

  // Display tasks for a specific day
  function displayDayTasks(day, containerId) {
    const container = document.getElementById(containerId);
    const tasks = tasksData[day] || [];
    
    if (tasks.length === 0) {
      const emptyStateMessages = {
        'today': 'No tasks for today',
        'tomorrow': 'No tasks for this day',
        'afterTomorrow': 'No tasks for this day'
      };
      
      const emptyStateIcons = {
        'today': 'fas fa-calendar-day',
        'tomorrow': 'fas fa-calendar-plus',
        'afterTomorrow': 'fas fa-calendar-week'
      };
      
      container.innerHTML = `
        <div class="empty-state">
          <i class="${emptyStateIcons[day]}"></i>
          <p>${emptyStateMessages[day]}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    
    // Sort tasks by time
    const sortedTasks = sortTasksByTime([...tasks]);
    
    sortedTasks.forEach((task, index) => {
      const taskElement = document.createElement('div');
      const isOverdue = isTaskOverdue(task, day);
      const completedClass = task.completed ? ' completed' : '';
      const dayClass = day === 'afterTomorrow' ? 'after-tomorrow' : day;
      
      taskElement.className = `task-item ${dayClass}${completedClass}`;
      
      const timeDisplay = task.time || '--:--';
      const timeClass = isOverdue ? 'overdue' : '';
      
      taskElement.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
               onchange="toggleTaskCompletion('${day}', ${task.id})">
        <div class="task-time ${timeClass}">${timeDisplay}</div>
        <div class="task-content">
          <div class="task-text">${task.text}</div>
        </div>
      `;
      
      // Add animation with delay
      setTimeout(() => {
        taskElement.classList.add('fade-in');
      }, index * 100);
      
      container.appendChild(taskElement);
    });
  }

  // Make toggleTaskCompletion globally available
  window.toggleTaskCompletion = toggleTaskCompletion;

  // Setup toggler to show/hide project
  function setupToggler() {
    const toggler = document.getElementById('toggler');
    
    toggler.addEventListener('click', function() {
      isProjectVisible = !isProjectVisible;
      
      if (isProjectVisible) {
        toggler.className = 'fas fa-eye-slash';
      } else {
        toggler.className = 'far fa-eye';
      }
      
      displayCurrentProject();
    });
  }

  // Setup message listener for real-time updates
  function setupMessageListener() {
    // Listen for messages from popup and background
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      console.log('New tab received message:', message);
      
      if (message.type === 'TASKS_UPDATED') {
        console.log('Updating tasks with new data:', message.data);
        
        // Update tasks data
        tasksData = {
          currentProject: message.data.currentProject || '',
          today: message.data.today || [],
          tomorrow: message.data.tomorrow || [],
          afterTomorrow: message.data.afterTomorrow || []
        };
        
        // Update display
        displayCurrentProject();
        displayTasks();
        
        sendResponse({ success: true });
      }
      
      return true; // Keep message channel open for async response
    });
  }

  // Refresh data periodically to stay in sync
  setInterval(async function() {
    try {
      await loadTasksData();
    } catch (error) {
      // Silently fail and try again next time
    }
  }, 30000); // Refresh every 30 seconds

  // Listen for storage changes (fallback)
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.tasksData) {
      tasksData = changes.tasksData.newValue || {
        currentProject: '',
        today: [],
        tomorrow: [],
        afterTomorrow: []
      };
      
      displayCurrentProject();
      displayTasks();
    }
  });

  // Check for overdue tasks and move them
  async function checkAndMoveOverdueTasks() {
    try {
      await window.taskDB.moveOverdueTasks();
      await loadTasksData(); // Refresh data after moving tasks
    } catch (error) {
      console.error('Error checking overdue tasks:', error);
    }
  }

  // Check for end of day and move incomplete tasks
  function checkEndOfDay() {
    const now = new Date();
    const hours = now.getHours();
    
    // If it's past midnight (00:00 to 02:00), move incomplete tasks
    if (hours >= 0 && hours < 2) {
      const lastCheck = localStorage.getItem('lastEndOfDayCheck');
      const today = now.toDateString();
      
      if (lastCheck !== today) {
        moveIncompleteTasksToNextDay();
        localStorage.setItem('lastEndOfDayCheck', today);
      }
    }
  }

  // Move incomplete tasks to next day
  async function moveIncompleteTasksToNextDay() {
    try {
      await window.taskDB.moveIncompleteTasksToNextDay();
      await loadTasksData(); // Refresh data after moving tasks
      console.log('Moved incomplete tasks to next day');
    } catch (error) {
      console.error('Error moving incomplete tasks:', error);
    }
  }

  // Handle visibility change to refresh data when tab becomes active
  document.addEventListener('visibilitychange', async function() {
    if (!document.hidden) {
      try {
        await loadTasksData();
        await checkAndMoveOverdueTasks();
        checkEndOfDay();
      } catch (error) {
        // Silently fail
      }
    }
  });

  // Check overdue tasks every 15 minutes
  setInterval(checkAndMoveOverdueTasks, 15 * 60 * 1000);

  // Check end of day every hour
  setInterval(checkEndOfDay, 60 * 60 * 1000);

  // Initial check
  setTimeout(() => {
    checkAndMoveOverdueTasks();
    checkEndOfDay();
  }, 5000);
})();
