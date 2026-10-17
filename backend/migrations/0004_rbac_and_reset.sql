-- Permissions and Role-Based Access Control
CREATE TABLE permissions (
    id SMALLSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id SMALLINT NOT NULL REFERENCES roles(id),
    permission_id SMALLINT NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    token_hash BYTEA PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);

-- Seed basic permissions
INSERT INTO permissions (code, description) VALUES 
('students:create', 'Create student accounts'),
('students:import', 'Bulk import students'),
('students:read', 'View student records'),
('students:update', 'Update student records'),
('students:restore', 'Restore archived students'),
('leave:approve', 'Approve leave requests'),
('leave:reject', 'Reject leave requests'),
('leave:request_changes', 'Request changes to leave requests'),
('admin:all', 'Full administrative access'),
('reports:view', 'View department reports');

-- Assign permissions to roles
-- Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'admin'), id FROM permissions;

-- HOD gets student and leave management
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'hod'), id FROM permissions 
WHERE code IN ('students:read', 'students:update', 'students:restore', 'leave:approve', 'leave:reject', 'leave:request_changes', 'reports:view');

-- Faculty gets read access
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'faculty'), id FROM permissions 
WHERE code IN ('students:read');
