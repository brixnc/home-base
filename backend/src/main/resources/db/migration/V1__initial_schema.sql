CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    keycloak_user_id VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    nickname VARCHAR(80),
    avatar_url VARCHAR(500),
    fun_fact VARCHAR(280),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE presence_status (
    user_profile_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    back_at TIMESTAMPTZ,
    note VARCHAR(280),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT presence_status_allowed CHECK (status IN ('HOME', 'AWAY', 'AT_WORK', 'AT_SCHOOL', 'TRAVELING', 'DO_NOT_DISTURB'))
);
CREATE TABLE absences (
    id UUID PRIMARY KEY,
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    destination VARCHAR(160),
    note VARCHAR(280),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT absence_dates_valid CHECK (ends_on >= starts_on)
);
CREATE TABLE events (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES user_profiles(id),
    title VARCHAR(160) NOT NULL,
    description VARCHAR(1000),
    starts_at TIMESTAMPTZ NOT NULL,
    location VARCHAR(160),
    reminder_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE chores (
    id UUID PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    assignee_id UUID REFERENCES user_profiles(id),
    due_on DATE,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    recurring BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    quantity VARCHAR(50),
    category VARCHAR(30) NOT NULL DEFAULT 'OTHER',
    added_by UUID REFERENCES user_profiles(id),
    purchased_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE feed_posts (
    id UUID PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES user_profiles(id),
    body VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_absences_dates ON absences(starts_on, ends_on);
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_chores_due_on ON chores(due_on);
CREATE INDEX idx_feed_posts_created_at ON feed_posts(created_at DESC);
