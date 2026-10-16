CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    request_type TEXT NOT NULL CHECK (
        request_type IN ('personal_leave', 'medical_leave', 'event_permission', 'other')
    ),
    reason TEXT NOT NULL,
    destination TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'pending', 'changes_requested',
                   'approved', 'rejected', 'withdrawn', 'completed')
    ),
    submitted_at TIMESTAMPTZ,
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    decision_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at > start_at),
    CHECK (status <> 'rejected' OR decision_reason IS NOT NULL)
);
CREATE INDEX idx_leave_student_date ON leave_requests (student_id, start_at DESC);
CREATE INDEX idx_leave_pending ON leave_requests (submitted_at DESC) WHERE status = 'pending';

-- Database-level guard: even a buggy service cannot make an illegal jump.
CREATE FUNCTION enforce_leave_transition() RETURNS trigger AS $$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;
    IF (OLD.status, NEW.status) IN (
        ('draft', 'pending'), ('changes_requested', 'pending'),
        ('draft', 'withdrawn'), ('pending', 'withdrawn'), ('changes_requested', 'withdrawn'),
        ('pending', 'approved'), ('pending', 'rejected'), ('pending', 'changes_requested'),
        ('approved', 'completed')
    ) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'invalid leave status transition % -> %', OLD.status, NEW.status
        USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leave_status_guard
    BEFORE UPDATE OF status ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION enforce_leave_transition();

CREATE TABLE request_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id),
    actor_id UUID NOT NULL REFERENCES users(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_history_request ON request_history (leave_request_id, created_at);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);

-- History and audit rows are append-only.
CREATE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% on % is not allowed (append-only table)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER request_history_append_only
    BEFORE UPDATE OR DELETE ON request_history
    FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
