// js/config.js
// ===============================
// Configurazione Supabase
// ===============================

// URL progetto Supabase
const SUPABASE_URL =
  "https://cuhcscpvhypoaplcmtjk.supabase.co";

// Chiave pubblica (anon key)
const SUPABASE_PUBLIC_KEY =
  "sb_publishable_WotaBvSScN1GwFw_rVWbzA_2OEcRJy-";

// Inizializzazione client Supabase (globale)
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);
