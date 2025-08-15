// IndexedDB Manager for ADHD Task Extension
class TaskDB {
  constructor() {
    this.dbName = 'ADHDTasksDB';
    this.version = 1;
    this.db = null;
  }

  // Initialize database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database failed to open');
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

        // Sort tasks by creation date
        Object.keys(tasksByDay).forEach(day => {
          tasksByDay[day].sort((a, b) => new Date(a.created) - new Date(b.created));
        });

        resolve(tasksByDay);
      };

      request.onerror = () => {
        console.error('Error getting all tasks');
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
window.taskDB = new TaskDB();