-- Drop preferences and notification settings tables
-- Run this script in pgAdmin 4 to remove these tables from the database

DROP TABLE IF EXISTS user_notification_settings CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Confirm deletion
SELECT 'Tables dropped successfully!' AS message;
