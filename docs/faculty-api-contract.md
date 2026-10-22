# Faculty API contract

**Audience:** the Rust/Axum backend developer.

The frontend is built for three roles — Student, HOD and Faculty — and the
Faculty console is already scaffolded (`/faculty/dashboard` and
`/faculty/students`). It cannot be wired to real data yet, because the
backend currently gives a Faculty member no readable endpoint at all.

This document states exactly what is missing and what the frontend expects.

---

## 1. The current situation

`Role::Faculty` maps to exactly one permission in
`crates/domain/src/principal.rs`:

```rust
Role::Faculty => permissions.push("students:read".to_string()),
```

No handler reads that permission. The read paths are gated by
`require_manager()` (`crates/service/src/students.rs`), which asks for
`students:create` or `students:update`:

```rust
fn require_manager(actor: &Principal) -> DomainResult<()> {
    if actor.can_manage_students() { Ok(()) } else { Err(DomainError::Forbidden) }
}
```

The result for a signed-in Faculty member:

| Endpoint | Current result | Why |
| --- | --- | --- |
| `GET /students` | `403 forbidden` | `require_manager` |
| `GET /students/:id` | `404 not_found` | `owns_student` is false and the caller is not a manager |
| `GET /students/:id/history` | `403 forbidden` | `require_manager` |
| `GET /leave-requests` | `403 forbidden` | `leave::list` scopes to `own_student` or a manager, Faculty has no `student_id` |
| `GET /leave-requests/:id` | `404 not_found` | same ownership check |
| `GET /notifications` | `403 forbidden` | `require_manager` |
| `GET /admin/audit-logs` | `403 forbidden` | needs `admin:all` or `reports:view` |

A Faculty member can therefore only use `/auth/*`. The Faculty console would
render empty screens.

## 2. What the frontend expects

Two endpoints, under the existing `/api/v1` prefix.

### `GET /faculty/students`

The roster of students the faculty member may read.

| Query | Type | Notes |
| --- | --- | --- |
| `q` | `string?` | search over name and register number |
| `semester` | `i16?` | exact match |
| `section` | `string?` | exact match |
| `page` | `i64?` | default 1 |
| `per_page` | `i64?` | default 20, clamp 1..100 |

Response — the standard pagination envelope:

```json
{
  "items": [
    {
      "id": "0f9c...",
      "user_id": "1a2b...",
      "register_number": "2021CS001",
      "full_name": "Asha Student",
      "email": "asha@example.com",
      "department": "ISE",
      "semester": 5,
      "section": "A",
      "admission_year": 2021,
      "status": "active",
      "created_at": "2026-08-01T09:00:00Z",
      "deleted_at": null,
      "pending_leave_count": 2
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

`pending_leave_count` is the number of leave requests of that student in
status `pending`. It is the only field beyond `StudentRecord`, and it lets
the roster show a badge without an extra request per row.

### `GET /faculty/leave-requests`

The leave requests of the students on that roster.

| Query | Type | Notes |
| --- | --- | --- |
| `student_id` | `uuid?` | narrows to one student |
| `status` | `string?` | one of `draft`, `pending`, `changes_requested`, `approved`, `rejected`, `withdrawn`, `completed` |
| `page` | `i64?` | default 1 |
| `per_page` | `i64?` | default 20, clamp 1..100 |

Response: the standard pagination envelope with `LeaveRequest` items, the
same shape as `GET /leave-requests`.

## 3. The permissions this needs

Two new permission strings, both granted to `Role::Faculty`:

| Permission | Grants |
| --- | --- |
| `faculty:students:read` | `GET /faculty/students` |
| `faculty:leave:read` | `GET /faculty/leave-requests` |

Add them to the `Role::Faculty` arm in `Principal` and record them in the
`permissions` / `role_permissions` tables created by migration `0004`.

Do **not** reuse `students:read` for this. `students:read` is already the
name of a permission, and widening the existing manager check would hand
Faculty the write paths as well.

### Authorisation rules

- The Faculty read scope is a **read-only** view. Faculty must not be able to
  create, update, deactivate or reset a student, and must not be able to
  approve, reject or request changes on a leave request. Only the HOD holds
  `leave:approve`, `leave:reject` and `leave:request_changes`.
- Which students a faculty member may read is a scoping decision. The
  simplest rule that matches the current data model is *all students of the
  department*. A tighter rule (for example, students of the sections a
  faculty member teaches) needs a teaching-assignment table that does not
  exist yet — see section 5.
- A Faculty member must still get `404`, not `403`, for a student outside
  their scope, so the endpoint does not confirm the existence of records the
  caller may not see. This matches the rule already applied in
  `students::ensure_access`.
- The frontend already hides the approve, reject and request-changes
  actions from anyone who is not the HOD (`canDecideRequests` in
  `src/context/AuthContext.tsx` is true only when the caller holds the
  `hod` role). This is a convenience, not a security boundary — the backend
  must keep enforcing the decision permissions.

## 4. What the frontend does not need

- No Faculty write endpoints. The Faculty console is read-only.
- No Faculty dashboard aggregate endpoint. The dashboard derives its
  counters from `GET /faculty/leave-requests` with the relevant status
  filters, which is accurate for a page of at most 100 rows.
- No Faculty-specific export, report or notification endpoints.

## 5. Still open for the backend

1. **The scope rule.** "All students of the department" is the assumption
   behind the two endpoints above. If faculty should only see their own
   students, that needs a teaching-assignment table and a new migration.
2. **Department scoping.** `StudentRecord.department` exists but the
   students are not filtered by it today, and a user is not tied to a
   department either. If a faculty member should only see one department,
   both sides need that link.
3. **The 404 rule for other departments** in section 3.

## 6. Related gaps that also affect the HOD console

These are not Faculty-specific but were found while building the frontend,
and the HOD pages cannot be completed without them:

| Gap | Frontend page affected |
| --- | --- |
| No dashboard aggregate endpoint (`/admin/dashboard`). Only paginated lists capped at 100 rows per page exist, so per-department counters cannot be computed reliably. | `pages/hod/Dashboard.tsx` |
| No leave-report endpoint (`/admin/reports`). `GET /leave-requests` filters by `status` only — no student filter, no date range, no sorting. | `pages/hod/Reports.tsx` |
| No certificate endpoint. A certificate is presumably derived from a leave request that is `approved` and later `completed`; if it needs a printable document, that is a new route. | `pages/hod/Certificates.tsx` |
| No document or attachment endpoints. `NewLeave` has no document field, so a student cannot attach a medical certificate. The AGENTS.md Phase D (documents and event evidence) is not in the router yet. | `pages/student/ApplyLeave.tsx` |

## 7. Verifying the change

Once the two endpoints exist, the frontend can be exercised end to end:

```bash
# 1. sign in as faculty
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"faculty@example.com","password":"..."}'

# 2. call the roster with the returned bearer token
curl -s http://localhost:8080/api/v1/faculty/students \
  -H 'Authorization: Bearer <token>'

# 3. call the leave requests
curl -s 'http://localhost:8080/api/v1/faculty/leave-requests?status=pending' \
  -H 'Authorization: Bearer <token>'
```

The frontend expects the standard envelopes: `{ "items": [...], "total": n,
"page": n, "per_page": n }` for lists and
`{ "error": { "code": "...", "message": "..." } }` for failures.
