CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types for strict data integrity
DO $$ BEGIN
    CREATE TYPE event_type_enum AS ENUM ('EMAIL_OPEN', 'LINK_CLICK', 'PAGE_VIEW', 'HEARTBEAT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE source_enum AS ENUM ('EMAIL', 'LINK', 'WEBSITE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Core events table
CREATE TABLE IF NOT EXISTS events (
    event_id    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tracking_id VARCHAR(128)     NOT NULL,
    user_id     VARCHAR(128),
    session_id  VARCHAR(128)     NOT NULL,
    event_type  event_type_enum  NOT NULL,
    source      source_enum      NOT NULL,
    timestamp   BIGINT           NOT NULL,
    metadata    JSONB            DEFAULT '{}'
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_tracking_id ON events (tracking_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp   ON events (timestamp);
CREATE INDEX IF NOT EXISTS idx_events_session_id  ON events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_type        ON events (event_type);

-- Identity map (reserved for future userId linking)
CREATE TABLE IF NOT EXISTS identity_map (
    tracking_id VARCHAR(128) PRIMARY KEY,
    user_id     VARCHAR(128) NOT NULL,
    mapped_at   BIGINT       NOT NULL
);
