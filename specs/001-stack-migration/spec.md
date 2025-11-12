# Feature Specification: EMR Stack Migration to shadcn/Tailwind

**Feature Branch**: `001-stack-migration`  
**Created**: 2025-11-12  
**Status**: Draft  
**Input**: User description: "Migrate EMR system from Bootstrap/Preclinic theme to shadcn/Tailwind stack, preserving existing functionality from legacy codebase"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authentication & Access Control (Priority: P1)

Healthcare staff (doctors, nurses, technicians, administrators) need to securely log in and access the system based on their role. The authentication system must support multiple healthcare roles with appropriate permissions, maintain session security, and provide password recovery options.

**Why this priority**: Authentication is the foundation - no other features can be used without secure access. Healthcare data requires strict access controls per HIPAA compliance.

**Independent Test**: Can be fully tested by creating user accounts with different roles, logging in/out, testing password reset flow, and verifying role-based access restrictions deliver working authentication without any clinical features implemented.

**Acceptance Scenarios**:

1. **Given** a registered healthcare staff member with valid credentials, **When** they enter their email and password on the login page, **Then** they are authenticated and redirected to their role-appropriate dashboard
2. **Given** an authenticated user has been inactive for 15 minutes, **When** they attempt any action, **Then** their session expires and they are prompted to log in again
3. **Given** a user has forgotten their password, **When** they request a password reset via email, **Then** they receive a secure reset link and can set a new password
4. **Given** a user with 'Doctor' role logs in, **When** they navigate the system, **Then** they can only access doctor-specific features and cannot access admin or nurse-specific functions
5. **Given** a user attempts to log in with incorrect credentials 5 times, **When** they make a 6th attempt, **Then** their account is temporarily locked for 30 minutes
6. **Given** a new staff member joins the hospital, **When** an administrator creates their account, **Then** they receive an email with initial password setup instructions
7. **Given** a user is logged in on one device, **When** they log in on another device, **Then** the previous session is invalidated (single session enforcement)

---

### User Story 2 - Patient Management (Priority: P1)

Healthcare staff need to register new patients, view patient records, update patient information, and search for patients quickly. This is the core data entity around which clinical workflows revolve.

**Why this priority**: Patient records are the central entity in an EMR system. Without patient management, no clinical documentation, appointments, or treatments can be recorded.

**Independent Test**: Can be fully tested by creating patients, viewing patient lists, searching patients, editing patient details, and viewing patient profiles without implementing appointments or clinical notes.

**Acceptance Scenarios**:

1. **Given** a front-desk staff member, **When** they access the patient registration form and enter patient demographics (name, date of birth, contact info, insurance), **Then** a new patient record is created with a unique patient ID
2. **Given** multiple patients are registered in the system, **When** staff searches by patient name, ID, or phone number, **Then** matching patient records are displayed within 1 second
3. **Given** a patient's information changes, **When** authorized staff updates the patient record, **Then** the changes are saved with an audit trail showing who made the change and when
4. **Given** a staff member views the patient list, **When** the list contains hundreds of patients, **Then** the list is paginated with 25 patients per page and loads in under 2 seconds
5. **Given** a patient record exists, **When** staff views the patient details page, **Then** they see complete demographics, contact information, insurance details, and medical record number
6. **Given** a patient has a preferred name different from legal name, **When** staff enters both names, **Then** the system displays the preferred name in most views while maintaining legal name for official documents
7. **Given** duplicate patient records might exist, **When** staff searches for a patient, **Then** the system flags potential duplicates based on matching name and date of birth

---

### User Story 3 - Doctor/Provider Management (Priority: P2)

Administrators need to manage doctor profiles including specializations, schedules, contact information, and availability. Patients and staff need to view doctor information when scheduling appointments.

**Why this priority**: Essential for appointment scheduling and provider assignment, but patient records can exist independently. Critical for operational workflows but secondary to patient data management.

