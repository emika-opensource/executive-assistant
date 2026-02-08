// Global state
let tasks = [];
let activities = [];
let currentFilter = '';
let currentSearch = '';

// DOM Elements
const elements = {
    newTaskBtn: document.getElementById('new-task-btn'),
    taskModal: document.getElementById('task-modal'),
    taskForm: document.getElementById('task-form'),
    modalClose: document.getElementById('modal-close'),
    cancelTask: document.getElementById('cancel-task'),
    deleteTask: document.getElementById('delete-task'),
    saveTask: document.getElementById('save-task'),
    themeToggle: document.getElementById('theme-toggle'),
    priorityFilter: document.getElementById('priority-filter'),
    searchInput: document.getElementById('search-input'),
    addComment: document.getElementById('add-comment'),
    newComment: document.getElementById('new-comment'),
    
    // Stats
    totalTasks: document.getElementById('total-tasks'),
    completedToday: document.getElementById('completed-today'),
    inProgress: document.getElementById('in-progress'),
    overdue: document.getElementById('overdue'),
    
    // Columns
    backlogCount: document.getElementById('backlog-count'),
    inProgressCount: document.getElementById('in-progress-count'),
    reviewCount: document.getElementById('review-count'),
    doneCount: document.getElementById('done-count'),
    
    // Activity
    activityBadge: document.getElementById('activity-badge'),
    activityList: document.getElementById('activity-list')
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupKeyboardShortcuts();
    loadData();
});

function initializeApp() {
    // Set default theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Initialize drag and drop
    setupDragAndDrop();
}

function setupEventListeners() {
    // Modal controls
    elements.newTaskBtn.addEventListener('click', openNewTaskModal);
    elements.modalClose.addEventListener('click', closeModal);
    elements.cancelTask.addEventListener('click', closeModal);
    elements.saveTask.addEventListener('click', saveTask);
    elements.deleteTask.addEventListener('click', deleteTask);
    elements.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask();
    });
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Filters
    elements.priorityFilter.addEventListener('change', applyFilters);
    elements.searchInput.addEventListener('input', applyFilters);
    
    // Comments
    elements.addComment.addEventListener('click', addComment);
    elements.newComment.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            addComment();
        }
    });
    
    // Close modal on backdrop click
    elements.taskModal.addEventListener('click', (e) => {
        if (e.target === elements.taskModal) closeModal();
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // New task: N
        if (e.key === 'n' || e.key === 'N') {
            if (!isModalOpen() && !isInputFocused()) {
                e.preventDefault();
                openNewTaskModal();
            }
        }
        
        // Search: /
        if (e.key === '/') {
            if (!isModalOpen() && !isInputFocused()) {
                e.preventDefault();
                elements.searchInput.focus();
            }
        }
        
        // Escape: close modal
        if (e.key === 'Escape') {
            if (isModalOpen()) {
                closeModal();
            }
        }
    });
}

function isModalOpen() {
    return elements.taskModal.classList.contains('show');
}

function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement.tagName === 'INPUT' || 
           activeElement.tagName === 'TEXTAREA' || 
           activeElement.tagName === 'SELECT';
}

// Task Management
function openNewTaskModal() {
    resetTaskForm();
    elements.taskModal.classList.add('show');
    document.getElementById('modal-title').textContent = 'New Task';
    document.getElementById('task-title').focus();
    elements.deleteTask.style.display = 'none';
    document.getElementById('comments-section').style.display = 'none';
}

function openEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    populateTaskForm(task);
    elements.taskModal.classList.add('show');
    document.getElementById('modal-title').textContent = 'Edit Task';
    elements.deleteTask.style.display = 'block';
    document.getElementById('comments-section').style.display = 'block';
    loadTaskComments(taskId);
}

function resetTaskForm() {
    elements.taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-status').value = 'backlog';
    document.getElementById('comments-list').innerHTML = '';
    elements.newComment.value = '';
}

