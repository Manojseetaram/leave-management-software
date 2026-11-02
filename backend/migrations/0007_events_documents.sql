-- Phase D: event metadata, private document metadata and evidence verification.

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID NOT NULL UNIQUE REFERENCES leave_requests(id),
    student_id UUID NOT NULL REFERENCES students(id),
    title TEXT NOT NULL,
    organizer TEXT NOT NULL,
    event_website TEXT,
    location TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    participation_details TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at > start_at)
);
CREATE INDEX idx_events_student ON events (student_id, start_at DESC);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID REFERENCES leave_requests(id),
    event_id UUID REFERENCES events(id),
    uploader_id UUID NOT NULL REFERENCES users(id),
    document_type TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    checksum_sha256 TEXT NOT NULL CHECK (length(checksum_sha256) = 64),
    malware_scan_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (malware_scan_status IN ('pending', 'clean', 'infected', 'failed')),
    verification_status TEXT NOT NULL DEFAULT 'unverified'
        CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((leave_request_id IS NOT NULL) <> (event_id IS NOT NULL)),
    CHECK (verification_status <> 'rejected' OR review_notes IS NOT NULL),
    CHECK ((verification_status = 'unverified') = (verified_at IS NULL))
);
CREATE INDEX idx_documents_request ON documents (leave_request_id, created_at);
CREATE INDEX idx_documents_event ON documents (event_id, created_at);
CREATE INDEX idx_documents_verification ON documents (verification_status)
    WHERE verification_status = 'unverified';
