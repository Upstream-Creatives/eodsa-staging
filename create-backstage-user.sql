-- Manual SQL to create backstage user
-- Run this in your Neon database console

-- First, let's check if the role column exists
ALTER TABLE judges ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'judge';

-- Create the backstage manager user
-- Note: You'll need to replace 'your-hashed-password' with a proper bcrypt hash
INSERT INTO judges (id, name, email, password, is_admin, role, specialization, created_at)
VALUES (
  'backstage-user-' || extract(epoch from now()),
  'Test Backstage Manager',
  'backstage@test.com',
  '$2a$10$D8FpG7CJ9ZgPn8Qj5nQvGOqmHjYZ.XhKqA5qZ6.kJtR0mQ1vWvHPi', -- This is 'testuser123' hashed
  false,
  'backstage_manager',
  '[]',
  now()::text
)
ON CONFLICT (email) DO UPDATE SET
  role = 'backstage_manager',
  password = EXCLUDED.password;

-- Verify the user was created
SELECT id, name, email, role, is_admin FROM judges WHERE email = 'backstage@test.com';

