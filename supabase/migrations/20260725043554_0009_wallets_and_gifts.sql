/*
# Create wallets and gifts tables

1. New Tables
   - `wallets`
     - `id` (uuid, primary key)
     - `user_id` (uuid, unique, FK to auth.users, defaults to auth.uid())
     - `balance` (integer, default 500) — dummy credits in cents
     - `updated_at` (timestamptz)
   - `gifts`
     - `id` (uuid, primary key)
     - `sender_id` (uuid, FK to auth.users, defaults to auth.uid())
     - `recipient_id` (uuid, FK to auth.users)
     - `pairing_id` (uuid, FK to pairings)
     - `name` (text) — gift name e.g. "chocolates"
     - `emoji` (text) — display emoji
     - `cost` (integer) — cost in credits
     - `phase_context` (text, nullable) — which phase triggered this suggestion
     - `status` (text, default 'delivered') — always delivered in dummy mode
     - `created_at` (timestamptz)

2. Security
   - RLS enabled on both tables
   - wallets: users can read/update their own wallet
   - gifts: users can see gifts they sent or received, can insert as sender

3. Notes
   - Every user starts with 500 credits (like a dummy balance)
   - Sending a gift deducts from sender's wallet in the frontend
   - This is a dummy/demo system — no real money involved
*/

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance integer NOT NULL DEFAULT 500,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pairing_id uuid REFERENCES pairings(id) ON DELETE SET NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🎁',
  cost integer NOT NULL,
  phase_context text,
  status text NOT NULL DEFAULT 'delivered',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

-- Wallet policies: own wallet only
DROP POLICY IF EXISTS "select_own_wallet" ON wallets;
CREATE POLICY "select_own_wallet" ON wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wallet" ON wallets;
CREATE POLICY "insert_own_wallet" ON wallets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_wallet" ON wallets;
CREATE POLICY "update_own_wallet" ON wallets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_wallet" ON wallets;
CREATE POLICY "delete_own_wallet" ON wallets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Gift policies: can see gifts where you're sender or recipient
DROP POLICY IF EXISTS "select_own_gifts" ON gifts;
CREATE POLICY "select_own_gifts" ON gifts FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "insert_own_gifts" ON gifts;
CREATE POLICY "insert_own_gifts" ON gifts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "update_own_gifts" ON gifts;
CREATE POLICY "update_own_gifts" ON gifts FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "delete_own_gifts" ON gifts;
CREATE POLICY "delete_own_gifts" ON gifts FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);
