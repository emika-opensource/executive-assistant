const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = process.env.DATA_DIR || '/home/node/emika/mission-control';
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const COLUMNS_FILE = path.join(DATA_DIR, 'columns.json');

const DEFAULT_COLUMNS = [
    { id: 'today', name: 'Today', order: 0 },
    { id: 'this-week', name: 'This Week', order: 1 },
    { id: 'later', name: 'Later', order: 2 },
    { id: 'done', name: 'Done', order: 3 },
];

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Helpers ──

async function ensureDataDir() {
    try {
        await fs.ensureDir(DATA_DIR);
        if (!(await fs.pathExists(TASKS_FILE))) await fs.writeJson(TASKS_FILE, []);
        if (!(await fs.pathExists(ACTIVITIES_FILE))) await fs.writeJson(ACTIVITIES_FILE, []);
        if (!(await fs.pathExists(COLUMNS_FILE))) await fs.writeJson(COLUMNS_FILE, DEFAULT_COLUMNS);
    } catch (error) {
        console.error('Data dir error:', error);
        const fallback = path.join(__dirname, 'data');
        await fs.ensureDir(fallback);
    }
}

async function load(file, fallback = []) {
    try { return await fs.pathExists(file) ? await fs.readJson(file) : fallback; }
    catch { return fallback; }
}
async function save(file, data) {
    try { await fs.writeJson(file, data, { spaces: 2 }); return true; }
    catch { return false; }
}

async function logActivity(type, content, author = 'System') {
    try {
        const activities = await load(ACTIVITIES_FILE);
        activities.unshift({
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            type, content, author,
            createdAt: new Date().toISOString()
        });
        if (activities.length > 100) activities.splice(100);
        await save(ACTIVITIES_FILE, activities);
    } catch {}
}

// ── Columns API ──

app.get('/api/columns', async (req, res) => {
    const columns = await load(COLUMNS_FILE, DEFAULT_COLUMNS);
    res.json(columns.sort((a, b) => a.order - b.order));
});

app.post('/api/columns', async (req, res) => {
    const columns = await load(COLUMNS_FILE, DEFAULT_COLUMNS);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Column name required' });
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `col-${Date.now()}`;
    if (columns.find(c => c.id === id)) return res.status(400).json({ error: 'Column already exists' });
    const newCol = { id, name, order: columns.length };
    columns.push(newCol);
    await save(COLUMNS_FILE, columns);
    await logActivity('column', `Added column: ${name}`);
    res.status(201).json(newCol);
});

app.put('/api/columns/:id', async (req, res) => {
    const columns = await load(COLUMNS_FILE, DEFAULT_COLUMNS);
    const col = columns.find(c => c.id === req.params.id);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    if (req.body.name !== undefined) col.name = req.body.name;
    if (req.body.order !== undefined) col.order = req.body.order;
    await save(COLUMNS_FILE, columns);
    res.json(col);
});

app.put('/api/columns', async (req, res) => {
    // Bulk reorder: expects array of { id, order } or full column objects
    const updates = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Expected array' });
    const columns = await load(COLUMNS_FILE, DEFAULT_COLUMNS);
    updates.forEach(u => {
        const col = columns.find(c => c.id === u.id);
        if (col) {
            if (u.name !== undefined) col.name = u.name;
            if (u.order !== undefined) col.order = u.order;
        }
    });
    await save(COLUMNS_FILE, columns);
    res.json(columns.sort((a, b) => a.order - b.order));
});

app.delete('/api/columns/:id', async (req, res) => {
    let columns = await load(COLUMNS_FILE, DEFAULT_COLUMNS);
    const col = columns.find(c => c.id === req.params.id);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    // Move tasks from deleted column to inbox
    const tasks = await load(TASKS_FILE);
    let moved = 0;
    tasks.forEach(t => { if (t.status === req.params.id) { t.status = 'inbox'; moved++; } });
    if (moved) await save(TASKS_FILE, tasks);
    columns = columns.filter(c => c.id !== req.params.id);
    // Reindex order
    columns.sort((a, b) => a.order - b.order).forEach((c, i) => c.order = i);
    await save(COLUMNS_FILE, columns);
    await logActivity('column', `Removed column: ${col.name}` + (moved ? ` (${moved} tasks moved to Inbox)` : ''));
    res.json({ message: 'Column deleted', movedTasks: moved });
});

