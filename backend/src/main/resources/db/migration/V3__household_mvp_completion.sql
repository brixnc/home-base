ALTER TABLE chores
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';

ALTER TABLE chores
    ADD CONSTRAINT chores_priority_allowed
        CHECK (priority IN ('LOW', 'NORMAL', 'HIGH'));
