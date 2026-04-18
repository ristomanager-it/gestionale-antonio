const supabase = window.supabase;

if (!supabase || typeof supabase.from !== "function") {
  throw new Error("Supabase client non inizializzato");
}

function getSupabase() {
  if (!window.supabase || typeof window.supabase.from !== "function") {
    throw new Error("Supabase non inizializzato");
  }

  return window.supabase;
}

async function waitSupabase() {
  let retries = 20;

  while ((!window.supabase || typeof window.supabase.from !== "function") && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    retries--;
  }

  if (!window.supabase || typeof window.supabase.from !== "function") {
    throw new Error("Supabase non disponibile dopo attesa");
  }

  return window.supabase;
}

if (!window.getSupabase) {
  window.getSupabase = getSupabase;
}

if (!window.waitSupabase) {
  window.waitSupabase = waitSupabase;
}

export { supabase, getSupabase, waitSupabase };
export default supabase;
