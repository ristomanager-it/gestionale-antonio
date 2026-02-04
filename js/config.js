// js/config.js
// ===============================
// Configurazione globale Supabase
// ===============================

// ⚠️ USA SOLO CHIAVE PUBBLICABILE
const SUPABASE_URL = "https://INSERISCI_LA_TUA_URL.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_INSERISCI_LA_TUA_CHIAVE";

// Client Supabase globale
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);
