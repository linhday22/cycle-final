/*
# Enforceable privacy + gift realtime

1. sharing_settings
   - The privacy dial (share_phase / share_symptoms / share_mood) is meant to be
     enforced in the app layer, but the app running as the *partner* could not
     read the tracker's sharing_settings — the original SELECT policy was
     self-only. Widen SELECT so a paired partner can read the row, which lets the
     dashboard gate what it shows (phase / mood / symptoms) by the tracker's
     choices. Writes stay self-only.

2. gifts realtime
   - Add `gifts` to the realtime publication so the recipient gets a live pop-up
     notification the moment a gift is sent (messages + nudges were already in
     the publication in migration 0004).

3. Notes
   - Row visibility is still restricted to the two paired users; a partner can
     read the booleans but never anyone else's.
*/

-- Allow a paired partner to READ sharing preferences (writes remain self-only).
DROP POLICY IF EXISTS "sharing_select_self" ON sharing_settings;
DROP POLICY IF EXISTS "sharing_select_self_or_partner" ON sharing_settings;
CREATE POLICY "sharing_select_self_or_partner" ON sharing_settings FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR are_paired(auth.uid(), user_id));

-- Live gift delivery for pop-up notifications.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gifts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE gifts';
  END IF;
END $$;
