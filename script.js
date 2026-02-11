// Mission Control

class MissionControl {
    constructor() {
        this.tasks = [];
        this.columns = [];
        this.draggedTask = null;
        this.editingColId = null;
        this.isResizing = false;
        this.loading = true;
        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupDragDrop();
        this.setupResize();
        this.setupPriorityPicker();
        this.setupDateSuggestions();
        this.setupKeyboardShortcuts();
        this.showLoading(true);
        try {
            await Promise.all([this.loadTasks(), this.loadColumns()]);
        } finally {
            this.loading = false;
            this.showLoading(false);
        }
        this.render();
    }

    // ── Toast Notifications ──

    toast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = message;
        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 300);
        }, 2500);
    }

    // ── Loading State ──

    showLoading(show) {
        let loader = document.getElementById('app-loader');
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'app-loader';
                loader.innerHTML = '<div class="loader-spinner"></div><div class="loader-text">Loading Mission Control…</div>';
                document.querySelector('.main').prepend(loader);
            }
            loader.style.display = 'flex';
        } else if (loader) {
            loader.style.display = 'none';
        }
    }

    setupElements() {
        this.inboxPanel = document.getElementById('inbox-panel');
        this.boardArea = document.getElementById('board-area');
        this.inboxList = document.getElementById('inbox-list');
        this.boardColumns = document.getElementById('board-columns');
        this.taskModal = document.getElementById('task-modal');
        this.taskForm = document.getElementById('task-form');
        this.colModal = document.getElementById('col-modal');
        this.resizeHandle = document.getElementById('resize-handle');
    }

    setupEventListeners() {
        // Floating toggle buttons — at least one panel must stay open
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = btn.dataset.panel;
                const otherBtn = [...document.querySelectorAll('.toggle-btn')].find(b => b.dataset.panel !== p);
                const isActive = btn.classList.contains('active');
                if (isActive && !otherBtn.classList.contains('active')) return;
                btn.classList.toggle('active');
                if (p === 'inbox') this.inboxPanel.classList.toggle('hidden');
                else if (p === 'board') this.boardArea.classList.toggle('hidden');
                this.updateResizeHandle();
            });
        });

        document.getElementById('add-inbox-btn').addEventListener('click', () => this.openTaskModal(null, 'inbox'));
        document.getElementById('add-col-btn').addEventListener('click', () => this.openAddColumnModal());

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

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { this.closeTaskModal(); this.closeColModal(); }
        });
    }

    // ── Keyboard Shortcuts ──

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                this.openTaskModal(null, 'inbox');
            }
        });
    }

    // ── Priority Picker ──

    setupPriorityPicker() {
        document.querySelectorAll('.priority-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.priority-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('task-priority').value = btn.dataset.value;
            });
        });
    }

    setPriority(value) {
        document.getElementById('task-priority').value = value;
        document.querySelectorAll('.priority-option').forEach(b => {
            b.classList.toggle('selected', b.dataset.value === value);
        });
    }

    // ── Date Suggestions ──

    setupDateSuggestions() {
        document.querySelectorAll('.date-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const dateType = chip.dataset.date;
                const dateInput = document.getElementById('task-due-date');

                document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));

                if (dateType === 'none') {
                    dateInput.value = '';
                    chip.classList.add('active');
                    return;
                }

                const now = new Date();
                let target;

                switch (dateType) {
                    case 'today':
                        target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0);
                        break;
                    case 'tomorrow':
                        target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 0);
                        break;
                    case 'this-week': {
                        const dayOfWeek = now.getDay();
                        const daysToFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 0;
                        target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToFriday, 18, 0);
                        break;
                    }
                    case 'next-week':
                        const dayOfWeek2 = now.getDay();
                        const daysToMonday = dayOfWeek2 === 0 ? 1 : 8 - dayOfWeek2;
                        target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday, 9, 0);
                        break;
                }

                if (target) {
                    dateInput.value = this.toLocalISO(target);
                    chip.classList.add('active');
                }
            });
        });

        document.getElementById('task-due-date').addEventListener('input', () => {
            document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
        });
    }

    toLocalISO(d) {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    // ── Resize Handle ──

    setupResize() {
        let startX = 0;
        let startWidth = 0;

        this.resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isResizing = true;
            startX = e.clientX;
            startWidth = this.inboxPanel.offsetWidth;
            document.body.classList.add('resizing');
            this.resizeHandle.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;
            const diff = e.clientX - startX;
            const newWidth = Math.min(Math.max(startWidth + diff, 200), 600);
            this.inboxPanel.style.width = newWidth + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!this.isResizing) return;
            this.isResizing = false;
            document.body.classList.remove('resizing');
            this.resizeHandle.classList.remove('dragging');
        });
    }

    updateResizeHandle() {
        const inboxOpen = !this.inboxPanel.classList.contains('hidden');
        const boardOpen = !this.boardArea.classList.contains('hidden');
        this.resizeHandle.classList.toggle('hidden', !(inboxOpen && boardOpen));
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
        try {
            const r = await fetch('/api/tasks');
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            this.tasks = await r.json();
        } catch (e) {
            console.error('Failed to load tasks:', e);
            this.tasks = [];
            this.toast('Failed to load tasks', 'error');
        }
    }

    async loadColumns() {
        try {
            const r = await fetch('/api/columns');
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            this.columns = await r.json();
        } catch (e) {
            console.error('Failed to load columns:', e);
            this.columns = [];
            this.toast('Failed to load columns', 'error');
        }
    }

    async moveTask(id, status) {
        const t = this.tasks.find(x => x.id === id);
        if (!t) return;
        const oldStatus = t.status;
        // Optimistic update
        t.status = status;
        this.render();
        try {
            const r = await fetch('/api/tasks', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...t, status })
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            Object.assign(t, await r.json());
            this.render();
            const colName = status === 'inbox' ? 'Inbox' : (this.columns.find(c => c.id === status)?.name || status);
            this.toast(`Moved to ${colName}`);
        } catch (e) {
            console.error('Failed to move task:', e);
            t.status = oldStatus;
            this.render();
            this.toast('Failed to move task', 'error');
        }
    }

    // ── Columns ──

    openAddColumnModal() {
        this.editingColId = null;
        document.getElementById('col-modal-title').textContent = 'Add Column';
        document.getElementById('col-name-input').value = '';
        document.getElementById('col-delete-btn').style.display = 'none';
        this.colModal.classList.add('show');
        document.getElementById('col-name-input').focus();
    }

    openColModal(col) {
        this.editingColId = col.id;
        document.getElementById('col-modal-title').textContent = 'Edit Column';
        document.getElementById('col-name-input').value = col.name;
        document.getElementById('col-delete-btn').style.display = 'block';
        this.colModal.classList.add('show');
        document.getElementById('col-name-input').focus();
    }

    closeColModal() { this.colModal.classList.remove('show'); this.editingColId = null; }

    async saveColumn() {
        const name = document.getElementById('col-name-input').value.trim();
        if (!name) return;

        if (this.editingColId) {
            // Edit existing
            try {
                const r = await fetch(`/api/columns/${this.editingColId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                if (!r.ok) { const d = await r.json(); this.toast(d.error || 'Failed to rename column', 'error'); return; }
                const c = this.columns.find(x => x.id === this.editingColId);
                if (c) c.name = name;
                this.closeColModal();
                this.render();
                this.toast('Column renamed');
            } catch (e) { console.error(e); this.toast('Failed to rename column', 'error'); }
        } else {
            // Add new
            try {
                const r = await fetch('/api/columns', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                if (!r.ok) { const d = await r.json(); this.toast(d.error || 'Column already exists', 'error'); return; }
                this.columns.push(await r.json());
                this.closeColModal();
                this.render();
                this.toast(`Column "${name}" added`);
            } catch (e) { console.error(e); this.toast('Failed to add column', 'error'); }
        }
    }

    async deleteColumn() {
        if (!this.editingColId) return;
        const col = this.columns.find(c => c.id === this.editingColId);
        if (!confirm(`Delete "${col?.name}"? Tasks will move to Inbox.`)) return;
        try {
            const r = await fetch(`/api/columns/${this.editingColId}`, { method: 'DELETE' });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            this.columns = this.columns.filter(c => c.id !== this.editingColId);
            this.tasks.forEach(t => { if (t.status === this.editingColId) t.status = 'inbox'; });
            this.closeColModal();
            this.render();
            this.toast(`Column "${col?.name}" deleted`);
        } catch (e) { console.error(e); this.toast('Failed to delete column', 'error'); }
    }

    // ── Welcome / Onboarding ──

    isFirstRun() {
        return this.tasks.length === 0;
    }

    renderWelcome() {
        const welcome = document.getElementById('welcome-screen');
        if (this.isFirstRun() && !this.loading) {
            if (!welcome) {
                const el = document.createElement('div');
                el.id = 'welcome-screen';
                el.innerHTML = `
                    <div class="welcome-card">
                        <div class="welcome-emoji">👋</div>
                        <h2 class="welcome-title">Welcome to Mission Control</h2>
                        <p class="welcome-desc">Your AI-powered task dashboard. Tell your AI assistant what you're working on, or create your first task to get started.</p>
                        <div class="welcome-actions">
                            <button class="btn btn-primary welcome-cta" id="welcome-add-task">+ Create Your First Task</button>
                        </div>
                        <div class="welcome-hint">
                            <span class="welcome-shortcut">Tip:</span> Press <kbd>N</kbd> anytime to quickly add a task
                        </div>
                    </div>
                `;
                document.querySelector('.main').appendChild(el);
                document.getElementById('welcome-add-task').addEventListener('click', () => this.openTaskModal(null, 'inbox'));
            }
            welcome?.style && (welcome.style.display = 'flex');
            this.inboxPanel.style.display = 'none';
            this.boardArea.style.display = 'none';
            this.resizeHandle.style.display = 'none';
        } else {
            if (welcome) welcome.style.display = 'none';
            // Restore panels
            if (!this.inboxPanel.classList.contains('hidden')) this.inboxPanel.style.display = '';
            if (!this.boardArea.classList.contains('hidden')) this.boardArea.style.display = '';
            this.updateResizeHandle();
        }
    }

    // ── Rendering ──

    render() {
        this.renderWelcome();

        const inboxTasks = this.tasks.filter(t => t.status === 'inbox');
        this.renderList(this.inboxList, inboxTasks, 'inbox');

        const badge = document.getElementById('inbox-badge');
        if (inboxTasks.length) { badge.textContent = inboxTasks.length; badge.style.display = 'flex'; }
        else badge.style.display = 'none';

        this.renderHeaderStats();

        this.boardColumns.innerHTML = '';
        const sorted = [...this.columns].sort((a, b) => a.order - b.order);
        sorted.forEach(col => {
            const colEl = document.createElement('div');
            colEl.className = 'column' + (col.id === 'done' ? ' column-done' : '');
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

            colEl.querySelector('.col-name').addEventListener('click', () => this.openColModal(col));
            colEl.querySelector('.add-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTaskModal(null, col.id);
            });

            const content = colEl.querySelector('.column-content');
            if (tasks.length === 0) {
                const emptyMsg = col.id === 'done' ? 'No completed tasks' : 'No tasks — drag here or click +';
                content.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
            } else {
                tasks.forEach(t => content.appendChild(this.createCard(t)));
            }

            this.boardColumns.appendChild(colEl);
        });

        this.updateStatusSelect();
    }

    renderHeaderStats() {
        const stats = document.getElementById('header-stats');
        const total = this.tasks.length;
        const done = this.tasks.filter(t => t.status === 'done').length;
        const today = this.tasks.filter(t => t.status === 'today').length;
        const overdue = this.tasks.filter(t => {
            if (!t.dueDate || t.status === 'done') return false;
            return new Date(t.dueDate) < new Date();
        }).length;

        let html = `<span class="header-stat">Total: <span class="stat-count">${total}</span></span>`;
        if (today > 0) html += `<span class="header-stat">Today: <span class="stat-count">${today}</span></span>`;
        if (done > 0) html += `<span class="header-stat">Done: <span class="stat-count">${done}</span></span>`;
        if (overdue > 0) html += `<span class="header-stat" style="color:#ef4444">Overdue: <span class="stat-count" style="color:#ef4444">${overdue}</span></span>`;
        stats.innerHTML = html;
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

    renderList(container, tasks, listType) {
        container.innerHTML = '';
        if (!tasks.length) {
            if (listType === 'inbox') {
                container.innerHTML = '<div class="empty-state empty-state-cta">No new tasks<br><span class="empty-hint">Press <kbd>N</kbd> or click + to add one</span></div>';
            } else {
                container.innerHTML = '<div class="empty-state">No tasks</div>';
            }
            return;
        }
        tasks.forEach(t => container.appendChild(this.createCard(t)));
    }

    createCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card' + (task.status === 'done' ? ' done-card' : '');
        card.draggable = true;
        card.dataset.taskId = task.id;

        let meta = '';
        if (task.dueDate) meta += `<span>${this.fmtDate(new Date(task.dueDate))}</span>`;
        const commentCount = (task.comments || []).length;
        if (commentCount > 0) meta += `<span>💬 ${commentCount}</span>`;

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

    fmtTimeAgo(dateStr) {
        const d = new Date(dateStr);
        const diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    // ── Task Modal ──

    openTaskModal(task = null, defaultStatus = 'inbox') {
        const edit = !!task;
        document.getElementById('modal-title').textContent = edit ? 'Edit Task' : 'New Task';
        document.getElementById('delete-task').style.display = edit ? 'block' : 'none';
        this.updateStatusSelect();

        const activitySection = document.getElementById('task-activity');
        const activityFeed = document.getElementById('activity-feed');

        if (edit) {
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            this.setPriority(task.priority || 'medium');
            document.getElementById('task-status').value = task.status || 'inbox';

            if (task.dueDate) {
                const d = new Date(task.dueDate);
                document.getElementById('task-due-date').value = this.toLocalISO(d);
            } else {
                document.getElementById('task-due-date').value = '';
            }
            document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));

            const comments = task.comments || [];
            if (comments.length > 0) {
                activitySection.style.display = 'block';
                activityFeed.innerHTML = '';
                comments.forEach(c => {
                    const icon = c.author === 'AI Employee' ? '🤖' : '👤';
                    const item = document.createElement('div');
                    item.className = `activity-item type-${c.type || 'comment'}`;
                    item.innerHTML = `
                        <div class="activity-avatar">${icon}</div>
                        <div class="activity-body">
                            <div class="activity-author">${this.esc(c.author || 'AI Employee')}</div>
                            <div class="activity-content">${this.esc(c.content)}</div>
                            <div class="activity-time">${this.fmtTimeAgo(c.createdAt)}</div>
                        </div>
                    `;
                    activityFeed.appendChild(item);
                });
            } else {
                activitySection.style.display = 'block';
                activityFeed.innerHTML = '<div class="activity-empty">No activity yet</div>';
            }
        } else {
            this.taskForm.reset();
            document.getElementById('task-id').value = '';
            document.getElementById('task-status').value = defaultStatus;
            this.setPriority('medium');
            document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
            activitySection.style.display = 'none';
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
        else data.dueDate = null;

        const id = document.getElementById('task-id').value;
        const isEdit = !!id;
        try {
            const r = id
                ? await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id }) })
                : await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                this.toast(err.error || 'Failed to save task', 'error');
                return;
            }
            const result = await r.json();
            const idx = this.tasks.findIndex(t => t.id === result.id);
            if (idx >= 0) this.tasks[idx] = result; else this.tasks.push(result);
            this.render();
            this.closeTaskModal();
            this.toast(isEdit ? 'Task updated' : 'Task created!');
        } catch (e) {
            console.error(e);
            this.toast('Failed to save task — check your connection', 'error');
        }
    }

    async deleteCurrent() {
        const id = document.getElementById('task-id').value;
        if (!id || !confirm('Delete this task?')) return;
        try {
            const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.render();
            this.closeTaskModal();
            this.toast('Task deleted');
        } catch (e) {
            console.error(e);
            this.toast('Failed to delete task', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.mc = new MissionControl(); });
