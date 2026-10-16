# ISE Department Leave & Permission Management — backend

Rust · Axum · SQLx · PostgreSQL. Cargo workspace, layered like `cashless-campus`.

```
.
├── Cargo.toml              # root package (binary) + workspace
├── src/{main.rs,config.rs} # wiring: env config, migrations, SMS worker, HTTP server
├── migrations/             # 0001_init · 0002_leave_workflow · 0003_notifications
├── crates/
│   ├── domain/       # pure types + rules: Role/Principal, state machine, validation, models
│   ├── repository/   # ALL SQL (sqlx), generic over executor so services control transactions
│   ├── service/      # workflows: auth, students, leave, parents, notifications, crypto
│   └── api/          # axum: router, handlers/, extractors, error mapping
└── tests/            # integration tests (real PostgreSQL via #[sqlx::test])
```

Dependency direction: `api → service → repository → domain` (domain depends on nothing).

## Run
```bash
cp .env.example .env            # set PHONE_ENCRYPTION_KEY=$(openssl rand -hex 32) and the bootstrap admin
docker compose up -d db
export $(grep -v '^#' .env | xargs) && cargo run
```
First start on an empty DB creates the bootstrap admin (must change password on first login).

## Test
```bash
DATABASE_URL=postgres://leave:leave@localhost:5432/leave_dev ./test.sh
```
`sqlx::test` creates a throw-away database per test, so the DB user needs CREATEDB.

## Auth model
`POST /api/v1/auth/login {login, password}` → opaque bearer token (SHA-256 stored, revocable).
Send `Authorization: Bearer <token>`. Students log in with their register number, staff with email.
Accounts created by staff have a temporary password; every route except `/auth/me`,
`/auth/logout` and `/auth/change-password` returns 403 `password_change_required` until it is changed.

## Implemented routes (`/api/v1`)
health/live, health/ready · auth/{login,logout,me,change-password,sessions,sessions/:id} ·
users (admin) · students (CRUD + restore, reset-password, history, parents) ·
parents (create, verify) · leave-requests (create, list, get, patch, submit, withdraw,
approve, reject, request-changes, completion, history) · notifications · admin/audit-logs

## Not built yet (next phases)
forgot/reset-password (needs email delivery) · bulk student import · documents & event evidence
(private storage, malware scan, verification) · real SMS gateway adapter + signed delivery webhook ·
rate limiting · dashboard/report endpoints · parent OTP verification (staff attestation for now) ·
cookie sessions + CSRF (this build uses bearer tokens) · reversible (down) migrations.
