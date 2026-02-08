// Executive Assistant Mission Control - Main JavaScript

class MissionControl {
    constructor() {
        this.tasks = [];
        this.currentView = 'inbox';
        this.draggedTask = null;
        this.taskModal = null;
        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        await this.loadTasks();
        this.renderTasks();
    }

    setupElements() {
        // Views
        this.inboxView = document.getElementById('inbox-view');
        this.boardView = document.getElementById('board-view');
        
        // Containers
        this.inboxList = document.getElementById('inbox-list');
        this.todayColumn = document.getElementById('today-column');
        this.thisWeekColumn = document.getElementById('this-week-column');
        this.laterColumn = document.getElementById('later-column');
        
        // Modal
        this.taskModal = document.getElementById('task-modal');
        this.taskForm = document.getElementById('task-form');
        
        // Buttons
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.addButtons = document.querySelectorAll('.add-btn');
        this.modalClose = document.getElementById('modal-close');
        this.cancelTask = document.getElementById('cancel-task');
        this.deleteTask = document.getElementById('delete-task');
        this.saveTask = document.getElementById('save-task');
    }

    setupEventListeners() {
        // Tab switching
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Add task buttons
        this.addButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.column || 'inbox';
                this.openTaskModal(null, column);
            });
        });

        // Modal events
        this.modalClose.addEventListener('click', () => this.closeTaskModal());
        this.cancelTask.addEventListener('click', () => this.closeTaskModal());
        this.deleteTask.addEventListener('click', () => this.deleteCurrentTask());
        this.taskForm.addEventListener('submit', (e) => this.saveCurrentTask(e));

        // Click outside modal to close
        this.taskModal.addEventListener('click', (e) => {
            if (e.target === this.taskModal) {
                this.closeTaskModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.taskModal.classList.contains('show')) {
                this.closeTaskModal();
            }
        });
    }

    switchView(view) {
        // Update active tab
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Show/hide views
        this.inboxView.style.display = view === 'inbox' ? 'block' : 'none';
        this.boardView.style.display = view === 'board' ? 'block' : 'none';

        this.currentView = view;
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (response.ok) {
                this.tasks = await response.json();
            } else {
                console.error('Failed to load tasks:', response.statusText);
                this.tasks = [];
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
    }

    renderTasks() {
        // Clear all containers
        this.inboxList.innerHTML = '';
        this.todayColumn.innerHTML = '';
        this.thisWeekColumn.innerHTML = '';
        this.laterColumn.innerHTML = '';

        // Filter and render tasks by status
        const inboxTasks = this.tasks.filter(t => t.status === 'inbox');
        const todayTasks = this.tasks.filter(t => t.status === 'today');
        const thisWeekTasks = this.tasks.filter(t => t.status === 'this-week');
        const laterTasks = this.tasks.filter(t => t.status === 'later');

        // Render each group
        this.renderTaskGroup(inboxTasks, this.inboxList);
        this.renderTaskGroup(todayTasks, this.todayColumn);
        this.renderTaskGroup(thisWeekTasks, this.thisWeekColumn);
        this.renderTaskGroup(laterTasks, this.laterColumn);

        // Show empty states
        this.showEmptyStateIfNeeded(this.inboxList, 'inbox');
        this.showEmptyStateIfNeeded(this.todayColumn, 'today');
        this.showEmptyStateIfNeeded(this.thisWeekColumn, 'this-week');
        this.showEmptyStateIfNeeded(this.laterColumn, 'later');
    }

    renderTaskGroup(tasks, container) {
        tasks.forEach(task => {
            const taskCard = this.createTaskCard(task);
            container.appendChild(taskCard);
        });
    }

    createTaskCard(task) {
        const template = document.getElementById('task-card-template');
        const card = template.content.cloneNode(true).querySelector('.task-card');
        
        // Set task data
        card.dataset.taskId = task.id;
        card.dataset.status = task.status;

        // Set priority dot
        const priorityDot = card.querySelector('.priority-dot');
        priorityDot.classList.add(task.priority || 'medium');

        // Set title
        const title = card.querySelector('.task-title');
        title.textContent = task.title;

        // Set meta info
        const due = card.querySelector('.task-due');
        const assignee = card.querySelector('.task-assignee');
        
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            due.textContent = this.formatDueDate(dueDate);
        }
        
        if (task.assignee) {
            assignee.textContent = task.assignee;
        }

        // Add event listeners
        card.addEventListener('click', () => this.openTaskModal(task));
        card.addEventListener('dragstart', (e) => this.onDragStart(e, task));
        card.addEventListener('dragend', () => this.onDragEnd());

        return card;
    }

    showEmptyStateIfNeeded(container, type) {
        if (container.children.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            let icon, text;
            switch (type) {
                case 'inbox':
                    icon = '📥';
                    text = 'No new tasks in inbox';
                    break;
                case 'today':
                    icon = '📅';
                    text = 'Nothing scheduled for today';
                    break;
                case 'this-week':
                    icon = '📆';
                    text = 'Nothing planned this week';
                    break;
                case 'later':
                    icon = '📋';
                    text = 'No future tasks';
                    break;
                default:
                    icon = '✅';
                    text = 'All clear!';
            }

            emptyState.innerHTML = `
                <div class="empty-state-icon">${icon}</div>
                <div class="empty-state-text">${text}</div>
            `;

            container.appendChild(emptyState);
        }
    }

    formatDueDate(date) {
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `${diffDays} days`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    onDragStart(e, task) {
        this.draggedTask = task;
        e.currentTarget.classList.add('dragging');
        
        // Set up drop zones
        document.querySelectorAll('.column-content').forEach(column => {
            column.addEventListener('dragover', this.onDragOver.bind(this));
            column.addEventListener('drop', this.onDrop.bind(this));
            column.addEventListener('dragenter', this.onDragEnter.bind(this));
            column.addEventListener('dragleave', this.onDragLeave.bind(this));
        });
    }

    onDragEnd() {
        document.querySelector('.dragging')?.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        
        // Clean up drop zones
        document.querySelectorAll('.column-content').forEach(column => {
            column.removeEventListener('dragover', this.onDragOver.bind(this));
            column.removeEventListener('drop', this.onDrop.bind(this));
            column.removeEventListener('dragenter', this.onDragEnter.bind(this));
            column.removeEventListener('dragleave', this.onDragLeave.bind(this));
        });
        
        this.draggedTask = null;
    }

    onDragOver(e) {
        e.preventDefault();
    }

    onDragEnter(e) {
        e.currentTarget.classList.add('drag-over');
    }

    onDragLeave(e) {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('drag-over');
        }
    }

    async onDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this.draggedTask) return;

        const targetColumn = e.currentTarget.parentElement;
        const newStatus = targetColumn.dataset.status;

        if (newStatus && this.draggedTask.status !== newStatus) {
            await this.moveTask(this.draggedTask.id, newStatus);
        }
    }

    async moveTask(taskId, newStatus) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            const updatedTask = { ...task, status: newStatus };
            
            const response = await fetch('/api/tasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTask)
            });

            if (response.ok) {
                const result = await response.json();
                this.updateTaskInMemory(result);
                this.renderTasks();
            } else {
                console.error('Failed to move task:', response.statusText);
            }
        } catch (error) {
            console.error('Error moving task:', error);
        }
    }

    openTaskModal(task = null, defaultStatus = 'inbox') {
        const isEdit = task !== null;
        
        // Set modal title
        document.getElementById('modal-title').textContent = isEdit ? 'Edit Task' : 'New Task';
        
        // Show/hide delete button
        this.deleteTask.style.display = isEdit ? 'block' : 'none';
        
        // Fill form
        if (isEdit) {
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority || 'medium';
            document.getElementById('task-assignee').value = task.assignee || '';
            document.getElementById('task-status').value = task.status || 'inbox';
            
            if (task.dueDate) {
                // Convert to datetime-local format
                const date = new Date(task.dueDate);
                const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                document.getElementById('task-due-date').value = localDate.toISOString().slice(0, 16);
            } else {
                document.getElementById('task-due-date').value = '';
            }
        } else {
            this.taskForm.reset();
            document.getElementById('task-status').value = defaultStatus;
            document.getElementById('task-assignee').value = 'AI Employee';
        }
        
        // Show modal
        this.taskModal.classList.add('show');
        document.getElementById('task-title').focus();
    }

    closeTaskModal() {
        this.taskModal.classList.remove('show');
        this.taskForm.reset();
    }

    async saveCurrentTask(e) {
        e.preventDefault();
        
        const taskData = {
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            priority: document.getElementById('task-priority').value,
            status: document.getElementById('task-status').value,
            assignee: document.getElementById('task-assignee').value.trim(),
        };

        const dueDateValue = document.getElementById('task-due-date').value;
        if (dueDateValue) {
            taskData.dueDate = new Date(dueDateValue).toISOString();
        }

        const taskId = document.getElementById('task-id').value;
        const isEdit = Boolean(taskId);

        try {
            let response;
            if (isEdit) {
                taskData.id = taskId;
                response = await fetch('/api/tasks', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
            } else {
                response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
            }

            if (response.ok) {
                const result = await response.json();
                this.updateTaskInMemory(result);
                this.renderTasks();
                this.closeTaskModal();
            } else {
                console.error('Failed to save task:', response.statusText);
                alert('Failed to save task. Please try again.');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Error saving task. Please try again.');
        }
    }

    async deleteCurrentTask() {
        const taskId = document.getElementById('task-id').value;
        if (!taskId) return;

        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.removeTaskFromMemory(taskId);
                this.renderTasks();
                this.closeTaskModal();
            } else {
                console.error('Failed to delete task:', response.statusText);
                alert('Failed to delete task. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Error deleting task. Please try again.');
        }
    }

    updateTaskInMemory(updatedTask) {
        const index = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (index >= 0) {
            this.tasks[index] = updatedTask;
        } else {
            this.tasks.push(updatedTask);
        }
    }

    removeTaskFromMemory(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.missionControl = new MissionControl();
});