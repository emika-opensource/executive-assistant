# Deployment Guide - Executive Assistant Mission Control

This guide covers deploying the Executive Assistant Mission Control dashboard to OpenClaw seats and integrating with the AI Employee system.

## Quick Deployment

### 1. Clone to Seat
```bash
# On the OpenClaw seat
git clone https://github.com/emika-opensource/executive-assistant.git
cd executive-assistant
npm install
npm start
```

### 2. Verify Access
- Dashboard: http://localhost:3000 (or seat's public URL)
- API Health: http://localhost:3000/api/health
- Data Directory: `/home/node/emika/mission-control/`

## Server Integration

### Production Deployment
```bash
# On production server (162.55.102.58)
sudo -u emika ssh -o BatchMode=yes root@88.99.94.116
cd /home/node/app
git clone https://github.com/emika-opensource/executive-assistant.git .
npm install
npm start
```

### Nginx Configuration
The seat's nginx already proxies port 3000, so the dashboard is automatically available at the seat's public URL.

### Data Directory Setup
```bash
# Ensure data directory exists
mkdir -p /home/node/emika/mission-control
chown node:node /home/node/emika/mission-control
```

## AI Employee Integration

### Image Updated ✅
The Executive Assistant image (ID: c65bdd97-d067-44a5-b6a8-07b02d7ffa40) has been updated with:
- Mission Control dashboard instructions
- Scheduled operation times
- Data file locations
- API endpoint documentation
- Proactive behavior guidelines

### Skill Installation
Copy the skill files to the appropriate OpenClaw skill directory:
```bash
cp -r skill/ ~/.openclaw/skills/mission-control/
```

### Environment Variables
Set these in the seat environment:
```bash
export DATA_DIR="/home/node/emika/mission-control"
export PORT="3000"
export NODE_ENV="production"
```

## Testing & Verification

### 1. Dashboard Access
- Visit the dashboard URL
- Verify dark theme loads correctly
- Test creating a new task
- Check drag-and-drop functionality

### 2. API Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Get tasks
curl http://localhost:3000/api/tasks

# Get statistics
curl http://localhost:3000/api/stats
```

### 3. File System
```bash
# Check data files
ls -la /home/node/emika/mission-control/
cat /home/node/emika/mission-control/tasks.json
```

### 4. AI Employee Integration
```javascript
// Test skill functions
const missionControl = require('./skill/skill.js');

// Test task creation
await missionControl.createTask({
  title: "Test task",
  description: "Verify mission control integration",
  priority: "medium"
});

// Test activity logging
await missionControl.logActivity("test", "Testing mission control system");
```

## Monitoring

### Health Checks
Monitor these endpoints:
- `GET /api/health` - System health
- `GET /api/stats` - Dashboard statistics
- File system access to data directory

### Logs
Check application logs for errors:
```bash
# Application logs
pm2 logs executive-assistant

# System logs
tail -f /var/log/nginx/error.log
```

### Performance
Monitor:
- Response times for API calls
- File system I/O performance
- Memory usage of Node.js process

## Backup & Recovery

### Data Backup
```bash
# Backup data files
cp /home/node/emika/mission-control/*.json ~/backups/
```

### Recovery
```bash
# Restore from backup
cp ~/backups/*.json /home/node/emika/mission-control/
```

## Troubleshooting

### Common Issues

1. **Dashboard Not Loading**
   - Check if Node.js process is running: `ps aux | grep node`
   - Verify port 3000 is not blocked
   - Check nginx proxy configuration

2. **API Errors**
   - Verify data directory permissions: `ls -la /home/node/emika/`
   - Check JSON file syntax: `json_verify < tasks.json`
   - Monitor disk space: `df -h`

3. **AI Employee Not Updating**
   - Verify image instructions in MongoDB
   - Check skill file installation
   - Review AI Employee logs for errors

### Debug Mode
Run with debug logging:
```bash
DEBUG=* npm start
```

### Reset Data
To reset all tasks and activities:
```bash
echo "[]" > /home/node/emika/mission-control/tasks.json
echo "[]" > /home/node/emika/mission-control/activities.json
```

## Security

### Access Control
- Dashboard runs on localhost by default
- No external API dependencies
- Data stored locally in JSON files
- File permissions managed by OpenClaw seat

### Updates
```bash
# Update from GitHub
git pull origin main
npm install
npm restart
```

## Support

### Documentation
- README.md - Overview and features
- skill/SKILL.md - AI Employee skill documentation
- API documentation in code comments

### GitHub Repository
https://github.com/emika-opensource/executive-assistant

### Issues
Report issues on GitHub Issues page with:
- Dashboard version
- OpenClaw seat information
- Error logs and screenshots
- Steps to reproduce

---

✅ **Deployment Complete!**

The Executive Assistant Mission Control dashboard is now ready for use with full AI Employee integration.