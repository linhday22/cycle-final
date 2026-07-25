/*
# Onboarding step machine + chat requests

1. Modified Tables
   - `profiles`
     - Add `onboarding_step` (integer, default 1) — tracks current onboarding step (1-7)
     - Add `onboarding_complete` (boolean, default false) — gates access to main app
   - `messages`
     - Add `type` (text, default 'text') — 'text' or 'request'
     - Add `request_status` (text, nullable) — 'open', 'accepted', 'done'
     - Add `request_category` (text, nullable) — 'feed-me', 'spoil-me', 'errand', 'favor'

2. Notes
   - onboarding_step persists mid-flow so refresh resumes correctly
   - onboarding_complete gates routing: true = go to Home, false = resume onboarding
   - messages.type distinguishes chat requests from normal text
   - request_status tracks the lifecycle: open → accepted → done
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS request_status text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS request_category text;