**Independent Test**: Can be fully tested by creating doctor profiles, setting specializations, managing schedules, and viewing doctor lists without implementing appointments or patient assignments.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they create a new doctor profile with name, specialization, contact details, and working hours, **Then** the doctor appears in the system's provider list
2. **Given** doctors have different specializations, **When** staff filters the doctor list by specialization, **Then** only doctors with that specialization are displayed
3. **Given** a doctor's schedule changes, **When** the administrator updates their working hours or days, **Then** the changes are reflected immediately in the system
4. **Given** a doctor profile exists, **When** staff views doctor details, **Then** they see the doctor's photo, full name, specializations, qualifications, contact info, and consultation fees
5. **Given** a doctor leaves the hospital, **When** the administrator deactivates their profile, **Then** the doctor no longer appears in active doctor lists but historical records remain accessible
6. **Given** multiple doctors work at the hospital, **When** staff views the doctors list, **Then** doctors are organized by department/specialization with search and filter capabilities

---

### User Story 4 - Appointment Scheduling (Priority: P2)

Staff need to schedule, view, modify, and cancel patient appointments with doctors. The system must prevent double-booking and show doctor availability clearly.

**Why this priority**: Core clinical workflow that depends on both patient and doctor management being in place. Critical for day-to-day operations but requires foundational entities first.

**Independent Test**: Can be fully tested by booking appointments between registered patients and doctors, viewing appointment calendars, and managing appointment status without implementing clinical notes or prescriptions.

**Acceptance Scenarios**:

1. **Given** a patient and available doctor, **When** staff books an appointment by selecting date, time, and reason, **Then** the appointment is created and appears on both patient and doctor schedules
2. **Given** a doctor already has an appointment at 2 PM, **When** staff attempts to book another appointment for the same doctor at 2 PM, **Then** the system prevents the double-booking and shows an error
3. **Given** an appointment is scheduled, **When** the patient cancels with reason provided, **Then** the appointment status changes to 'Cancelled', the time slot becomes available, and cancellation reason is recorded
4. **Given** staff views the appointment calendar, **When** they select a specific date, **Then** they see all appointments for that day organized by doctor and time
5. **Given** an appointment time needs to change, **When** staff reschedules the appointment, **Then** the new time is validated for availability and updated with notification to relevant parties
6. **Given** walk-in patients arrive without appointment, **When** staff marks an appointment as 'walk-in', **Then** it's added to the schedule without prior booking validation
7. **Given** multiple appointments exist, **When** staff filters by status (scheduled, completed, cancelled, no-show), **Then** appointments matching that status are displayed
8. **Given** an appointment is approaching, **When** it's 1 day before the scheduled time, **Then** automated reminder notifications are prepared for the patient

---

### User Story 5 - Staff Management (Priority: P3)

Administrators need to manage non-doctor staff including nurses, technicians, and administrative personnel with their roles, departments, and contact information.

**Why this priority**: Important for operational completeness and audit trails, but not blocking core clinical workflows. Can be implemented after primary clinical entities are functional.

**Independent Test**: Can be fully tested by creating staff profiles, assigning roles, organizing by department, and managing access permissions independently of clinical operations.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they create a staff member profile with name, role, department, and contact info, **Then** the staff member appears in the staff directory
2. **Given** staff have different roles (nurse, technician, receptionist), **When** filtering the staff list by role, **Then** only staff with that role are displayed
3. **Given** a staff member's details change, **When** the administrator updates their profile, **Then** changes are saved with audit trail
4. **Given** a staff member leaves, **When** the administrator deactivates their account, **Then** they cannot log in but their historical records remain in the system
5. **Given** staff work in different departments, **When** viewing the staff directory, **Then** staff can be filtered and organized by department

---

### User Story 6 - Dashboard & Overview (Priority: P3)

Healthcare staff need role-specific dashboards showing relevant metrics, upcoming appointments, pending tasks, and quick access to common functions based on their role.

**Why this priority**: Enhances user experience and efficiency but not required for core functions to work. Provides value after main features are implemented.

**Independent Test**: Can be fully tested by logging in as different roles and viewing their respective dashboards with appropriate widgets, metrics, and quick actions without completing actual clinical workflows.

**Acceptance Scenarios**:

