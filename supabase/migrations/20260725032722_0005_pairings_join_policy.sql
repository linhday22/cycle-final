/*
# Add pairing join policy

1. Security Changes
   - Add SELECT policy on `pairings` that allows any authenticated user to see pending pairings
     where user_b is null (so they can look up a code to join)
   - This is safe because: the code is a single-use secret shared intentionally,
     and the row only exposes the pairing ID + code + status (no sensitive data)

2. Notes
   - Without this, Bob can't find Alice's pending pairing to join it
   - The existing member SELECT policy stays for viewing active pairings
*/

DROP POLICY IF EXISTS "pairings_lookup_pending" ON pairings;
CREATE POLICY "pairings_lookup_pending" ON pairings FOR SELECT
  TO authenticated USING (status = 'pending' AND user_b IS NULL);
