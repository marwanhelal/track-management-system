-- Create Administrator User
-- This script creates the main administrator account for the Track Management System

-- Option 1: Create admin with pre-hashed password
-- Password: Admin@2025 (change this in the application after first login!)
-- Hash generated with: bcrypt.hash('Admin@2025', 12)

INSERT INTO users (name, email, password_hash, role, job_description, is_active)
VALUES (
    'Marwan Helal',
    'marwanhelal15@gmail.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeY5GyYIeDZRZ8O2',
    'administrator',
    'System Administrator',
    true
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    job_description = EXCLUDED.job_description,
    is_active = EXCLUDED.is_active;

-- Verify the user was created
SELECT id, name, email, role, job_description, is_active, created_at
FROM users
WHERE email = 'marwanhelal15@gmail.com';

-- Add audit log entry
INSERT INTO audit_logs (entity_type, entity_id, action, note)
VALUES (
    'users',
    (SELECT id FROM users WHERE email = 'marwanhelal15@gmail.com'),
    'INSERT',
    'Administrator account created for system deployment'
);

-- Display success message
SELECT 'Admin user created successfully! Login with: marwanhelal15@gmail.com / Admin@2025' as status;
SELECT 'IMPORTANT: Change the password immediately after first login!' as warning;
