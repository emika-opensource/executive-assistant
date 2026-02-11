# AUDIT.md — Executive Assistant Time-to-First-Value Audit

**Date:** 2026-02-11  
**Auditor:** AI Subagent  
**Verdict:** Functional but slow to deliver value. Several dead ends, phantom features, and a confused identity between what the docs promise and what the code delivers.

---

## 1. First-Run Experience

**Rating: 4/10**

### What actually happens:
1. User deploys the image, server starts, dashboard loads
2. User sees an empty kanban board with 4 columns (Today, This Week, Later, Done) and an empty Inbox
3. There is **zero onboarding UI**. No welcome message, no tutorial, no hints beyond "Everything new lands here" under Inbox
4. The user must already know to click the tiny `+` button to create a task

### Steps to first value:
1. Deploy → 2. Open dashboard → 3. Figure out the `+` button → 4. Fill out modal → 5. Save → **5 steps minimum, with no guidance**

### The real problem:
The SKILL.md describes an elaborate onboarding conversation ("explain what you are", "show the dashboard", "offer integrations"), but **none of this is automated**. It depends entirely on the AI agent reading SKILL.md and proactively messaging the user. If the agent doesn't fire or the user opens the dashboard directly, they get a blank screen with no context.

**There is no BOOTSTRAP.md auto-delete mechanism in the app itself** — it's a manual `rm` command in step 10. The BOOTSTRAP.md also references endpoints that don't exist (`/api/morning-update`, `/api/daily-summary`).

---

## 2. UI/UX Issues

**Rating: 6/10 — Clean design, but multiple UX gaps**

### Good:
- Dark theme is polished, Space Grotesk font looks sharp
- Drag-and-drop between columns works
- Priority picker and date suggestions in the modal are nice touches
- Resize handle between inbox and board is a good detail
- Floating toggle bar at bottom is clean

### Bad:

| Issue | Severity |
|-------|----------|
| **No empty-state guidance** — Empty board says "No tasks" / "No new tasks" with no call-to-action | High |
| **Column add uses `prompt()`** — Browser native prompt for adding columns. Jarring vs the polished modal for tasks | Medium |
| **No search/filter** — README claims keyboard shortcut `/` for search, but **search doesn't exist in the code** | High |
| **No keyboard shortcut `N`** — README claims it, code doesn't implement it | Medium |
| **No dark/light theme toggle** — README claims it, doesn't exist | Low |
| **Activity feed not visible in UI** — Activities API exists but the dashboard has **no activity feed panel**. Activities are invisible to the user unless they open a task with comments | High |
| **No assignee field in modal** — API supports `assignee`, modal doesn't expose it | Low |
| **No confirmation/toast on save** — Task saves silently. No "Task created!" feedback | Medium |
| **Column drag reorder missing** — Columns can't be reordered via UI despite API support | Low |
| **"Done" column has no special treatment** — No auto-archive, no visual distinction (the `.column-done` CSS class exists but is never applied in JS) | Medium |

---

## 3. Feature Completeness

**Rating: 4/10 — Many features are documented but not implemented**

### Implemented ✅
- CRUD for tasks, columns, activities, comments
- Kanban board with drag-and-drop
- Priority system (4 levels)
- Date picker with smart suggestions
- Inbox + board layout with resize
- Panel toggle (inbox/board)
- Basic stats in header
- Task modal with edit/delete/activity feed

### Documented but NOT implemented ❌
| Claimed Feature | Where Claimed | Status |
|----------------|---------------|--------|
| `/api/morning-update` endpoint | BOOTSTRAP.md, cron-jobs.json | **Does not exist** |
| `/api/daily-summary` endpoint | BOOTSTRAP.md, cron-jobs.json | **Does not exist** |
| Search (`/` shortcut) | README.md | **Not implemented** |
| New task shortcut (`N`) | README.md | **Not implemented** |
| Dark/Light theme toggle | README.md | **Not implemented** |
| `Ctrl+Enter` submit comment | README.md | **Not implemented** |
| Activity feed sidebar | README.md ("sidebar layout with notification badges") | **Not implemented** |
| Calendar integration | SKILL.md | **Not implemented** (aspirational) |
| External tool import (Jira, Trello) | SKILL.md | **Not implemented** (aspirational) |

### skill.js vs server.js mismatch
- `skill.js` references statuses `backlog`, `in-progress`, `review` — the actual dashboard uses `inbox`, `today`, `this-week`, `later`, `done`
- `skill.js` is essentially dead code that duplicates server.js logic with wrong status names
- `update-ai-image.py` also references `backlog`, `in-progress`, `review` — same mismatch

---

## 4. Error Handling

**Rating: 5/10**

### Server-side:
- ✅ Graceful fallback if data dir fails (uses local `data/` dir)
- ✅ 404 handling for missing tasks/columns
- ✅ Input validation for required fields (title, column name)
- ❌ No rate limiting
- ❌ No request size validation beyond express default (10mb is generous)
- ❌ Silent `catch {}` in `logActivity` — errors are swallowed completely
- ❌ No structured error logging

