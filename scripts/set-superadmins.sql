-- Set specific emails as superadmin
-- Note: We use 'role' column, not 'user_type' column
UPDATE judges
SET role = 'superadmin', is_admin = TRUE
WHERE email IN (
  'gabriel@elementscentral.com',
  'info@upstreamcreatives.co.za',
  'mains@elementscentral.com',
  'admin@eodsa.com'
);

-- Verify the update
SELECT id, name, email, role, is_admin 
FROM judges 
WHERE email IN (
  'gabriel@elementscentral.com',
  'info@upstreamcreatives.co.za',
  'mains@elementscentral.com',
  'admin@eodsa.com'
);
