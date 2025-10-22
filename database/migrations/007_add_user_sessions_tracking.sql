-- Migration 007: Add User Sessions Tracking
-- Purpose: Track engineer login activity and sessions for the Engineer Activity page
-- Date: 2025-01-22

-- Create user_sessions table to track login activity
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMP NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance on user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_time ON user_sessions(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_login ON user_sessions(user_id, login_time DESC);

-- Add last_login column to users table to quickly show last login time
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create index on last_login for performance
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

-- Add comment to table for documentation
COMMENT ON TABLE user_sessions IS 'Tracks user login sessions for activity monitoring and attendance tracking';
COMMENT ON COLUMN user_sessions.login_time IS 'Timestamp when user logged into the system';
COMMENT ON COLUMN user_sessions.logout_time IS 'Timestamp when user logged out (null if still logged in)';
COMMENT ON COLUMN user_sessions.ip_address IS 'IP address of the login session';
COMMENT ON COLUMN user_sessions.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN user_sessions.session_token IS 'JWT token identifier for session tracking';

-- Migration complete
SELECT 'Migration 007: User sessions tracking completed successfully' AS status;
