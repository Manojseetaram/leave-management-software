-- Phase B: granular permissions for the faculty role and bulk import for HOD.
-- Existing role_permissions rows are preserved; this only adds the new codes.

INSERT INTO permissions (code, description) VALUES
    ('faculty:students:read', 'View limited student attendance information'),
    ('faculty:leave:read', 'View limited leave/permission status information')
ON CONFLICT (code) DO NOTHING;

-- Faculty receives only the two explicitly scoped permissions above. They do
-- not inherit student management or leave decision permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('faculty:students:read', 'faculty:leave:read')
WHERE r.name = 'faculty'
ON CONFLICT DO NOTHING;

-- The requirement gives HOD and admin bulk-import capability. Admin already
-- received all permissions in 0004, but repeat the insert so this migration is
-- also correct when applied to an existing database with custom role changes.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('students:import')
WHERE r.name IN ('admin', 'hod')
ON CONFLICT DO NOTHING;

-- Any permission added by future migrations is granted to admin explicitly.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
