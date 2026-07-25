/*
# Add role column to profiles + weather column

1. Modified Tables
   - `profiles`
     - Add `role` (text, nullable) — values: 'tracker', 'supporter', 'both', or null (not yet onboarded)
     - Add `weather` (text, nullable) — today's self-set weather icon for the dashboard

2. Notes
   - role determines what UI surfaces the user sees (cycle input vs support-only)
   - weather is the "how are you today?" quick-set on the dashboard
   - No policy changes needed since profiles already has self-select/update policies
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weather text;