function populateTaskForm(task) {
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-assignee').value = task.assignee || '';
    
    if (task.dueDate) {
        const date = new Date(task.dueDate);
        document.getElementById('task-due-date').value = formatDateForInput(date);
    }
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function closeModal() {
    elements.taskModal.classList.remove('show');
}

async function saveTask() {
    const taskId = document.getElementById('task-id').value;
    const isNewTask = !taskId;
    
    const taskData = {
        id: taskId || generateId(),
        title: document.getElementById('task-title').value.trim(),
        description: document.getElementById('task-description').value.trim(),
        priority: document.getElementById('task-priority').value,
        status: document.getElementById('task-status').value,
        assignee: document.getElementById('task-assignee').value.trim(),
        dueDate: document.getElementById('task-due-date').value || null,
        createdAt: isNewTask ? new Date().toISOString() : tasks.find(t => t.id === taskId)?.createdAt,
        updatedAt: new Date().toISOString(),
        comments: isNewTask ? [] : tasks.find(t => t.id === taskId)?.comments || []
    };
    
    if (!taskData.title) {
        alert('Task title is required');
        return;
    }
    
    try {
        const response = await fetch('/api/tasks', {
            method: isNewTask ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            const savedTask = await response.json();
            
            if (isNewTask) {
                tasks.push(savedTask);
                addActivity('created', `Created task: ${savedTask.title}`, 'System');
            } else {
                const index = tasks.findIndex(t => t.id === taskId);
                if (index !== -1) {
                    const oldStatus = tasks[index].status;
                    tasks[index] = savedTask;
                    
                    if (oldStatus !== savedTask.status) {
                        addActivity('updated', `Moved task "${savedTask.title}" to ${savedTask.status}`, 'System');
                    } else {
                        addActivity('updated', `Updated task: ${savedTask.title}`, 'System');
                    }
                }
            }
            
            closeModal();
            renderTasks();
            updateStats();
            
        } else {
            console.error('Error saving task:', response.statusText);
            alert('Error saving task. Please try again.');
        }
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Error saving task. Please try again.');
    }
}

async function deleteTask() {
    const taskId = document.getElementById('task-id').value;
    if (!taskId) return;
    
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const deletedTask = tasks[taskIndex];
                tasks.splice(taskIndex, 1);
                addActivity('deleted', `Deleted task: ${deletedTask.title}`, 'System');
            }
            
            closeModal();
            renderTasks();
            updateStats();
            
        } else {
            console.error('Error deleting task:', response.statusText);
            alert('Error deleting task. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Error deleting task. Please try again.');
    }
}

function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Drag and Drop
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.column-content');
    
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.currentTarget.getAttribute('data-status');
    
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        
        try {
            const response = await fetch('/api/tasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            
            if (response.ok) {
                addActivity('moved', `Moved task "${task.title}" from ${oldStatus} to ${newStatus}`, 'System');
                renderTasks();
                updateStats();
            } else {
                // Revert on error
                task.status = oldStatus;
                renderTasks();
                alert('Error updating task status. Please try again.');
            }
        } catch (error) {
            // Revert on error
            task.status = oldStatus;
            renderTasks();
            console.error('Error updating task:', error);
            alert('Error updating task status. Please try again.');
        }
    }
}

// Rendering
function renderTasks() {
    const columns = {
        'backlog': document.querySelector('[data-status="backlog"]'),
        'in-progress': document.querySelector('[data-status="in-progress"]'),
        'review': document.querySelector('[data-status="review"]'),
        'done': document.querySelector('[data-status="done"]')
    };
    
    // Clear columns
    Object.values(columns).forEach(column => {
        column.innerHTML = '';
    });
    
    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        const matchesPriority = !currentFilter || task.priority === currentFilter;
        const matchesSearch = !currentSearch || 
            task.title.toLowerCase().includes(currentSearch.toLowerCase()) ||
            task.description?.toLowerCase().includes(currentSearch.toLowerCase());
        
        return matchesPriority && matchesSearch;
    });
    
    // Render tasks
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        const column = columns[task.status];
        if (column) {
            column.appendChild(taskElement);
        }
    });
    
    updateColumnCounts();
}

