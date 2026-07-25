/*
# Create profiles table and auth trigger

1. New Tables
   - `profiles`
     - `id` (uuid, PK, references auth.users on delete cascade)
     - `display_name` (text, nullable)
     - `avatar_url` (text, nullable)
     - `created_at` (timestamptz, default now())

2. Security
   - Enable RLS on `profiles`
   - SELECT policy: authenticated users can read their own profile
   - UPDATE policy: authenticated users can update their own profile
   - INSERT policy: authenticated users can insert their own profile (for trigger)

3. Trigger
   - `handle_new_user()` function (SECURITY DEFINER) auto-creates a profiles row on auth.users insert
   - Trigger fires AFTER INSERT on auth.users

4. Notes
   - Partner-visible SELECT policy will be added in a later migration once `pairings` table exists
   - display_name is seeded from auth metadata if available
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies (drop first for idempotency)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NULL));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
