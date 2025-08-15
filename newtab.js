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
      // Load current project
      const currentProject = await window.taskDB.getCurrentProject();
      tasksData.currentProject = currentProject;
      
      // Load all tasks
      const allTasks = await window.taskDB.getAllTasks();
      tasksData = { ...tasksData, ...allTasks };
      
      // Display data
      displayCurrentProject();
      displayTasks();
    } catch (error) {
      console.error('Error loading tasks data:', error);
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
    
    tasks.forEach((task, index) => {
      const taskElement = document.createElement('div');
      taskElement.className = `task-item ${day === 'afterTomorrow' ? 'after-tomorrow' : day}`;
      taskElement.innerHTML = `
        <div class="task-text">${task.text}</div>
      `;
      
      // Add animation with delay
      setTimeout(() => {
        taskElement.classList.add('fade-in');
      }, index * 100);
      
      container.appendChild(taskElement);
    });
  }

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
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      if (message.type === 'TASKS_UPDATED') {
        tasksData = message.data;
        displayCurrentProject();
        displayTasks();
      }
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

  // Handle visibility change to refresh data when tab becomes active
  document.addEventListener('visibilitychange', async function() {
    if (!document.hidden) {
      try {
        await loadTasksData();
      } catch (error) {
        // Silently fail
      }
    }
  });
})();
