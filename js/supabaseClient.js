// js/supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase project
const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";

// ⚠️ Anon key (publishable)
const SUPABASE_ANON_KEY =
  "sb_publishable_WotaBvSScN1GwFw_rVWbzA_2OEcRJy-";

// Client Supabase (CREATO SUBITO)
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Esposto globalmente (utile per debug / legacy)
window.supabase = supabase;

// ===============================
// DEBUG TEMPORANEO — rimuovere dopo
// ===============================
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

  const res = await supabase.functions.invoke(
    "create-azienda",
    { body: payload }
  );

  console.log("RAW RESPONSE:", res);

  if (res.error) {
    console.error("ERROR MESSAGE:", res.error.message);
    console.error("ERROR DETAILS:", res.error);
  }

  if (res.data) {
    console.log("DATA:", res.data);
  }
};
