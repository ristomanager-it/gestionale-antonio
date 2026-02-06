// js/supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_WotaBvSScN1GwFw_rVWbzA_2OEcRJy-";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

// 👉 rendiamo disponibile globalmente
window.supabaseClient = supabase;
