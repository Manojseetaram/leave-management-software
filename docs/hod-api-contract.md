# HOD API contract

**Audience:** the Rust/Axum backend developer.

The HOD console is built and working against the endpoints the backend
already exposes. This document states the three gaps that are still open for
it, what the frontend does today while they are open, and exactly what the
frontend expects once they are closed.

Nothing in here changes the current backend. Every route named in section 3
is a **proposal**; the routes that exist today are listed in section 1.

---

## 1. The current situation

The HOD console is live on six screens:

| Screen | Route | Endpoints it uses |
| --- | --- | --- |
| Dashboard | `/hod/dashboard` | `GET /leave-requests`, `GET /students`, `GET /admin/audit-logs` |
| Leave requests | `/hod/requests` | `GET /leave-requests` |
| Leave details | `/hod/requests/:id` | `GET /leave-requests/:id`, `GET /leave-requests/:id/history`, the decision routes |
| Students | `/hod/students` | `GET /students` |
| Student details | `/hod/students/:id` | `GET /students/:id`, `GET /students/:id/history`, `GET /students/:id/parents` |
| Reports | `/hod/reports` | `GET /leave-requests`, `GET /admin/audit-logs`, `GET /notifications` |
| Certificates | `/hod/certificates` | `GET /leave-requests?status=approved\|completed` |

All of them work with the permissions the HOD role already holds
(`students:read`, `students:update`, `students:restore`, `leave:approve`,
`leave:reject`, `leave:request_changes`, `reports:view` — see
`crates/migrations/0004_rbac_and_reset.sql`). No new permission is needed
for the work below.

Three capabilities are **not** in the router today:

| Missing | Where the requirement comes from |
| --- | --- |
| Documents (upload, download, verification) | `REQUIREMENTS.md` §5 and §7, `backend/AGENTS.md` Phase D |
| Events and event evidence | `REQUIREMENTS.md` §5 and §7, `backend/AGENTS.md` Phase D |
| Certificates | `REQUIREMENTS.md` §5 (participation certificates) and §7 |

The router (`crates/api/src/router.rs`) currently ends at
`GET /admin/audit-logs`. There is no `documents`, `events` or `certificates`
route, and no `documents` table in any migration.

## 2. What the frontend does today

### 2.1 Certificates — `/hod/certificates`

The screen shows the leave requests a certificate can be issued from: the
requests in status `approved` and the ones in status `completed`, with the
student, the leave type, the dates and the decision. The names come from
`GET /students`.

The screen states plainly that **issuing a certificate is not available yet**,
because there is no endpoint to create, download or sign one. It does not
pretend: there is no print button and no download link, because both would
have to invent a route.

### 2.2 Documents — student request form

`pages/student/ApplyLeave.tsx` and `pages/student/LeaveDetails.tsx` show the
same honest notice (`components/student/DocumentsNotice.tsx`): a student
cannot attach a medical certificate yet, because `NewLeave` carries no
document field and there is no upload route.

### 2.3 Dashboard and Reports

Both are built from the list endpoints. The counters are exact, but they are
computed by the frontend: the report pages through `GET /leave-requests` and
`GET /notifications` (`per_page` is capped at 100) and counts the rows
client-side. That is correct for the current data volume, but it is not an
aggregate query, and it will not scale.

**The HOD console is not department-scoped.** `leave::list` uses
`scope = None` for a manager (`crates/service/src/leave.rs`), so every HOD
sees every student's requests in the department system. The UI does not claim
a department filter it does not have.

## 3. What the frontend expects

### 3.1 `GET /certificates`

The list of certificates a certificate can be issued from. If a certificate
is derived from a leave request, this endpoint can simply be a filtered view
of the leave requests.

| Query | Type | Notes |
| --- | --- | --- |
| `student_id` | `uuid?` | narrows to one student |
| `status` | `string?` | one of `approved`, `completed` |
| `page` | `i64?` | default 1 |
| `per_page` | `i64?` | default 20, clamp 1..100 |

Response — the standard pagination envelope, with the leave fields the
certificate is based on:

