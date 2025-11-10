# Score Approval Dashboard Troubleshooting Guide
**Issue:** Performances not showing even though all judges have scored  
**Date:** October 8, 2025

---

## 🔍 How the System Works

### The Logic (As Per Requirements):
**"Show item only once all assigned judges have scored it"**

The query does this:
```sql
SELECT 
  p.id,
  COUNT(DISTINCT jea.judge_id) as total_judges,    -- How many judges assigned
  COUNT(DISTINCT s.judge_id) as scored_judges      -- How many judges scored
FROM performances p
JOIN judge_event_assignments jea ON jea.event_id = p.event_id
LEFT JOIN scores s ON s.performance_id = p.id
GROUP BY p.id
WHERE scored_judges > 0 AND scored_judges = total_judges
```

**Performance appears when:** `scored_judges = total_judges`

---

## 🚨 Common Issues & Solutions

### Issue 1: Judges Not Assigned to Event

**Symptom:** All 4 judges scored, but performance not showing

**Cause:** Judges might be in the system but not assigned to the specific event

**Check:**
```sql
-- Check judge assignments for an event
SELECT e.name as event_name, j.name as judge_name, jea.assigned_at
FROM judge_event_assignments jea
JOIN events e ON e.id = jea.event_id
JOIN judges j ON j.id = jea.judge_id
WHERE e.id = 'YOUR_EVENT_ID'
ORDER BY j.name;
```

**Expected:** Should show 4 judges for Sasolburg event

**Fix:**
1. Go to `/admin` → Event Management
2. Select the event
3. Click "Assign Judges"
4. Ensure all 4 judges are assigned

---

### Issue 2: Scores Submitted to Wrong Performance

**Symptom:** Judges think they scored, but dashboard shows 0 scores

**Cause:** Performance ID mismatch

**Check:**
```sql
-- Check scores for a specific performance
SELECT 
  p.title,
  j.name as judge_name,
  s.technical_score + s.musical_score + s.performance_score + 
  s.styling_score + s.overall_impression_score as total,
  s.submitted_at
FROM performances p
LEFT JOIN scores s ON s.performance_id = p.id
LEFT JOIN judges j ON j.id = s.judge_id
WHERE p.id = 'PERFORMANCE_ID'
ORDER BY s.submitted_at;
```

**Expected:** Should show 4 rows (one per judge) with scores

---

### Issue 3: Performance Has Wrong Event ID

**Symptom:** Judges assigned to Event A, but performance linked to Event B

**Cause:** Performance created with incorrect event_id

**Check:**
```sql
-- Check performance event linkage
SELECT 
  p.id,
  p.title,
  p.event_id,
  e.name as event_name
FROM performances p
JOIN events e ON e.id = p.event_id
WHERE p.id = 'PERFORMANCE_ID';
```

**Fix:** Update performance event_id if wrong
```sql
UPDATE performances 
SET event_id = 'CORRECT_EVENT_ID' 
WHERE id = 'PERFORMANCE_ID';
```

---

### Issue 4: Duplicate Judge Assignments

**Symptom:** System thinks 8 judges assigned but only 4 exist

**Cause:** Judges assigned multiple times to same event

**Check:**
```sql
-- Check for duplicate assignments
SELECT 
  event_id,
  judge_id,
  COUNT(*) as assignment_count
FROM judge_event_assignments
WHERE event_id = 'YOUR_EVENT_ID'
GROUP BY event_id, judge_id
HAVING COUNT(*) > 1;
```

**Fix:** Remove duplicates
```sql
-- Keep only one assignment per judge per event
DELETE FROM judge_event_assignments
WHERE id NOT IN (
  SELECT MIN(id)
  FROM judge_event_assignments
  GROUP BY event_id, judge_id
);
```

---

## 🔧 Debug Endpoint

I've created a debug endpoint to help diagnose issues:

### Usage:
```bash
# Check specific performance
GET /api/debug/score-approval?performanceId=PERFORMANCE_ID

# List recent performances (no performanceId parameter)
GET /api/debug/score-approval
```

