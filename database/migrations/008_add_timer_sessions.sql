-- Migration 008: Add Timer Sessions for Pause/Resume Functionality
-- Description: Creates timer_sessions table to persist active timer sessions
--              Enables engineers to pause/resume timers with full recovery support
-- Date: 2025-10-23

-- Create timer_sessions table
CREATE TABLE IF NOT EXISTS timer_sessions (
    id SERIAL PRIMARY KEY,
    engineer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Timer state
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    paused_at TIMESTAMP,
    total_paused_ms BIGINT DEFAULT 0 CHECK (total_paused_ms >= 0),
    elapsed_time_ms BIGINT DEFAULT 0 CHECK (elapsed_time_ms >= 0),

    -- Session data
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    -- Ensure only one active session per engineer
    CONSTRAINT unique_active_session_per_engineer
        UNIQUE (engineer_id, status)
        DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX idx_timer_sessions_engineer_id ON timer_sessions(engineer_id);
CREATE INDEX idx_timer_sessions_status ON timer_sessions(status);
CREATE INDEX idx_timer_sessions_phase_id ON timer_sessions(phase_id);
CREATE INDEX idx_timer_sessions_created_at ON timer_sessions(created_at DESC);

-- Create index for finding active/paused sessions
CREATE INDEX idx_timer_sessions_active_paused
    ON timer_sessions(engineer_id, status)
    WHERE status IN ('active', 'paused');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timer_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_timer_session_timestamp
    BEFORE UPDATE ON timer_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_timer_session_updated_at();

-- Function to auto-cleanup old completed/cancelled sessions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_timer_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM timer_sessions
    WHERE status IN ('completed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE timer_sessions IS 'Stores active timer sessions for engineers with pause/resume support and automatic recovery';
COMMENT ON COLUMN timer_sessions.total_paused_ms IS 'Total time paused in milliseconds (cumulative across all pause periods)';
COMMENT ON COLUMN timer_sessions.elapsed_time_ms IS 'Total elapsed time since start in milliseconds';
COMMENT ON COLUMN timer_sessions.status IS 'Session status: active (running), paused (temporarily stopped), completed (converted to work log), cancelled (discarded)';
