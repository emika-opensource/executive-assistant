# Executive Assistant Mission Control - API Tools

## Overview

The Mission Control dashboard uses a kanban-style board with these columns:
- **Inbox**: All new tasks land here initially
- **Today**: Tasks to be completed today
- **This Week**: Tasks for this week
- **Later**: Future tasks and backlog
- **Done**: Completed tasks

## Base URL
```
http://localhost:3000/api
```

## Task Management

### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review quarterly report",
    "description": "Analyze Q3 performance metrics and prepare summary",
    "priority": "high",
    "status": "inbox",
    "assignee": "AI Employee",
    "dueDate": "2026-02-10T15:00:00Z"
  }'
```

**Statuses**: `inbox`, `today`, `this-week`, `later`, `done`  
**Priorities**: `low`, `medium`, `high`, `urgent`

### Update Task (Move Between Columns)
```bash
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task_1707408000_abc123",
    "status": "today"
  }'
```

### Get All Tasks
```bash
curl http://localhost:3000/api/tasks
```

### Get Single Task
```bash
curl http://localhost:3000/api/tasks/task_1707408000_abc123
```

### Delete Task
```bash
curl -X DELETE http://localhost:3000/api/tasks/task_1707408000_abc123
```

## Activity Feed

### Post Activity Update
```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "type": "progress",
    "content": "Completed 3 tasks this morning. Moving email campaign to review.",
    "author": "AI Employee"
  }'
```

**Activity Types**: `checkin`, `progress`, `update`, `report`, `completed`, `moved`, `created`

### Get Activities
```bash
curl http://localhost:3000/api/activities
```

## Daily Reports

### Get Daily Summary (for evening reports)
```bash
curl http://localhost:3000/api/daily-summary
```

**Response includes:**
- Tasks completed today
- Tasks moved between columns
- Current status breakdown
- Overdue tasks
- Activity count

### Get Morning Update (for daily planning)
```bash
curl http://localhost:3000/api/morning-update
```

**Response includes:**
- Today's scheduled tasks
- Tasks due today
- Overdue items
- High priority tasks
- Inbox items needing attention

## Statistics
```bash
curl http://localhost:3000/api/stats
```

## Typical AI Employee Workflow

### 1. Morning Check-in (8 AM UTC)
```bash
# Get morning update
UPDATE=$(curl -s http://localhost:3000/api/morning-update)

# Post morning summary
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "type": "checkin",
    "content": "Good morning! Found 5 tasks for today, 2 overdue items need attention. Starting with high priority tasks.",
    "author": "AI Employee"
  }'
```

### 2. Moving Tasks Throughout Day
```bash
# Move task from inbox to today
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id": "task_123", "status": "today"}'

# Complete a task
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id": "task_123", "status": "done"}'
```

### 3. Evening Summary (6 PM UTC)
```bash
# Get daily summary
SUMMARY=$(curl -s http://localhost:3000/api/daily-summary)

# Post end-of-day report
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "type": "report",
    "content": "Daily wrap-up: Completed 8 tasks, 2 moved to this-week. Tomorrow: Focus on project proposal and client calls.",
    "author": "AI Employee"
  }'
```

## Task Status Flow

```
inbox → today → done
inbox → this-week → today → done  
inbox → later → this-week → today → done
```

## Error Handling

All endpoints return:
- **200/201**: Success
- **400**: Bad request (missing required fields)
- **404**: Task not found
- **500**: Server error

Check the response body for error details:
```json
{
  "error": "Task title is required"
}
```

## Tips for AI Employees

1. **Check morning update first** - Sets daily priorities
2. **Use inbox for triage** - All new tasks go here initially
3. **Move strategically** - Today = must do today, This Week = can wait a few days
4. **Post progress updates** - Keep activity feed active
5. **Evening summary** - Review what was accomplished
6. **Batch operations** - Update multiple tasks efficiently
7. **Monitor overdue** - Address these first in morning routine