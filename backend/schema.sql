-- Urban Tracker Database Schema
-- Run this file on a fresh PostgreSQL database to initialise all tables.

CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    role           VARCHAR(20)  DEFAULT 'citizen',
    is_active      BOOLEAN      DEFAULT TRUE,
    reset_required BOOLEAN      DEFAULT FALSE,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    department TEXT
);

CREATE TABLE IF NOT EXISTS departments (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

INSERT INTO departments (name) VALUES
    ('Roads'),
    ('Electricity'),
    ('Sanitation'),
    ('Parks'),
    ('Other')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS reports (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    status       VARCHAR(50)  DEFAULT 'submitted',
    category     VARCHAR(100),
    latitude     NUMERIC(10, 8),
    longitude    NUMERIC(11, 8),
    citizen_id   INTEGER REFERENCES users(id),
    department   TEXT,
    jurisdiction TEXT,
    updated_at   TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_profiles (
    user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department  TEXT,
    jurisdiction TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_blocklist (
    jti        TEXT PRIMARY KEY,
    token_type TEXT NOT NULL,
    user_id    INTEGER,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_images (
    id          SERIAL PRIMARY KEY,
    report_id   INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id),
    stage       TEXT NOT NULL,
    image_url   TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_activity (
    id         SERIAL PRIMARY KEY,
    report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    actor_id   INTEGER REFERENCES users(id),
    actor_role TEXT,
    action     TEXT NOT NULL,
    detail     TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    message   TEXT NOT NULL,
    is_read   BOOLEAN   DEFAULT FALSE,
    sent_at   TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_created_at        ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status            ON reports(status);
CREATE INDEX IF NOT EXISTS idx_report_activity_report_id ON report_activity(report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_images_report_id   ON report_images(report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON notifications(user_id, sent_at DESC);
