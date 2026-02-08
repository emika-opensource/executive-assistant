# Executive Assistant Mission Control Skill

This skill provides the AI Employee Executive Assistant with comprehensive task management and mission control capabilities through the Executive Assistant dashboard.

## Features

- **Task Management**: Create, update, move, and complete tasks
- **Activity Logging**: Post daily updates and progress reports
- **Data Access**: Read/write mission control JSON files
- **Dashboard Integration**: Seamless integration with the web dashboard
- **Scheduled Updates**: Automated daily check-ins and reports

## Files and Data

### Data Files (in /home/node/emika/mission-control/)
- `tasks.json` - All task data with full metadata
- `activities.json` - Activity feed entries and AI updates

### Dashboard API (http://localhost:3000/api/)
- Tasks CRUD operations
- Activity feed management
- Real-time statistics
- Health monitoring

## Core Functions

### Task Operations

```javascript
// Create a new task
await createTask({
  title: "Weekly progress report",
  description: "Compile and send weekly summary to stakeholders",
  priority: "high", // low, medium, high, urgent
  status: "backlog", // backlog, in-progress, review, done
  assignee: "AI Employee",
  dueDate: "2026-02-15T09:00:00Z"
});

// Update task status
await moveTask("task_id", "in-progress");

// Add comment to task
await addTaskComment("task_id", "Started working on this, ETA 2 hours");

// Complete task
await completeTask("task_id", "Task completed successfully");
```

### Activity Logging

```javascript
// Daily check-in
await logActivity({
  type: "checkin",
  content: "Good morning! Ready to tackle today's priorities. I see 3 urgent tasks in the backlog.",
  author: "AI Employee"
});

// Progress update
await logActivity({
  type: "progress",
  content: "Completed 2 tasks this hour. Moving 'Email campaign' to review.",
  author: "AI Employee"
});

// Status report
await logActivity({
  type: "report",
  content: "Daily summary: 8 tasks completed, 2 in progress, 1 blocked. Overall progress: 85%",
  author: "AI Employee"
});
```

## Scheduled Operations

### Daily Check-in (9:00 AM)
- Review overnight activity
- Check for urgent/overdue tasks
- Post morning status update
- Plan day's priorities

### Hourly Progress (during work hours)
- Update task statuses
- Move completed items to review/done
- Log significant progress
- Flag any blockers

### Daily Wrap-up (6:00 PM)
- Complete daily summary
- Archive finished tasks
- Prepare tomorrow's priorities
- Post end-of-day report

### Weekly Review (Friday 5:00 PM)
- Generate weekly statistics
- Create progress charts
- Send stakeholder summary
- Plan next week's goals

## API Usage Examples

### Reading Tasks
```javascript
// Get all tasks
const tasks = await api('GET', '/api/tasks');

// Get tasks by status
const inProgress = tasks.filter(t => t.status === 'in-progress');

// Get overdue tasks
const overdue = tasks.filter(t => {
  if (!t.dueDate || t.status === 'done') return false;
  return new Date(t.dueDate) < new Date();
});
```

### Creating Tasks
```javascript
// From email or chat request
await api('POST', '/api/tasks', {
  title: extractedTitle,
  description: extractedDescription,
  priority: determinePriority(content),
  assignee: 'AI Employee',
  dueDate: parseDate(content) || defaultDueDate()
});
```

### Updating Tasks
```javascript
// Move task through workflow
await api('PUT', '/api/tasks', {
  id: taskId,
  status: newStatus,
  updatedAt: new Date().toISOString()
});
```

### Activity Updates
```javascript
// Regular progress updates
await api('POST', '/api/activities', {
  type: 'progress',
  content: generateProgressMessage(),
  author: 'AI Employee'
});
```

## Common Workflows

### 1. Morning Routine
```javascript
async function morningCheckIn() {
  // Load current state
  const tasks = await loadTasks();
  const overdue = findOverdueTasks(tasks);
  const urgent = findUrgentTasks(tasks);
  
  // Create morning summary
  const summary = generateMorningSummary(tasks, overdue, urgent);
  await logActivity('checkin', summary);
  
  // Update priorities if needed
  if (overdue.length > 0) {
    await escalateOverdueTasks(overdue);
  }
}
```

### 2. Task Completion
```javascript
async function completeTask(taskId, notes) {
  // Update task status
  await api('PUT', '/api/tasks', {
    id: taskId,
    status: 'done',
    updatedAt: new Date().toISOString()
  });
  
  // Log completion
  const task = await getTask(taskId);
  await logActivity('completed', 
    `Completed task: "${task.title}". ${notes}`);
  
  // Check for dependent tasks
  await checkDependentTasks(taskId);
}
```

### 3. Weekly Report
```javascript
async function generateWeeklyReport() {
  const tasks = await loadTasks();
  const weekStart = getWeekStart();
  const weekTasks = filterTasksByWeek(tasks, weekStart);
  
  const stats = calculateWeeklyStats(weekTasks);
  const report = formatWeeklyReport(stats);
  
  // Post to activity feed
  await logActivity('report', report);
  
  // Create next week's planning task
  await createTask({
    title: 'Weekly planning session',
    description: 'Review last week and plan upcoming priorities',
    priority: 'high',
    dueDate: getNextMonday()
  });
}
```

## Integration Points

### 1. Email Processing
When processing emails, check for:
- Task creation requests
- Status update requests  
- Deadline changes
- Priority escalations

### 2. Calendar Sync
- Create tasks from calendar events
- Set due dates based on meetings
- Generate pre-meeting preparation tasks

### 3. Slack/Chat Integration
- Post daily summaries to team channels
- Accept task creation via chat commands
- Provide status updates on request

### 4. External Tools
- Sync with project management tools
- Update documentation systems
- Generate reports for stakeholders

## Error Handling

```javascript
// Robust API calls with fallbacks
async function safeApiCall(method, endpoint, data) {
  try {
    return await api(method, endpoint, data);
  } catch (error) {
    console.error(`API call failed: ${method} ${endpoint}`, error);
    
    // Fallback to file system
    if (endpoint.includes('/tasks')) {
      return await fileSystemFallback(method, data);
    }
    
    // Log error as activity
    await logActivity('error', 
      `System error during ${method} ${endpoint}: ${error.message}`);
    
    throw error;
  }
}
```

## Performance Tips

1. **Batch Operations**: Group multiple task updates
2. **Cache Data**: Keep frequently accessed data in memory
3. **Async Processing**: Use background processing for reports
4. **Rate Limiting**: Respect API limits during bulk operations

## Security Notes

- All data stored locally in JSON files
- No external API calls required
- Dashboard accessible only on local network
- File permissions managed by OpenClaw seat

## Monitoring

The skill includes built-in monitoring for:
- Task completion rates
- Response times
- Error frequencies
- Activity patterns

Access monitoring via `/api/health` endpoint on the dashboard.