---
name: mission-control
description: Manage tasks, columns, and activity on the Mission Control dashboard. Create, move, complete tasks. Post check-ins, progress updates, and daily reports. Dashboard runs on localhost:3000.
---

# Mission Control — Task & Activity Management

Your Mission Control dashboard runs at `http://localhost:3000`. Use `curl` to interact with it.

## Tasks

### List all tasks
```bash
curl -s http://localhost:3000/api/tasks | jq .
```

### Create a task
```bash
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"TITLE","description":"DESC","priority":"medium","status":"inbox"}'
```
- **priority**: `low`, `medium`, `high`, `urgent`
- **status**: `inbox`, `today`, `this-week`, `later`, `done` (or any custom column id)

### Update / move a task
```bash
curl -s -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id":"TASK_ID","status":"today"}'
```
You can update any field: `title`, `description`, `priority`, `status`, `assignee`, `dueDate`.

### Complete a task
```bash
curl -s -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id":"TASK_ID","status":"done"}'
```

### Delete a task
```bash
curl -s -X DELETE http://localhost:3000/api/tasks/TASK_ID
```

### Get a single task
```bash
curl -s http://localhost:3000/api/tasks/TASK_ID | jq .
```

## Activities (Activity Feed)

### Post an activity
```bash
curl -s -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{"type":"TYPE","content":"MESSAGE","author":"AI Employee"}'
```
- **type**: `checkin` (morning), `progress` (during day), `report` (evening), `update` (general)

### List activities
```bash
curl -s http://localhost:3000/api/activities | jq .
```

## Columns

### List columns
```bash
curl -s http://localhost:3000/api/columns | jq .
```

### Add a column
```bash
curl -s -X POST http://localhost:3000/api/columns \
  -H "Content-Type: application/json" -d '{"name":"Blocked"}'
```

### Rename a column
```bash
curl -s -X PUT http://localhost:3000/api/columns/COLUMN_ID \
  -H "Content-Type: application/json" -d '{"name":"New Name"}'
```

### Delete a column (tasks move to inbox)
```bash
curl -s -X DELETE http://localhost:3000/api/columns/COLUMN_ID
```

## Stats
```bash
curl -s http://localhost:3000/api/stats | jq .
```

## Daily Workflow

### Morning Check-in
1. `GET /api/tasks` — review all tasks
2. Move urgent/overdue items to `today`
3. Triage inbox items
4. `POST /api/activities` with type `checkin` — summarize today's plan

### During the Day
- Create tasks as work comes in (always to `inbox` first, then triage)
- Move tasks through: `inbox` → `today` → `done`
- Post `progress` activities for significant updates

### Evening Wrap-up
1. Move completed work to `done`
2. Move unfinished `today` items to `this-week`
3. `POST /api/activities` with type `report` — daily summary

## Rules
- Always start new tasks in `inbox` unless explicitly urgent
- Keep `today` to max 8-10 tasks
- Process inbox to empty daily
- The user sees the dashboard at their server URL — keep it organized