```json
{
  "items": [
    {
      "id": "0f9c...",
      "leave_request_id": "7b2d...",
      "student_id": "3a8f...",
      "request_type": "medical_leave",
      "start_at": "2026-10-22T00:00:00Z",
      "end_at": "2026-10-24T00:00:00Z",
      "status": "approved",
      "decided_at": "2026-10-21T09:00:00Z",
      "decision_reason": "Approved.",
      "issued_at": null,
      "document_id": null
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

The frontend renders `leave_request_id`, `student_id`, `status`,
`decided_at` and `decision_reason`, and needs `document_id` to offer the
download once documents exist.

### 3.2 `POST /certificates`

Creates the certificate for a leave request.

| Body | Type | Notes |
| --- | --- | --- |
| `leave_request_id` | `uuid` | the approved or completed leave |
| `issued_to` | `uuid?` | the student; defaults to the owner of the request |
| `note` | `string?` | at most 500 characters |

Only the request owner, the HOD and an admin may create a certificate, and
only for a request that is `approved` or `completed`. A second call for the
same request must be a `409 conflict` — a certificate is issued once.

### 3.3 `GET /certificates/{id}/download`

Returns the certificate as a PDF. The route is authorized like every other
download: the student who owns the leave, the HOD and an admin. It must
never be a public, unauthenticated URL, and the file must not be stored
where the web server can serve it directly.

The frontend opens this route from the download button and needs the
`Content-Type: application/pdf` and the filename in `Content-Disposition`.

### 3.4 Documents and evidence

These are the routes `REQUIREMENTS.md` §7 already names. The frontend needs
them for the student request form and for the HOD review screen:

| Route | Purpose |
| --- | --- |
| `POST /leave-requests/{id}/documents` | the student attaches a medical certificate or an event invitation |
| `GET /leave-requests/{id}/documents` | the reviewer lists what is attached |
| `GET /documents/{id}/download` | an authorized download, never public |
| `POST /events` | create an event permission |
| `GET /events`, `GET /events/{id}`, `PATCH /events/{id}` | read and update an event |
| `POST /events/{id}/evidence` | attach participation evidence |
| `GET /events/{id}/evidence` | list the evidence of an event |

The upload must validate the file by its content, enforce a size limit, and
store it privately, exactly as `backend/AGENTS.md` Phase D requires. A
document belongs to a request and to the student who uploaded it, and an
upload must not be visible to another student.

## 4. What the frontend does **not** need

- **No dashboard aggregate.** The dashboard counts the list endpoints and the
  numbers are exact. A `/admin/dashboard` aggregate is welcome, but nothing
  is blocked on it.
- **No report endpoint.** `pages/hod/Reports.tsx` counts the leave
  requests, the audit log and the notification log itself. The only thing an
  aggregate would improve is the number of requests the browser makes.
- **No certificate export format other than PDF.** The frontend renders the
  certificate data; it does not generate a document.
- **No new permission for the HOD.** Every route above belongs to the HOD and
  the admin, both of which already hold the permissions in section 1.

## 5. Open questions for the backend

1. **Is a certificate a stored document or a generated one?** A stored file
   needs a storage key, a checksum and a malware-scan status like a document
   does. A generated one needs a template and a renderer. The frontend is
   the same either way, but the migration is very different.
2. **Is the certificate issued once, or re-issued?** The decision keeps the
   original `decided_at` and `decision_reason` separate from the later
   completion status, and the certificate should preserve both.
3. **Who may download a certificate?** The proposal is: the student, the HOD
   and an admin. Faculty should not receive it — see
   `docs/faculty-api-contract.md`.
4. **Should the certificate be department-scoped?** The HOD console is not
   department-scoped today, and the certificate list inherits that. If the
   HOD should only certify their own department, the link between a user and
   a department has to exist first.

## 6. Verifying the change

When the certificate routes exist, the frontend can be exercised end to end:

```bash
# 1. sign in as the HOD
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"hod@example.com","password":"..."}'

# 2. list the certificates
curl -s 'http://localhost:8080/api/v1/certificates?status=approved' \
  -H 'Authorization: Bearer <token>'

# 3. issue one
curl -s -X POST http://localhost:8080/api/v1/certificates \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"leave_request_id":"7b2d..."}'

# 4. download it
curl -s http://localhost:8080/api/v1/certificates/<id>/download \
  -H 'Authorization: Bearer <token>' -o certificate.pdf
```

The frontend expects the standard envelopes:
`{ "items": [...], "total": n, "page": n, "per_page": n }` for lists and
`{ "error": { "code": "...", "message": "..." } }` for failures.
