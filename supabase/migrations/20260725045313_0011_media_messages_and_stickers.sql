/*
# Add media messages and custom stickers

1. Modified Tables
   - `messages`
     - Add `media_url` (text, nullable) — URL or base64 data of image/drawing
     - Add `media_type` (text, nullable) — 'image', 'drawing', 'sticker', 'video'

2. New Tables
   - `stickers`
     - `id` (uuid, primary key)
     - `user_id` (uuid, FK to auth.users, defaults to auth.uid())
     - `name` (text) — sticker name
     - `image_data` (text) — base64 PNG data of the sticker/drawing
     - `emoji` (text, nullable) — optional emoji label
     - `created_at` (timestamptz)

3. Security
   - RLS enabled on stickers
   - Users can CRUD their own stickers
   - Stickers are personal to each user (they create their own custom emoji library)

4. Notes
   - Images/drawings stored as base64 data URIs in message media_url
   - Stickers are saved drawings that users can reuse
   - No file storage needed since canvas drawings are small base64 PNGs
*/

ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type text;

CREATE TABLE IF NOT EXISTS stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'untitled',
  image_data text NOT NULL,
  emoji text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_stickers" ON stickers;
CREATE POLICY "select_own_stickers" ON stickers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_stickers" ON stickers;
CREATE POLICY "insert_own_stickers" ON stickers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_stickers" ON stickers;
CREATE POLICY "update_own_stickers" ON stickers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_stickers" ON stickers;
CREATE POLICY "delete_own_stickers" ON stickers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
