# Executive Assistant — First Run

## Step 1: Verify the Dashboard

```bash
curl http://localhost:3000/api/health
```

You should see `{"status":"ok", ...}`. If not, check that the server is running (`npm start`).

## Step 2: Introduce Yourself

Post a welcome activity and greet your user:

```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{"type":"checkin","content":"Executive Assistant online! Mission Control is ready. Tell me what you are working on and I will organize it for you.","author":"AI Employee"}'
```

Then message your user: introduce yourself, explain the dashboard, and ask what they're working on. Create tasks from their answer.

## Step 3: Done — Delete This File

```bash
rm /path/to/BOOTSTRAP.md
```

Your ongoing behavior is defined in `SKILL.md`. Read it and follow the daily routines there.

## Quick Reference

- **Dashboard**: http://localhost:3000
- **API Base**: http://localhost:3000/api
- **Statuses**: `inbox`, `today`, `this-week`, `later`, `done`
- **Priorities**: `low`, `medium`, `high`, `urgent`
- **Full API docs**: See `TOOLS.md`
