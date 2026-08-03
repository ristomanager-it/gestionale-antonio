// js/views/recensioni.js
// Due pannelli in uno:
//  - "Il mio QR": ogni collaboratore mostra il suo codice al cliente
//  - "Impostazioni": la direzione decide piattaforma, testo e firma (solo admin)

const BASE = (location.origin + location.pathname).replace(/index\.html$/, "");

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  const ruolo = String(window.state?.viewAs || window.state?.ruolo || "").toLowerCase();
  const isAdmin = ["admin", "superadmin", "direttore", "titolare"].includes(ruolo);

  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  container.innerHTML = `
    <div style="max-width:820px;margin:0 auto;padding:16px 14px 60px;">
      <h1 style="font-size:23px;margin:0 0 4px;">⭐ Richiedi una recensione</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
        Fai inquadrare il codice al cliente: la pagina lo porta dove decide la direzione.${
          isAdmin ? "" : "<br>Le impostazioni le gestisce la direzione."}</p>
      <div id="rec-qr"></div>
      <div id="rec-stat" style="margin-top:20px;"></div>
      <div id="rec-cfg" style="margin-top:24px;"></div>
    </div>`;

  await mostraQr();
  await mostraStatistiche();
  if (isAdmin) await mostraImpostazioni();

  /* ── Il QR del collaboratore ─────────────────────────────────────────── */
  async function mostraQr() {
    const box = document.getElementById("rec-qr");
    const userId = window.state?.user?.id || (await supabase.auth.getUser()).data?.user?.id;

    let { data: dip } = await supabase.from("dipendenti")
      .select("id, nome, cognome, codice_recensione, sede_id")
      .eq("azienda_id", azienda.id).eq("user_id", userId).maybeSingle();

    // chi non ha una scheda dipendente (es. il titolare) usa il QR della sede
    if (!dip) {
      const { data: primo } = await supabase.from("dipendenti")
        .select("id, nome, cognome, codice_recensione, sede_id")
        .eq("azienda_id", azienda.id).eq("attivo", true)
        .order("nome").limit(1).maybeSingle();
      dip = primo;
    }
    if (!dip) {
      box.innerHTML = `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:14px;font-size:14px;">
        Nessun collaboratore collegato a questo accesso: il QR si genera dalla scheda di un dipendente.</div>`;
      return;
    }

    let codice = dip.codice_recensione;
    if (!codice) {
      const { data } = await supabase.rpc("genera_codice_recensione", { p_dipendente: dip.id });
      codice = data;
    }
    const url = BASE + "#/recensione?c=" + codice;
    const qr = "https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=" + encodeURIComponent(url);

    box.innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:22px;text-align:center;">
        <div style="font-size:13px;color:#64748b;margin-bottom:12px;">Il QR di <b>${esc(dip.nome || "")} ${esc(dip.cognome || "")}</b></div>
        <img src="${qr}" alt="QR recensione" style="width:100%;max-width:280px;border-radius:12px;">
        <div style="font-size:12px;color:#94a3b8;margin-top:10px;word-break:break-all;">${esc(url)}</div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px;">
          <button id="rec-copia" style="background:#023C59;color:#fff;border:none;border-radius:10px;padding:11px 18px;font-weight:700;font-size:14px;cursor:pointer;">Copia link</button>
          <button id="rec-stampa" style="background:#fff;border:1.5px solid #cbd5e1;border-radius:10px;padding:11px 18px;font-weight:700;font-size:14px;cursor:pointer;">Stampa</button>
        </div>
      </div>`;

    document.getElementById("rec-copia").addEventListener("click", async (e) => {
      try { await navigator.clipboard.writeText(url); e.target.textContent = "Copiato ✓"; }
      catch { prompt("Copia il link:", url); }
      setTimeout(() => { e.target.textContent = "Copia link"; }, 1600);
    });
    document.getElementById("rec-stampa").addEventListener("click", () => {
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><head><title>QR recensione</title></head>
        <body style="font-family:system-ui;text-align:center;padding:40px;">
          <h2 style="font-family:Georgia,serif;">${esc(azienda.nome || "")}</h2>
          <p style="font-size:18px;color:#334155;">Inquadra e lasciaci una recensione</p>
          <img src="${qr}" style="width:340px;margin:20px 0;">
          <p style="font-size:14px;color:#64748b;">${esc(dip.nome || "")}</p>
        </body></html>`);
      w.document.close(); w.print();
    });
  }

  /* ── Quante ne portano ───────────────────────────────────────────────── */
  async function mostraStatistiche() {
    const box = document.getElementById("rec-stat");
    const { data } = await supabase.from("recensioni_scan")
      .select("dipendente_id, esito, piattaforma, creato_il")
      .eq("azienda_id", azienda.id)
      .gte("creato_il", new Date(Date.now() - 30 * 86400000).toISOString());

    const righe = data || [];
    if (!righe.length) {
      box.innerHTML = `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;font-size:13.5px;color:#64748b;">
        Ancora nessuna scansione negli ultimi 30 giorni.</div>`;
      return;
    }
    const aperture = righe.filter(r => r.esito === "apertura").length;
    const click = righe.filter(r => r.esito === "click").length;
    const privati = righe.filter(r => r.esito === "feedback_privato").length;
    const perc = aperture ? Math.round(click / aperture * 100) : 0;

    const { data: dips } = await supabase.from("dipendenti").select("id, nome, cognome").eq("azienda_id", azienda.id);
    const nomi = new Map((dips || []).map(d => [d.id, (d.nome || "") + " " + (d.cognome || "")]));
    const perDip = {};
    righe.filter(r => r.esito === "click").forEach(r => {
      const k = r.dipendente_id || "—";
      perDip[k] = (perDip[k] || 0) + 1;
    });
    const classifica = Object.entries(perDip).sort((a, b) => b[1] - a[1]).slice(0, 5);

    box.innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin-bottom:12px;">Ultimi 30 giorni</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;margin-bottom:14px;">
          ${[["Codici inquadrati", aperture], ["Sono andati a scrivere", click], ["Conversione", perc + "%"], ["Scritte a voi", privati]]
            .map(([k, v]) => `<div style="text-align:center;background:#f8fafc;border-radius:10px;padding:12px 6px;">
              <div style="font-size:22px;font-weight:800;color:#023C59;">${v}</div>
              <div style="font-size:11.5px;color:#64748b;margin-top:2px;">${k}</div></div>`).join("")}
        </div>
        ${classifica.length ? `<div style="font-size:13px;color:#334155;">
          ${classifica.map(([id, n]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #f1f5f9;">
            <span>${esc(nomi.get(id) || "senza nome")}</span><b>${n}</b></div>`).join("")}
        </div>` : ""}
      </div>`;
  }

  /* ── Impostazioni della direzione ────────────────────────────────────── */
  async function mostraImpostazioni() {
    const box = document.getElementById("rec-cfg");
    const sedeId = sede?.id;
    if (!sedeId) { box.innerHTML = ""; return; }

    let { data: cfg } = await supabase.from("recensioni_config").select("*").eq("sede_id", sedeId).maybeSingle();
    if (!cfg) {
      const { data: creata } = await supabase.from("recensioni_config")
        .insert({ sede_id: sedeId, azienda_id: azienda.id }).select("*").maybeSingle();
      cfg = creata || {};
    }

    const opt = (v, l, sel) => `<option value="${v}"${sel === v ? " selected" : ""}>${l}</option>`;
    box.innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h2 style="font-size:17px;margin:0 0 4px;">Impostazioni · ${esc(sede?.nome || "")}</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 16px;">Decidi tu dove mandare i clienti: il QR dei collaboratori non cambia.</p>

        <label style="display:block;font-size:12.5px;font-weight:700;margin-bottom:5px;">Dove mandiamo il cliente</label>
        <select id="rc-modalita" style="width:100%;padding:11px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;box-sizing:border-box;">
          ${opt("alternato", "Alternato — uno su Google, uno su TripAdvisor", cfg.modalita)}
          ${opt("google", "Sempre Google", cfg.modalita)}
          ${opt("tripadvisor", "Sempre TripAdvisor", cfg.modalita)}
          ${opt("scelta_cliente", "Sceglie il cliente (due pulsanti)", cfg.modalita)}
        </select>

        <label style="display:block;font-size:12.5px;font-weight:700;margin:14px 0 5px;">Link recensione Google</label>
        <input id="rc-google" value="${esc(cfg.url_google || "")}" placeholder="https://g.page/r/..."
          style="width:100%;padding:11px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;box-sizing:border-box;">

        <label style="display:block;font-size:12.5px;font-weight:700;margin:14px 0 5px;">Link recensione TripAdvisor</label>
        <input id="rc-trip" value="${esc(cfg.url_tripadvisor || "")}" placeholder="https://www.tripadvisor.it/..."
          style="width:100%;padding:11px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;box-sizing:border-box;">

        <label style="display:block;font-size:12.5px;font-weight:700;margin:14px 0 5px;">Titolo</label>
        <input id="rc-titolo" value="${esc(cfg.testo_titolo || "")}"
          style="width:100%;padding:11px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;box-sizing:border-box;">

        <label style="display:block;font-size:12.5px;font-weight:700;margin:14px 0 5px;">Testo</label>
        <textarea id="rc-corpo" rows="2" style="width:100%;padding:11px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;font-family:inherit;box-sizing:border-box;">${esc(cfg.testo_corpo || "")}</textarea>

        <label style="display:block;font-size:12.5px;font-weight:700;margin:14px 0 5px;">Firma</label>
        <select id="rc-firma" style="width:100%;padding:11px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;box-sizing:border-box;">
          ${opt("collaboratore", "Il nome di chi ha servito", cfg.firma_modalita)}
          ${opt("titolare", "Sempre il titolare", cfg.firma_modalita)}
          ${opt("nessuna", "Nessuna firma", cfg.firma_modalita)}
        </select>
        <input id="rc-firma-nome" value="${esc(cfg.firma_nome || "")}" placeholder="Nome del titolare"
          style="width:100%;padding:11px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;margin-top:8px;box-sizing:border-box;display:${cfg.firma_modalita === "titolare" ? "block" : "none"};">

        <label style="display:flex;align-items:center;gap:8px;font-size:14px;margin:16px 0 6px;">
          <input type="checkbox" id="rc-privato" ${cfg.feedback_privato ? "checked" : ""}>
          Mostra anche "preferisci scrivercelo direttamente?"
        </label>
        <input id="rc-tel" value="${esc(cfg.telefono_feedback || "")}" placeholder="Numero WhatsApp per il feedback privato"
          style="width:100%;padding:11px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;box-sizing:border-box;">

        <button id="rc-salva" style="width:100%;margin-top:18px;background:#023C59;color:#fff;border:none;border-radius:12px;padding:14px;font-weight:700;font-size:16px;cursor:pointer;">Salva</button>
        <div id="rc-esito" style="font-size:13.5px;margin-top:10px;text-align:center;"></div>
      </div>`;

    document.getElementById("rc-firma").addEventListener("change", (e) => {
      document.getElementById("rc-firma-nome").style.display = e.target.value === "titolare" ? "block" : "none";
    });

    document.getElementById("rc-salva").addEventListener("click", async () => {
      const esito = document.getElementById("rc-esito");
      const patch = {
        modalita: document.getElementById("rc-modalita").value,
        url_google: val("rc-google") || null,
        url_tripadvisor: val("rc-trip") || null,
        testo_titolo: val("rc-titolo") || "Grazie di essere passati.",
        testo_corpo: val("rc-corpo") || "",
        firma_modalita: document.getElementById("rc-firma").value,
        firma_nome: val("rc-firma-nome") || null,
        feedback_privato: document.getElementById("rc-privato").checked,
        telefono_feedback: val("rc-tel") || null,
        aggiornato_il: new Date().toISOString(),
      };
      const { error } = await supabase.from("recensioni_config").update(patch).eq("sede_id", sedeId);
      esito.textContent = error ? "Errore: " + error.message : "Salvato ✓";
      esito.style.color = error ? "#b91c1c" : "#15803d";
    });
  }
}

function val(id) { const e = document.getElementById(id); return e ? String(e.value || "").trim() : ""; }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
