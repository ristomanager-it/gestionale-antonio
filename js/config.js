// js/config.js
// =======================================
// Configurazione Supabase (SaaS)
// =======================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔐 URL e chiave pubblica Supabase
const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_WotaBvSScN1GwFw_rVWbzA_2OEcRJy-";

// ✅ Client Supabase
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
