# 🎭 Backstage Manager Feature Testing Guide

## 🚀 Overview

This guide provides comprehensive testing instructions for all the new backstage management features:

- **Backstage Manager**: Drag & drop reordering, status control
- **Announcer View**: Program display and completion marking  
- **Registration View**: Check-in functionality
- **Media View**: Contestant details and media access
- **Score Approval System**: Admin approval workflow

## 📋 Prerequisites

### 1. Database Setup
```bash
# Ensure database schema is updated (run this once)
npm run dev
# The schema will auto-update when the app starts
```

### 2. Create Test Users
```bash
node scripts/setup-test-users.js
```

This creates test accounts:
- **Backstage Manager**: `backstage@test.com` / `testuser123`
- **Announcer**: `announcer@test.com` / `testuser123`  
- **Registration**: `registration@test.com` / `testuser123`
- **Media**: `media@test.com` / `testuser123`

### 3. WebSocket Server

#### Option A: Local Development
```bash
# Start the real-time server (separate terminal)
node server-realtime.js
```

#### Option B: Railway Production (Recommended)
```bash
# Deploy to Railway for production use
./deploy-websocket.sh

# See RAILWAY_DEPLOYMENT_GUIDE.md for complete instructions
```

**Set Environment Variable:**
```bash
# For local server
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# For Railway deployment  
NEXT_PUBLIC_SOCKET_URL=https://your-project.railway.app
```

## 🧪 Testing Workflow

### Phase 1: Setup Test Data

1. **Login as Admin**
   - Go to `/portal/admin`
   - Email: `mains@elementscentral.com`
   - Password: `624355Mage55!`

2. **Create Test Event**
   - Go to Events tab
   - Create a new event (e.g., "Test Competition 2024")
   - Set date for today or tomorrow

3. **Create Test Performances**
   - Add 5-10 event entries with different:
     - Item names
     - Choreographers
     - Participant names
     - Entry types (live/virtual)
     - Music/video files

### Phase 2: Backstage Manager Testing

1. **Login as Backstage Manager**
   - Go to `/portal/backstage`
   - Email: `backstage@test.com`
   - Password: `testuser123`

2. **Access Backstage Control**
   - Select your test event
   - Click "Enter Backstage Control"
   - Should redirect to `/admin/backstage/[eventId]`

3. **Test Drag & Drop Reordering**
   - **Drag Test**: Grab any ⋮⋮ handle
   - **Drop Test**: Move item to different position
   - **Verification**: Item numbers should update instantly
   - **Real-time Sync**: Changes should appear in other dashboards

4. **Test Status Control**
   - **Scheduled → Ready**: Click "✅ Ready" button
   - **Scheduled → Hold**: Click "⏸️ Hold" button  
   - **Ready → In Progress**: Click "▶️ Start" button
   - **Ready → Hold**: Click "⏸️ Hold" button
   - **Hold → Ready**: Click "✅ Ready" button
   - **In Progress → Complete**: Click "✅ Complete" button
   - **Reset**: Click "↩️ Reset" button (from any status)
   - **Verification**: Status changes sync across all views

5. **Test Music Player**
   - Click 🎵 button on live entries with music
   - **Expected**: Music player opens with controls
   - **Test**: Play, pause, seek, volume controls

### Phase 3: Announcer Testing

1. **Login as Announcer**
   - Go to `/portal/announcer`
   - Email: `announcer@test.com`
   - Password: `testuser123`

2. **Test Program Display**
   - Should see all performances in order
   - **Filter Test**: Try different status filters
   - **Search Test**: Search by item number, name, participant

3. **Test Performance Announcement**
   - **Mark as Announced**: Click "✅ Mark as Announced" on in-progress items
   - **Verification**: Item should disappear from queue
   - **Real-time Sync**: Changes should appear in other dashboards

4. **Test Current Performance Display**
   - **Backstage Action**: Set a performance to "In Progress" from backstage
   - **Announcer View**: Should show highlighted "NOW PERFORMING" section

### Phase 4: Registration Testing

1. **Login as Registration Staff**
   - Go to `/portal/registration`
   - Email: `registration@test.com` 
   - Password: `testuser123`

2. **Test Check-in Functionality**
   - **Check In**: Click "✅ Check In" for absent performers
   - **Mark Absent**: Click "❌ Mark Absent" for present performers
   - **Verification**: Status should update immediately
   - **Search Test**: Search by name, item number, EODSA ID

