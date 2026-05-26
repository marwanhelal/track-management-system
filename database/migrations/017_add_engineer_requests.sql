-- Migration: Add Engineer Requests System
-- Allows engineers to submit requests (early leave, permission, vacation, etc.) to supervisors

-- Create engineer_requests table
CREATE TABLE engineer_requests (
    id SERIAL PRIMARY KEY,
    engineer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Request Details
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'early_leave',
        'permission_leave_return',
        'vacation',
        'sick_leave',
        'work_from_home',
        'other'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    -- Date/Time Fields
    request_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,

    -- Status Workflow
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'denied',
        'cancelled'
    )),

    -- Response Fields
    response_note TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by INTEGER REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_engineer_requests_engineer_id ON engineer_requests(engineer_id);
CREATE INDEX idx_engineer_requests_status ON engineer_requests(status);
CREATE INDEX idx_engineer_requests_request_date ON engineer_requests(request_date);
CREATE INDEX idx_engineer_requests_created_at ON engineer_requests(created_at DESC);

-- Success message
SELECT 'Created engineer_requests table with indexes' as status;
