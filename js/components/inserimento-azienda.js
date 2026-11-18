// js/components/inserimento-azienda.js
// INSERIMENTO AZIENDA (18/11/2026) — pannello sotto ogni azienda in Piattaforma → Gestione aziende.
// Segue il Programma inserimento azienda: raccolta → caricamento → consegna → secondo incontro → concluso.
// I controlli automatici li calcola inserimento_controlli sui dati veri dell'azienda; a mano si spuntano
// solo le due cose che nessuna query può sapere (il titolare entra dal telefono, la Bussola è credibile).

const sb = () => window.supabaseClient || window.supabase;
const FASI = [
  { k: "raccolta", n: "Raccolta" }, { k: "caricamento", n: "Caricamento" }, { k: "consegna", n: "Consegna" },
  { k: "secondo", n: "Secondo incontro" }, { k: "concluso", n: "Concluso" },
];
const MATERIALE = [
  { k: "fatture", n: "Fatture ultimi 3 mesi" }, { k: "ricette", n: "Ricette" }, { k: "menu", n: "Menu" },
  { k: "personale", n: "Personale" }, { k: "logo", n: "Logo e foto" }, { k: "delega", n: "Delega cassetto fiscale" },
];
const LINK_AVVIO = "https://app.ristoflow-ai.com/avvio.html?k=";

function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function perInput(ts) { if (!ts) return ""; const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function data(ts) { return ts ? new Date(ts).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) : ""; }
function telWa(t) { let d = String(t || "").replace(/[^0-9]/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d && d.length <= 10 && d[0] === "3") d = "39" + d; return d; }

// etichetta per la riga dell'azienda nell'elenco
export function etichetta(ins) {
  if (!ins) return "";
  const f = FASI.find(x => x.k === ins.fase) || FASI[0];
  const col = ins.fase === "concluso" ? "#dcfce7;color:#166534" : "#fef3c7;color:#92400e";
  return '<span style="background:' + col + ';border-radius:20px;padding:2px 9px;font-size:10.5px;font-weight:700">🚀 ' + f.n + "</span>";
}

