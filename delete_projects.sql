-- Delete all test projects and related data
-- This will cascade delete all related records due to foreign key constraints

DELETE FROM projects;

-- Reset the sequence
ALTER SEQUENCE projects_id_seq RESTART WITH 1;

SELECT 'All projects deleted successfully' as result;