### Example Response:
```json
{
  "performance": {
    "id": "perf-123",
    "title": "Performance Name",
    "eventId": "event-456",
    "scoresPublished": false
  },
  "judgeAssignments": [
    {"judgeId": "judge-1", "judgeName": "Judge Smith"},
    {"judgeId": "judge-2", "judgeName": "Judge Jones"},
    {"judgeId": "judge-3", "judgeName": "Judge Brown"},
    {"judgeId": "judge-4", "judgeName": "Judge Davis"}
  ],
  "scores": [
    {"judgeId": "judge-1", "judgeName": "Judge Smith", "total": 85},
    {"judgeId": "judge-2", "judgeName": "Judge Jones", "total": 88},
    {"judgeId": "judge-3", "judgeName": "Judge Brown", "total": 82},
    {"judgeId": "judge-4", "judgeName": "Judge Davis", "total": 90}
  ],
  "counts": {
    "performance_id": "perf-123",
    "total_judges": 4,
    "scored_judges": 4
  },
  "analysis": {
    "totalJudgesAssigned": 4,
    "totalScoresSubmitted": 4,
    "judgesWhoScored": 4,
    "shouldAppearInApproval": true,
    "reason": "All judges have scored - should appear in approval dashboard"
  }
}
```

### If Analysis Shows:
- **`shouldAppearInApproval: false`** → Shows why performance isn't appearing
- **`shouldAppearInApproval: true`** → Performance should appear (cache issue or other bug)

---

## 📋 Step-by-Step Diagnosis

### Step 1: Get Performance ID
```sql
-- Find performances for Sasolburg event
SELECT p.id, p.title, p.event_id, e.name as event_name
FROM performances p
JOIN events e ON e.id = p.event_id
WHERE e.name LIKE '%Sasolburg%'
ORDER BY p.created_at DESC
LIMIT 10;
```

### Step 2: Check Judge Assignments
```sql
-- For the event, check all judge assignments
SELECT 
  jea.judge_id,
  j.name as judge_name,
  jea.event_id,
  jea.assigned_at
FROM judge_event_assignments jea
JOIN judges j ON j.id = jea.judge_id
WHERE jea.event_id = 'EVENT_ID_FROM_STEP_1'
ORDER BY j.name;
```

**Expected Result:** 4 rows (4 judges)

### Step 3: Check Scores Submitted
```sql
-- For the performance, check all scores
SELECT 
  s.judge_id,
  j.name as judge_name,
  s.technical_score + s.musical_score + s.performance_score + 
  s.styling_score + s.overall_impression_score as total,
  s.submitted_at
FROM scores s
JOIN judges j ON j.id = s.judge_id
WHERE s.performance_id = 'PERFORMANCE_ID_FROM_STEP_1'
ORDER BY s.submitted_at;
```

**Expected Result:** 4 rows (4 scores, one from each judge)

### Step 4: Run the Approval Query
```sql
-- This is the actual query the system runs
WITH performance_judge_counts AS (
  SELECT
    p.id as performance_id,
    p.title as performance_title,
    p.event_id,
    p.scores_published,
    COUNT(DISTINCT jea.judge_id) as total_judges,
    COUNT(DISTINCT s.judge_id) as scored_judges
  FROM performances p
  JOIN judge_event_assignments jea ON jea.event_id = p.event_id
  LEFT JOIN scores s ON s.performance_id = p.id
  WHERE p.id = 'PERFORMANCE_ID_FROM_STEP_1'
  GROUP BY p.id, p.title, p.event_id, p.scores_published
)
SELECT * FROM performance_judge_counts
WHERE scored_judges > 0 AND scored_judges = total_judges;
```

**Expected Result:** 
- 1 row if all judges scored (performance should appear)
- 0 rows if not all judges scored yet

### Step 5: Check Actual Dashboard
Go to `/admin/scoring-approval` and verify if performance appears

