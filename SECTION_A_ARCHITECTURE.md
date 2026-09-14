# SECTION A: ARCHITECTURE FINDINGS

## Existing Field Operations Status
- Backend: COMPLETE (controllers/models/routes/audit/logs/face verification/GPS/offline/teams/assignments/activities/export)
- Frontend: COMPLETE component exists (FieldOperations.jsx with TeamSetupForm/ManagerDashboard/EmployeeDuty)
- Attendance Integration: COMPLETE (`assertNotFieldEmployee` blocks normal check-in for field employees)
- Models: FieldTeam, FieldAssignment, FieldDutySession, FieldLocation, FieldVisit, FieldWorkSettings (in SuperAdmin)
- Auth/Role: SuperAdmin/Admin/Manager/User already handled
- Upload: ImageKit already integrated
- Map: Leaflet-based FieldMap component exists
- Face: `verifyDutySelfie` > `faceprofile` embedding comparison
- Offline: `fieldOfflineQueue.js` + sync logic exists

## What's Working
- Team creation/edit/update with member/manager selection
- Bulk assignment (manual + Excel)
- Individual assignment with one-active-rule enforcement
- Field Duty start/pause/resume/checkout
- Periodic checkpoint (2-hour selfie + GPS)
- Open + Assigned activities
- 20-minute minimum duration validation (`resolveMinDurationMinutes`)
- Visit completion selfie + GPS + face verification
- Manager dashboard (own team only)
- Admin/SuperAdmin overview + filters + CSV export
- Audit log with pagination
- GPS accuracy display + warning tiers
- Geofence (off/warning/strict)
- Organization-level feature toggle (`field_operations.enabled`)

## What's Broken / Needs Fix
1. **Team delete is soft-delete** (`active=false`) — user wants hard DB delete
2. **Team edit options not filtering already-assigned users** — dropdown shows everyone
3. **Super Admin UI sees too much** — bulk/assign/settings/create must be hidden from platform-level super admin view per user request
4. **Audit pagination exists** but needs confirmation it works (it does: `page`/`limit` in `getAuditLog`)
5. **Refresh button** needs clear UX visibility in ManagerDashboard
6. **Face verification** during duty start uses `selfieBase64` — works if `FaceProfile` exists, fails with clear error if missing
7. **Settings** have `require_face_verification` and `enabled` — user wants these removed from main settings panel because they live in submenu

## What's Reusable (Don't Rebuild)
- `face_service/` for embedding
- `mediaDevices.getUserMedia` for camera
- `navigator.geolocation` for GPS
- `FieldMap.jsx` for map
- `ImageKit` for photos
- `AuditLog` model
- Existing attendance guard (`assertNotFieldEmployee`)
- Existing React Query hooks (`useFieldTeams`, `useFieldOverview`, etc.)

## What Needs Modification
- `Backend/controllers/fieldOperations.controller.js`: `deleteTeam` hard delete; `teamOptions` filter assigned users; `getAuditLog` pagination confirm
- `Frontend/src/pages/field-operations/FieldOperations.jsx`: SuperAdmin restrictions; refresh UX; edit form ID mapping
- `Frontend/src/auth/api/fieldOperations/fieldOperations.api.js`: pass `excludeTeamId`
