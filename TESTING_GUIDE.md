# Manual Progress Tracking - Testing Guide

## Prerequisites

✅ Database migration completed (see `DATABASE_MIGRATION_INSTRUCTIONS.md`)
✅ Backend server running on port 5005
✅ Frontend server running on port 3000

---

## Test Scenario: Complete Progress Tracking Flow

### 1. Login as Engineer

**URL:** `http://localhost:3000`

**Test Account:**
- Email: engineer@example.com (or create one if needed)
- Password: [your password]

**Actions:**
1. Navigate to a project
2. Go to Time Tracking or Work Logs section
3. Log some hours on a phase (e.g., 10 hours on "Pre-Concept Design")
4. Note the automatic progress calculation should show ~10% (if predicted hours is 100)

---

### 2. Login as Supervisor

**Test Account:**
- Email: supervisor@example.com
- Password: [your password]

**View Phase Progress:**
1. Navigate to the same project
2. Click on "Project Phases" section
3. You should see:
   - Progress bar showing the phase progress
   - "Manage Progress" button (supervisors only)
   - Variance indicators if progress has been adjusted

---

### 3. Test Progress Adjustment (Supervisor Only)

**Open Progress Summary:**
1. Click "Manage Progress" button on a phase
2. **PhaseProgressSummary Dialog** should open showing:
   - List of all engineers working on the phase
   - Their calculated progress (hours-based)
   - Their actual progress
   - Variance between the two
   - Last adjustment date and supervisor

**Adjust Engineer Progress:**
1. Click the "Edit" (pencil) icon next to an engineer
2. **ProgressAdjustmentDialog** should open:
   - Shows engineer name, phase name
   - Shows hours logged (e.g., 10 hours)
   - Shows calculated progress (e.g., 10%)
   - Has a slider to set manual progress
3. Move the slider to a different value (e.g., 2%)
4. Enter a reason: "Work quality issues, requires rework"
5. Click "Adjust Progress"
6. Dialog should close and summary should refresh

**Expected Results:**
- ✅ Calculated progress: 10% (unchanged)
- ✅ Actual progress: 2% (your manual override)
- ✅ Variance: -8% (shown in red/error color)
- ✅ Progress bar color changes to red (significant variance)

---

### 4. Test Progress History

**View Adjustment History:**
1. In the PhaseProgressSummary dialog
2. Click the "History" (clock) icon next to an engineer
3. **ProgressHistoryDialog** should open showing:
   - Timeline of all adjustments
   - Date/time of each adjustment
   - Supervisor who made the adjustment
   - Calculated vs Manual progress values
   - Variance
   - Reason provided

**Test Filters:**
1. Try searching by engineer name
2. Try filtering by adjustment type
3. Try exporting to CSV

**Expected Results:**
- ✅ Shows your recent adjustment
- ✅ All details are correct
- ✅ Filters work properly
- ✅ CSV export downloads successfully

---

### 5. Verify Engineer View

**Login as Engineer Again:**
1. Navigate to the same project
2. View your work logs or phase details
3. You should see:
   - Your adjusted progress (2% instead of 10%)
   - A note or indicator that progress was adjusted by supervisor
   - The supervisor's reasoning

**Expected Results:**
- ✅ Engineer can see the adjusted progress
- ✅ Engineer can see why it was adjusted
- ✅ Engineer cannot modify the adjustment (supervisor only)

---

### 6. Test Phase-Level Progress Adjustment

**As Supervisor:**
1. Open PhaseProgressSummary
2. Click "Edit" for an engineer
3. Adjust their overall phase progress to 30%
4. Provide reason: "Quality assessment: 30% complete"
5. Submit

**Expected Results:**
- ✅ Creates a "phase_overall" type adjustment
- ✅ Overrides all previous work log adjustments
- ✅ Shows in history as "Phase Overall" type
- ✅ Affects the phase progress bar

---

### 7. Test Variance Color Coding

**Test Different Variance Levels:**

**Green (Minor Variance < ±5%):**
- Set manual progress close to calculated (e.g., 10% → 12%)
- Progress bar should be green

