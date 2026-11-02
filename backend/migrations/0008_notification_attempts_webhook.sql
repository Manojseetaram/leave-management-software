-- Phase E: per-attempt history, consent verification tracking and
-- webhook safety are enforced in the application layer.

CREATE TABLE notification_attempts (
    id BIGSERIAL PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'callback_failed')),
    provider_message_id TEXT,
    error TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (notification_id, attempt_number)
);
CREATE INDEX idx_notification_attempts_notification ON notification_attempts (notification_id, attempted_at);

CREATE TABLE parent_consent_history (
    id BIGSERIAL PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES parents(id),
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL CHECK (action IN ('consent_given', 'consent_revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS callback_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS callback_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS webhook_idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_webhook_key
    ON notifications (webhook_idempotency_key)
    WHERE webhook_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_provider_message_id
    ON notifications (provider_message_id)
    WHERE provider_message_id IS NOT NULL;
