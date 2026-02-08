// Mission Control

class MissionControl {
    constructor() {
        this.tasks = [];
        this.columns = [];
        this.draggedTask = null;
        this.editingColId = null;
        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupDragDrop();
        await Promise.all([this.loadTasks(), this.loadColumns()]);
        this.render();
    }

    setupElements() {
        this.inboxPanel = document.getElementById('inbox-panel');
        this.boardArea = document.getElementById('board-area');
        this.inboxList = document.getElementById('inbox-list');
        this.boardColumns = document.getElementById('board-columns');
        this.taskModal = document.getElementById('task-modal');
        this.taskForm = document.getElementById('task-form');
        this.colModal = document.getElementById('col-modal');
    }

    setupEventListeners() {
        // Tab toggles
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const p = btn.dataset.panel;
                if (p === 'inbox') this.inboxPanel.classList.toggle('hidden');
                else if (p === 'board') this.boardArea.classList.toggle('hidden');
            });
        });

        // Add inbox
        document.getElementById('add-inbox-btn').addEventListener('click', () => this.openTaskModal(null, 'inbox'));

        // Add column
        document.getElementById('add-col-btn').addEventListener('click', () => this.addColumn());

        // Task modal
        document.getElementById('modal-close').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('cancel-task').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('delete-task').addEventListener('click', () => this.deleteCurrent());
        this.taskForm.addEventListener('submit', (e) => this.saveCurrent(e));
        this.taskModal.addEventListener('click', (e) => { if (e.target === this.taskModal) this.closeTaskModal(); });

        // Column modal
        document.getElementById('col-modal-close').addEventListener('click', () => this.closeColModal());
        document.getElementById('col-save-btn').addEventListener('click', () => this.saveColumn());
        document.getElementById('col-delete-btn').addEventListener('click', () => this.deleteColumn());
        this.colModal.addEventListener('click', (e) => { if (e.target === this.colModal) this.closeColModal(); });

        // Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { this.closeTaskModal(); this.closeColModal(); }
        });
    }

    setupDragDrop() {
        document.addEventListener('dragover', (e) => {
            if (e.target.closest('.column-content, .inbox-list')) e.preventDefault();
        });
        document.addEventListener('dragenter', (e) => {
            const z = e.target.closest('.column-content, .inbox-list');
            if (z) z.classList.add('drag-over');
        });
        document.addEventListener('dragleave', (e) => {
            const z = e.target.closest('.column-content, .inbox-list');
            if (z && !z.contains(e.relatedTarget)) z.classList.remove('drag-over');
        });
        document.addEventListener('drop', async (e) => {
            const z = e.target.closest('.column-content, .inbox-list');
            if (!z || !this.draggedTask) return;
            e.preventDefault();
            z.classList.remove('drag-over');
            const newStatus = z.classList.contains('inbox-list') ? 'inbox' : z.closest('.column')?.dataset.status;
            if (newStatus && newStatus !== this.draggedTask.status) {
                await this.moveTask(this.draggedTask.id, newStatus);
            }
            this.draggedTask = null;
        });
    }

    // ── Data ──

    async loadTasks() {
        try { const r = await fetch('/api/tasks'); this.tasks = r.ok ? await r.json() : []; }
        catch { this.tasks = []; }
    }

    async loadColumns() {
        try { const r = await fetch('/api/columns'); this.columns = r.ok ? await r.json() : []; }
        catch { this.columns = []; }
    }

    async moveTask(id, status) {
        const t = this.tasks.find(x => x.id === id);
        if (!t) return;
        try {
            const r = await fetch('/api/tasks', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...t, status })
            });
            if (r.ok) { Object.assign(t, await r.json()); this.render(); }
        } catch (e) { console.error(e); }
    }

    // ── Columns ──

    async addColumn() {
        const name = prompt('Column name:');
        if (!name?.trim()) return;
        try {
            const r = await fetch('/api/columns', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() })
            });
            if (r.ok) { this.columns.push(await r.json()); this.render(); }
            else { const d = await r.json(); alert(d.error || 'Failed'); }
        } catch (e) { console.error(e); }
    }

    openColModal(col) {
        this.editingColId = col.id;
        document.getElementById('col-modal-title').textContent = 'Edit Column';
        document.getElementById('col-name-input').value = col.name;
        this.colModal.classList.add('show');
        document.getElementById('col-name-input').focus();
    }

    closeColModal() { this.colModal.classList.remove('show'); this.editingColId = null; }

    async saveColumn() {
        const name = document.getElementById('col-name-input').value.trim();
        if (!name || !this.editingColId) return;
        try {
            const r = await fetch(`/api/columns/${this.editingColId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (r.ok) {
                const c = this.columns.find(x => x.id === this.editingColId);
                if (c) c.name = name;
                this.closeColModal();
                this.render();
            }
        } catch (e) { console.error(e); }
    }

    async deleteColumn() {
        if (!this.editingColId) return;
        const col = this.columns.find(c => c.id === this.editingColId);
        if (!confirm(`Delete "${col?.name}"? Tasks will move to Inbox.`)) return;
        try {
            const r = await fetch(`/api/columns/${this.editingColId}`, { method: 'DELETE' });
            if (r.ok) {
                this.columns = this.columns.filter(c => c.id !== this.editingColId);
                // Move tasks in memory
                this.tasks.forEach(t => { if (t.status === this.editingColId) t.status = 'inbox'; });
                this.closeColModal();
                this.render();
            }
        } catch (e) { console.error(e); }
    }

    // ── Rendering ──

    render() {
        // Inbox
        const inboxTasks = this.tasks.filter(t => t.status === 'inbox');
        this.renderList(this.inboxList, inboxTasks, 'No new tasks');

        // Badge
        const badge = document.getElementById('inbox-badge');
        if (inboxTasks.length) { badge.textContent = inboxTasks.length; badge.style.display = 'flex'; }
        else badge.style.display = 'none';

        // Board columns
        this.boardColumns.innerHTML = '';
        const sorted = [...this.columns].sort((a, b) => a.order - b.order);
        sorted.forEach(col => {
            const colEl = document.createElement('div');
            colEl.className = 'column';
            colEl.dataset.status = col.id;

            const tasks = this.tasks.filter(t => t.status === col.id);

            colEl.innerHTML = `
                <div class="column-header">
                    <h3 class="col-name" data-col-id="${col.id}">${this.esc(col.name)}</h3>
                    <span class="col-count">${tasks.length}</span>
                    <button class="add-btn" data-column="${col.id}" title="Add to ${this.esc(col.name)}">+</button>
                </div>
                <div class="column-content"></div>
            `;

            // Column name click → edit
            colEl.querySelector('.col-name').addEventListener('click', () => this.openColModal(col));

            // Add button
            colEl.querySelector('.add-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTaskModal(null, col.id);
            });

            // Render tasks
            const content = colEl.querySelector('.column-content');
            if (tasks.length === 0) {
                content.innerHTML = '<div class="empty-state">No tasks</div>';
            } else {
                tasks.forEach(t => content.appendChild(this.createCard(t)));
            }

            this.boardColumns.appendChild(colEl);
        });

        // Update status select in task modal
        this.updateStatusSelect();
    }

    updateStatusSelect() {
        const sel = document.getElementById('task-status');
        const current = sel.value;
        sel.innerHTML = '<option value="inbox">Inbox</option>';
        this.columns.sort((a, b) => a.order - b.order).forEach(c => {
            sel.innerHTML += `<option value="${c.id}">${this.esc(c.name)}</option>`;
        });
        sel.value = current || 'inbox';
    }

    renderList(container, tasks, emptyText) {
        container.innerHTML = '';
        if (!tasks.length) { container.innerHTML = `<div class="empty-state">${emptyText}</div>`; return; }
        tasks.forEach(t => container.appendChild(this.createCard(t)));
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

        card.addEventListener('click', () => this.openTaskModal(task));
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
        const diff = Math.ceil((d - new Date()) / 86400000);
        if (diff < 0) return '<span style="color:#ef4444">Overdue</span>';
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        if (diff < 7) return `${diff}d`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    // ── Task Modal ──

    openTaskModal(task = null, defaultStatus = 'inbox') {
        const edit = !!task;
        document.getElementById('modal-title').textContent = edit ? 'Edit Task' : 'New Task';
        document.getElementById('delete-task').style.display = edit ? 'block' : 'none';
        this.updateStatusSelect();

        if (edit) {
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority || 'medium';
            document.getElementById('task-status').value = task.status || 'inbox';
            if (task.dueDate) {
                const d = new Date(task.dueDate);
                document.getElementById('task-due-date').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            } else document.getElementById('task-due-date').value = '';
        } else {
            this.taskForm.reset();
            document.getElementById('task-id').value = '';
            document.getElementById('task-status').value = defaultStatus;
        }
        this.taskModal.classList.add('show');
        document.getElementById('task-title').focus();
    }

    closeTaskModal() { this.taskModal.classList.remove('show'); }

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
            const r = id
                ? await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id }) })
                : await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (r.ok) {
                const result = await r.json();
                const idx = this.tasks.findIndex(t => t.id === result.id);
                if (idx >= 0) this.tasks[idx] = result; else this.tasks.push(result);
                this.render();
                this.closeTaskModal();
            }
        } catch (e) { console.error(e); }
    }

    async deleteCurrent() {
        const id = document.getElementById('task-id').value;
        if (!id || !confirm('Delete this task?')) return;
        try {
            const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            if (r.ok) { this.tasks = this.tasks.filter(t => t.id !== id); this.render(); this.closeTaskModal(); }
        } catch (e) { console.error(e); }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.mc = new MissionControl(); });
