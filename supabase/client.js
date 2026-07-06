const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('WARNING: Supabase URL or Key is missing from environment variables!');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceRoleKey || '');

module.exports = { supabase };
