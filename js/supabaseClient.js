import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

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

// 🔥 FONDAMENTALE
window.supabase = supabase;

/* =====================================================
   TEST CREAZIONE AZIENDA
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
