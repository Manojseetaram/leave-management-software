-- Phase C: preserve the original decision separately from the later
-- return/completion event, and record the named workflow action in history.

ALTER TABLE leave_requests
    ADD COLUMN completed_at TIMESTAMPTZ,
    ADD COLUMN completed_by UUID REFERENCES users(id),
    ADD COLUMN completion_note TEXT;

ALTER TABLE request_history
    ADD COLUMN action TEXT;

CREATE INDEX idx_leave_completed ON leave_requests (completed_at DESC)
    WHERE completed_at IS NOT NULL;
