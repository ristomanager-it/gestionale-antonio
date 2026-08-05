// js/components/notifiche-tab.js
// Tab notifiche in home: pallino rosso col numero, sparisce all'apertura.

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function initNotificheTab() {

  const supabase = window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id || window.state?.azienda_id;
  const box = document.getElementById("notifiche-tab");

  if (!supabase || !aziendaId || !box) return;

  const { data, error } = await supabase
    .from("notifiche")
    .select("id,titolo,messaggio,letto,created_at")
    .eq("azienda_id", aziendaId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data || !data.length) { box.innerHTML = ""; return; }

  const nonLette = data.filter(n => !n.letto).length;

  box.innerHTML =
    '<div class="ntf">' +
      '<div class="ntf-barra" id="ntf-barra">' +
        '<span class="ntf-freccia" id="ntf-freccia">&#9656;</span>' +
        '<span class="ntf-tit">Notifiche</span>' +
        (nonLette
          ? '<span class="ntf-pallino" id="ntf-pallino">' + nonLette + '</span>'
          : '<span class="ntf-letto">letto</span>') +
      '</div>' +
      '<ul class="ntf-lista" id="ntf-lista" hidden>' +
        data.map(n =>
          '<li><b>' + esc(n.titolo) + '</b>\n' + esc(n.messaggio) + '</li>'
        ).join("") +
      '</ul>' +
    '</div>' +
    '<style>' +
      '.ntf{background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:16px;overflow:hidden}' +
      '.ntf-barra{display:flex;align-items:center;gap:9px;padding:12px 14px;cursor:pointer;user-select:none}' +
      '.ntf-freccia{color:#9ca3af;font-size:12px}' +
      '.ntf-tit{font-weight:600;font-size:14px}' +
      '.ntf-pallino{margin-left:auto;background:#dc2626;color:#fff;font-size:11px;font-weight:700;' +
        'min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;' +
        'justify-content:center;padding:0 6px}' +
      '.ntf-letto{margin-left:auto;color:#9ca3af;font-size:11px}' +
      '.ntf-lista{list-style:none;padding:2px 14px 12px;margin:0;border-top:1px solid #f3f4f6}' +
      '.ntf-lista li{font-size:13px;padding:8px 0;border-bottom:1px solid #f6f6f4;' +
        'line-height:1.4;white-space:pre-line}' +
      '.ntf-lista li:last-child{border-bottom:none}' +
    '</style>';

  document.getElementById("ntf-barra").onclick = async () => {

    const lista = document.getElementById("ntf-lista");
    const freccia = document.getElementById("ntf-freccia");
    const aperto = !lista.hidden;

    lista.hidden = aperto;
    freccia.innerHTML = aperto ? "&#9656;" : "&#9662;";

    if (aperto) return;

    const pallino = document.getElementById("ntf-pallino");
    if (pallino) {
      pallino.outerHTML = '<span class="ntf-letto">letto</span>';
      await supabase.rpc("segna_notifiche_lette", { p_azienda: aziendaId, p_tipo: null });
    }
  };
}
