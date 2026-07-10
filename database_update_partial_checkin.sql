-- Run this script in your Supabase SQL Editor to support partial check-ins

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS checked_in_couples INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS checked_in_adult INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS checked_in_child INTEGER DEFAULT 0;
