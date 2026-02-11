# Mission Control - API Tools

## Overview

Mission Control is a kanban board served at `http://localhost:3000`. Columns are fully dynamic — you can add, rename, reorder, and delete them via API.

Default columns: **Today**, **This Week**, **Later**, **Done** (plus **Inbox** which is always present).

Base URL: `http://localhost:3000`

---

## Columns API

### List columns
```bash
curl http://localhost:3000/api/columns
```

### Add a column
```bash
curl -X POST http://localhost:3000/api/columns \
  -H "Content-Type: application/json" \
  -d '{"name": "Blocked"}'
```

### Rename a column
```bash
curl -X PUT http://localhost:3000/api/columns/blocked \
  -H "Content-Type: application/json" \
  -d '{"name": "On Hold"}'
```

### Reorder columns (bulk)
```bash
curl -X PUT http://localhost:3000/api/columns \
  -H "Content-Type: application/json" \
  -d '[{"id":"today","order":0},{"id":"this-week","order":1},{"id":"blocked","order":2},{"id":"later","order":3},{"id":"done","order":4}]'
```

### Delete a column
Tasks in the deleted column move to Inbox automatically.
```bash
curl -X DELETE http://localhost:3000/api/columns/blocked
```

---

## Tasks API

### List all tasks
```bash
curl http://localhost:3000/api/tasks
```

### Create a task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Review PR #42","priority":"high","status":"today"}'
```

Status can be `inbox`, any column ID, or `done`. Priority: `low`, `medium`, `high`, `urgent`.

### Move a task
```bash
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id":"task_123","status":"done"}'
```

### Delete a task
```bash
curl -X DELETE http://localhost:3000/api/tasks/task_123
```

---

## Task Comments API

Add activity/comments to specific tasks. These show up in the task detail modal.

### Add a comment to a task
```bash
curl -X POST http://localhost:3000/api/tasks/task_123/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"Started working on this. ETA 2 hours.","author":"AI Employee","type":"progress"}'
```

Comment types: `comment` (default), `progress`, `status`, `note`

Use this to:
- Log progress updates on tasks ("50% complete, waiting on API response")
- Add context ("User mentioned this is related to the Q2 launch")
- Record status changes ("Moved to Today — deadline approaching")
- Leave notes ("Blocked by missing credentials, asked user")

---

## Activities API

### Post an update
```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{"type":"checkin","content":"Morning check-in: 3 tasks for today","author":"AI Employee"}'
```

### Get activity feed
```bash
curl http://localhost:3000/api/activities
```

---

## Common Workflows

### Morning routine
1. `GET /api/tasks` — review all tasks
2. Move overdue/priority items to `today`
3. `POST /api/activities` — post morning plan

### Evening summary
1. `GET /api/tasks` — count completed
2. Move finished items to `done`
3. `POST /api/activities` — post daily summary

### Reorganize board
1. `POST /api/columns` — add new columns as needed
2. `PUT /api/columns/:id` — rename existing
3. `PUT /api/columns` — reorder all at once
4. `DELETE /api/columns/:id` — remove unused
