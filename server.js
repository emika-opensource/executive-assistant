const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory setup
const DATA_DIR = process.env.DATA_DIR || '/home/node/emika/mission-control';
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('.'));

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.ensureDir(DATA_DIR);
        console.log(`Data directory ensured: ${DATA_DIR}`);
        
        // Initialize files if they don't exist
        if (!(await fs.pathExists(TASKS_FILE))) {
            await fs.writeJson(TASKS_FILE, []);
            console.log('Initialized tasks.json');
        }
        
        if (!(await fs.pathExists(ACTIVITIES_FILE))) {
            await fs.writeJson(ACTIVITIES_FILE, []);
            console.log('Initialized activities.json');
        }
    } catch (error) {
        console.error('Error ensuring data directory:', error);
        // Fallback to local directory
        const fallbackDir = path.join(__dirname, 'data');
        await fs.ensureDir(fallbackDir);
        console.log(`Using fallback data directory: ${fallbackDir}`);
        return fallbackDir;
    }
    return DATA_DIR;
}

// Load data from JSON files
async function loadTasks() {
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

async function saveTasks(tasks) {
    try {
        await fs.writeJson(TASKS_FILE, tasks, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('Error saving tasks:', error);
        return false;
    }
}

async function loadActivities() {
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

async function saveActivities(activities) {
    try {
        await fs.writeJson(ACTIVITIES_FILE, activities, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('Error saving activities:', error);
        return false;
    }
}

// API Routes

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await loadTasks();
        res.json(tasks);
    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({ error: 'Failed to load tasks' });
    }
});

// Get single task
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const tasks = await loadTasks();
        const task = tasks.find(t => t.id === req.params.id);
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(task);
    } catch (error) {
        console.error('Error getting task:', error);
        res.status(500).json({ error: 'Failed to load task' });
    }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
    try {
        const tasks = await loadTasks();
        const newTask = {
            id: req.body.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: req.body.title,
            description: req.body.description || '',
            priority: req.body.priority || 'medium',
            status: req.body.status || 'backlog',
            assignee: req.body.assignee || '',
            dueDate: req.body.dueDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: req.body.comments || []
        };
        
        // Validate required fields
        if (!newTask.title) {
            return res.status(400).json({ error: 'Task title is required' });
        }
        
        tasks.push(newTask);
        
        if (await saveTasks(tasks)) {
            // Log activity
            await logActivity('created', `Created task: ${newTask.title}`, 'System');
            res.status(201).json(newTask);
        } else {
            res.status(500).json({ error: 'Failed to save task' });
        }
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
app.put('/api/tasks', async (req, res) => {
    try {
        const tasks = await loadTasks();
        const taskIndex = tasks.findIndex(t => t.id === req.body.id);
        
        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const oldTask = { ...tasks[taskIndex] };
        const updatedTask = {
            ...oldTask,
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        // Validate required fields
        if (!updatedTask.title) {
            return res.status(400).json({ error: 'Task title is required' });
        }
        
        tasks[taskIndex] = updatedTask;
        
        if (await saveTasks(tasks)) {
            // Log activity for status changes
            if (oldTask.status !== updatedTask.status) {
                await logActivity('moved', `Moved task "${updatedTask.title}" from ${oldTask.status} to ${updatedTask.status}`, 'System');
            } else {
                await logActivity('updated', `Updated task: ${updatedTask.title}`, 'System');
            }
            
            res.json(updatedTask);
        } else {
            res.status(500).json({ error: 'Failed to update task' });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const tasks = await loadTasks();
        const taskIndex = tasks.findIndex(t => t.id === req.params.id);
        
        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const deletedTask = tasks[taskIndex];
        tasks.splice(taskIndex, 1);
        
        if (await saveTasks(tasks)) {
            await logActivity('deleted', `Deleted task: ${deletedTask.title}`, 'System');
            res.json({ message: 'Task deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete task' });
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Get activities
app.get('/api/activities', async (req, res) => {
    try {
        const activities = await loadActivities();
        res.json(activities);
    } catch (error) {
        console.error('Error getting activities:', error);
        res.status(500).json({ error: 'Failed to load activities' });
    }
});

// Add activity (for AI Employee to post updates)
app.post('/api/activities', async (req, res) => {
    try {
        const activities = await loadActivities();
        const newActivity = {
            id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: req.body.type || 'update',
            content: req.body.content,
            author: req.body.author || 'AI Employee',
            createdAt: new Date().toISOString()
        };
        
        if (!newActivity.content) {
            return res.status(400).json({ error: 'Activity content is required' });
        }
        
        activities.unshift(newActivity);
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.splice(100);
        }
        
        if (await saveActivities(activities)) {
            res.status(201).json(newActivity);
        } else {
            res.status(500).json({ error: 'Failed to save activity' });
        }
    } catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).json({ error: 'Failed to create activity' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        dataDir: DATA_DIR,
        tasksFile: TASKS_FILE
    });
});

// Statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const tasks = await loadTasks();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const stats = {
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
        
        res.json(stats);
    } catch (error) {
        console.error('Error calculating stats:', error);
        res.status(500).json({ error: 'Failed to calculate statistics' });
    }
});

// Helper function to log activities
async function logActivity(type, content, author = 'System') {
    try {
        const activities = await loadActivities();
        const activity = {
            id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            content: content,
            author: author,
            createdAt: new Date().toISOString()
        };
        
        activities.unshift(activity);
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.splice(100);
        }
        
        await saveActivities(activities);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        // Serve index.html for SPA routing
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Initialize and start server
async function startServer() {
    try {
        await ensureDataDir();
        
        app.listen(PORT, () => {
            console.log(`
🚀 Executive Assistant Mission Control Dashboard
📊 Server running on port ${PORT}
📁 Data directory: ${DATA_DIR}
📄 Tasks file: ${TASKS_FILE}
🔗 Dashboard: http://localhost:${PORT}
🔗 API Health: http://localhost:${PORT}/api/health
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    process.exit(0);
});

// Start the server
startServer();