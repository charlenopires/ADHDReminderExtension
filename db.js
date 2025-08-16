// IndexedDB Manager for ADHD Task Extension
class TaskDB {
  constructor() {
    this.dbName = 'ADHDTasksDB';
    this.version = 1;
    this.db = null;
  }

  // Initialize database
  async init() {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      throw new Error('IndexedDB not supported');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (e) => {
        this.db = e.target.result;

        // Create tasks store
        if (!this.db.objectStoreNames.contains('tasks')) {
          const tasksStore = this.db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
          tasksStore.createIndex('day', 'day', { unique: false });
          tasksStore.createIndex('created', 'created', { unique: false });
        }

        // Create projects store
        if (!this.db.objectStoreNames.contains('projects')) {
          const projectsStore = this.db.createObjectStore('projects', { keyPath: 'id' });
          projectsStore.createIndex('name', 'name', { unique: false });
        }

        console.log('Database setup complete');
      };
    });
  }

  // Save current project
  async saveProject(projectName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      
      const project = {
        id: 'current',
        name: projectName,
        updated: new Date().toISOString()
      };

      const request = store.put(project);

      request.onsuccess = () => {
        console.log('Project saved successfully');
        resolve(project);
      };

      request.onerror = () => {
        console.error('Error saving project');
        reject(request.error);
      };
    });
  }

  // Get current project
  async getCurrentProject() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get('current');

      request.onsuccess = () => {
        resolve(request.result ? request.result.name : '');
      };

      request.onerror = () => {
        console.error('Error getting project');
        reject(request.error);
      };
    });
  }

  // Save task
  async saveTask(day, text) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      
      const task = {
        day: day,
        text: text,
        completed: false,
        created: new Date().toISOString()
      };

      const request = store.add(task);

      request.onsuccess = () => {
        task.id = request.result;
        console.log('Task saved successfully');
        resolve(task);
      };

      request.onerror = () => {
        console.error('Error saving task');
        reject(request.error);
      };
    });
  }

  // Save task with time
  async saveTaskWithTime(day, text, time) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      
      const task = {
        day: day,
        text: text,
        time: time,
        completed: false,
        created: new Date().toISOString()
      };

      console.log('Saving task to IndexedDB:', task);

      const request = store.add(task);

      request.onsuccess = () => {
        task.id = request.result;
        console.log('Task with time saved successfully, ID:', task.id);
        resolve(task);
      };

      request.onerror = () => {
        console.error('Error saving task with time:', request.error);
        reject(request.error);
      };
    });
  }

  // Get tasks for a specific day
  async getTasksForDay(day) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const index = store.index('day');
      const request = index.getAll(day);

      request.onsuccess = () => {
        const tasks = request.result.sort((a, b) => new Date(a.created) - new Date(b.created));
        resolve(tasks);
      };

      request.onerror = () => {
        console.error('Error getting tasks');
        reject(request.error);
      };
    });
  }

  // Get all tasks
  async getAllTasks() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const request = store.getAll();

      request.onsuccess = () => {
        const tasks = request.result;
        console.log('Retrieved all tasks from IndexedDB:', tasks);
        
        const tasksByDay = {
          today: [],
          tomorrow: [],
          afterTomorrow: []
        };

        tasks.forEach(task => {
          if (tasksByDay[task.day]) {
            tasksByDay[task.day].push(task);
          }
        });

        // Sort tasks by time, then by creation date
        Object.keys(tasksByDay).forEach(day => {
          tasksByDay[day].sort((a, b) => {
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            const timeComparison = timeA.localeCompare(timeB);
            if (timeComparison !== 0) return timeComparison;
            return new Date(a.created) - new Date(b.created);
          });
        });

        console.log('Organized tasks by day:', tasksByDay);
        resolve(tasksByDay);
      };

      request.onerror = () => {
        console.error('Error getting all tasks:', request.error);
        reject(request.error);
      };
    });
  }

  // Delete task
  async deleteTask(taskId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const request = store.delete(taskId);

      request.onsuccess = () => {
        console.log('Task deleted successfully');
        resolve(taskId);
      };

      request.onerror = () => {
        console.error('Error deleting task');
        reject(request.error);
      };
    });
  }

  // Update task
  async updateTask(taskId, updates) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      
      // First get the existing task
      const getRequest = store.get(taskId);
      
      getRequest.onsuccess = () => {
        const task = getRequest.result;
        if (task) {
          // Update the task with new data
          Object.assign(task, updates);
          task.updated = new Date().toISOString();
          
          // Put the updated task back
          const putRequest = store.put(task);
          
          putRequest.onsuccess = () => {
            console.log('Task updated successfully');
            resolve(task);
          };
          
          putRequest.onerror = () => {
            console.error('Error updating task');
            reject(putRequest.error);
          };
        } else {
          reject(new Error('Task not found'));
        }
      };

      getRequest.onerror = () => {
        console.error('Error getting task for update');
        reject(getRequest.error);
      };
    });
  }

  // Move overdue tasks to next day
  async moveOverdueTasks() {
    if (!this.db) await this.init();

    return new Promise(async (resolve, reject) => {
      try {
        const todayTasks = await this.getTasksForDay('today');
        const now = new Date();
        const movedTasks = [];

        console.log(`[${now.toLocaleTimeString()}] Checking for overdue tasks... Found ${todayTasks.length} tasks for today.`);

        for (const task of todayTasks) {
          if (!task.completed && task.time) {
            const [hours, minutes] = task.time.split(':');
            const taskTime = new Date();
            taskTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // If task time has passed and it's not completed, move to tomorrow
            if (now > taskTime) {
              console.log(`Task "${task.text}" at ${task.time} is overdue. Moving to tomorrow.`);
              await this.updateTask(task.id, { day: 'tomorrow' });
              movedTasks.push(task);
            }
          }
        }

        if (movedTasks.length > 0) {
            console.log(`Moved ${movedTasks.length} overdue tasks to tomorrow`);
        }
        resolve(movedTasks);
      } catch (error) {
        console.error('Error moving overdue tasks:', error);
        reject(error);
      }
    });
  }

  // Move all incomplete tasks to next day (end of day cleanup)
  async moveIncompleteTasksToNextDay() {
    if (!this.db) await this.init();
  
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Starting daily task rollover...');
        
        // Get all tasks for all days
        const todayTasks = await this.getTasksForDay('today');
        const tomorrowTasks = await this.getTasksForDay('tomorrow');
        const afterTomorrowTasks = await this.getTasksForDay('afterTomorrow');
        
        const movedTasks = [];
        const deletedTasks = [];
  
        // 1. Delete completed tasks from today (they're done, no need to keep)
        for (const task of todayTasks) {
          if (task.completed) {
            await this.deleteTask(task.id);
            deletedTasks.push({ task, reason: 'completed_today' });
          }
        }
  
        // 2. Move incomplete tasks from today to tomorrow (they become overdue)
        for (const task of todayTasks) {
          if (!task.completed) {
            await this.updateTask(task.id, { day: 'tomorrow' });
            movedTasks.push({ from: 'today', to: 'tomorrow', task, reason: 'incomplete_rollover' });
          }
        }
  
        // 3. Move all tasks from tomorrow to today (tomorrow becomes today)
        for (const task of tomorrowTasks) {
          await this.updateTask(task.id, { day: 'today' });
          movedTasks.push({ from: 'tomorrow', to: 'today', task, reason: 'daily_advance' });
        }
  
        // 4. Move all tasks from afterTomorrow to tomorrow (day after tomorrow becomes tomorrow)
        for (const task of afterTomorrowTasks) {
          await this.updateTask(task.id, { day: 'tomorrow' });
          movedTasks.push({ from: 'afterTomorrow', to: 'tomorrow', task, reason: 'daily_advance' });
        }
  
        console.log(`Daily rollover complete:`);
        console.log(`- Deleted ${deletedTasks.length} completed tasks`);
        console.log(`- Moved ${movedTasks.length} tasks between days`);
        
        resolve({ movedTasks, deletedTasks });
      } catch (error) {
        console.error('Error in daily task rollover:', error);
        reject(error);
      }
    });
  }

  // Clear old tasks (optional cleanup method)
  async clearOldTasks(daysOld = 30) {
    if (!this.db) await this.init();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const index = store.index('created');
      const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deletedCount} old tasks`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('Error cleaning up old tasks');
        reject(request.error);
      };
    });
  }
}

// Create global instance
try {
  window.taskDB = new TaskDB();
  console.log('TaskDB instance created successfully');
} catch (error) {
  console.error('Failed to create TaskDB instance:', error);
  window.taskDB = null;
}