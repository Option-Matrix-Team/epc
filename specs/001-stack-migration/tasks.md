# Implementation Tasks: EMR Stack Migration (shadcn/Tailwind/Supabase)

**Feature**: 001-stack-migration  
**Branch**: 001-stack-migration  
**Date**: 2025-11-12

---

## Phase 1: Setup
- [x] T001 Create project structure per plan.md in epc_latest/
- [x] T002 Install dependencies (@supabase/ssr, react-hook-form, zod, sonner, shadcn/ui) in epc_latest/package.json
- [x] T003 Add shadcn/ui form and label components in epc_latest/src/components/ui/
- [x] T004 Create .env.local.example template in epc_latest/.env.local.example
- [x] T005 Configure .gitignore to exclude .env.local in epc_latest/.gitignore

## Phase 2: Foundational
- [x] T006 Apply RLS policies to profiles table in Supabase (see quickstart.md SQL)
- [x] T007 Create test users and profiles in Supabase dashboard and public.profiles table
- [x] T008 Create Supabase client helpers (client.ts, server.ts) in epc_latest/src/lib/supabase/
- [x] T009 Create TypeScript types for auth in epc_latest/src/types/auth.ts
- [x] T010 Create useAuth hook for client-side auth state in epc_latest/src/hooks/use-auth.ts

## Phase 3: [US1] Authentication & Access Control (P1)
- [x] T011 [P] [US1] Create login page in epc_latest/src/app/(auth)/login/page.tsx
- [x] T012 [P] [US1] Create login form component with validation in epc_latest/src/components/auth/login-form.tsx
- [x] T013 [P] [US1] Create auth layout (no sidebar) in epc_latest/src/app/(auth)/layout.tsx
- [x] T014 [P] [US1] Implement route protection middleware in epc_latest/middleware.ts
- [x] T015 [P] [US1] Move dashboard to protected route group in epc_latest/src/app/(dashboard)/page.tsx
- [x] T016 [P] [US1] Create dashboard layout with sidebar in epc_latest/src/app/(dashboard)/layout.tsx
- [x] T017 [P] [US1] Implement sign-out functionality in epc_latest/src/app/api/auth/signout/route.ts
- [x] T018 [P] [US1] Implement auth callback handler in epc_latest/src/app/api/auth/callback/route.ts
- [ ] T019 [P] [US1] Implement manual test cases from quickstart.md

## Phase 4: [US2] Patient Management (P1)
- [ ] T020 [P] [US2] Create patient entity/model in epc_latest/src/types/patient.ts
- [ ] T021 [P] [US2] Create patient registration form in epc_latest/src/components/patient/patient-form.tsx
- [ ] T022 [P] [US2] Implement patient list page with search and pagination in epc_latest/src/app/(dashboard)/patients/page.tsx
- [ ] T023 [P] [US2] Implement patient profile page in epc_latest/src/app/(dashboard)/patients/[id]/page.tsx
- [ ] T024 [P] [US2] Implement patient CRUD API routes in epc_latest/src/app/api/patients/[...].ts
- [ ] T025 [P] [US2] Implement audit trail for patient updates in Supabase

## Phase 5: [US3] Doctor/Provider Management (P2)
- [ ] T026 [P] [US3] Create doctor entity/model in epc_latest/src/types/doctor.ts
- [ ] T027 [P] [US3] Create doctor profile form in epc_latest/src/components/doctor/doctor-form.tsx
- [ ] T028 [P] [US3] Implement doctor list page with filter in epc_latest/src/app/(dashboard)/doctors/page.tsx
- [ ] T029 [P] [US3] Implement doctor profile page in epc_latest/src/app/(dashboard)/doctors/[id]/page.tsx
- [ ] T030 [P] [US3] Implement doctor CRUD API routes in epc_latest/src/app/api/doctors/[...].ts
- [ ] T031 [P] [US3] Implement schedule management for doctors in epc_latest/src/app/(dashboard)/doctors/schedule.tsx

