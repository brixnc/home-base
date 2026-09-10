-- Adds an optional responsible roommate to events and shopping items.
--
-- Both columns are nullable so every existing row stays valid and untouched:
-- existing events keep working with only creator attribution, and existing
-- shopping items keep their added_by attribution.
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES user_profiles(id);

ALTER TABLE shopping_items
    ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES user_profiles(id);

-- Every dashboard load reads notifications by user; this lookup had no index.
CREATE INDEX IF NOT EXISTS idx_notifications_user_profile
    ON notifications (user_profile_id);
