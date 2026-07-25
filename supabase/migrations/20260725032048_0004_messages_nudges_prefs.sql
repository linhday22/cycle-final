/*
# Create messages, nudges, and notification_prefs tables

1. New Tables
   - `messages` - persistent chat thread per pairing
     - `id` (uuid, PK)
     - `pairing_id` (uuid, FK pairings, not null)
     - `sender_id` (uuid, FK profiles, not null, default auth.uid())
     - `body` (text, not null)
     - `created_at` (timestamptz, default now())
   - `nudges` - pushed cute notifications
     - `id` (uuid, PK)
     - `pairing_id` (uuid, FK pairings, not null)
     - `sender_id` (uuid, FK profiles, not null, default auth.uid())
     - `kind` (text, default 'custom') - 'preset' or 'custom'
     - `preset_key` (text, nullable)
     - `body` (text, not null)
     - `read_at` (timestamptz, nullable)
     - `created_at` (timestamptz, default now())
   - `notification_prefs` - per-user notification preferences
     - `user_id` (uuid, PK, FK profiles)
     - `email_on_unsync` (boolean, default false)
     - `push_enabled` (boolean, default true)

2. Security
   - RLS on all tables
   - messages/nudges: only members of the pairing can read/send
   - notification_prefs: self only

3. Indexes
   - messages: index on (pairing_id, created_at) for chat loading
   - nudges: index on (pairing_id, created_at) for notification feed

4. Realtime
   - Enable realtime on messages and nudges tables
*/

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id uuid NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_pairing_time ON messages (pairing_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_member" ON messages;
CREATE POLICY "messages_select_member" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM pairings p WHERE p.id = pairing_id
      AND (p.user_a = auth.uid() OR p.user_b = auth.uid()))
  );

DROP POLICY IF EXISTS "messages_insert_member" ON messages;
CREATE POLICY "messages_insert_member" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM pairings p WHERE p.id = pairing_id AND p.status = 'active'
      AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
    )
  );

-- Nudges table
CREATE TABLE IF NOT EXISTS nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id uuid NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'custom',
  preset_key text,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nudges_pairing_time ON nudges (pairing_id, created_at);

ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nudges_select_member" ON nudges;
CREATE POLICY "nudges_select_member" ON nudges FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM pairings p WHERE p.id = pairing_id
      AND (p.user_a = auth.uid() OR p.user_b = auth.uid()))
  );

DROP POLICY IF EXISTS "nudges_insert_member" ON nudges;
CREATE POLICY "nudges_insert_member" ON nudges FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM pairings p WHERE p.id = pairing_id AND p.status = 'active'
      AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "nudges_update_member" ON nudges;
CREATE POLICY "nudges_update_member" ON nudges FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM pairings p WHERE p.id = pairing_id
      AND (p.user_a = auth.uid() OR p.user_b = auth.uid()))
  );

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  email_on_unsync boolean DEFAULT false,
  push_enabled boolean DEFAULT true
);

ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prefs_select_self" ON notification_prefs;
CREATE POLICY "prefs_select_self" ON notification_prefs FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "prefs_insert_self" ON notification_prefs;
CREATE POLICY "prefs_insert_self" ON notification_prefs FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "prefs_update_self" ON notification_prefs;
CREATE POLICY "prefs_update_self" ON notification_prefs FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "prefs_delete_self" ON notification_prefs;
CREATE POLICY "prefs_delete_self" ON notification_prefs FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Enable realtime for messages and nudges
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE nudges;