### Client-side:
- ❌ All fetch errors are `console.error(e)` with no user feedback
- ❌ No loading states — board renders instantly from cache but there's no spinner if API is slow
- ❌ No retry logic for failed API calls
- ❌ No offline handling — if server is down, everything silently fails
- ✅ Empty states exist ("No tasks", "No new tasks", "No activity yet")

---

## 5. Code Quality

**Rating: 6/10 — Solid for a prototype, not production-ready**

### Good:
- Clean, readable code in both server.js and script.js
- Proper HTML escaping via `esc()` method
- SPA fallback for non-API routes
- Modular class structure in frontend

### Issues:
- **No authentication** — Anyone with the URL can read/write all tasks
- **Race conditions** — Multiple concurrent writes to JSON files will corrupt data (read → modify → write pattern)
- **No input sanitization** on task description (stored as-is, rendered via `textContent` so XSS-safe, but API consumers might not)
- **`substr` is deprecated** — Used in ID generation, should be `substring`
- **No CSRF protection**
- **File-based storage** won't scale, but acceptable for single-user use
- **`cors()` wide open** — No origin restrictions
- **Inconsistent ID generation** — server uses `task_${Date.now()}_${random}`, skill.js uses same pattern but with 9 chars vs 8 chars

---

## 6. BOOTSTRAP.md Quality

**Rating: 3/10**

### Problems:
- **References non-existent endpoints** (`/api/morning-update`, `/api/daily-summary`) — Step 9 will fail
- **10 steps is too many** — Should be 3-4 steps max for first run
- **Creates sample tasks that aren't useful** — "Set up daily routine" and "Weekly planning session" are meta-tasks about the tool itself, not the user's actual work
- **Step 10 asks to delete the file** — This is AGENTS.md convention, fine, but the bootstrap should have already delivered value by this point
- **No verification that steps actually worked** — "You should see..." with no fallback if you don't
- **Hardcoded dates** — Example task has `dueDate: "2026-02-14T09:00:00Z"` which will be stale immediately
- **Doesn't set up cron jobs** — Just references `cron-jobs.json` but doesn't actually install them

### What it should do:
1. Health check
2. Ask the user what they're working on
3. Create real tasks from their answer
4. Done. Delete file.

---

## 7. SKILL.md Quality

**Rating: 7/10 — Best file in the repo**

### Good:
- Clear role definition and tone guidelines
- Practical onboarding script
- Daily routine templates (morning/hourly/evening) are well thought out
- Task management rules are sensible (column limits, triage logic)
- Natural language parsing examples ("I need to..." → create task)

### Issues:
- References calendar integration that doesn't exist
- References external tool import that doesn't exist
- Cron schedule section describes jobs but doesn't explain how to actually set them up in OpenClaw
- The API reference is duplicated between SKILL.md and TOOLS.md (DRY violation)
- No guidance on what to do when the dashboard is down

---

## 8. Specific Improvements (Ranked by Impact)

### Critical (blocks first value)

1. **Add a welcome/onboarding state to the dashboard UI.** When tasks array is empty, show a centered welcome card: "👋 Welcome to Mission Control. Tell your AI assistant what you're working on, or click here to add your first task." This is the #1 blocker for time-to-first-value.

2. **Fix BOOTSTRAP.md to not reference non-existent endpoints.** Remove `/api/morning-update` and `/api/daily-summary` references. Either implement them or use existing endpoints.

3. **Fix skill.js status name mismatch.** Replace `backlog`, `in-progress`, `review` with `inbox`, `today`, `this-week`, `later`, `done`. Currently skill.js would create tasks with wrong statuses.

4. **Add an activity feed panel to the dashboard.** The API exists, activities are logged, but users can't see them. Add a collapsible right sidebar or bottom panel showing recent activity.

### High Impact

5. **Add toast/snackbar notifications.** "Task created!", "Moved to Done", "Column deleted" — 30 lines of code, massive UX improvement.

6. **Implement keyboard shortcuts.** `N` for new task, `Escape` already works. Remove claims from README or implement them.

7. **Replace `prompt()` for column creation** with the existing modal pattern. Already have a column modal for edit — reuse it for create.

8. **Add loading skeleton/spinner** on initial load. Even a brief flash of empty content looks like a bug.

9. **Shorten BOOTSTRAP.md to 3 steps.** Health check → create a welcome activity → done. Let SKILL.md handle the actual onboarding conversation.

10. **Add the Done column visual treatment.** The CSS class `.column-done` exists. Apply it in the render function when `col.id === 'done'`.

### Medium Impact

11. **Add search/filter.** At minimum, a text filter over task titles. The README already promises it.

12. **Implement cron job installation in bootstrap.** The cron-jobs.json file exists but is never consumed. Either wire it up or remove it.

13. **Deduplicate API docs.** SKILL.md and TOOLS.md both document the API. SKILL.md should reference TOOLS.md, not repeat it.

14. **Add file locking or use SQLite** instead of bare JSON files. Concurrent writes will corrupt data.

15. **Add basic auth** or at least a configurable API key. Currently anyone on the network can wipe all tasks.

### Low Impact (polish)

16. **Delete or fix `update-ai-image.py`** — references wrong status names and hardcoded MongoDB URI.