## Phase 6: [US4] Appointment Scheduling (P2)
- [ ] T032 [P] [US4] Create appointment entity/model in epc_latest/src/types/appointment.ts
- [ ] T033 [P] [US4] Create appointment booking form in epc_latest/src/components/appointment/appointment-form.tsx
- [ ] T034 [P] [US4] Implement appointment calendar view in epc_latest/src/app/(dashboard)/appointments/calendar.tsx
- [ ] T035 [P] [US4] Implement appointment CRUD API routes in epc_latest/src/app/api/appointments/[...].ts
- [ ] T036 [P] [US4] Implement double-booking prevention logic in API route
- [ ] T037 [P] [US4] Implement appointment status management in epc_latest/src/types/appointment.ts

## Phase 7: [US5] Staff Management (P3)
- [ ] T038 [P] [US5] Create staff entity/model in epc_latest/src/types/staff.ts
- [ ] T039 [P] [US5] Create staff profile form in epc_latest/src/components/staff/staff-form.tsx
- [ ] T040 [P] [US5] Implement staff list page with filter in epc_latest/src/app/(dashboard)/staff/page.tsx
- [ ] T041 [P] [US5] Implement staff profile page in epc_latest/src/app/(dashboard)/staff/[id]/page.tsx
- [ ] T042 [P] [US5] Implement staff CRUD API routes in epc_latest/src/app/api/staff/[...].ts
- [ ] T043 [P] [US5] Implement audit trail for staff updates in Supabase

## Phase 8: [US6] Dashboard & Overview (P3)
- [ ] T044 [P] [US6] Implement role-specific dashboard widgets in epc_latest/src/app/(dashboard)/widgets/
- [ ] T045 [P] [US6] Implement notification badge in epc_latest/src/components/ui/notification-badge.tsx
- [ ] T046 [P] [US6] Implement dashboard refresh logic in epc_latest/src/app/(dashboard)/page.tsx

## Phase 9: [US7] Responsive Mobile Access (P4)
- [ ] T047 [P] [US7] Implement responsive layouts for mobile/tablet in epc_latest/src/app/(dashboard)/
- [ ] T048 [P] [US7] Implement touch-friendly controls in epc_latest/src/components/ui/
- [ ] T049 [P] [US7] Test mobile workflows per quickstart.md

## Final Phase: Polish & Cross-Cutting
- [ ] T050 Review and polish UI for accessibility and consistency in epc_latest/src/components/ui/
- [ ] T051 Update documentation in specs/001-stack-migration/quickstart.md
- [ ] T052 Validate manual test cases for all user stories
- [ ] T053 Prepare for production deployment (env, Supabase config, error tracking)

---

## Dependencies
- Phase 1 and 2 must be completed before any user story phases
- User stories are prioritized: US1 (Auth) → US2 (Patient) → US3 (Doctor) → US4 (Appointment) → US5 (Staff) → US6 (Dashboard) → US7 (Mobile)
- Most user stories can be implemented in parallel after foundational tasks

## Parallel Execution Examples
- T011, T012, T013, T014, T015, T016, T017, T018, T019 ([US1]) can be done in parallel (different files)
- T020–T025 ([US2]) can be done in parallel after US1
- T026–T031 ([US3]), T032–T037 ([US4]), T038–T043 ([US5]), T044–T046 ([US6]), T047–T049 ([US7]) can be done in parallel per story

## Implementation Strategy
- MVP: Complete Phase 1–3 (Setup, Foundational, Authentication)
- Incremental delivery: Each user story phase is independently testable
- Manual test cases only (no automated tests)
- Validate each phase before moving to next

---

## Format Validation
- All tasks use strict checklist format: `- [ ] Txxx [P] [USx] Description with file path`
- Each user story phase is independently testable
- Manual test criteria documented in quickstart.md

---

## Summary
- Total tasks: 53
- Task count per user story: US1 (9), US2 (6), US3 (6), US4 (6), US5 (6), US6 (3), US7 (3)
- Parallel opportunities: All user story tasks can be executed in parallel after foundational phases
- MVP scope: Complete through US1 (Authentication & Access Control)
- All tasks follow required checklist format
- Each phase is independently testable

**Path to tasks.md**: specs/001-stack-migration/tasks.md
