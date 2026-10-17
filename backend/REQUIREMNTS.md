# Project: ISE Department Leave & Permission Management System

Act as a senior Rust backend engineer, PostgreSQL database architect, application security engineer, and React/TypeScript frontend developer.

Build a production-oriented, full-stack web application for a college Information Science and Engineering (ISE) department. The system must manage student accounts, leave requests, HOD approvals, parent SMS notifications, medical certificates, event permissions, event participation evidence, and complete audit history.

## 1. Required technology stack

- Backend: Rust, Axum, Tokio, SQLx.
- Database: PostgreSQL.
- Frontend: React, TypeScript, Vite.
- API: REST API using `/api/v1`.
- Authentication: secure, revocable sessions or a carefully implemented access/refresh-token strategy.
- Password hashing: Argon2id.
- File storage: private object storage behind a storage abstraction.
- Notifications: asynchronous queue and pluggable SMS provider.
- Deployment: Docker, Docker Compose for local development, HTTPS in production.
- Testing: Rust unit/integration tests, PostgreSQL integration tests, API authorization tests, and frontend tests.
- CI: GitHub Actions with formatting, linting, tests, migration checks, and production build checks.

Use stable, compatible dependency versions. Pin versions in the lockfile. Do not use deprecated APIs or pretend that an external integration works without credentials and tests.

## 2. Roles and access control

Implement these roles:

1. Admin: student and account management, configuration, authorized reports and audit access.
2. HOD: final leave and event-permission approval, student oversight, and authorized reports.
3. Faculty: only explicitly assigned permissions, such as providing recommendations or viewing permitted attendance information.
4. Student: own profile, requests, documents, status, history, and event evidence.

Parent notifications initially work through verified contact details and SMS. A parent portal may be added later.

Implement RBAC on the backend. Never rely on frontend route guards alone. Check resource ownership, department scope, role permissions, and status-transition rules on every relevant endpoint.

## 3. Student management

The HOD/admin must be able to:

- Create individual student accounts and bulk-import students.
- Generate unique student registration numbers and temporary credentials or secure activation links.
- Require a password change on first login.
- View, search, filter, paginate, update, deactivate, archive, and restore student records.
- Maintain name, register number, department, semester, section, email, parent/guardian contacts and account status.
- Reset access securely without viewing existing passwords.
- View an authorized student's leave and event history.

Do not permanently delete historical requests, approvals, or audit records when deactivating a student.

## 4. Leave and permission workflow

Support personal leave, medical leave, event permission, and other department-defined request types.

Each request should include:

- Student and registration number.
- Request type and reason.
- Start date/time and end date/time.
- Destination when applicable.
- Emergency contact information when required.
- Supporting document metadata.
- Submission timestamp and status.
- Reviewer, decision timestamp and decision reason.
- Full request history.

Implement these states:

`draft`, `pending`, `changes_requested`, `approved`, `rejected`, `withdrawn`, and `completed`.

Enforce valid transitions in the service layer and database transaction. A student may edit a draft or a returned request under policy, but must not change an approved request's dates or decision. Require a new request or an authorized amendment workflow.

Only an authorized HOD can approve or reject requests. Rejections must include a reason. Approval, history creation, and audit creation must be atomic. Handle concurrent approval attempts safely.

Submitting a request must never be treated as approval.

## 5. Medical documents and event evidence

Allow students to upload medical certificates, event invitations, registration confirmations, participation certificates and other approved supporting documents.

For each file, maintain:

- Associated request and uploader.
- Document type, original filename and upload timestamp.
- Private storage key, content type and size.
- Cryptographic checksum.
- Malware-scan status.
- Verification status and reviewer.
- Verification timestamp and any review notes.

Validate file types using file content, enforce size limits, scan uploads, prevent path traversal and restrict access. Medical certificates must not be publicly accessible.

Allow students to add event title, organizer, event website, location, dates and participation details.

Provide a separate verification workflow. Uploaded evidence must initially be unverified. Authorized reviewers may verify or reject evidence with a reason.

Allow an authorized student or reviewer to record return/completion after leave or an event. Preserve both the original permission decision and the later completion status.

## 6. Parent SMS notifications

Create a provider-independent notification service with an SMS gateway adapter.

