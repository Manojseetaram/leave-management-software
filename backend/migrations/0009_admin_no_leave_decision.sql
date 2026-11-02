-- Admin manages accounts, config and reports; only the HOD decides leave requests.
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')
  AND permission_id IN (
      SELECT id FROM permissions WHERE code IN ('leave:approve', 'leave:reject', 'leave:request_changes')
  );