// ── Tasks API ──

app.get('/api/tasks', async (req, res) => {
    res.json(await load(TASKS_FILE));
});

app.get('/api/tasks/:id', async (req, res) => {
    const tasks = await load(TASKS_FILE);
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
});

app.post('/api/tasks', async (req, res) => {
    const tasks = await load(TASKS_FILE);
    const t = {
        id: req.body.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        title: req.body.title,
        description: req.body.description || '',
        priority: req.body.priority || 'medium',
        status: req.body.status || 'inbox',
        assignee: req.body.assignee || '',
        dueDate: req.body.dueDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: req.body.comments || []
    };
    if (!t.title) return res.status(400).json({ error: 'Title required' });
    tasks.push(t);
    await save(TASKS_FILE, tasks);
    await logActivity('created', `Created task: ${t.title}`);
    res.status(201).json(t);
});

app.put('/api/tasks', async (req, res) => {
    const tasks = await load(TASKS_FILE);
    const idx = tasks.findIndex(t => t.id === req.body.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    const old = { ...tasks[idx] };
    tasks[idx] = { ...old, ...req.body, updatedAt: new Date().toISOString() };
    await save(TASKS_FILE, tasks);
    if (old.status !== tasks[idx].status) {
        await logActivity('moved', `Moved "${tasks[idx].title}" → ${tasks[idx].status}`);
    }
    res.json(tasks[idx]);
});

// Add comment/activity to a specific task
app.post('/api/tasks/:id/comments', async (req, res) => {
    const tasks = await load(TASKS_FILE);
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!req.body.content) return res.status(400).json({ error: 'Content required' });
    if (!task.comments) task.comments = [];
    const comment = {
        id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        content: req.body.content,
        author: req.body.author || 'AI Employee',
        type: req.body.type || 'comment',
        createdAt: new Date().toISOString()
    };
    task.comments.push(comment);
    task.updatedAt = new Date().toISOString();
    await save(TASKS_FILE, tasks);
    res.status(201).json(comment);
});

app.delete('/api/tasks/:id', async (req, res) => {
    let tasks = await load(TASKS_FILE);
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    tasks = tasks.filter(t => t.id !== req.params.id);
    await save(TASKS_FILE, tasks);
    await logActivity('deleted', `Deleted: ${task.title}`);
    res.json({ message: 'Deleted' });
});

// ── Activities API ──

app.get('/api/activities', async (req, res) => {
    res.json(await load(ACTIVITIES_FILE));
});

app.post('/api/activities', async (req, res) => {
    if (!req.body.content) return res.status(400).json({ error: 'Content required' });
    const activities = await load(ACTIVITIES_FILE);
    const a = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: req.body.type || 'update',
        content: req.body.content,
        author: req.body.author || 'AI Employee',
        createdAt: new Date().toISOString()
    };
    activities.unshift(a);
    if (activities.length > 100) activities.splice(100);
    await save(ACTIVITIES_FILE, activities);
    res.status(201).json(a);
});

// ── Stats & Health ──

app.get('/api/stats', async (req, res) => {
    const tasks = await load(TASKS_FILE);
    const columns = await load(COLUMNS_FILE, DEFAULT_COLUMNS);
    const byStatus = {};
    columns.forEach(c => byStatus[c.id] = 0);
    byStatus.inbox = 0;
    tasks.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
    res.json({ total: tasks.length, byStatus });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files + SPA fallback (AFTER API routes)
app.use(express.static(path.join(__dirname)));
app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, 'index.html'));
});

async function start() {
    await ensureDataDir();
    app.listen(PORT, () => console.log(`🚀 Mission Control on port ${PORT}`));
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
start();