1. **Given** a doctor logs in, **When** they view their dashboard, **Then** they see today's appointments, pending tasks, recent patients, and quick access to schedule
2. **Given** an administrator logs in, **When** they view their dashboard, **Then** they see system metrics (total patients, staff count, today's appointments), recent activities, and admin quick actions
3. **Given** a receptionist logs in, **When** they view their dashboard, **Then** they see today's appointment list, walk-in queue, and quick patient registration access
4. **Given** dashboard data may be stale, **When** a user refreshes their dashboard, **Then** latest data is fetched and displayed within 2 seconds
5. **Given** a user has unread notifications, **When** they view their dashboard, **Then** a notification badge displays the count and they can access notifications quickly

---

### User Story 7 - Responsive Mobile Access (Priority: P4)

Healthcare staff need to access key system functions from tablets and mobile devices while on rounds or away from their desktop workstations.

**Why this priority**: Convenience feature that improves flexibility but all core workflows must function on desktop first. Mobile optimization can follow desktop implementation.

**Independent Test**: Can be fully tested by accessing the application on various screen sizes (mobile, tablet) and verifying responsive layouts, touch-friendly controls, and mobile-optimized workflows work independently of desktop version.

**Acceptance Scenarios**:

1. **Given** a doctor uses a tablet during rounds, **When** they access patient records on the tablet, **Then** the interface adapts to tablet screen size with touch-friendly controls
2. **Given** a staff member uses a mobile phone, **When** they view the appointment calendar, **Then** the calendar displays in a mobile-optimized format with easy date navigation
3. **Given** various screen sizes exist, **When** accessing any page, **Then** the layout responds appropriately maintaining readability and functionality
4. **Given** touch gestures are available on mobile, **When** users interact with lists or menus, **Then** swipe and tap gestures work intuitively

---

### Edge Cases

- What happens when a user tries to schedule an appointment outside doctor's working hours?
- How does the system handle simultaneous updates to the same patient record by multiple staff members?
- What happens when attempting to delete a patient record that has associated appointments or medical history?
- How does the system behave when network connectivity is lost during form submission?
- What happens when uploaded file sizes exceed limits or are in unsupported formats?
- How does the system handle special characters or non-English names in patient/staff records?
- What happens when a doctor is marked inactive but has future appointments scheduled?
- How does pagination behave when filters reduce results to less than one page?
- What happens during database backup or maintenance windows?

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Security

- **FR-001**: System MUST support email/password authentication with bcrypt password hashing
- **FR-002**: System MUST enforce multi-factor authentication (MFA) for all user accounts
- **FR-003**: System MUST implement role-based access control (RBAC) with roles: Administrator, Doctor, Nurse, Technician, Receptionist
- **FR-004**: System MUST automatically expire sessions after 15 minutes of inactivity
- **FR-005**: System MUST provide password reset functionality via secure email link with 1-hour expiration
- **FR-006**: System MUST lock accounts after 5 failed login attempts for 30 minutes
- **FR-007**: System MUST enforce single session per user (logging in elsewhere invalidates previous session)
- **FR-008**: System MUST log all authentication events (login, logout, failed attempts) with timestamp and IP address

#### Patient Management

- **FR-009**: System MUST allow creation of patient records with demographics: name (legal and preferred), date of birth, gender, contact information, address, emergency contact, insurance details
- **FR-010**: System MUST auto-generate unique patient IDs upon registration
- **FR-011**: System MUST provide patient search by name, patient ID, phone number, or date of birth
- **FR-012**: System MUST display search results within 1 second for databases up to 100,000 patients
- **FR-013**: System MUST support patient record updates with audit trail (who, when, what changed)
- **FR-014**: System MUST implement soft delete for patient records (mark inactive, never permanently delete)
- **FR-015**: System MUST detect and flag potential duplicate patients based on name and date of birth matching
- **FR-016**: System MUST display patient list with pagination (25 records per page) and sorting options
- **FR-017**: System MUST maintain patient profile page showing complete demographics and medical record number

#### Doctor/Provider Management

- **FR-018**: System MUST allow creation of doctor profiles with: name, photo, specialization(s), qualifications, license number, contact details, consultation fees, working schedule
- **FR-019**: System MUST support multiple specializations per doctor
- **FR-020**: System MUST allow filtering doctors by specialization and active/inactive status
- **FR-021**: System MUST provide doctor schedule management (working days, hours, breaks)
- **FR-022**: System MUST support doctor profile activation/deactivation
- **FR-023**: System MUST maintain historical records when doctors are deactivated
- **FR-024**: System MUST display doctor list organized by department/specialization

#### Appointment Scheduling

- **FR-025**: System MUST allow creation of appointments with: patient, doctor, date, time, duration, appointment type, reason/notes
- **FR-026**: System MUST prevent double-booking (same doctor, overlapping time slots)
- **FR-027**: System MUST validate appointments against doctor's working schedule
- **FR-028**: System MUST support appointment statuses: Scheduled, Confirmed, In Progress, Completed, Cancelled, No Show
- **FR-029**: System MUST record cancellation reasons when appointments are cancelled
- **FR-030**: System MUST allow rescheduling appointments with availability validation
- **FR-031**: System MUST support walk-in appointments (created on-the-fly)
- **FR-032**: System MUST display calendar view of appointments by day, week, or month
- **FR-033**: System MUST filter appointments by status, doctor, or date range
- **FR-034**: System MUST show appointment count and patient details in calendar view

#### Staff Management

- **FR-035**: System MUST allow creation of staff profiles with: name, role, department, contact information, employee ID
- **FR-036**: System MUST support staff roles: Nurse, Technician, Receptionist, Lab Technician
- **FR-037**: System MUST allow filtering staff by role and department
- **FR-038**: System MUST support staff profile activation/deactivation
- **FR-039**: System MUST maintain audit trail of staff profile changes

#### Dashboard & Navigation

- **FR-040**: System MUST provide role-specific dashboards with relevant metrics and quick actions
- **FR-041**: System MUST display today's appointments count on all dashboards
- **FR-042**: System MUST provide quick navigation to frequently used features based on role
- **FR-043**: System MUST show notification badges for unread items
- **FR-044**: System MUST refresh dashboard data on user request

#### Data Integrity & Audit

- **FR-045**: System MUST log all data modifications (create, update, delete) with: user, timestamp, before/after values, action type
- **FR-046**: System MUST use soft delete for all records (patients, doctors, staff, appointments)
- **FR-047**: System MUST implement database transactions for operations affecting multiple tables
- **FR-048**: System MUST validate all form inputs at both client and server levels
- **FR-049**: System MUST display validation errors clearly near relevant form fields

#### UI/UX Standards

- **FR-050**: System MUST use shadcn/ui components for all UI elements
- **FR-051**: System MUST use Tailwind CSS for all styling
- **FR-052**: System MUST maintain consistent color scheme aligned with healthcare branding
- **FR-053**: System MUST provide loading indicators for operations taking longer than 500ms
- **FR-054**: System MUST display success/error toast notifications for user actions
- **FR-055**: System MUST implement responsive design supporting desktop (1920x1080), tablet (768x1024), and mobile (375x667) viewports
- **FR-056**: System MUST maintain WCAG 2.1 AA accessibility standards
- **FR-057**: System MUST support keyboard navigation for all interactive elements

#### Performance Requirements

- **FR-058**: System MUST load pages within 2 seconds on standard hospital network (10 Mbps)
- **FR-059**: System MUST return search results within 1 second
- **FR-060**: System MUST handle 100 concurrent users without performance degradation
- **FR-061**: System MUST optimize database queries with proper indexing

#### Integration Requirements

- **FR-062**: System MUST integrate with Supabase for authentication using Supabase Auth
- **FR-063**: System MUST use Supabase PostgreSQL database with Row Level Security (RLS) policies
- **FR-064**: System MUST use Supabase Storage for file uploads (patient documents, doctor photos)
- **FR-065**: System MUST implement real-time subscriptions for appointment updates using Supabase Realtime

### Key Entities

- **User**: Represents any system user with authentication credentials, role, and permissions. Attributes include email, password hash, role, MFA settings, last login, account status. Related to specific role entities (Doctor, Nurse, Staff).

- **Patient**: Core entity representing individuals receiving care. Attributes include patient ID, legal name, preferred name, date of birth, gender, contact information, address, emergency contact, insurance details, medical record number, registration date, status (active/inactive). Related to Appointments, and future clinical entities.

- **Doctor**: Healthcare providers who see patients. Attributes include user reference, name, photo, specializations (array), qualifications, license number, contact details, consultation fees, working schedule (JSON), department, status (active/inactive). Related to Appointments and User.

- **Appointment**: Scheduled or completed patient-doctor interactions. Attributes include patient reference, doctor reference, appointment date, start time, end time, appointment type, reason/chief complaint, status (scheduled/confirmed/completed/cancelled/no-show), cancellation reason, created by (staff reference), created at, updated at. Related to Patient, Doctor, and User (creator).

- **Staff**: Non-doctor healthcare personnel. Attributes include user reference, name, role (nurse/technician/receptionist/lab tech), department, employee ID, contact information, hire date, status (active/inactive). Related to User.

- **Audit Log**: Tracks all data modifications for compliance. Attributes include user reference, action type (create/update/delete), entity type, entity ID, before values (JSON), after values (JSON), timestamp, IP address, user agent.

- **Specialization**: Medical specialties for categorizing doctors. Attributes include name, description, status. Related to Doctor (many-to-many).

- **Department**: Organizational units within hospital. Attributes include name, description, head (staff reference), status. Related to Doctor, Staff.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Healthcare staff can log in and access their role-appropriate dashboard within 3 clicks and 10 seconds
- **SC-002**: Front desk staff can register a new patient and schedule their first appointment in under 3 minutes
- **SC-003**: Staff can search for and retrieve patient records within 1 second for 95% of searches
- **SC-004**: System maintains 99.9% uptime during hospital operating hours (7 AM - 10 PM)
- **SC-005**: All pages load within 2 seconds on standard hospital network conditions
- **SC-006**: 100% of legacy authentication, patient management, doctor management, appointment scheduling, and staff management features are successfully migrated
- **SC-007**: Zero data loss during migration from legacy to new system
- **SC-008**: System passes WCAG 2.1 AA accessibility audit with no critical violations
- **SC-009**: Mobile and tablet interfaces allow staff to complete key workflows (view patients, check schedules) with same success rate as desktop
- **SC-010**: System supports 100 concurrent users with response times staying under 2 seconds for 95th percentile
- **SC-011**: All database operations affecting patient data include audit trail entries with 100% accuracy
- **SC-012**: Password reset workflow has 95% successful completion rate without support intervention
- **SC-013**: System prevents 100% of double-booking attempts through validation
- **SC-014**: Role-based access control correctly restricts unauthorized access in 100% of test cases
- **SC-015**: UI components maintain visual consistency across all pages matching approved design system

## Assumptions

1. **Supabase Setup**: A Supabase project is already configured with appropriate database, authentication, and storage buckets
2. **Environment Variables**: Supabase connection credentials will be provided via environment variables
3. **Email Service**: Supabase email service or SMTP configuration is available for password reset and notifications
4. **Data Migration**: Legacy database schema and data export will be available in compatible format for migration
5. **No Payment Processing**: Financial transactions and payment processing are not part of this migration scope
6. **Single Clinic Group**: System serves one hospital/clinic group, not a multi-tenant SaaS platform
7. **English Language**: Initial implementation supports English only, internationalization can be added later
8. **Image Storage**: Doctor photos and patient documents are stored in Supabase Storage with public URLs for photos, private URLs for documents
9. **Working Hours**: Standard hospital working hours are 7 AM - 10 PM, appointments cannot be scheduled outside this window without override
10. **Appointment Duration**: Standard appointment duration is 30 minutes unless specified otherwise
11. **Browser Support**: Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
12. **Network**: Hospital network provides minimum 10 Mbps bandwidth
13. **Authentication Method**: Email/password with MFA is the primary authentication method; SSO/OAuth can be added later if needed

## Out of Scope

The following features exist in the legacy system but are explicitly excluded from this migration phase:

- **Clinical Documentation**: Medical notes, diagnoses, treatment plans, prescriptions
- **Laboratory**: Lab orders, results, test management
- **Pharmacy**: Medication inventory, prescription fulfillment
- **Billing & Finance**: Invoice generation, payment processing, accounting, insurance claims
- **Reporting**: Analytics dashboards, custom reports, export features
- **HR Management**: Payroll, attendance tracking, leave management, holidays
- **Content Management**: Blog posts, pages, FAQs, testimonials, newsletters
- **Communication**: Chat, video calls, SMS notifications, email templates
- **Advanced Settings**: All 40+ settings pages from legacy system
- **Multiple Locations**: Multi-clinic/branch management
- **Super Admin**: Multi-organization/company management
- **UI Components Library**: Extended UI component showcase pages are not needed in new system

These features may be implemented in subsequent phases after the core migration is stable and validated