17. **Delete or fix `skill.js`** — duplicates server.js with wrong status values. Either make it the canonical SDK or remove it.

18. **Fix deprecated `substr` calls** — trivial but shows code age.

19. **Add `start.sh`** — referenced in the task description but doesn't exist in the repo.

20. **README.md claims features that don't exist** (theme toggle, keyboard shortcuts, search). Update to match reality.

---

## Summary

| Area | Score | Notes |
|------|-------|-------|
| First-Run Experience | 4/10 | Empty screen, no guidance |
| UI/UX | 6/10 | Clean design, missing feedback |
| Feature Completeness | 4/10 | Many phantom features |
| Error Handling | 5/10 | Silent failures everywhere |
| Code Quality | 6/10 | Good for prototype |
| BOOTSTRAP.md | 3/10 | References broken endpoints |
| SKILL.md | 7/10 | Best doc, some aspirational claims |

**Overall: 5/10**

**Estimated time-to-first-value today:** 5-10 minutes (if the AI agent works) or **never** (if user just opens the dashboard alone).

**Target time-to-first-value:** Under 60 seconds. User opens dashboard → sees welcome state with clear CTA → creates or tells AI their first task → sees it on the board. Done.

The biggest wins are items #1 (welcome state), #3 (fix skill.js statuses), and #2 (fix BOOTSTRAP.md). These three changes alone would cut time-to-first-value by 80%.

---

## Fixes Applied

**Date:** 2026-02-11

### Critical

1. **✅ Welcome/onboarding screen** — Added full first-run welcome card when task list is empty. Shows welcome message, CTA to create first task, and keyboard shortcut hint. Hides inbox/board panels and shows centered onboarding UI. Automatically disappears once the first task is created.

2. **✅ Fixed BOOTSTRAP.md phantom endpoints** — Completely rewrote BOOTSTRAP.md. Removed references to non-existent `/api/morning-update` and `/api/daily-summary`. Reduced from 10 steps to 3 (health check → post welcome activity → delete file). Removed hardcoded dates and meta-tasks.

3. **✅ Fixed skill.js status name mismatch** — Replaced all `backlog`, `in-progress`, `review` references with correct `inbox`, `today`, `this-week`, `later`, `done` throughout skill.js. Fixed `createTask` default status, `getStatistics` fallback, `generateDailySummary`, and `morningCheckIn`.

### High Impact

4. **✅ Toast/snackbar notifications** — Added toast notification system. All actions now show feedback: "Task created!", "Task updated", "Task deleted", "Moved to [column]", "Column added/renamed/deleted", and error messages for failed operations. CSS animations included.

5. **✅ Keyboard shortcut `N`** — Implemented `N` key to open new task modal. Properly ignores keypresses when user is typing in inputs/textareas.

6. **✅ Replaced `prompt()` for column creation** — Column creation now uses the same modal as column editing. "Add Column" button opens the column modal in create mode with delete button hidden.

7. **✅ Loading state on initial load** — Added spinner with "Loading Mission Control…" text that displays while tasks and columns are being fetched. Uses CSS animation.

8. **✅ Empty states with CTAs** — Inbox empty state now shows "Press N or click + to add one" hint. Board column empty states show "No tasks — drag here or click +". Done column shows "No completed tasks".

9. **✅ Done column visual treatment** — The `.column-done` CSS class is now applied in the render function when `col.id === 'done'` (was never applied before).

### Medium Impact

10. **✅ Client-side error handling** — All `fetch` calls now check response status, show toast errors on failure, and handle network errors gracefully. `moveTask` uses optimistic update with rollback on failure. `saveCurrent` shows specific API error messages.

11. **✅ Fixed cron-jobs.json** — Removed phantom `/api/morning-update` and `/api/daily-summary` from required_endpoints and job instructions. All jobs now reference only existing endpoints (`/api/tasks`, `/api/activities`, `/api/stats`).

12. **✅ Deduplicated API docs in SKILL.md** — Removed duplicated API reference from SKILL.md, now points to TOOLS.md for the complete reference.

13. **✅ Removed aspirational feature claims from SKILL.md** — Removed Calendar Integration and External Tool Import sections that referenced unimplemented features. Replaced "offer integrations" onboarding step with practical "ask what they need" step.

### Low Impact

14. **✅ Fixed README.md** — Removed claims for non-existent features (dark/light theme toggle, `/` search, `Ctrl+Enter` comment submit, activity feed sidebar). Updated column names from "Backlog, In Progress, Review, Done" to "Today, This Week, Later, Done". Added toast notifications and welcome onboarding to feature list. Fixed example code status values.

15. **✅ Fixed deprecated `substr`** — Replaced all `.substr()` calls with `.substring()` in server.js and skill/skill.js.

16. **✅ Fixed update-ai-image.py** — Replaced all `backlog`, `in-progress`, `review` status references with correct `inbox`, `today`, `this-week`, `later`, `done`.

17. **✅ Created start.sh** — Added missing `start.sh` script that installs dependencies and starts the server.

18. **✅ Fixed mission-control/SKILL.md** — The nested skill SKILL.md already used correct statuses; no changes needed.
