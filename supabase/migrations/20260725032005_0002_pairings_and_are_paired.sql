/*
# Create pairings table and are_paired() helper

1. New Types
   - `pairing_status` enum: 'pending', 'active', 'unsynced'

2. New Tables
   - `pairings`
     - `id` (uuid, PK)
     - `code` (text, unique, not null) - single-use join code
     - `user_a` (uuid, not null, FK profiles) - creator
     - `user_b` (uuid, nullable, FK profiles) - joiner (null until joined)
     - `status` (pairing_status, default 'pending')
     - `created_at`, `activated_at`, `ended_at` (timestamptz)

3. Functions
   - `are_paired(u1 uuid, u2 uuid)` - returns true if two users share an active pairing

4. Security
   - RLS enabled on `pairings`
   - SELECT: members can see their own pairings
   - INSERT: authenticated user can create (must be user_a)
   - UPDATE: members can update their pairing (for joining/unsyncing)

5. Updated Policies
   - `profiles` SELECT policy updated to allow partner visibility via are_paired()

6. Notes
   - "One active pairing per user" enforced at app layer + partial unique indexes
*/

-- Pairing status enum
DO $$ BEGIN
  CREATE TYPE pairing_status AS ENUM ('pending', 'active', 'unsynced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Pairings table
CREATE TABLE IF NOT EXISTS pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  user_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status pairing_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  activated_at timestamptz,
  ended_at timestamptz
);

-- Partial unique indexes to enforce one active pairing per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_pairing_a
  ON pairings (user_a) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_pairing_b
  ON pairings (user_b) WHERE status = 'active';

-- Enable RLS
ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "pairings_select_member" ON pairings;
CREATE POLICY "pairings_select_member" ON pairings FOR SELECT
  TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS "pairings_insert_creator" ON pairings;
CREATE POLICY "pairings_insert_creator" ON pairings FOR INSERT
  TO authenticated WITH CHECK (user_a = auth.uid());

DROP POLICY IF EXISTS "pairings_update_member" ON pairings;
CREATE POLICY "pairings_update_member" ON pairings FOR UPDATE
  TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid());

-- Helper function: are two users in an active pairing?
CREATE OR REPLACE FUNCTION are_paired(u1 uuid, u2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pairings
    WHERE status = 'active'
      AND ((user_a = u1 AND user_b = u2) OR (user_a = u2 AND user_b = u1))
  );
$$;

-- Update profiles SELECT policy to include partner visibility
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own_or_partner" ON profiles FOR SELECT
  TO authenticated USING (id = auth.uid() OR are_paired(auth.uid(), id));
