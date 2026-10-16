CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES parents(id),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id),
    channel TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms')),
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'failed')),
    dedupe_key TEXT NOT NULL UNIQUE,
    provider_message_id TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);
CREATE INDEX idx_notifications_due ON notifications (next_attempt_at)
    WHERE status IN ('queued', 'failed', 'sending');