export async function montaInserimento(el, az, alCambio) {
  el.innerHTML = '<div style="padding:10px;color:#94a3b8;font-size:13px">Carico…</div>';
  const { data: ins } = await sb().from("aziende_inserimento").select("*").eq("azienda_id", az.id).maybeSingle();
  if (!ins) {
    el.innerHTML = '<div style="font-size:13px;color:#475569">Inserimento non ancora avviato per questa azienda.</div>' +
      '<button class="app-button small primary" data-avvia style="margin-top:8px">🚀 Avvia inserimento</button>';
    el.querySelector("[data-avvia]").onclick = async () => {
      const { error } = await sb().from("aziende_inserimento").insert({ azienda_id: az.id });
      if (error) { alert(error.message); return; }
      alCambio && alCambio(); montaInserimento(el, az, alCambio);
    };
    return;
  }
  const [{ data: c, error: ec }, { data: file }] = await Promise.all([
    sb().rpc("inserimento_controlli", { p_azienda: az.id }),
    sb().from("aziende_inserimento_file").select("id, tipo, nome_file, path, testo, created_at").eq("azienda_id", az.id).order("created_at"),
  ]);
  const k = c || {};
  const spunte = ins.spunte || {};
  const per = {}; (file || []).forEach(f => { (per[f.tipo] = per[f.tipo] || []).push(f); });

  const auto = [
    { ok: k.fatture_3m > 0, t: "Fatture caricate", s: (k.fatture_3m || 0) + " negli ultimi 3 mesi · " + (k.fornitori || 0) + " fornitori" },
    { ok: k.prodotti > 0 && !k.prezzi_sospetti, t: "Prezzi dei prodotti credibili", s: k.prezzi_sospetti ? k.prezzi_sospetti + " prodotti con costo sopra 150 € per unità: quasi sempre è il totale della riga di fattura" : (k.prodotti || 0) + " prodotti" },
    { ok: k.ricette > 0 && !k.ricette_senza_porzioni, t: "Ricette con porzioni", s: k.ricette ? (k.ricette - (k.ricette_senza_porzioni || 0)) + " di " + k.ricette + " hanno le porzioni" : "nessuna ricetta caricata" },
    { ok: k.piatti > 0 && !k.piatti_incompleti, t: "Piatti con ricetta e prezzo", s: k.piatti ? (k.piatti - (k.piatti_incompleti || 0)) + " di " + k.piatti + " completi" : "nessun piatto caricato" },
    { ok: k.dipendenti > 0 && !k.dipendenti_senza_accesso, t: "Dipendenti con accesso", s: k.dipendenti ? k.dipendenti + " dipendenti" + (k.dipendenti_senza_accesso ? " · " + k.dipendenti_senza_accesso + " senza accesso né PIN" : "") : "nessun dipendente" },
    { ok: !!k.cassetto, t: "Cassetto fiscale attivo", s: k.cassetto ? "le fatture nuove arrivano da sole" : "delega da attivare" },
  ];
  const manuali = [{ k: "telefono", t: "Il titolare entra dal suo telefono" }, { k: "bussola", t: "La Bussola del locale mostra numeri credibili" }];
  const i = FASI.findIndex(f => f.k === ins.fase), prossima = FASI[i + 1];
  const link = LINK_AVVIO + ins.codice;
  const msg = "Ciao, sono Antonio di Ristoflow. Per consegnarti l'app già pronta con il tuo locale dentro, mandaci qui quello che hai (fatture, ricette, menu, personale), come ce l'hai: " + link + "\nAl resto pensiamo noi.";
  const wa = telWa(az.telefono);
  const segno = ok => ok ? '<span style="color:#16a34a">✓</span>' : '<span style="color:#dc2626">✕</span>';
  const riga = (s, t, sotto) => '<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #eef2f7;font-size:13px"><span style="width:18px;text-align:center;flex-shrink:0">' + s + "</span><div>" + t + (sotto ? '<div style="font-size:11.5px;color:#64748b">' + sotto + "</div>" : "") + "</div></div>";
  const tit = t => '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;color:#64748b;text-transform:uppercase;margin:14px 0 6px">' + t + "</div>";
  const inp = "padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px";

  el.innerHTML =
    '<div style="display:flex;gap:3px;margin-bottom:12px">' + FASI.map((f, j) =>
      '<button data-fase="' + f.k + '" style="flex:1;border:none;cursor:pointer;font-size:10.5px;font-weight:700;padding:7px 2px;border-radius:7px;background:' +
      (j < i ? "#dcfce7;color:#166534" : j === i ? "#0E5A7A;color:#fff" : "#e2e8f0;color:#64748b") + '">' + f.n + "</button>").join("") + "</div>" +
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;font-size:13px">' +
      '<span>Segue l\'inserimento</span><input data-campo="seguito_da" value="' + esc(ins.seguito_da || "") + '" placeholder="Nome di chi lo segue" style="' + inp + '">' +
      '<span>Primo incontro</span><input type="datetime-local" data-campo="incontro1_il" value="' + perInput(ins.incontro1_il) + '" style="' + inp + '">' +
      '<span>Secondo incontro</span><input type="datetime-local" data-campo="incontro2_il" value="' + perInput(ins.incontro2_il) + '" style="' + inp + '">' +
    "</div>" +
    tit("Materiale dal cliente") +
    '<div style="background:#fff;border:1px dashed #0E5A7A;border-radius:9px;padding:8px 10px;font-size:12px;color:#0E5A7A;word-break:break-all">' + esc(link) + "</div>" +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
      (wa ? '<a href="https://wa.me/' + wa + "?text=" + encodeURIComponent(msg) + '" target="_blank" class="app-button small" style="background:#25d366;color:#fff;text-decoration:none">Manda il link su WhatsApp</a>' : '<span style="font-size:12px;color:#b42318;align-self:center">Telefono dell\'azienda mancante: copia il link</span>') +
      '<button class="app-button small gray" data-copia>Copia messaggio</button>' +
    "</div>" +
    MATERIALE.map(m => {
      const fs = per[m.k] || [];
      const sotto = fs.length ? (m.k === "personale" ? fs.map(f => esc(f.testo || "").replace(/\n/g, "<br>")).join("<hr style='border:0;border-top:1px solid #eef2f7'>")
        : fs.length + " file · ultimo il " + data(fs.at(-1).created_at) + ' · <a href="#" data-scarica="' + m.k + '">apri</a>') : "";
      return riga(fs.length ? '<span style="color:#16a34a">✓</span>' : '<span style="color:#d97706">…</span>', m.n, sotto);
    }).join("") +
    '<div data-elenco style="display:none;margin-top:6px;font-size:12px"></div>' +
    tit("Controlli prima della consegna") +
    (ec ? '<div style="color:#b42318;font-size:12px">Controlli non disponibili: ' + esc(ec.message) + "</div>" : "") +
    auto.map(a => riga(segno(a.ok), a.t + ' <span style="font-size:10px;font-weight:700;color:#7c3aed;background:#f3e8ff;border-radius:6px;padding:1px 5px">AUTO</span>', a.s)).join("") +
    manuali.map(m => riga('<input type="checkbox" data-spunta="' + m.k + '"' + (spunte[m.k] ? " checked" : "") + ">", m.t, "")).join("") +
    tit("Note") +
    '<textarea data-campo="note" rows="3" style="width:100%;box-sizing:border-box;' + inp + '" placeholder="Scrivi una nota…">' + esc(ins.note || "") + "</textarea>" +
    (prossima ? '<button class="app-button small primary" data-avanza style="margin-top:8px">Passa a ' + prossima.n + "</button>" : '<div style="margin-top:8px;color:#166534;font-weight:700;font-size:13px">Inserimento concluso il ' + data(ins.concluso_il) + "</div>");

  const salva = async (campi) => {
    const { error } = await sb().from("aziende_inserimento").update(Object.assign({ updated_at: new Date().toISOString() }, campi)).eq("azienda_id", az.id);
    if (error) alert(error.message);
    return !error;
  };
  el.querySelectorAll("[data-campo]").forEach(x => x.onchange = () => {
    const v = x.value.trim();
    salva({ [x.dataset.campo]: x.type === "datetime-local" ? (v ? new Date(v).toISOString() : null) : (v || null) });
  });
  el.querySelectorAll("[data-spunta]").forEach(x => x.onchange = () => { spunte[x.dataset.spunta] = x.checked; salva({ spunte }); });
  const vaiA = async (f) => {
    if (await salva({ fase: f, concluso_il: f === "concluso" ? new Date().toISOString() : null })) { alCambio && alCambio(); montaInserimento(el, az, alCambio); }
  };
  el.querySelectorAll("[data-fase]").forEach(b => b.onclick = () => { if (b.dataset.fase !== ins.fase) vaiA(b.dataset.fase); });
  const av = el.querySelector("[data-avanza]"); if (av) av.onclick = () => vaiA(prossima.k);
  el.querySelector("[data-copia]").onclick = async (e) => {
    try { await navigator.clipboard.writeText(msg); e.target.textContent = "✓ Copiato"; } catch (_) { prompt("Copia il messaggio:", msg); }
  };
  el.querySelectorAll("[data-scarica]").forEach(a => a.onclick = async (e) => {
    e.preventDefault();
    const box = el.querySelector("[data-elenco]");
    const fs = (per[a.dataset.scarica] || []).filter(f => f.path);
    box.style.display = "";
    box.innerHTML = "Preparo i link…";
    const { data: firme } = await sb().storage.from("avvio").createSignedUrls(fs.map(f => f.path), 3600);
    box.innerHTML = (firme || []).map((s, j) => s.signedUrl ? '<div><a href="' + esc(s.signedUrl) + '" target="_blank">' + esc(fs[j].nome_file || "file") + "</a></div>" : "").join("") || "Nessun file da aprire.";
  });
}
