CREATE TABLE apartment_info (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL DEFAULT 'Homebase',
    address VARCHAR(240),
    wifi_name VARCHAR(120),
    wifi_password VARCHAR(120),
    landlord_contact VARCHAR(240),
    emergency_contact VARCHAR(240),
    shared_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL,
    message VARCHAR(500) NOT NULL,
    type VARCHAR(40) NOT NULL DEFAULT 'INFO',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chores
    ADD COLUMN IF NOT EXISTS description VARCHAR(500),
    ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

INSERT INTO apartment_info (id, name, address, wifi_name, wifi_password, landlord_contact, emergency_contact, shared_notes)
VALUES (
    gen_random_uuid(),
    'Homebase',
    '123 Maple Street',
    'Homebase WiFi',
    'homebase123',
    'Landlord Desk: (555) 010-0101',
    'Emergency: (555) 010-4040',
    'Shared notes: keep the kitchen tidy and label pantry items.'
)
ON CONFLICT DO NOTHING;
