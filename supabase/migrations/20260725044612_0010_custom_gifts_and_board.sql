/*
# Add custom gift support and gift board visibility

1. Modified Tables
   - `gifts`
     - Add `custom_message` (text, nullable) — user-written message for custom gifts
     - Add `is_board_visible` (boolean, default true) — whether the gift shows on recipient's board

2. Notes
   - Custom gifts have name='custom gift' and use custom_message for the content
   - All gifts default to visible on the board (recipient can hide them later)
   - The gift board is a public showcase of received gifts
*/

ALTER TABLE gifts ADD COLUMN IF NOT EXISTS custom_message text;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS is_board_visible boolean NOT NULL DEFAULT true;
