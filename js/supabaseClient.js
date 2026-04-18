import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

// 🔥 CLIENT UNICO
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// 🔥 BLOCCO CRITICO: assicura disponibilità globale PRIMA dei moduli
window.supabase = supabase;
window.SUPABASE_READY = true;

// 🔥 FUNZIONE GLOBALE SICURA (retrocompatibilità totale)
window.getSupabase = function () {
  if (!window.supabase) {
    throw new Error("Supabase non inizializzato");
  }
  return window.supabase;
};

/* =====================================================
   WAIT UTILITY (ANTI RACE CONDITION)
===================================================== */

window.waitSupabase = async function () {
  let retries = 20;

  while (!window.supabase && retries > 0) {
    await new Promise(r => setTimeout(r, 50));
    retries--;
  }

  if (!window.supabase) {
    throw new Error("Supabase non disponibile dopo attesa");
  }

  return window.supabase;
};

/* =====================================================
   TEST CREAZIONE AZIENDA
===================================================== */

window.testCreateAzienda = async function () {
  const supabase = await window.waitSupabase();

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
