/* Riquadro "Fatture per il commercialista".
   Lo stesso componente vive in due posti:
   - Accessi Consulenti (lato azienda): scarica lo ZIP o lo manda per email al commercialista;
   - home del commercialista: scarica lo ZIP da solo.
   Tutto il lavoro lo fa la Edge Function fe-esporta (XML FatturaPA + riepilogo.csv in uno ZIP,
   link valido 7 giorni). Qui si sceglie il periodo, si vede quante fatture ci sono e si avvisa
   se un periodo ne ha troppo poche rispetto alla media (import fermo, fatture mancanti). */

const sb = () => window.supabaseClient || window.supabase;

export async function montaEsportaFatture(el, opt) {
  const aziendaId = opt && opt.aziendaId;
  const lato = (opt && opt.lato) === "commercialista" ? "commercialista" : "azienda";
  if (!el || !aziendaId) return;

  const periodi = periodiPronti();
  const st = { periodo: periodi[0], cosa: "tutte", dal: periodi[0].dal, al: periodi[0].al };

  el.innerHTML = '<div style="' + S.card + '">'
    + '<div style="' + S.sez + '">🧾 ' + (lato === "azienda" ? "Fatture per il commercialista" : "Fatture da scaricare") + "</div>"
    + '<label style="' + S.label + '">Periodo</label>'
    + '<div id="ef-periodi" style="' + S.scelte + '">'
    + periodi.map((p, i) => bottone("ef-p-" + i, p.nome, i === 0)).join("")
    + bottone("ef-p-libero", "Dal… al…", false)
    + "</div>"
    + '<div id="ef-libero" style="display:none;gap:10px;flex-wrap:wrap;margin:-4px 0 12px;">'
    + '<input type="date" id="ef-dal" style="' + S.input + '"><input type="date" id="ef-al" style="' + S.input + '">'
    + "</div>"
    + (lato === "azienda"
      ? '<label style="' + S.label + '">Cosa</label><div id="ef-cosa" style="' + S.scelte + '">'
        + bottone("ef-c-tutte", "Tutte", true) + bottone("ef-c-emesse", "Solo emesse", false) + bottone("ef-c-ricevute", "Solo ricevute", false) + "</div>"
      : "")
    + '<div id="ef-conta" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 12px;"></div>'
    + '<div id="ef-avviso"></div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
    + '<button type="button" id="ef-scarica" style="' + (lato === "azienda" ? S.btnSec : S.btnPri) + '">⬇ Scarica ZIP' + (lato === "commercialista" ? " con gli XML" : "") + "</button>"
    + (lato === "azienda" ? '<button type="button" id="ef-invia" style="' + S.btnPri + '">✉ Invia al commercialista</button>' : "")
    + "</div>"
    + (lato === "azienda" ? '<div id="ef-dest" style="margin-top:12px;"></div>' : "")
    + '<div id="ef-esito" style="margin-top:10px;"></div>'
    + '<div style="' + S.grigio + 'margin-top:10px;">'
    + (lato === "azienda"
      ? "Nello ZIP: gli XML di tutte le fatture, pronti da importare nel programma di contabilità, e un riepilogo che si apre in Excel. Il link vale 7 giorni."
      : "Gli XML si importano direttamente in TeamSystem, Zucchetti, Profis e negli altri programmi di contabilità. Nello ZIP c'è anche un riepilogo che si apre in Excel.")
    + "</div></div>"
    + '<div id="ef-storico"></div>';

  const $ = (id) => el.querySelector("#" + id);

  // periodo
  periodi.forEach((p, i) => $("ef-p-" + i).addEventListener("click", () => {
    st.periodo = p; st.dal = p.dal; st.al = p.al;
    $("ef-libero").style.display = "none";
    accendi($("ef-periodi"), "ef-p-" + i);
    aggiorna();
  }));
  $("ef-p-libero").addEventListener("click", () => {
    accendi($("ef-periodi"), "ef-p-libero");
    $("ef-libero").style.display = "flex";
    $("ef-dal").value = st.dal; $("ef-al").value = st.al;
  });
  ["ef-dal", "ef-al"].forEach((id) => $(id).addEventListener("change", () => {
    if ($("ef-dal").value && $("ef-al").value && $("ef-dal").value <= $("ef-al").value) {
      st.dal = $("ef-dal").value; st.al = $("ef-al").value; aggiorna();
    }
  }));
  if (lato === "azienda") {
    ["tutte", "emesse", "ricevute"].forEach((c) => $("ef-c-" + c).addEventListener("click", () => {
      st.cosa = c; accendi($("ef-cosa"), "ef-c-" + c); aggiorna();
    }));
  }

  $("ef-scarica").addEventListener("click", async () => {
    const b = $("ef-scarica"); b.disabled = true;
    $("ef-esito").innerHTML = msg("Preparo lo ZIP…", "info");
    const r = await chiama({ azienda_id: aziendaId, dal: st.dal, al: st.al, cosa: st.cosa, azione: "scarica" });
    b.disabled = false;
    if (!r.ok) { $("ef-esito").innerHTML = msg(r.errore || "Non riuscito, riprova", "avviso"); return; }
    $("ef-esito").innerHTML = msg("Pronto: " + r.ricevute + " ricevute, " + r.emesse + " emesse. Se il download non parte, <a href=\"" + attr(r.link) + "\">tocca qui</a>.", "ok", true);
    window.location.href = r.link;
    storico();
  });

  let commercialisti = [];
  if (lato === "azienda") {
    const { data } = await sb().from("utenti_aziende").select("email").eq("azienda_id", aziendaId).eq("ruolo", "commercialista").eq("attivo", true);
    commercialisti = (data || []).map((x) => x.email).filter(Boolean);
    $("ef-dest").innerHTML = commercialisti.length
      ? '<div style="' + S.grigio + '">Va a: <b>' + esc(commercialisti.join(", ")) + "</b></div>"
      : '<div style="font-size:13px;color:#334155;margin-bottom:6px;">Nessun commercialista invitato. Invitalo qui sotto oppure scrivi la sua email per mandargli solo questo periodo:</div>'
        + '<input type="email" id="ef-email" placeholder="email del commercialista" style="' + S.input + 'width:100%;max-width:360px;" autocomplete="off">';

    $("ef-invia").addEventListener("click", async () => {
      const email = $("ef-email") ? String($("ef-email").value || "").trim() : "";
      if (!commercialisti.length && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
        $("ef-esito").innerHTML = msg("Scrivi l'email del commercialista.", "avviso"); return;
      }
      const b = $("ef-invia"); b.disabled = true;
      $("ef-esito").innerHTML = msg("Preparo e invio…", "info");
      const r = await chiama({ azienda_id: aziendaId, dal: st.dal, al: st.al, cosa: st.cosa, azione: "invia", email: email || undefined });
      b.disabled = false;
      if (!r.ok) { $("ef-esito").innerHTML = msg(r.errore || "Non inviato, riprova", "avviso"); return; }
      $("ef-esito").innerHTML = msg("Inviato a " + esc((r.inviato_a || []).join(", ")) + ": " + r.ricevute + " ricevute, " + r.emesse + " emesse.", "ok");
      storico();
    });
  }

  async function aggiorna() {
    $("ef-conta").innerHTML = numero("…", "fatture emesse") + numero("…", "fatture ricevute");
    $("ef-avviso").innerHTML = "";
    const r = await chiama({ azienda_id: aziendaId, dal: st.dal, al: st.al, azione: "conta" });
    if (!r.ok) { $("ef-conta").innerHTML = ""; $("ef-avviso").innerHTML = msg(r.errore || "Non riesco a contare le fatture", "avviso"); return; }
    const e = st.cosa === "ricevute" ? "—" : r.emesse;
    const ri = st.cosa === "emesse" ? "—" : r.ricevute;
    $("ef-conta").innerHTML = numero(e, "fatture emesse") + numero(ri, "fatture ricevute");
    if (r.anomalo && st.cosa !== "emesse") {
      $("ef-avviso").innerHTML = msg("In questo periodo ci sono " + r.ricevute + " fatture ricevute: di solito sono circa " + r.ricevute_attese
        + ". " + (lato === "azienda" ? "Controlla che siano arrivate tutte prima di mandarle." : "Potrebbero non essere ancora arrivate tutte."), "avviso");
    }
  }

  async function storico() {
    const { data } = await sb().from("fe_esportazioni").select("dal, al, n_emesse, n_ricevute, inviato_a, created_at")
      .eq("azienda_id", aziendaId).order("created_at", { ascending: false }).limit(5);
    if (!data || !data.length) { $("ef-storico").innerHTML = ""; return; }
    $("ef-storico").innerHTML = '<div style="' + S.card + '"><div style="' + S.sez + '">' + (lato === "azienda" ? "Ultimi invii" : "Ultime esportazioni") + "</div>"
      + data.map((x) => '<div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:9px 0;border-bottom:1px solid #f1f5f9;">'
        + "<span>" + esc(etichettaPeriodo(x.dal, x.al)) + " · " + x.n_ricevute + " ricevute" + (x.n_emesse ? ", " + x.n_emesse + " emesse" : "") + "</span>"
        + '<span style="' + S.grigio + '">' + esc(x.inviato_a && x.inviato_a.length ? x.inviato_a.join(", ") : "scaricato") + " · " + esc(giorno(x.created_at)) + "</span></div>").join("")
      + "</div>";
  }

  aggiorna();
  storico();
}

