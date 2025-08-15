// Global tasks state
let tasksData = {
  currentProject: '',
  today: [],
  tomorrow: [],
  afterTomorrow: []
};

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', function() {
  loadData();
  setupDateLabels();
  setupEventListeners();
});

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
  
  // Auto-save current project
  document.getElementById('current-project').addEventListener('input', function() {
    tasksData.currentProject = this.value;
  });
}

// Load saved data
function loadData() {
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
function addTask(day) {
  const inputId = day === 'afterTomorrow' ? 'after-tomorrow-task-input' : `${day}-task-input`;
  const input = document.getElementById(inputId);
  const taskText = input.value.trim();
  
  if (taskText) {
    tasksData[day].push({
      id: Date.now(),
      text: taskText,
      completed: false
    });
    
    input.value = '';
    renderTasks(day);
  }
}

// Remove task
function removeTask(day, taskId) {
  tasksData[day] = tasksData[day].filter(task => task.id !== taskId);
  renderTasks(day);
}

// Render tasks
function renderTasks(day) {
  const containerId = day === 'afterTomorrow' ? 'after-tomorrow-tasks' : `${day}-tasks`;
  const container = document.getElementById(containerId);
  
  container.innerHTML = '';
  
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

// Save data
function saveData() {
  // Update current project
  tasksData.currentProject = document.getElementById('current-project').value;
  
  // Save to storage
  chrome.storage.local.set({tasksData: tasksData}, function() {
    console.log('Data saved successfully');
    
    // Visual feedback
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