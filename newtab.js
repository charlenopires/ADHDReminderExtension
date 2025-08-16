// ADHD Task Manager - New Tab functionality
function initializeNewTabModule() {
  let tasksData = {
    currentProject: '',
    today: [],
    tomorrow: [],
    afterTomorrow: []
  };

  let isProjectVisible = false;

  // Initialize when new tab loads
  function initializeNewTabPage() {
    if (document.readyState === 'loading') {
      document.addEventListener("DOMContentLoaded", initializeNewTabAsync);
    } else {
      initializeNewTabAsync();
    }
  }

  async function initializeNewTabAsync() {
    try {
      await initializeNewTab();
    } catch (error) {
      console.error('Failed to initialize new tab:', error);
      // Fallback initialization
      setupDateLabels();
      setupToggler();
      loadTasksDataFromChromeStorage();
      setupMessageListener();
    }
  }

  // Start initialization
  initializeNewTabPage();

  // Initialize new tab
  async function initializeNewTab() {
    try {
      // Check if taskDB is available
      if (!window.taskDB) {
        throw new Error('TaskDB not available');
      }
      
      // Initialize database
      await window.taskDB.init();
      
      
      // Setup UI and load data
      setupDateLabels();
      await loadTasksData();
      setupToggler();
      setupMessageListener();
      setupDropZones(); // Adicionar esta linha
    } catch (error) {
      console.error('Failed to initialize new tab:', error);
      // Fallback to Chrome storage
      setupDateLabels();
      loadTasksDataFromChromeStorage();
      setupToggler();
      setupMessageListener();
      setupDropZones(); // Adicionar esta linha também no fallback
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

  // Load tasks data from IndexedDB
  async function loadTasksData() {
    try {
      if (!window.taskDB) {
        throw new Error('TaskDB not available');
      }
      
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
    
    if (projectDisplay) {
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
      const timeClass = isOverdue ? 'overdue' : '';
      
      taskElement.className = `task-item ${dayClass}${completedClass}`;
      
      // Adicionar atributos de drag and drop
      taskElement.draggable = true;
      taskElement.setAttribute('data-task-id', task.id);
      taskElement.setAttribute('data-current-day', day);
      
      // Eventos de drag
      taskElement.addEventListener('dragstart', handleDragStart);
      taskElement.addEventListener('dragend', handleDragEnd);
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('data-day', day);
      checkbox.setAttribute('data-task-id', task.id);
      taskElement.appendChild(checkbox);
      
      const timeDiv = document.createElement('div');
      timeDiv.className = `task-time ${timeClass}`;
      timeDiv.textContent = task.time || '--:--';
      timeDiv.setAttribute('contenteditable', 'true');
      timeDiv.setAttribute('data-day', day);
      timeDiv.setAttribute('data-task-id', task.id);
      taskElement.appendChild(timeDiv);
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'task-content';
      const textDiv = document.createElement('div');
      textDiv.className = 'task-text';
      textDiv.textContent = task.text;
      textDiv.setAttribute('contenteditable', 'true');
      textDiv.setAttribute('data-day', day);
      textDiv.setAttribute('data-task-id', task.id);
      contentDiv.appendChild(textDiv);
  
      const deleteButton = document.createElement('i');
      deleteButton.className = 'fas fa-trash-alt task-delete-button';
      deleteButton.setAttribute('data-day', day);
      deleteButton.setAttribute('data-task-id', task.id);
      contentDiv.appendChild(deleteButton);
  
      taskElement.appendChild(contentDiv);
      
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
    
    if (toggler) {
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

    // Event delegation for task checkboxes
    document.addEventListener('change', function(e) {
      if (e.target.classList.contains('task-checkbox')) {
        const day = e.target.getAttribute('data-day');
        const taskId = parseInt(e.target.getAttribute('data-task-id'));
        toggleTaskCompletion(day, taskId);
      }
    });

    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('task-delete-button')) {
        const day = e.target.getAttribute('data-day');
        const taskId = parseInt(e.target.getAttribute('data-task-id'));
        
        // Confirmation before deleting
        if (confirm('Are you sure you want to delete this task?')) {
          deleteTask(day, taskId);
        }
      }
    });

    document.addEventListener('focusout', function(e) {
      if (e.target.classList.contains('task-time') || e.target.classList.contains('task-text')) {
        const day = e.target.getAttribute('data-day');
        const taskId = parseInt(e.target.getAttribute('data-task-id'));
        const taskElement = e.target.closest('.task-item');
        const newTime = taskElement.querySelector('.task-time').textContent;
        const newText = taskElement.querySelector('.task-text').textContent;

        updateTaskContent(day, taskId, newTime, newText);
      }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.target.classList.contains('task-time') || e.target.classList.contains('task-text'))) {
            e.preventDefault();
            e.target.blur();
        }
    });
  }

  // Update task content
  async function updateTaskContent(day, taskId, newTime, newText) {
    try {
      const task = tasksData[day].find(t => t.id === taskId);
      if (task && (task.time !== newTime || task.text !== newText)) {
        task.time = newTime;
        task.text = newText;

        await window.taskDB.updateTask(taskId, { time: newTime, text: newText });

        // Re-sort and re-render
        displayDayTasks(day, day === 'afterTomorrow' ? 'after-tomorrow-tasks' : `${day}-tasks`);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // Reload data to stay in sync if update fails
      await loadTasksData();
    }
  }

  // Delete a task
  async function deleteTask(day, taskId) {
    try {
      // Remove from local data
      tasksData[day] = tasksData[day].filter(t => t.id !== taskId);
      
      // Remove from IndexedDB
      await window.taskDB.deleteTask(taskId);
      
      // Re-render tasks for the day
      displayDayTasks(day, day === 'afterTomorrow' ? 'after-tomorrow-tasks' : `${day}-tasks`);
    } catch (error) {
      console.error('Error deleting task:', error);
      // If deletion fails, reload data to stay in sync
      await loadTasksData();
    }
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

  // Variáveis para drag and drop
  let draggedElement = null;
  let draggedTaskId = null;
  let draggedFromDay = null;

  // Função para lidar com o início do arraste
  function handleDragStart(e) {
    draggedElement = e.target;
    draggedTaskId = e.target.dataset.taskId;
    draggedFromDay = e.target.dataset.day;
    
    e.target.style.opacity = '0.5';
    e.target.classList.add('dragging'); // Adicionar classe visual
    
    // Adicionar classe visual às zonas de drop
    document.querySelectorAll('.day-column').forEach(column => {
      column.classList.add('drag-active');
    });
  }

  // Função para lidar com o fim do arraste
  function handleDragEnd(e) {
    e.target.style.opacity = '1';
    e.target.classList.remove('dragging'); // Remover classe visual
    draggedElement = null;
    draggedTaskId = null;
    draggedFromDay = null;
    
    // Remover classe visual das zonas de drop
    document.querySelectorAll('.day-column').forEach(column => {
      column.classList.remove('drag-active', 'drag-over');
    });
  }

  // Função para lidar com o arraste sobre uma zona válida
  function handleDragOver(e) {
    e.preventDefault();
  }

  // Função para lidar com a entrada em uma zona de drop
  function handleDragEnter(e) {
    e.target.closest('.day-column')?.classList.add('drag-over');
  }

  // Função para lidar com a saída de uma zona de drop
  function handleDragLeave(e) {
    e.target.closest('.day-column')?.classList.remove('drag-over');
  }

  // Função para lidar com o drop
  async function handleDrop(e) {
    e.preventDefault();
    
    const dropZone = e.target.closest('.day-column');
    if (!dropZone || !draggedTaskId) return;
    
    // Determinar o dia de destino baseado na classe da coluna
    let targetDay;
    if (dropZone.classList.contains('today')) {
      targetDay = 'today';
    } else if (dropZone.classList.contains('tomorrow')) {
      targetDay = 'tomorrow';
    } else if (dropZone.classList.contains('after-tomorrow')) {
      targetDay = 'afterTomorrow';
    }
    
    // Se o dia de destino é o mesmo, não fazer nada
    if (targetDay === draggedFromDay) {
      return;
    }
    
    try {
      // Atualizar no IndexedDB
      await window.taskDB.updateTask(parseInt(draggedTaskId), { day: targetDay });
      
      // Atualizar dados locais
      const taskIndex = tasksData[draggedFromDay].findIndex(t => t.id == draggedTaskId);
      if (taskIndex !== -1) {
        const task = tasksData[draggedFromDay].splice(taskIndex, 1)[0];
        task.day = targetDay;
        tasksData[targetDay].push(task);
      }
      
      // Re-renderizar ambos os dias
      const dayContainerMap = {
        'today': 'today-tasks',
        'tomorrow': 'tomorrow-tasks',
        'afterTomorrow': 'after-tomorrow-tasks'
      };
      
      displayDayTasks(draggedFromDay, dayContainerMap[draggedFromDay]);
      displayDayTasks(targetDay, dayContainerMap[targetDay]);
      
      console.log(`Tarefa ${draggedTaskId} movida de ${draggedFromDay} para ${targetDay}`);
      
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      // Recarregar dados em caso de erro
      await loadTasksData();
    }
  }

  // Função para configurar as zonas de drop
  function setupDropZones() {
    const dropZones = document.querySelectorAll('.day-column');
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', handleDragOver);
      zone.addEventListener('dragenter', handleDragEnter);
      zone.addEventListener('dragleave', handleDragLeave);
      zone.addEventListener('drop', handleDrop);
    });
  }
}

// Initialize when DOM is ready
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNewTabModule);
  } else {
    initializeNewTabModule();
  }
})();
