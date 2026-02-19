// js/supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase project
const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_WotaBvSScN1GwFw_rVWbzA_2OEcRJy-";

// Client Supabase con configurazione AUTH stabile
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: false,   // Disattiviamo refresh automatico (evita loop 522)
      detectSessionInUrl: false
    }
  }
);

// Esposto globalmente per compatibilità con le view
window.supabaseClient = supabase;

/* =====================================================
   🔧 FUNZIONE TEST CREAZIONE AZIENDA (NON TOCCATA)
===================================================== */

window.testCreateAzienda = async function () {
  const payload = {
    nome: "Azienda Demo",
    codice: "DEMO001",
    email_amministrativa: "demo@azienda.it",
    telefono_amministrativo: "3330000000",
    email_admin: "admin.demo@azienda.it",
    password_admin: "Password123!",
    features: {
      dipendenti: true,
      timbrature: true,
      magazzino: false,
      acquisti: false,
      ricette: false,
      venduto: false,
      report: false
    }
  };

  const { data, error } = await supabase.functions.invoke(
    "create-azienda",
    { body: payload }
  );

  console.log("DATA:", data);
  console.log("ERROR:", error);
};
