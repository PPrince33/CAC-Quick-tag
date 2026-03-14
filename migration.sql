-- ============================================================
-- CAC QUICK-TAG: DATABASE MIGRATION
-- Run this in Supabase SQL Editor BEFORE using the new app.
-- ============================================================

-- 1. Add columns to matches table
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_jersey_color TEXT DEFAULT 'red',
  ADD COLUMN IF NOT EXISTS away_jersey_color TEXT DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS is_futsal BOOLEAN DEFAULT false;

-- 2. Add new columns to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS half TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS location_box INTEGER,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS direction_of_attack TEXT,
  ADD COLUMN IF NOT EXISTS "timestamp" INTEGER,
  ADD COLUMN IF NOT EXISTS player_name TEXT,
  ADD COLUMN IF NOT EXISTS jersey_number TEXT;

-- 3. Drop old columns from events (safe: data preserved in new columns going forward)
-- Uncomment these ONLY if you want to clean up old columns:
-- ALTER TABLE public.events DROP COLUMN IF EXISTS event_type;
-- ALTER TABLE public.events DROP COLUMN IF EXISTS is_attacking_3rd;

-- 4. Drop match_final_stats table (stats now computed live from events)
-- Uncomment if you're ready:
-- DROP TABLE IF EXISTS public.match_final_stats;

-- 5. Add status values for matches (if not already present)
-- Status values: 'Draft', 'Live', 'Finished', 'Published'