3. **Test Presence Status Display**
   - **Filter Test**: Filter by Present/Absent
   - **Stats Verification**: Check attendance rate calculation
   - **Real-time Updates**: Changes should sync with other views

### Phase 5: Media Personnel Testing

1. **Login as Media Personnel**
   - Go to `/portal/media`
   - Email: `media@test.com`
   - Password: `testuser123`

2. **Test Contestant Details Access**
   - **View Details**: Click "📋 View Details" button
   - **Verification**: Should show full performer information
   - **Contact Info**: Email, phone, EODSA ID display

3. **Test Media File Access**
   - **Music Download**: Click "🎵 Download Music" for live entries
   - **Video Links**: Click "📹 Watch Video" for virtual entries
   - **Inline Preview**: Music player should work in the interface

4. **Test Search and Filter**
   - **Search**: By performer name, choreographer, EODSA ID
   - **Filter**: Live vs Virtual performances
   - **Details Modal**: All information should be read-only

### Phase 6: Score Approval Testing

1. **Setup Test Scores**
   - Login as a judge and score some performances
   - Scores should automatically create approval requests

2. **Login as Admin**
   - Go to `/admin/scoring-approval`
   - Should see pending score approvals

3. **Test Approval Workflow**
   - **Approve Score**: Click "✅ Approve" button
   - **Reject Score**: Click "❌ Reject" with reason
   - **View Details**: Check score breakdown and comments
   - **Status Filters**: Filter by pending/approved/rejected

## 🔄 Real-Time Sync Testing

### Test Scenario: Multi-Dashboard Sync

1. **Setup**: Open 4 browser windows/tabs:
   - Backstage Manager dashboard
   - Announcer dashboard  
   - Registration dashboard
   - Admin backstage view

2. **Reorder Test**:
   - **Action**: Drag and drop in backstage manager
   - **Expected**: All dashboards update item numbers instantly

3. **Status Test**:
   - **Action**: Change performance status in backstage
   - **Expected**: Status updates across all views

4. **Announcement Test**:
   - **Action**: Mark performance as announced in announcer view
   - **Expected**: Item disappears from all relevant queues

5. **Check-in Test**:
   - **Action**: Check in performer in registration view
   - **Expected**: Presence status updates everywhere

## 🐛 Common Issues & Troubleshooting

### WebSocket Connection Issues
```bash
# Check if socket server is running
curl http://localhost:3001
# Should return socket.io response

# Restart socket server if needed
node server-realtime.js
```

### Database Schema Issues
```bash
# Check table columns
node scripts/check-table-columns.js

# If schema is missing, restart the app
npm run dev
```

### Permission Issues
```bash
# Verify user roles in database
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT name, email, role FROM judges WHERE role != 'judge'\`.then(console.log);
"
```

## ✅ Expected Results Summary

### Backstage Manager
- ✅ Drag & drop reordering with instant item number updates
- ✅ Performance status control (Ready/In Progress/Complete)
- ✅ Real-time sync across all dashboards
- ✅ Music/video preview functionality

### Announcer
- ✅ Program display with real-time updates from backstage
- ✅ Mark performances as announced (removes from queue)
- ✅ Current performance highlighting
- ✅ Search and filter functionality

### Registration  
- ✅ Check-in/check-out functionality
- ✅ Presence status tracking with timestamps
- ✅ Attendance statistics and filtering
- ✅ Real-time updates from other interfaces

### Media Personnel
- ✅ Read-only access to all performer details
- ✅ Contact information (email, phone, EODSA ID)
- ✅ Music file download and video link access
- ✅ Comprehensive search and filtering

### Score Approval
- ✅ Admin review of all judge scores before release
- ✅ Approve/reject workflow with reasons
- ✅ Score breakdown and comments display
- ✅ Status tracking (pending/approved/rejected)

## 🎯 Success Criteria

**All features are working correctly when:**

1. **Real-time sync** works across all dashboards (< 1 second delay)
2. **Drag & drop** reordering updates item numbers instantly
3. **Status changes** propagate to all relevant views
4. **Authentication** works for all new role types
5. **Media access** functions properly for authorized users
6. **Score approval** workflow prevents unapproved scores from being visible
7. **Presence tracking** accurately reflects check-in status
8. **Search and filtering** work across all interfaces

## 📞 Support

If you encounter issues during testing:

1. Check browser console for JavaScript errors
2. Verify WebSocket connection status
3. Confirm database schema is updated
4. Restart the application and socket server
5. Check that test users were created successfully

All features should work seamlessly together with real-time synchronization across multiple user roles and dashboards.
