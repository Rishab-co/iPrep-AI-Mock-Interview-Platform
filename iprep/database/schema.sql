-- ============================================================
-- iPrep Database Schema
-- PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,           -- BCrypt hash
    full_name   VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'USER', -- USER | ADMIN
    avatar_url  VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);

-- ── Interviews ───────────────────────────────────────────────
CREATE TABLE interviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_role     VARCHAR(100) NOT NULL,
    experience_level VARCHAR(30) NOT NULL,       -- FRESHER | MID | SENIOR
    difficulty      VARCHAR(10)  NOT NULL,       -- EASY | MEDIUM | HARD
    status          VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS | COMPLETED | ABANDONED
    question_count  INTEGER      NOT NULL DEFAULT 5,
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    duration_seconds INTEGER,
    -- Evaluation scores (populated on completion)
    technical_score  NUMERIC(3,1),               -- 1.0 – 10.0
    communication_score NUMERIC(3,1),
    problem_solving_score NUMERIC(3,1),
    depth_score      NUMERIC(3,1),
    overall_score    NUMERIC(3,1),
    verdict          VARCHAR(50),                -- READY | BORDERLINE | NEEDS_WORK
    -- Full AI evaluation JSON
    evaluation_json  JSONB
);

CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_status  ON interviews(status);
CREATE INDEX idx_interviews_created ON interviews(started_at DESC);

-- ── Transcript Messages ───────────────────────────────────────
CREATE TABLE transcript_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id    UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    speaker         VARCHAR(10) NOT NULL,        -- AI | USER
    content         TEXT NOT NULL,               -- raw text
    audio_url       VARCHAR(500),                -- S3 / local path for TTS audio
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Per-message scoring (optional, populated by AI evaluation)
    question_score  INTEGER,                     -- 1–10 for user answer messages
    question_feedback TEXT
);

CREATE INDEX idx_transcript_interview ON transcript_messages(interview_id, sequence_number);

-- ── Refresh Tokens ────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_refresh_token ON refresh_tokens(token);

-- ── Trigger: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed data (dev) ───────────────────────────────────────────
INSERT INTO users (email, password, full_name) VALUES
  ('demo@iprep.dev',
   '$2a$12$xVGb4sQ2Jq5qH8RKk7yKVeZBvvkBvQ6dEzZq0Qd9VhJ6cLZ1s7UvK',  -- demo1234
   'Arjun Kumar');
