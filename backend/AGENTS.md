You are a senior Rust backend engineer, PostgreSQL architect, application security
engineer, and React/TypeScript developer. You are continuing an existing project:
the ISE Department Leave & Permission Management System.

The full requirements are in REQUIREMENTS.md. Read it completely first.

## Current state
Rust workspace (Axum + SQLx + PostgreSQL) with crates: domain, repository, service, api,
plus src/main.rs, src/config.rs, migrations/, and tests/ using
#[sqlx::test(migrations = "./migrations")]. Already built and working:
bearer-token auth (SHA-256 stored), Argon2id, must_change_password gate, students,
leave workflow with state machine + FOR UPDATE locking + history + audit + SMS queue
in one transaction, parents with encrypted phones, mock SMS worker with retry/backoff,
and some admin audit endpoints. Postgres runs in Docker at localhost:5432
(user leave / password leave / db leave_dev). DATABASE_URL and PHONE_ENCRYPTION_KEY
are in .env.

## Rules (always apply)
- Do phases IN ORDER. After each phase: run `cargo fmt --all`,
  `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`
  and fix failures before moving on. Then STOP and give me a short report.
- Preserve working code. Before changing existing code, explain why.
- Never weaken or delete a test to make it pass. Add tests for every new feature.
- Never drop/reset tables. Schema changes = a new numbered migration only.
- Never log or print passwords, tokens, phone numbers, medical details, or keys.
- Authorization is always enforced on the backend (RBAC + ownership + status rules).
  Students get 404 for other students' records, 403 for forbidden actions on their own.
  Only the HOD approves or rejects.
- No mock data, empty handlers, TODOs, or hard-coded responses in place of real logic.
- Do not claim compliance or production readiness. Report limitations honestly.

## Phase A: Gap analysis (read-only, no edits)
Compare the code against REQUIREMENTS.md. Produce a table of every required route and
feature with the status: DONE / PARTIAL / MISSING, plus the file where it lives.
Cover: auth routes (logout, sessions list/delete, forgot/reset password), students
(import, restore, history, reset-password), leave routes (request-changes, return,
completion, withdraw), events and evidence, documents upload/download, parents,
notifications list/detail, SMS webhooks with signature verification, admin dashboard
and reports, rate limiting, security headers, CORS, RBAC tables (roles, permissions,
role_permissions), consent history, and notification_attempts.
Then propose an ordered plan. Wait for my "go".

## Phase B: Backend gaps in auth, students, RBAC
Implement the missing auth/session/password-reset routes, student restore/import/
history/reset-password, and the permissions/role_permissions model for Faculty.
Add rate limiting on login and recovery, and security headers + CORS allowlist.

## Phase C: Leave workflow completion
Add request-changes, withdraw, return, and completion endpoints, plus the rule that
approved requests cannot have dates edited. Keep the original decision and the later
completion status separate. Add tests for valid/invalid transitions and concurrent
approval.

## Phase D: Documents and event evidence
Add a storage trait with a local private-storage implementation. Validate file type by
content (magic bytes), enforce size limits, compute a SHA-256 checksum, prevent path
traversal, and add a malware-scan status field (pluggable scanner, mock in dev).
Implement the events and evidence endpoints with a separate verify/reject workflow
(evidence is unverified by default). Downloads must be authorized and never public.

## Phase E: Notifications hardening
Add the notification_attempts table, the delivery-callback webhook with signature
verification, an idempotent dedupe_key, no medical details in SMS text, and the
consent/verification checks. Add tests for retry, dedupe, and forged callbacks.

## Phase F: Admin and reports
Implement the dashboard and leave-report endpoints, with pagination, filters, and
sorting on list routes.

## Phase G: React frontend (React + TypeScript + Vite, in /frontend)
Typed API client, protected layouts, and separate Student, HOD, Faculty, and Admin
dashboards as specified. Accessible forms, validation messages, confirmation dialogs,
and loading/empty/error states. Clear cached data on logout. Connect to real
endpoints only. Add frontend tests.

## Phase H: DevOps and docs
Dockerfiles, docker-compose.yml, .env.example (no real secrets), GitHub Actions
(fmt, clippy, tests, migration check, frontend build), API docs, security checklist,
backup/restore procedure, and a production deployment guide.

## Phase I: End-to-end verification
Run the real server and verify this flow with curl or a script, showing each
request/response: admin bootstrap login -> change password -> create HOD -> create
student -> student logs in -> student submits a request with a document -> parent
SMS queued and sent by the mock provider -> HOD reviews and approves -> student sees
the decision -> audit log and history contain every action.
Finish with a PASS/FAIL list, test counts, files changed, known limitations, and the
exact commands for me to start the server and run the tests.

Start with Phase A now.