async function chiama(body) {
  try {
    const { data, error } = await sb().functions.invoke("fe-esporta", { body });
    if (!error) return data || {};
    try { const j = await error.context.json(); return Object.assign({ ok: false }, j); } catch (e) { return { ok: false, errore: error.message }; }
  } catch (e) { return { ok: false, errore: String(e && e.message ? e.message : e) }; }
}

// mese scorso, mese in corso, trimestre scorso: le scelte che un commercialista usa davvero
function periodiPronti() {
  const oggi = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const a = Number(oggi.slice(0, 4)), m = Number(oggi.slice(5, 7));
  const mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const fine = (y, mm) => new Date(Date.UTC(y, mm, 0)).getUTCDate();
  const d = (y, mm, g) => y + "-" + String(mm).padStart(2, "0") + "-" + String(g).padStart(2, "0");
  const ms = m === 1 ? 12 : m - 1, as = m === 1 ? a - 1 : a;
  const q = Math.floor((m - 1) / 3); const qs = q === 0 ? 4 : q; const aq = q === 0 ? a - 1 : a;
  return [
    { nome: cap(mesi[ms - 1]) + " " + as, dal: d(as, ms, 1), al: d(as, ms, fine(as, ms)) },
    { nome: cap(mesi[m - 1]) + " " + a, dal: d(a, m, 1), al: oggi },
    { nome: qs + "° trimestre " + aq, dal: d(aq, (qs - 1) * 3 + 1, 1), al: d(aq, qs * 3, fine(aq, qs * 3)) },
  ];
}
function etichettaPeriodo(dal, al) { return giorno(dal) + " – " + giorno(al); }
function giorno(t) { const s = String(t || "").slice(0, 10).split("-"); return s.length === 3 ? s[2] + "/" + s[1] + "/" + s[0] : ""; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function accendi(box, idOn) { box.querySelectorAll("button").forEach((b) => { b.setAttribute("style", b.id === idOn ? S.sceltaOn : S.scelta); }); }
function bottone(id, testo, on) { return '<button type="button" id="' + id + '" style="' + (on ? S.sceltaOn : S.scelta) + '">' + esc(testo) + "</button>"; }
function numero(v, t) { return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;"><b style="display:block;font-size:1.5rem;color:#0E5A7A;">' + esc(String(v)) + '</b><span style="font-size:12px;color:#64748b;">' + esc(t) + "</span></div>"; }
function msg(t, tipo, html) {
  const st = tipo === "ok" ? S.ok : tipo === "avviso" ? S.avviso : "font-size:13px;color:#64748b;";
  return '<div style="' + st + '">' + (html ? t : esc(t)) + "</div>";
}
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function attr(s) { return esc(s); }

const S = {
  card: "background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:14px;",
  sez: "font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;margin:0 0 10px;",
  label: "display:block;font-size:12px;font-weight:700;color:#334155;margin:0 0 6px;",
  scelte: "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;",
  scelta: "border:1px solid #cbd5e1;border-radius:10px;padding:9px 12px;font-size:13px;background:#fff;color:#0f172a;cursor:pointer;",
  sceltaOn: "border:1px solid #0E5A7A;border-radius:10px;padding:9px 12px;font-size:13px;background:#e0f2fe;color:#0E5A7A;font-weight:700;cursor:pointer;",
  input: "border:1px solid #cbd5e1;border-radius:10px;padding:9px 12px;font-size:16px;background:#fff;color:#0f172a;box-sizing:border-box;",
  btnPri: "border:0;border-radius:10px;padding:11px 16px;font-size:14px;font-weight:700;background:#0E5A7A;color:#fff;cursor:pointer;",
  btnSec: "border:1px solid #0E5A7A;border-radius:10px;padding:10px 14px;font-size:14px;font-weight:700;background:#fff;color:#0E5A7A;cursor:pointer;",
  grigio: "font-size:12px;color:#64748b;",
  avviso: "background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;font-size:13px;color:#92400e;margin-bottom:12px;",
  ok: "background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13px;color:#15803d;",
};
