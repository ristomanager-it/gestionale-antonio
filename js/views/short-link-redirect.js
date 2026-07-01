// js/views/short-link-redirect.js
// Rotta pubblica #/s/CODICE — nessun login richiesto.
// Cerca il codice nella tabella short_links, incrementa il contatore click
// e reindirizza alla URL di destinazione (booking, menu pubblico, ecc).

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;

  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;">
      <div style="text-align:center;color:#64748b;">
        <div style="font-size:32px;margin-bottom:10px;">🔗</div>
        <div style="font-size:14px;">Reindirizzamento in corso...</div>
      </div>
    </div>
  `;

  const raw = window.location.hash || "";
  const path = raw.replace("#/", "").split("?")[0];
  const segments = path.split("/").filter(Boolean);
  const codice = segments[1] || "";

  if (!codice || !supabase) {
    mostraErrore("Link non valido.");
    return;
  }

  const { data, error } = await supabase
    .from("short_links")
    .select("id, url_destinazione, attivo")
    .eq("codice", codice)
    .maybeSingle();

  if (error || !data || data.attivo === false) {
    mostraErrore("Questo link non esiste o non è più attivo.");
    return;
  }

  // Incrementa contatore click senza bloccare il redirect
  supabase.rpc("incrementa_click_short_link", { p_codice: codice }).then(() => {}).catch(() => {
    // Fallback se la funzione RPC non esiste ancora: update diretto best-effort
    supabase.from("short_links").select("click_count").eq("id", data.id).maybeSingle().then(({ data: cur }) => {
      supabase.from("short_links").update({ click_count: (cur?.click_count || 0) + 1 }).eq("id", data.id);
    });
  });

  window.location.replace(data.url_destinazione);

  function mostraErrore(msg) {
    container.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:20px;">
        <div style="text-align:center;max-width:340px;">
          <div style="font-size:40px;margin-bottom:12px;">😕</div>
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">Link non disponibile</div>
          <div style="font-size:13px;color:#64748b;">${msg}</div>
        </div>
      </div>
    `;
  }
}