**Yellow (Moderate Variance ±5% to ±10%):**
- Set manual progress with moderate difference (e.g., 10% → 17%)
- Progress bar should be yellow

**Red (Significant Variance > ±10%):**
- Set manual progress with large difference (e.g., 10% → 2%)
- Progress bar should be red

---

### 8. Test Progress Aggregation

**Create Multiple Engineers:**
1. Have 2-3 engineers log hours on the same phase
2. As supervisor, adjust progress for each engineer differently
3. View the phase card in ProjectPhases

**Expected Results:**
- ✅ Phase shows average actual progress across all engineers
- ✅ Variance is calculated correctly
- ✅ Color coding reflects the average variance
- ✅ Tooltip shows detailed breakdown

---

### 9. Test Edge Cases

**Test Zero Hours:**
- Try adjusting progress for an engineer with minimal hours
- Should handle gracefully

**Test 100% Progress:**
- Set manual progress to 100%
- Should show as completed
- Progress bar should max at 100%

**Test Invalid Input:**
- Try setting progress > 100% → Should show validation error
- Try setting progress < 0% → Should show validation error
- Try submitting without reason → Should show validation error
- Try reason < 10 characters → Should show validation error

---

### 10. Test API Endpoints Directly (Optional)

**Using Browser DevTools or Postman:**

**Get Phase Progress Summary:**
```
GET http://localhost:5005/api/v1/progress/phase/{phaseId}/summary
Authorization: Bearer {your_token}
```

**Adjust Progress:**
```
POST http://localhost:5005/api/v1/progress/phase/{phaseId}/engineer/{engineerId}
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "manual_progress_percentage": 25,
  "adjustment_reason": "Quality assessment indicates 25% completion"
}
```

**Get Progress History:**
```
GET http://localhost:5005/api/v1/progress/phase/{phaseId}/history
GET http://localhost:5005/api/v1/progress/phase/{phaseId}/history?engineerId={engineerId}
Authorization: Bearer {your_token}
```

---

## Success Criteria

### ✅ All Features Working:
- [ ] Engineers can log hours
- [ ] Automatic progress calculation works
- [ ] Supervisors can open progress summary
- [ ] Supervisors can adjust progress with reasoning
- [ ] Adjustments are saved and visible immediately
- [ ] Engineers can see adjusted progress
- [ ] Progress history is tracked correctly
- [ ] Variance indicators show correct colors
- [ ] CSV export works
- [ ] Filters in history dialog work
- [ ] Phase-level adjustments work
- [ ] Work log-level adjustments work
- [ ] Database triggers update progress automatically
- [ ] API endpoints respond correctly
- [ ] Permissions are enforced (supervisor only for adjustments)

### ✅ UI/UX Quality:
- [ ] Dialogs are responsive and clear
- [ ] Error messages are helpful
- [ ] Loading states show during API calls
- [ ] Success messages confirm actions
- [ ] Tooltips explain complex features
- [ ] Icons and colors are meaningful
- [ ] Mobile view is usable

### ✅ Data Integrity:
- [ ] Progress calculations are accurate
- [ ] Variance calculations are correct
- [ ] History is complete and ordered
- [ ] No data loss when adjusting
- [ ] Concurrent updates handle gracefully

---

## Troubleshooting

### Frontend Not Showing Progress Features:
1. Check browser console for errors
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Clear browser cache
4. Check if frontend server restarted after code changes

### Backend API Errors:
1. Check backend server logs
2. Verify migration ran successfully
3. Check database connection
4. Verify API routes are registered

### Progress Not Calculating:
1. Check if predicted_hours is set on the phase
2. Verify database triggers are created
3. Check sync_phase_progress function exists
4. Run manual sync: `SELECT sync_phase_progress({phase_id});`

---

## Known Limitations

1. **Migration Required:** Database migration must be run manually via pgAdmin
2. **Supervisor Only:** Only supervisors can adjust progress (by design)
3. **Requires Hours:** Progress tracking only works for phases with predicted_hours set

---

## Support

If you encounter issues:
1. Check the backend server logs
2. Check the frontend browser console
3. Verify migration completed successfully
4. Review `PROGRESS_TRACKING_IMPLEMENTATION.md` for architecture details