function createTaskElement(task) {
    const taskEl = document.createElement('div');
    taskEl.className = 'task-card';
    taskEl.draggable = true;
    taskEl.dataset.taskId = task.id;
    
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';
    const dueDateText = dueDate ? formatRelativeDate(dueDate) : '';
    
    taskEl.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
            <span class="priority-badge ${task.priority}">${task.priority}</span>
            ${dueDateText ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">${dueDateText}</span>` : ''}
            ${task.assignee ? `<span class="task-assignee">${escapeHtml(task.assignee)}</span>` : ''}
            ${task.comments?.length ? `<span class="task-comments">💬 ${task.comments.length}</span>` : ''}
        </div>
    `;
    
    // Event listeners
    taskEl.addEventListener('click', () => openEditTaskModal(task.id));
    taskEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        taskEl.classList.add('dragging');
    });
    taskEl.addEventListener('dragend', () => {
        taskEl.classList.remove('dragging');
    });
    
    return taskEl;
}

function updateColumnCounts() {
    const counts = {
        'backlog': tasks.filter(t => t.status === 'backlog').length,
        'in-progress': tasks.filter(t => t.status === 'in-progress').length,
        'review': tasks.filter(t => t.status === 'review').length,
        'done': tasks.filter(t => t.status === 'done').length
    };
    
    elements.backlogCount.textContent = counts.backlog;
    elements.inProgressCount.textContent = counts['in-progress'];
    elements.reviewCount.textContent = counts.review;
    elements.doneCount.textContent = counts.done;
}

function updateStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const totalTasks = tasks.length;
    const completedToday = tasks.filter(t => 
        t.status === 'done' && 
        new Date(t.updatedAt) >= todayStart
    ).length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const overdue = tasks.filter(t => {
        if (t.status === 'done' || !t.dueDate) return false;
        return new Date(t.dueDate) < now;
    }).length;
    
    elements.totalTasks.textContent = totalTasks;
    elements.completedToday.textContent = completedToday;
    elements.inProgress.textContent = inProgress;
    elements.overdue.textContent = overdue;
}

// Comments
function loadTaskComments(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '';
    
    if (task?.comments) {
        task.comments.forEach(comment => {
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
    }
}

function createCommentElement(comment) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment-item';
    commentEl.innerHTML = `
        <div class="comment-author">${escapeHtml(comment.author)}</div>
        <div class="comment-content">${escapeHtml(comment.content)}</div>
        <div class="comment-time">${formatRelativeDate(new Date(comment.createdAt))}</div>
    `;
    return commentEl;
}

async function addComment() {
    const taskId = document.getElementById('task-id').value;
    const content = elements.newComment.value.trim();
    
    if (!taskId || !content) return;
    
    const comment = {
        id: generateId(),
        content: content,
        author: 'User', // This would be dynamic based on current user
        createdAt: new Date().toISOString()
    };
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.comments = task.comments || [];
    task.comments.push(comment);
    task.updatedAt = new Date().toISOString();
    
    try {
        const response = await fetch('/api/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        
        if (response.ok) {
            elements.newComment.value = '';
            loadTaskComments(taskId);
            addActivity('commented', `Added comment to "${task.title}": ${content}`, 'User');
            renderTasks(); // Update comment count badges
        } else {
            // Revert on error
            task.comments.pop();
            alert('Error adding comment. Please try again.');
        }
    } catch (error) {
        // Revert on error
        task.comments.pop();
        console.error('Error adding comment:', error);
        alert('Error adding comment. Please try again.');
    }
}

// Activity Feed
function addActivity(type, content, author = 'System') {
    const activity = {
        id: generateId(),
        type: type,
        content: content,
        author: author,
        createdAt: new Date().toISOString()
    };
    
    activities.unshift(activity);
    
    // Keep only last 50 activities
    if (activities.length > 50) {
        activities = activities.slice(0, 50);
    }
    
    saveActivitiesToLocal();
    renderActivityFeed();
}

function renderActivityFeed() {
    const activityList = elements.activityList;
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const activityEl = createActivityElement(activity);
        activityList.appendChild(activityEl);
    });
    
    elements.activityBadge.textContent = activities.length;
}

function createActivityElement(activity) {
    const activityEl = document.createElement('div');
    activityEl.className = 'activity-item';
    activityEl.innerHTML = `
        <div class="activity-author">${escapeHtml(activity.author)}</div>
        <div class="activity-content">${escapeHtml(activity.content)}</div>
        <div class="activity-time">${formatRelativeDate(new Date(activity.createdAt))}</div>
    `;
    return activityEl;
}

// Filters
function applyFilters() {
    currentFilter = elements.priorityFilter.value;
    currentSearch = elements.searchInput.value;
    renderTasks();
}

// Theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Data Management
async function loadData() {
    try {
        // Load tasks
        const tasksResponse = await fetch('/api/tasks');
        if (tasksResponse.ok) {
            tasks = await tasksResponse.json();
        } else {
            console.log('No tasks found or error loading tasks, starting with empty array');
            tasks = [];
        }
        
        // Load activities from localStorage
        loadActivitiesFromLocal();
        
        renderTasks();
        updateStats();
        renderActivityFeed();
        
    } catch (error) {
        console.error('Error loading data:', error);
        // Load from localStorage as fallback
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const savedTasks = localStorage.getItem('missionControl_tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    
    loadActivitiesFromLocal();
    renderTasks();
    updateStats();
    renderActivityFeed();
}

function loadActivitiesFromLocal() {
    const savedActivities = localStorage.getItem('missionControl_activities');
    if (savedActivities) {
        activities = JSON.parse(savedActivities);
    }
}

function saveActivitiesToLocal() {
    localStorage.setItem('missionControl_activities', JSON.stringify(activities));
}

// Utility Functions
function formatRelativeDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-sync with server every 30 seconds
setInterval(async () => {
    try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
            const serverTasks = await response.json();
            
            // Simple sync - replace local tasks with server tasks if different
            if (JSON.stringify(serverTasks) !== JSON.stringify(tasks)) {
                tasks = serverTasks;
                renderTasks();
                updateStats();
            }
        }
    } catch (error) {
        console.log('Auto-sync failed:', error);
    }
}, 30000);