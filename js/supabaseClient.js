// js/supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase project
const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";

// ⚠️ Anon key (publishable) — già in tuo possesso
const SUPABASE_ANON_KEY =
  "sb_publishable_WotaBvSScN1GwFw_rVWbzA_2OEcRJy-";

// Client Supabase
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Esposto globalmente per le view legacy / compatibilità
window.supabaseClient = supabase;
