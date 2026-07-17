-- Run this script in your Supabase SQL Editor to update your existing 'tickets' table

-- 1. Add new columns for the ticket breakdown
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS couples_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS adult_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS child_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS booking_details JSONB;

-- 2. Relax the ticket_count check constraint to allow more than 10 if necessary, 
-- or ensure it validates correctly. The original check was ticket_count <= 10.
-- Since one couples ticket = 2 people, 10 couples = 20 people. 
-- We'll just remove the strict constraint and add a relaxed one.
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_count_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_ticket_count_check CHECK (ticket_count >= 1 AND ticket_count <= 20);

-- 3. The category column must be expanded because we are now combining multiple categories 
-- into a single string (e.g. "General (2 Adult) | Silver (1 Couple)")
ALTER TABLE tickets ALTER COLUMN category TYPE TEXT;
