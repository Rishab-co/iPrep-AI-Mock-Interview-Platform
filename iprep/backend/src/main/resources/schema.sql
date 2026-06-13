-- iPrep Database Schema — PostgreSQL 14+
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    role        VARCHAR(50)  NOT NULL DEFAULT 'USER',
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_role         VARCHAR(255) NOT NULL,
    experience_level    VARCHAR(50)  NOT NULL,
    difficulty          VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    status              VARCHAR(30)  NOT NULL DEFAULT 'IN_PROGRESS',
    question_count      INTEGER      NOT NULL DEFAULT 5,
    system_prompt       TEXT,
    technical_score     DOUBLE PRECISION,
    communication_score DOUBLE PRECISION,
    problem_solving_score DOUBLE PRECISION,
    depth_score         DOUBLE PRECISION,
    overall_score       DOUBLE PRECISION,
    verdict             VARCHAR(50),
    started_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    duration_seconds    INTEGER
);

CREATE TABLE IF NOT EXISTS transcript_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id    UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    speaker         VARCHAR(10) NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_user_id     ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status      ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_interview  ON transcript_messages(interview_id, sequence_number);
