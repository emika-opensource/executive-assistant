/**
 * Executive Assistant Mission Control Skill
 * Provides task management and activity logging capabilities
 */

const fs = require('fs-extra');
const path = require('path');

// Configuration
const DATA_DIR = '/home/node/emika/mission-control';
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const API_BASE = 'http://localhost:3000/api';

class MissionControlSkill {
  constructor() {
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.ensureDir(DATA_DIR);
      
      if (!(await fs.pathExists(TASKS_FILE))) {
        await fs.writeJson(TASKS_FILE, []);
      }
      
      if (!(await fs.pathExists(ACTIVITIES_FILE))) {
        await fs.writeJson(ACTIVITIES_FILE, []);
      }
    } catch (error) {
      console.error('Error ensuring data directory:', error);
    }
  }

  // ====================
  // CORE API METHODS
  // ====================

  async api(method, endpoint, data = null) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : null
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      
      // Fallback to direct file access
      if (endpoint.includes('/tasks')) {
        return await this.fileSystemFallback(method, endpoint, data);
      }
      
      throw error;
    }
  }

  async fileSystemFallback(method, endpoint, data) {
    try {
      if (endpoint === '/tasks') {
        if (method === 'GET') {
          return await this.loadTasks();
        } else if (method === 'POST') {
          const tasks = await this.loadTasks();
          const newTask = { ...data, id: this.generateId() };
          tasks.push(newTask);
          await this.saveTasks(tasks);
          return newTask;
        }
      }
    } catch (error) {
      console.error('File system fallback failed:', error);
      throw error;
    }
  }

  // ====================
  // FILE SYSTEM OPERATIONS
  // ====================

  async loadTasks() {
    try {
      if (await fs.pathExists(TASKS_FILE)) {
        return await fs.readJson(TASKS_FILE);
      }
      return [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  async saveTasks(tasks) {
    try {
      await fs.writeJson(TASKS_FILE, tasks, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving tasks:', error);
      return false;
    }
  }

  async loadActivities() {
    try {
      if (await fs.pathExists(ACTIVITIES_FILE)) {
        return await fs.readJson(ACTIVITIES_FILE);
      }
      return [];
    } catch (error) {
      console.error('Error loading activities:', error);
      return [];
    }
  }

  async saveActivities(activities) {
    try {
      await fs.writeJson(ACTIVITIES_FILE, activities, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving activities:', error);
      return false;
    }
  }

  // ====================
  // TASK MANAGEMENT
  // ====================

  async createTask(taskData) {
    const task = {
      id: this.generateId(),
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      status: taskData.status || 'backlog',
      assignee: taskData.assignee || 'AI Employee',
      dueDate: taskData.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: []
    };

    try {
      const result = await this.api('POST', '/tasks', task);
      await this.logActivity('created', `Created task: ${task.title}`);
      return result;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      const tasks = await this.loadTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const oldTask = { ...tasks[taskIndex] };
      const updatedTask = {
        ...oldTask,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const result = await this.api('PUT', '/tasks', updatedTask);
      
      // Log status changes
      if (oldTask.status !== updatedTask.status) {
        await this.logActivity('moved', 
          `Moved task "${updatedTask.title}" from ${oldTask.status} to ${updatedTask.status}`);
      } else {
        await this.logActivity('updated', `Updated task: ${updatedTask.title}`);
      }

      return result;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async moveTask(taskId, newStatus) {
    return await this.updateTask(taskId, { status: newStatus });
  }

  async completeTask(taskId, notes = '') {
    const result = await this.updateTask(taskId, { status: 'done' });
    
    if (notes) {
      await this.addTaskComment(taskId, `Task completed: ${notes}`);
    }
    
    return result;
  }

  async deleteTask(taskId) {
    try {
      const tasks = await this.loadTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      await this.api('DELETE', `/tasks/${taskId}`);
      await this.logActivity('deleted', `Deleted task: ${task.title}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async addTaskComment(taskId, comment, author = 'AI Employee') {
    try {
      const tasks = await this.loadTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const commentObj = {
        id: this.generateId(),
        content: comment,
        author: author,
        createdAt: new Date().toISOString()
      };

      task.comments = task.comments || [];
      task.comments.push(commentObj);
      task.updatedAt = new Date().toISOString();

      const result = await this.api('PUT', '/tasks', task);
      await this.logActivity('commented', 
        `Added comment to "${task.title}": ${comment}`);
      
      return result;
    } catch (error) {
      console.error('Error adding task comment:', error);
      throw error;
    }
  }

  // ====================
  // ACTIVITY LOGGING
  // ====================

  async logActivity(type, content, author = 'AI Employee') {
    const activity = {
      type: type,
      content: content,
      author: author
    };

    try {
      return await this.api('POST', '/activities', activity);
    } catch (error) {
      // Fallback to direct file write
      try {
        const activities = await this.loadActivities();
        const newActivity = {
          id: this.generateId(),
          ...activity,
          createdAt: new Date().toISOString()
        };
        
        activities.unshift(newActivity);
        
        // Keep only last 100 activities
        if (activities.length > 100) {
          activities.splice(100);
        }
        
        await this.saveActivities(activities);
        return newActivity;
      } catch (fallbackError) {
        console.error('Activity logging failed completely:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // ====================
  // QUERY METHODS
  // ====================

  async getTasks(filter = {}) {
    const tasks = await this.loadTasks();
    
    return tasks.filter(task => {
      if (filter.status && task.status !== filter.status) return false;
      if (filter.priority && task.priority !== filter.priority) return false;
      if (filter.assignee && task.assignee !== filter.assignee) return false;
      return true;
    });
  }

  async getTask(taskId) {
    const tasks = await this.loadTasks();
    return tasks.find(t => t.id === taskId);
  }

  async getOverdueTasks() {
    const tasks = await this.loadTasks();
    const now = new Date();
    
    return tasks.filter(task => {
      if (task.status === 'done' || !task.dueDate) return false;
      return new Date(task.dueDate) < now;
    });
  }

  async getUrgentTasks() {
    const tasks = await this.loadTasks();
    return tasks.filter(task => 
      task.priority === 'urgent' && task.status !== 'done'
    );
  }

  async getTasksByStatus(status) {
    return await this.getTasks({ status });
  }

  async getMyTasks(assignee = 'AI Employee') {
    return await this.getTasks({ assignee });
  }

  // ====================
  // STATISTICS & REPORTING
  // ====================

  async getStatistics() {
    try {
      return await this.api('GET', '/stats');
    } catch (error) {
      // Fallback to manual calculation
      const tasks = await this.loadTasks();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      return {
        total: tasks.length,
        byStatus: {
          backlog: tasks.filter(t => t.status === 'backlog').length,
          'in-progress': tasks.filter(t => t.status === 'in-progress').length,
          review: tasks.filter(t => t.status === 'review').length,
          done: tasks.filter(t => t.status === 'done').length
        },
        byPriority: {
          low: tasks.filter(t => t.priority === 'low').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          high: tasks.filter(t => t.priority === 'high').length,
          urgent: tasks.filter(t => t.priority === 'urgent').length
        },
        completedToday: tasks.filter(t => 
          t.status === 'done' && 
          new Date(t.updatedAt) >= todayStart
        ).length,
        overdue: tasks.filter(t => {
          if (t.status === 'done' || !t.dueDate) return false;
          return new Date(t.dueDate) < now;
        }).length
      };
    }
  }

  async generateDailySummary() {
    const stats = await this.getStatistics();
    const overdue = await this.getOverdueTasks();
    const urgent = await this.getUrgentTasks();
    const inProgress = await this.getTasksByStatus('in-progress');
    
    let summary = `📊 Daily Summary:\n`;
    summary += `• Total Tasks: ${stats.total}\n`;
    summary += `• Completed Today: ${stats.completedToday}\n`;
    summary += `• In Progress: ${stats.byStatus['in-progress']}\n`;
    summary += `• Pending Review: ${stats.byStatus.review}\n`;
    
    if (overdue.length > 0) {
      summary += `• ⚠️ Overdue: ${overdue.length}\n`;
    }
    
    if (urgent.length > 0) {
      summary += `• 🔥 Urgent: ${urgent.length}\n`;
    }
    
    if (inProgress.length > 0) {
      summary += `\n🔄 Currently working on:\n`;
      inProgress.slice(0, 3).forEach(task => {
        summary += `• ${task.title}\n`;
      });
    }
    
    return summary;
  }

  async generateWeeklyReport() {
    const tasks = await this.loadTasks();
    const weekStart = this.getWeekStart();
    const weekTasks = tasks.filter(task => 
      new Date(task.createdAt) >= weekStart
    );
    
    const completed = weekTasks.filter(t => t.status === 'done');
    
    let report = `📈 Weekly Report (${weekStart.toDateString()}):\n\n`;
    report += `• Tasks Created: ${weekTasks.length}\n`;
    report += `• Tasks Completed: ${completed.length}\n`;
    report += `• Completion Rate: ${weekTasks.length ? Math.round((completed.length / weekTasks.length) * 100) : 0}%\n\n`;
    
    if (completed.length > 0) {
      report += `🎉 Completed This Week:\n`;
      completed.forEach(task => {
        report += `• ${task.title}\n`;
      });
    }
    
    return report;
  }

  // ====================
  // SCHEDULED OPERATIONS
  // ====================

  async morningCheckIn() {
    const overdue = await this.getOverdueTasks();
    const urgent = await this.getUrgentTasks();
    const inProgress = await this.getTasksByStatus('in-progress');
    
    let message = "🌅 Good morning! Here's your mission status:\n\n";
    
    if (overdue.length > 0) {
      message += `⚠️ ${overdue.length} overdue tasks need immediate attention:\n`;
      overdue.forEach(task => {
        message += `• ${task.title} (due: ${new Date(task.dueDate).toLocaleDateString()})\n`;
      });
      message += '\n';
    }
    
    if (urgent.length > 0) {
      message += `🔥 ${urgent.length} urgent tasks in queue:\n`;
      urgent.forEach(task => {
        message += `• ${task.title}\n`;
      });
      message += '\n';
    }
    
    if (inProgress.length > 0) {
      message += `🔄 ${inProgress.length} tasks in progress:\n`;
      inProgress.forEach(task => {
        message += `• ${task.title}\n`;
      });
    } else {
      message += "✨ Ready to start new tasks!";
    }
    
    await this.logActivity('checkin', message);
    return message;
  }

  async eveningWrapUp() {
    const summary = await this.generateDailySummary();
    await this.logActivity('wrapup', `🌅 End of day summary:\n${summary}`);
    return summary;
  }

  async weeklyReview() {
    const report = await this.generateWeeklyReport();
    await this.logActivity('report', `📊 Weekly Review:\n${report}`);
    
    // Create planning task for next week
    await this.createTask({
      title: 'Weekly planning session',
      description: 'Review last week performance and plan upcoming priorities',
      priority: 'high',
      dueDate: this.getNextMonday().toISOString()
    });
    
    return report;
  }

  // ====================
  // UTILITY METHODS
  // ====================

  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const difference = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + difference);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  getNextMonday() {
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7);
    nextMonday.setHours(9, 0, 0, 0);
    return nextMonday;
  }

  async healthCheck() {
    try {
      const health = await this.api('GET', '/health');
      return { status: 'healthy', api: health };
    } catch (error) {
      return { 
        status: 'degraded', 
        error: error.message,
        filesAccessible: {
          tasks: await fs.pathExists(TASKS_FILE),
          activities: await fs.pathExists(ACTIVITIES_FILE)
        }
      };
    }
  }
}

// Export singleton instance
module.exports = new MissionControlSkill();