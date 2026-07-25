/*
# Create cycles, cycle_logs, and sharing_settings tables

1. New Tables
   - `cycles` - one current cycle record per user
     - `id` (uuid, PK)
     - `user_id` (uuid, FK profiles, not null, default auth.uid())
     - `last_period_start` (date, not null)
     - `avg_cycle_length` (int, default 28)
     - `avg_period_length` (int, default 5)
     - `updated_at` (timestamptz, default now())
   - `cycle_logs` - optional daily tracking
     - `id` (uuid, PK)
     - `user_id` (uuid, FK profiles, not null, default auth.uid())
     - `log_date` (date, not null)
     - `flow` (text) - light/medium/heavy
     - `mood` (text)
     - `symptoms` (jsonb)
     - `note` (text)
     - `created_at` (timestamptz)
   - `sharing_settings` - consent-first: what the tracking partner shares
     - `user_id` (uuid, PK, FK profiles)
     - `share_phase` (boolean, default true)
     - `share_symptoms` (boolean, default false)
     - `share_mood` (boolean, default false)

2. Security
   - RLS on all tables
   - cycles/cycle_logs: self read/write + partner read (via are_paired)
   - sharing_settings: self only (all CRUD)

3. Notes
   - Partner can see cycle data rows (RLS), but app layer gates symptoms/mood by sharing_settings
*/

-- Cycles table
CREATE TABLE IF NOT EXISTS cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  last_period_start date NOT NULL,
  avg_cycle_length int NOT NULL DEFAULT 28,
  avg_period_length int NOT NULL DEFAULT 5,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cycles_select_self_or_partner" ON cycles;
CREATE POLICY "cycles_select_self_or_partner" ON cycles FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR are_paired(auth.uid(), user_id));

DROP POLICY IF EXISTS "cycles_insert_self" ON cycles;
CREATE POLICY "cycles_insert_self" ON cycles FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cycles_update_self" ON cycles;
CREATE POLICY "cycles_update_self" ON cycles FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cycles_delete_self" ON cycles;
CREATE POLICY "cycles_delete_self" ON cycles FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Cycle logs table
CREATE TABLE IF NOT EXISTS cycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  flow text,
  mood text,
  symptoms jsonb,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cycle_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_select_self_or_partner" ON cycle_logs;
CREATE POLICY "logs_select_self_or_partner" ON cycle_logs FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR are_paired(auth.uid(), user_id));

DROP POLICY IF EXISTS "logs_insert_self" ON cycle_logs;
CREATE POLICY "logs_insert_self" ON cycle_logs FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "logs_update_self" ON cycle_logs;
CREATE POLICY "logs_update_self" ON cycle_logs FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "logs_delete_self" ON cycle_logs;
CREATE POLICY "logs_delete_self" ON cycle_logs FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Sharing settings table
CREATE TABLE IF NOT EXISTS sharing_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  share_phase boolean DEFAULT true,
  share_symptoms boolean DEFAULT false,
  share_mood boolean DEFAULT false
);

ALTER TABLE sharing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sharing_select_self" ON sharing_settings;
CREATE POLICY "sharing_select_self" ON sharing_settings FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "sharing_insert_self" ON sharing_settings;
CREATE POLICY "sharing_insert_self" ON sharing_settings FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sharing_update_self" ON sharing_settings;
CREATE POLICY "sharing_update_self" ON sharing_settings FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sharing_delete_self" ON sharing_settings;
CREATE POLICY "sharing_delete_self" ON sharing_settings FOR DELETE
  TO authenticated USING (user_id = auth.uid());
