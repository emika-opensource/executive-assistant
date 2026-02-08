# Executive Assistant Mission Control Skill

This skill provides the AI Employee Executive Assistant with comprehensive task management and mission control capabilities through a Trello-like kanban board interface.

## Features

- **Kanban Board**: Inbox → Today → This Week → Later → Done workflow
- **Task Management**: Create, update, move, and complete tasks via API
- **Activity Logging**: Post daily updates and progress reports  
- **Daily Reports**: Automated morning briefings and evening summaries
- **Drag & Drop**: Visual task management through web interface
- **Minimal Design**: Clean, focused Trello-inspired UI

## Board Structure

### Column Workflow
```
Inbox → Today → Done
Inbox → This Week → Today → Done
Inbox → Later → This Week → Today → Done
```

### Column Purposes
- **Inbox**: All new tasks land here - triage and organize daily
- **Today**: Must-complete tasks for today
- **This Week**: Tasks for this week, flexible timing
- **Later**: Future tasks, ideas, backlog
- **Done**: Completed tasks

## Core Functions

### Task Operations

```javascript
// Create task in inbox (default)
await createTask({
  title: "Process incoming emails",
  description: "Review and respond to priority messages",
  priority: "high",  // low, medium, high, urgent
  status: "inbox",   // inbox, today, this-week, later, done
  assignee: "AI Employee",
  dueDate: "2026-02-09T09:00:00Z"
});

// Move task between columns
await moveTask("task_id", "today");

// Complete task
await completeTask("task_id", "All emails processed and responded to");
```

### Activity Logging

```javascript
// Morning check-in
await logActivity({
  type: "checkin",
  content: "Good morning! 8 items in inbox, 3 tasks scheduled for today. Starting with urgent email responses.",
  author: "AI Employee"
});

// Progress update  
await logActivity({
  type: "progress", 
  content: "Moved 'Client presentation' from this-week to today. ETA 2 hours completion.",
  author: "AI Employee"
});

// Daily summary
await logActivity({
  type: "report",
  content: "Daily wrap-up: 6 tasks completed, 2 moved to this-week. Tomorrow focus: project proposal and team meeting prep.",
  author: "AI Employee"  
});
```

## Scheduled Operations

### Morning Check-in (8:00 AM UTC)
```javascript
async function morningRoutine() {
  // Get daily briefing data
  const update = await api('GET', '/api/morning-update');
  
  // Review high priority and overdue items
  const priorities = update.tasks.highPriority;
  const overdue = update.tasks.overdue;
  
  // Create morning activity post
  const summary = generateMorningBriefing(update);
  await logActivity('checkin', summary);
  
  // Escalate overdue items if needed
  if (overdue.length > 0) {
    await escalateOverdueTasks(overdue);
  }
}
```

### Evening Summary (6:00 PM UTC)  
```javascript
async function eveningRoutine() {
  // Get daily summary data
  const summary = await api('GET', '/api/daily-summary');
  
  // Generate end-of-day report
  const report = generateEveningReport(summary);
  await logActivity('report', report);
  
  // Archive completed tasks older than 7 days
  await archiveOldTasks();
  
  // Plan tomorrow's priorities
  await planTomorrowTasks();
}
```

## API Usage Examples

### Reading Data
```javascript
// Get all tasks
const tasks = await api('GET', '/api/tasks');

// Filter by column
const todayTasks = tasks.filter(t => t.status === 'today');
const inboxItems = tasks.filter(t => t.status === 'inbox');

// Find overdue tasks
const overdue = tasks.filter(t => {
  if (!t.dueDate || t.status === 'done') return false;
  return new Date(t.dueDate) < new Date();
});
```

### Managing Tasks
```javascript
// Create from email or request
await api('POST', '/api/tasks', {
  title: extractedTitle,
  description: extractedDetails,
  priority: determinePriority(content),
  status: 'inbox',  // Always start in inbox
  assignee: 'AI Employee'
});

// Move through workflow
await api('PUT', '/api/tasks', {
  id: taskId,
  status: 'today',  // inbox → today
  updatedAt: new Date().toISOString()
});

// Complete task
await api('PUT', '/api/tasks', {
  id: taskId, 
  status: 'done',
  updatedAt: new Date().toISOString()
});
```

### Activity Updates
```javascript
// Regular progress posts
await api('POST', '/api/activities', {
  type: 'progress',
  content: 'Completed user research analysis. Moving to review phase.',
  author: 'AI Employee'
});
```

## Daily Workflows

### 1. Morning Routine (8 AM UTC)
```javascript
async function morningCheckIn() {
  // Get morning update data
  const briefing = await api('GET', '/api/morning-update');
  
  // Post morning summary
  const content = `Good morning! Today's focus:
• ${briefing.todayTasks} tasks scheduled
• ${briefing.dueToday} items due today  
• ${briefing.inboxItems} inbox items to triage
${briefing.overdue > 0 ? `• ⚠️  ${briefing.overdue} overdue items need attention` : ''}

Starting with high priority tasks.`;

  await api('POST', '/api/activities', {
    type: 'checkin',
    content: content,
    author: 'AI Employee'
  });
  
  // Handle overdue items
  if (briefing.overdue > 0) {
    await processOverdueTasks(briefing.tasks.overdue);
  }
  
  // Triage inbox
  if (briefing.inboxItems > 0) {
    await triageInboxTasks(briefing.tasks.inbox);
  }
}
```

