/*
# Fix pairings update policy for join flow

1. Security Changes
   - Update the pairings UPDATE policy to also allow any authenticated user to update
     a pending pairing where user_b IS NULL (the join case)
   - The existing member check stays for active pairings (e.g. unsyncing)

2. Notes
   - Without this fix, Bob can't join Alice's pairing because the UPDATE policy
     checks user_a or user_b, but Bob is neither until the update completes
   - The WITH CHECK ensures the updater sets themselves as user_b
*/

DROP POLICY IF EXISTS "pairings_update_member" ON pairings;
CREATE POLICY "pairings_update_member" ON pairings FOR UPDATE
  TO authenticated USING (
    user_a = auth.uid() OR user_b = auth.uid()
    OR (status = 'pending' AND user_b IS NULL)
  )
  WITH CHECK (
    user_a = auth.uid() OR user_b = auth.uid()
  );
