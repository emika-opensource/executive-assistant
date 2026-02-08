// Executive Assistant Mission Control

class MissionControl {
    constructor() {
        this.tasks = [];
        this.draggedTask = null;
        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupDragDrop();
        await this.loadTasks();
        this.render();
    }

    setupElements() {
        this.inboxPanel = document.getElementById('inbox-panel');
        this.boardArea = document.getElementById('board-area');
        this.inboxList = document.getElementById('inbox-list');
        this.taskModal = document.getElementById('task-modal');
        this.taskForm = document.getElementById('task-form');
    }

    setupEventListeners() {
        // Tab toggles — each toggles its own panel independently
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.panel;
                btn.classList.toggle('active');
                if (panel === 'inbox') {
                    this.inboxPanel.classList.toggle('hidden');
                } else if (panel === 'board') {
                    this.boardArea.classList.toggle('hidden');
                }
            });
        });

        // Add buttons
        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const col = btn.dataset.column || 'inbox';
                this.openModal(null, col);
            });
        });

        // Modal
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-task').addEventListener('click', () => this.closeModal());
        document.getElementById('delete-task').addEventListener('click', () => this.deleteCurrent());
        this.taskForm.addEventListener('submit', (e) => this.saveCurrent(e));
        this.taskModal.addEventListener('click', (e) => {
            if (e.target === this.taskModal) this.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    setupDragDrop() {
        // Delegate drag events on column-content elements and inbox-list
        const dropZones = () => [...document.querySelectorAll('.column-content'), this.inboxList];

        document.addEventListener('dragover', (e) => {
            const zone = e.target.closest('.column-content, .inbox-list');
            if (zone) e.preventDefault();
        });

        document.addEventListener('dragenter', (e) => {
            const zone = e.target.closest('.column-content, .inbox-list');
            if (zone) zone.classList.add('drag-over');
        });

        document.addEventListener('dragleave', (e) => {
            const zone = e.target.closest('.column-content, .inbox-list');
            if (zone && !zone.contains(e.relatedTarget)) {
                zone.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', async (e) => {
            const zone = e.target.closest('.column-content, .inbox-list');
            if (!zone || !this.draggedTask) return;
            e.preventDefault();
            zone.classList.remove('drag-over');

            // Determine target status
            let newStatus;
            if (zone.classList.contains('inbox-list')) {
                newStatus = 'inbox';
            } else {
                newStatus = zone.closest('.column')?.dataset.status;
            }
            if (newStatus && newStatus !== this.draggedTask.status) {
                await this.moveTask(this.draggedTask.id, newStatus);
            }
            this.draggedTask = null;
        });
    }

    // ── Data ──

    async loadTasks() {
        try {
            const res = await fetch('/api/tasks');
            this.tasks = res.ok ? await res.json() : [];
        } catch { this.tasks = []; }
    }

    async moveTask(id, status) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        try {
            const res = await fetch('/api/tasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...task, status })
            });
            if (res.ok) { Object.assign(task, await res.json()); this.render(); }
        } catch (e) { console.error('Move failed:', e); }
    }

    // ── Rendering ──

    render() {
        const groups = { inbox: [], today: [], 'this-week': [], later: [], done: [] };
        this.tasks.forEach(t => {
            if (groups[t.status]) groups[t.status].push(t);
            else groups.inbox.push(t); // unknown status → inbox
        });

        this.renderList(this.inboxList, groups.inbox, 'No new tasks');
        this.renderList(document.getElementById('today-column'), groups.today, 'Nothing for today');
        this.renderList(document.getElementById('this-week-column'), groups['this-week'], 'Nothing this week');
        this.renderList(document.getElementById('later-column'), groups.later, 'Nothing planned');
        this.renderList(document.getElementById('done-column'), groups.done, 'No completed tasks');

        // Update counts
        document.getElementById('today-count').textContent = groups.today.length;
        document.getElementById('this-week-count').textContent = groups['this-week'].length;
        document.getElementById('later-count').textContent = groups.later.length;
        document.getElementById('done-count').textContent = groups.done.length;

        // Inbox badge
        const badge = document.getElementById('inbox-badge');
        if (groups.inbox.length > 0) {
            badge.textContent = groups.inbox.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    renderList(container, tasks, emptyText) {
        container.innerHTML = '';
        if (tasks.length === 0) {
            container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
            return;
        }
        tasks.forEach(task => container.appendChild(this.createCard(task)));
    }

    createCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card' + (task.status === 'done' ? ' done-card' : '');
        card.draggable = true;
        card.dataset.taskId = task.id;

        let meta = '';
        if (task.dueDate) meta += `<span>${this.fmtDate(new Date(task.dueDate))}</span>`;

        card.innerHTML = `
            <div class="task-header">
                <div class="priority-dot ${task.priority || 'medium'}"></div>
                <div class="task-title">${this.esc(task.title)}</div>
            </div>
            ${meta ? `<div class="task-meta">${meta}</div>` : ''}
        `;

        card.addEventListener('click', () => this.openModal(task));
        card.addEventListener('dragstart', (e) => {
            this.draggedTask = task;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        return card;
    }

    fmtDate(d) {
        const now = new Date();
        const diff = Math.ceil((d - now) / 86400000);
        if (diff < 0) return '<span style="color:#ef4444">Overdue</span>';
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        if (diff < 7) return `${diff}d`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    // ── Modal ──

    openModal(task = null, defaultStatus = 'inbox') {
        const edit = !!task;
        document.getElementById('modal-title').textContent = edit ? 'Edit Task' : 'New Task';
        document.getElementById('delete-task').style.display = edit ? 'block' : 'none';

        if (edit) {
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority || 'medium';
            document.getElementById('task-status').value = task.status || 'inbox';
            if (task.dueDate) {
                const d = new Date(task.dueDate);
                document.getElementById('task-due-date').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            } else {
                document.getElementById('task-due-date').value = '';
            }
        } else {
            this.taskForm.reset();
            document.getElementById('task-id').value = '';
            document.getElementById('task-status').value = defaultStatus;
        }

        this.taskModal.classList.add('show');
        document.getElementById('task-title').focus();
    }

    closeModal() {
        this.taskModal.classList.remove('show');
    }

    async saveCurrent(e) {
        e.preventDefault();
        const data = {
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            priority: document.getElementById('task-priority').value,
            status: document.getElementById('task-status').value,
        };
        const due = document.getElementById('task-due-date').value;
        if (due) data.dueDate = new Date(due).toISOString();

        const id = document.getElementById('task-id').value;
        try {
            const res = id
                ? await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id }) })
                : await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (res.ok) {
                const result = await res.json();
                const idx = this.tasks.findIndex(t => t.id === result.id);
                if (idx >= 0) this.tasks[idx] = result; else this.tasks.push(result);
                this.render();
                this.closeModal();
            }
        } catch (e) { console.error('Save failed:', e); }
    }

    async deleteCurrent() {
        const id = document.getElementById('task-id').value;
        if (!id || !confirm('Delete this task?')) return;
        try {
            const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.render();
                this.closeModal();
            }
        } catch (e) { console.error('Delete failed:', e); }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.mc = new MissionControl(); });
