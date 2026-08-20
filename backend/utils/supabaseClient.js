const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase configuration missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    transport: ws,
  },
});

module.exports = { supabase };