Trigger notifications for:

- Request submission.
- HOD approval.
- HOD rejection.
- Requests for additional information, when appropriate.
- Material changes to an approved request.
- Return or event completion, where required by department policy.

Maintain a notification queue, retry policy, provider message ID, attempt count, timestamps, delivery callbacks and failure reasons.

Implement idempotency to prevent duplicate SMS messages. Verify webhook signatures and prevent forged delivery callbacks.

Keep API keys and provider credentials exclusively on the server. Support development mode with a mock SMS provider.

Use appropriate contact verification, notification consent/legal-basis handling, and applicable Indian DLT requirements. Do not include sensitive medical details in SMS messages.

## 7. API routes

Implement and document routes for:

Authentication:
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/logout`
- GET `/api/v1/auth/me`
- POST `/api/v1/auth/change-password`
- POST `/api/v1/auth/forgot-password`
- POST `/api/v1/auth/reset-password`
- GET `/api/v1/auth/sessions`
- DELETE `/api/v1/auth/sessions/{id}`

Students:
- POST `/api/v1/students`
- GET `/api/v1/students`
- GET `/api/v1/students/{id}`
- PATCH `/api/v1/students/{id}`
- DELETE `/api/v1/students/{id}`
- POST `/api/v1/students/{id}/restore`
- POST `/api/v1/students/import`
- GET `/api/v1/students/{id}/history`
- POST `/api/v1/students/{id}/reset-password`

Leave requests:
- POST `/api/v1/leave-requests`
- GET `/api/v1/leave-requests`
- GET `/api/v1/leave-requests/{id}`
- PATCH `/api/v1/leave-requests/{id}`
- POST `/api/v1/leave-requests/{id}/submit`
- POST `/api/v1/leave-requests/{id}/withdraw`
- POST `/api/v1/leave-requests/{id}/approve`
- POST `/api/v1/leave-requests/{id}/reject`
- POST `/api/v1/leave-requests/{id}/request-changes`
- GET `/api/v1/leave-requests/{id}/history`
- POST `/api/v1/leave-requests/{id}/return`
- POST `/api/v1/leave-requests/{id}/completion`

Events and documents:
- POST `/api/v1/events`
- GET `/api/v1/events`
- GET `/api/v1/events/{id}`
- PATCH `/api/v1/events/{id}`
- POST `/api/v1/events/{id}/evidence`
- GET `/api/v1/events/{id}/evidence`
- POST `/api/v1/leave-requests/{id}/documents`
- GET `/api/v1/documents/{id}/download`

Parents and notifications:
- POST `/api/v1/parents`
- PATCH `/api/v1/parents/{id}`
- POST `/api/v1/parents/{id}/verify`
- GET `/api/v1/notifications`
- GET `/api/v1/notifications/{id}`
- POST `/api/v1/webhooks/sms/{provider}`

Administration:
- GET `/api/v1/admin/dashboard`
- GET `/api/v1/admin/audit-logs`
- GET `/api/v1/admin/reports/leaves`
- GET `/api/v1/health/live`
- GET `/api/v1/health/ready`

Add appropriate request/response DTOs, query validation, pagination, filters, sorting and authorization for every route. Return consistent JSON errors with correct HTTP status codes. Use 401 for unauthenticated access, 403 for insufficient permissions, 404 for inaccessible or nonexistent resources where appropriate, 409 for state conflicts, 422 for validation errors, and 429 for rate limits.

## 8. PostgreSQL and migrations

Design normalized PostgreSQL tables for:

- users
- roles
- permissions and role_permissions
- user_roles
- students
- parents
- parent contact verification and consent history
- sessions and password reset tokens
- leave_requests
- request_history
- events
- documents and evidence verification
- notifications and notification attempts
- audit_logs

Use UUID primary keys, foreign keys, unique constraints, check constraints, indexes, timestamps and appropriate transaction boundaries.

Provide numbered, reversible where practical, forward-compatible migrations. Never drop or reset production tables to resolve migration problems. Support migration status checks and a documented backup-and-restore procedure.

Use SQLx prepared queries and offline metadata where appropriate. Ensure a clean clone can build and run migrations from the documented commands.

## 9. Folder architecture

Use a modular Rust backend:

- `routes/`: HTTP routing and handlers.
- `middleware/`: authentication, authorization and rate limiting.
- `models/`: database models.
- `dto/`: validated request and response structures.
- `repositories/`: database access.
- `services/`: business rules and workflows.
- `storage/`: private file storage abstraction.
- `notifications/`: queue and SMS adapters.
- `config.rs`: validated configuration.
- `errors.rs`: consistent API errors.
- `state.rs`: shared application state.
- `tests/`: integration and authorization tests.

Use a separate React frontend with API clients, typed models, protected layouts, shared components, forms, loading/error states, and separate student, HOD, faculty and admin dashboards.

Avoid giant source files, duplicated logic, circular dependencies and unnecessary abstractions.

## 10. Frontend requirements

Create a clean, professional, responsive interface.

Student dashboard:
- Request summary and pending status.
- New leave/permission request form.
- Document upload.
- Event evidence submission.
- Request timeline and decision history.
- Profile and password management.

HOD dashboard:
- Pending approvals queue.
- Student search and account management.
- Request and document review.
- Approve, reject and request-changes actions.
- Event-evidence verification.
- Leave reports, audit history and notification status.

Admin dashboard:
- Student import and account administration.
- Role and permission management.
- Department configuration.
- System health and authorized reports.

Faculty dashboard:
- Only the faculty permissions assigned by the department.

Use accessible forms, clear validation messages, confirmation dialogs for destructive actions, pagination and useful empty/loading/error states. Do not expose another student's private information through client-side caching or API responses.

## 11. Security requirements

Implement:

- Password hashing and secure account recovery.
- CSRF protection when using cookie-based authentication.
- Secure, HttpOnly, appropriately configured SameSite cookies.
- Rate limits on login, recovery and sensitive endpoints.
- Input validation and parameterized SQL.
- CORS allowlisting, security headers and HTTPS.
- Authorization and resource-ownership checks.
- Secret management through environment variables.
- Upload validation, private storage and malware scanning.
- Audit logging with redaction of passwords, tokens, phone numbers and medical details.
- Verified notification webhooks and idempotent processing.
- Database backups, retention policies, health checks and structured logs.
- Privacy-aware access and deletion policies for student and medical records.

Do not log access tokens, passwords, full medical documents or unnecessary personal data. Never claim compliance or production readiness merely because a security feature exists in code.

## 12. Testing and deployment

Provide tests for:

- Login, logout, password changes and revoked sessions.
- All role and resource-ownership restrictions.
- Student create, update, deactivate and restore operations.
- Valid and invalid leave status transitions.
- Unauthorized approval attempts.
- Concurrent approval conflicts.
- File validation and document access.
- Event-evidence verification.
- SMS retry, deduplication and delivery callbacks.
- Audit history and transaction rollback.
- Database migrations from a clean PostgreSQL database.

Create Dockerfiles, Docker Compose, `.env.example`, GitHub Actions workflows, database migration instructions, API documentation, a security checklist, and a production deployment guide.

Use mock SMS and local private file storage for development, with explicit production adapters. Do not commit real secrets or seed production with sample users.

## 13. Implementation instructions

Work in phases:

1. Establish the repository structure, configuration, database connection and migrations.
2. Implement authentication, sessions, RBAC and student administration.
3. Implement the leave workflow and audit history.
4. Implement secure document storage and event evidence.
5. Implement SMS notifications and retry processing.
6. Build the React dashboards and connect them to real API endpoints.
7. Add integration tests, security checks, Docker and CI.
8. Document deployment and verify the complete workflow end to end.

Start by inspecting the existing repository if one exists. Preserve working code unless a change is necessary and explained. Do not replace implemented functionality with mock data, empty handlers, TODOs, or hard-coded responses.

After each phase, run the relevant formatter, compiler, tests and migration checks. Fix failures before proceeding. Report completed work, commands executed, test results, known limitations and remaining tasks honestly.

The final acceptance criterion is a working end-to-end flow: an authorized HOD creates a student account, the student logs in and submits a request with optional evidence, the parent receives the configured notification, the HOD reviews and decides, the student sees the decision, and all actions are recorded in the database and audit history.