---

## 🎯 Quick Fixes

### Fix 1: Refresh Judge Assignments
```sql
-- Remove all judge assignments for the event
DELETE FROM judge_event_assignments WHERE event_id = 'YOUR_EVENT_ID';

-- Re-add all 4 judges
INSERT INTO judge_event_assignments (id, event_id, judge_id, assigned_at)
VALUES 
  ('assign-1', 'YOUR_EVENT_ID', 'JUDGE_1_ID', NOW()),
  ('assign-2', 'YOUR_EVENT_ID', 'JUDGE_2_ID', NOW()),
  ('assign-3', 'YOUR_EVENT_ID', 'JUDGE_3_ID', NOW()),
  ('assign-4', 'YOUR_EVENT_ID', 'JUDGE_4_ID', NOW());
```

### Fix 2: Force Refresh Approval Dashboard
In the browser:
1. Open `/admin/scoring-approval`
2. Press `Ctrl+Shift+R` (hard refresh)
3. Click the "🔄 Refresh" button

### Fix 3: Clear Browser Cache
Sometimes the dashboard is cached:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

---

## 🔍 Specific Checks for Sasolburg

### Expected Setup:
- **Event Name:** Contains "Sasolburg"
- **Judge Count:** 4 judges assigned
- **Entry Types:** Both live + virtual entries
- **Score Requirement:** All 4 judges must score each performance

### Verification Query:
```sql
-- Complete check for Sasolburg event
SELECT 
  e.name as event_name,
  p.title as performance_title,
  COUNT(DISTINCT jea.judge_id) as judges_assigned,
  COUNT(DISTINCT s.judge_id) as judges_scored,
  CASE 
    WHEN COUNT(DISTINCT jea.judge_id) = COUNT(DISTINCT s.judge_id) AND COUNT(DISTINCT s.judge_id) > 0
    THEN 'Ready for Approval'
    WHEN COUNT(DISTINCT s.judge_id) = 0
    THEN 'No scores yet'
    ELSE CONCAT('Waiting for ', 
         COUNT(DISTINCT jea.judge_id) - COUNT(DISTINCT s.judge_id), 
         ' more judge(s)')
  END as status
FROM events e
JOIN performances p ON p.event_id = e.id
JOIN judge_event_assignments jea ON jea.event_id = e.id
LEFT JOIN scores s ON s.performance_id = p.id AND s.judge_id = jea.judge_id
WHERE e.name LIKE '%Sasolburg%'
GROUP BY e.name, p.id, p.title
ORDER BY p.title;
```

This will show the status of every performance in the Sasolburg event.

---

## 🚀 For Gabriel - Quick Action Items

1. **Get Performance ID:**
   - Check judge dashboard or admin panel
   - Or run: `SELECT id, title FROM performances WHERE event_id = 'sasolburg_event_id' LIMIT 5`

2. **Run Debug Endpoint:**
   ```
   GET /api/debug/score-approval?performanceId=YOUR_PERFORMANCE_ID
   ```

3. **Check the Response:**
   - Look at `analysis.reason`
   - If says "All judges have scored" but not appearing → there's a bug
   - If says "Waiting for X judges" → need more scores

4. **Verify Judge Assignments:**
   - Go to `/admin` → Event Management
   - Click on Sasolburg event
   - Verify 4 judges are assigned

5. **Hard Refresh Dashboard:**
   - Go to `/admin/scoring-approval`
   - Press `Ctrl+Shift+R`
   - Click "🔄 Refresh" button

---

## 📞 Report Back

Please provide:
1. Event ID for Sasolburg
2. One sample Performance ID that should show but doesn't
3. Output from debug endpoint: `/api/debug/score-approval?performanceId=XXX`
4. Screenshot of scoring approval dashboard (showing it's empty)

This will help me identify the exact issue!

---

**Status:** Debug endpoint created  
**Next Step:** Run diagnostics on actual performance  
**Priority:** 🔴 CRITICAL for Thursday


