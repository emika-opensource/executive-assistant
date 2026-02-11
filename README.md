# Executive Assistant - Mission Control Dashboard

A full-featured Mission Control dashboard for Emika's AI Employee Executive Assistant. This dashboard provides a comprehensive Kanban board, activity feed, and task management system designed to work seamlessly with AI Employee workflows.

## Features

### 🎯 Kanban Board
- **Dynamic Columns**: Today, This Week, Later, Done (customizable)
- **Drag & Drop**: Move tasks between columns with visual feedback
- **Rich Task Cards**: Priority badges, due dates, assignee, comment count
- **Task Details**: Full description, comments thread, metadata

### 📊 Quick Stats Dashboard
- Real-time statistics in the header
- Total tasks, completed today, in progress, overdue count
- Automatic updates as tasks change status

### 🤖 AI Activity Feed
- Activity logging via API for AI Employee actions
- Timestamps and categorized activity types
- Per-task activity visible in task detail modal

### ✨ Advanced Features
- **Keyboard Shortcuts**: `N` for new task, `ESC` to close modal
- **Toast Notifications**: Feedback on every action (create, move, delete)
- **Welcome Onboarding**: First-run experience guides new users
- **Loading States**: Spinner on initial load
- **Comments System**: Threaded discussions on tasks
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no build tools required)
- **Backend**: Express.js with file-based JSON storage
- **Styling**: Custom CSS matching emika.ai design language
- **Data**: JSON files that both dashboard and AI can read/write

## Design System

The dashboard follows Emika's design language:

```css
/* Color Palette */
--bg-primary: #06060a        /* Near black background */
--bg-surface: rgba(20, 20, 24, 0.85)  /* Card surfaces */
--border-color: rgba(255,255,255,0.1)  /* Subtle borders */
--text-primary: #f4f4f5      /* Primary text */
--text-muted: #71717a        /* Secondary text */
--accent-color: rgba(192,192,192,1)    /* Silver/metallic accent */

/* Typography */
font-family: 'Space Grotesk'  /* From Google Fonts */
border-radius: 12-16px       /* Rounded corners */
```

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/emika-opensource/executive-assistant.git
   cd executive-assistant
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Access the dashboard**:
   Open http://localhost:3000 in your browser

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks` - Update existing task
- `DELETE /api/tasks/:id` - Delete task

### Activities
- `GET /api/activities` - Get activity feed
- `POST /api/activities` - Add activity (for AI Employee)

### System
- `GET /api/health` - Health check
- `GET /api/stats` - Dashboard statistics

## Data Storage

Tasks and activities are stored in JSON files:

```
/home/node/emika/mission-control/
├── tasks.json      # All task data
└── activities.json # Activity feed data
```

### Task Data Structure

```json
{
  "id": "task_1234567890_abc123",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality with session management",
  "priority": "high",
  "status": "today",
  "assignee": "AI Employee",
  "dueDate": "2026-02-15T10:00:00Z",
  "createdAt": "2026-02-08T17:48:46Z",
  "updatedAt": "2026-02-09T09:30:00Z",
  "comments": [
    {
      "id": "comment_1234567890_def456",
      "content": "Started working on OAuth integration",
      "author": "AI Employee",
      "createdAt": "2026-02-09T09:30:00Z"
    }
  ]
}
```

## AI Employee Integration

The AI Employee can interact with the dashboard through:

1. **File Operations**: Direct read/write access to JSON files
2. **API Calls**: HTTP requests to the REST API
3. **Activity Logging**: Post updates to the activity feed

### Example AI Employee Commands

```javascript
// Read current tasks
const tasks = JSON.parse(fs.readFileSync('/home/node/emika/mission-control/tasks.json'));

// Create a new task
await fetch('http://localhost:3000/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Daily status report',
    description: 'Generate and send weekly progress summary',
    priority: 'medium',
    status: 'inbox',
    assignee: 'AI Employee'
  })
});

// Post an activity update
await fetch('http://localhost:3000/api/activities', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'update',
    content: 'Completed 5 tasks this morning, starting on priority items',
    author: 'AI Employee'
  })
});
```

## Deployment

### OpenClaw Seat Deployment

1. Copy files to `/home/node/app/` in the seat container
2. The seat's nginx proxies port 3000 automatically
3. Dashboard accessible at seat's public URL

### Environment Variables

- `PORT`: Server port (default: 3000)
- `DATA_DIR`: Data directory path (default: /home/node/emika/mission-control)
- `NODE_ENV`: Environment (development/production)

## Keyboard Shortcuts

- `N`: Create new task
- `ESC`: Close modal/dialog

## Browser Support

- Modern browsers with ES6+ support
- Chrome 88+, Firefox 85+, Safari 14+, Edge 88+

## Development

### Project Structure

```
executive-assistant/
├── index.html          # Main dashboard interface
├── style.css           # Dark theme styling
├── script.js           # Frontend JavaScript
├── server.js           # Express.js API server
├── package.json        # Dependencies
├── README.md           # Documentation
└── skill/              # OpenClaw skill definition
    ├── SKILL.md        # Skill documentation
    └── skill.js        # Skill implementation
```

### Running in Development

```bash
npm run dev  # Start with nodemon for auto-restart
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ for Emika AI Employee ecosystem.