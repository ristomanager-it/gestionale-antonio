// js/supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ✅ METTI I TUOI
const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SUPABASE_ANON_KEY = "INCOLLA_QUI_LA_TUA_ANON_KEY_COMPLETA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// comodo per le view che usano window.supabaseClient
window.supabaseClient = supabase;