### 2. Hourly Progress (During Work Hours)
```javascript
async function hourlyUpdate() {
  // Check for completed tasks to move to done
  const completedTasks = await findCompletedTasks();
  for (const task of completedTasks) {
    await moveTask(task.id, 'done');
  }
  
  // Post progress if significant activity
  if (completedTasks.length > 0) {
    await api('POST', '/api/activities', {
      type: 'progress',
      content: `Progress update: Completed ${completedTasks.length} task(s). ${getCurrentFocus()}`,
      author: 'AI Employee'
    });
  }
}
```

### 3. Evening Wrap-up (6 PM UTC)
```javascript
async function eveningWrapUp() {
  // Get daily summary
  const summary = await api('GET', '/api/daily-summary');
  
  // Generate end-of-day report
  const report = `Daily wrap-up:
• Completed: ${summary.completedToday} tasks
• Moved: ${summary.movedToday} items between columns
• Status: ${summary.tasksByStatus.today} today, ${summary.tasksByStatus['this-week']} this week
${summary.overdueTasks > 0 ? `• Outstanding: ${summary.overdueTasks} overdue` : ''}

Tomorrow: Focus on ${getTomorrowPriorities()}`;

  await api('POST', '/api/activities', {
    type: 'report', 
    content: report,
    author: 'AI Employee'
  });
  
  // Clean up done tasks older than 7 days
  await archiveOldCompletedTasks();
}
```

## Integration Points

### 1. Email Processing
When processing emails:
```javascript
// Create task from email
await createTaskFromEmail({
  subject: email.subject,
  body: email.body,
  sender: email.from,
  priority: determinePriorityFromContent(email.body),
  status: 'inbox'  // Always start here for triage
});
```

### 2. Calendar Integration  
```javascript
// Create prep tasks from calendar events
for (const event of upcomingMeetings) {
  await createTask({
    title: `Prep for ${event.title}`,
    description: `Prepare materials and agenda for ${event.title}`,
    priority: 'high',
    status: event.start < tomorrow ? 'today' : 'this-week',
    dueDate: event.start
  });
}
```

### 3. Slack/Chat Integration
```javascript
// Post daily summary to team channel
await postToSlack(generateTeamSummary(dailySummary));

// Create tasks from chat commands
if (message.includes('/task')) {
  const taskDetails = parseTaskCommand(message);
  await createTask({...taskDetails, status: 'inbox'});
}
```

## Column Management Strategy

### Inbox Triage Rules
```javascript
function triageTask(task) {
  // Urgent/due today → Today column
  if (task.priority === 'urgent' || isDueToday(task)) {
    return 'today';
  }
  
  // Due this week → This Week column  
  if (isDueThisWeek(task)) {
    return 'this-week';
  }
  
  // Everything else → Later column
  return 'later';
}
```

### Column Limits (Recommended)
- **Today**: Max 8-10 tasks (realistic daily capacity)
- **This Week**: Max 15-20 tasks
- **Later**: Unlimited (regular grooming needed)
- **Inbox**: Process to empty daily

## Monitoring & Health

### Key Metrics to Track
```javascript
const healthMetrics = {
  inboxAge: getAverageInboxTaskAge(),      // Should be < 24 hours
  overdueCount: getOverdueTaskCount(),     // Should trend toward 0
  dailyCompletions: getDailyCompletions(), // Track productivity
  columnDistribution: getColumnCounts()    // Balanced workload
};
```

### Weekly Review (Fridays)
```javascript
async function weeklyReview() {
  const weekTasks = await getTasksForWeek();
  const stats = calculateWeeklyStats(weekTasks);
  
  const report = `Weekly Review:
• Completed: ${stats.completed} tasks
• Created: ${stats.created} new tasks  
• Avg completion time: ${stats.avgCompletionTime}
• Focus areas: ${stats.topCategories.join(', ')}

Next week: ${generateNextWeekPriorities()}`;

  await api('POST', '/api/activities', {
    type: 'report',
    content: report,
    author: 'AI Employee'
  });
}
```

## Error Handling & Resilience

```javascript
// Robust task operations with fallbacks
async function safeTaskUpdate(taskId, updates) {
  try {
    return await api('PUT', '/api/tasks', {id: taskId, ...updates});
  } catch (error) {
    // Log error but don't fail entire workflow
    await logActivity('error', `Failed to update task ${taskId}: ${error.message}`);
    
    // Retry once
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await api('PUT', '/api/tasks', {id: taskId, ...updates});
    } catch (retryError) {
      // Final fallback: log for manual review
      await logActivity('error', `Task update failed after retry: ${taskId}`);
      throw retryError;
    }
  }
}
```

## Performance Best Practices

1. **Batch Operations**: Group multiple task updates
2. **Smart Filtering**: Cache frequently accessed task lists
3. **Async Processing**: Use background tasks for reports  
4. **Rate Limiting**: Respect API limits during bulk operations
5. **Efficient Queries**: Filter on client side when possible

## Security & Data

- All data stored locally in JSON files
- No external API dependencies required
- Dashboard accessible only on local network
- File permissions managed by OpenClaw
- Activity logs preserved for audit trail

This skill transforms the mission control dashboard from a traditional project management tool into a streamlined, AI-driven task orchestration system optimized for executive assistant workflows.