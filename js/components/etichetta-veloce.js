// Etichetta veloce: per conservare al volo qualcosa che non ha ricetta né lotto
// (mezzo pomodoro, una salsa avanzata, un trancio di pesce). Si scrive cosa è,
// si sceglie la conservazione e i giorni, si firma col PIN: esce dalla Brother
// con un codice (V-AAMMGG-HHMM), la scadenza e il nome di chi l'ha fatta.
import { inviaEtichetteLotto, scegliFormatoEtichetta } from "../modules/produzione/etichette-lotto.js?v=20261010";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CONSERVAZIONI = [
  { t: "Frigo +4 °C", testo: "Conservare in frigorifero tra 0 e +4 °C", gg: 2 },
  { t: "Sottovuoto in frigo", testo: "Sottovuoto, in frigorifero tra 0 e +4 °C", gg: 5 },
  { t: "Abbattuto -18 °C", testo: "Abbattuto in negativo. Conservare a -18 °C. Una volta scongelato non ricongelare", gg: 180 },
  { t: "Ambiente", testo: "Conservare in luogo fresco e asciutto", gg: 1 },
];

export async function apriEtichettaVeloce(pre = {}) {
  const sb = window.supabaseClient || window.supabase;
  const az = window.state?.azienda?.id;
  if (!sb || !az) return;
  const oggiISO = new Date().toISOString().slice(0, 10);
  const [{ data: dip }, { data: ric }, { data: prod }, { data: ev }] = await Promise.all([
    sb.from("dipendenti").select("id, nome, pin").eq("azienda_id", az).eq("attivo", true),
    sb.from("etichette").select("ricetta_id, denominazione, ingredienti, allergeni, origine").eq("azienda_id", az).eq("confermata", true).limit(2000),
    sb.from("prodotti").select("id, nome, nome_etichetta, allergeni").eq("azienda_id", az).limit(3000),
    sb.from("preventivi").select("titolo_evento, data_evento").eq("azienda_id", az).eq("stato", "confermato")
      .gte("data_evento", oggiISO).order("data_evento").limit(30),
  ]);
  const DEST = (ev || []).map((e) => e.titolo_evento + " (" + new Date(e.data_evento + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) + ")")
    .concat(["Trattoria", "Ristorante", "Banchetto", "Buffet", "Pasto del personale"]);
  // suggerimenti: prodotti gia' esistenti (da produzione con la loro scheda etichetta, o da acquisti)
  const SUGG = new Map();
  (ric || []).forEach((e) => { if (e.denominazione) SUGG.set("🍳 " + e.denominazione, { nome: e.denominazione, ingredienti: e.ingredienti, allergeni: e.allergeni || [], origine: e.origine, da: "ricetta" }); });
  (prod || []).forEach((p) => {
    const n = String(p.nome_etichetta || p.nome || "").trim();
    if (n && !SUGG.has("📦 " + n)) SUGG.set("📦 " + n, { nome: n.charAt(0).toUpperCase() + n.slice(1), ingredienti: null, allergeni: p.allergeni || [], origine: null, da: "acquisti" });
  });
  let scelto = null;
  const io = window.state?.dipendente || null;

  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;";
  const st = "width:100%;font-size:16px;padding:11px;border:1.5px solid #e2e8f0;border-radius:10px;";
  ov.innerHTML = `
    <div style="background:#fff;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));max-height:92vh;overflow:auto;">
      <div style="font-size:17px;font-weight:800;">🏷 Etichetta veloce</div>
      <div style="font-size:12.5px;color:#64748b;margin:4px 0 12px;">Per conservare al volo qualcosa che non ha una ricetta: scrivi cos'è, scegli come lo conservi, firma.</div>
      <label style="font-size:12px;font-weight:700;">Cos'è</label>
      <input id="ev-cosa" list="ev-sugg" autocomplete="off" placeholder="Es: mezzo pomodoro cuore di bue — o cerca un prodotto" style="${st}margin-bottom:4px;">
      <datalist id="ev-sugg">${Array.from(SUGG.keys()).map((k) => `<option value="${esc(k)}">`).join("")}</datalist>
      <div id="ev-info" style="font-size:12px;color:#166534;font-weight:700;min-height:16px;margin:0 2px 8px;"></div>
      <label style="font-size:12px;font-weight:700;">Conservazione</label>
      <div id="ev-cons" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px;">
        ${CONSERVAZIONI.map((c, i) => `<button type="button" data-c="${i}" style="border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:8px 10px;font-weight:700;font-size:13.5px;">${esc(c.t)}</button>`).join("")}
      </div>
      <label style="font-size:12px;font-weight:700;">Allergeni (se ci sono)</label>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin:4px 0 10px;">
        ${["glutine","crostacei","uova","pesce","arachidi","soia","latte","frutta a guscio","sedano","senape","sesamo","solfiti","lupini","molluschi"].map((a) =>
          `<label style="display:flex;align-items:center;gap:4px;font-size:12.5px;background:#f1f5f9;border-radius:8px;padding:4px 7px;"><input type="checkbox" class="ev-all" value="${a}"> ${a}</label>`).join("")}
      </div>
      <label style="font-size:12px;font-weight:700;">Giorni di vita</label>
      <div id="ev-ggq" style="display:flex;flex-wrap:wrap;gap:5px;margin:4px 0 6px;">
        ${[3, 7, 15, 30, 90, 180].map((n) => `<button type="button" data-gg="${n}" style="min-width:42px;border:1.5px solid #cbd5e1;background:#fff;border-radius:9px;padding:7px 8px;font-weight:800;font-size:13.5px;">${n}</button>`).join("")}
      </div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;"><label style="font-size:12px;font-weight:700;">Giorni (o scrivili)</label>
          <input id="ev-gg" type="number" inputmode="numeric" min="0" value="" placeholder="—" style="${st}"></div>
        <div style="width:80px;"><label style="font-size:12px;font-weight:700;">Copie</label>
          <input id="ev-copie" type="number" inputmode="numeric" min="1" value="1" style="${st}"></div>
      </div>
      <label style="font-size:12px;font-weight:700;margin-top:8px;display:block;">Quantità (facoltativa)</label>
      <div style="display:flex;gap:6px;">
        <input id="ev-q" type="text" inputmode="decimal" placeholder="es. 350" style="${st}flex:1;">
        <select id="ev-um" style="border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;padding:0 8px;">
          <option value="g">g</option><option value="kg">kg</option><option value="pz">pz</option><option value="porzioni">porzioni</option><option value="ml">ml</option><option value="l">l</option>
        </select>
      </div>
      <label style="font-size:12px;font-weight:700;margin-top:8px;display:block;">Destinazione (facoltativa)</label>
      <input id="ev-dest" list="ev-dest-l" autocomplete="off" placeholder="Matrimonio di…, Battesimo…, Trattoria…" style="${st}">
      <datalist id="ev-dest-l">${DEST.map((d) => `<option value="${esc(d)}">`).join("")}</datalist>
      <div id="ev-scad" style="font-size:13px;color:#b91c1c;font-weight:700;margin:6px 2px 10px;"></div>
      <label style="font-size:12px;font-weight:700;">Firma: PIN di chi lo fa</label>
      <input id="ev-pin" type="password" inputmode="numeric" autocomplete="off" placeholder="${io?.nome ? "PIN (vuoto = " + esc(io.nome) + ")" : "PIN"}" style="${st}">
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button type="button" data-no style="flex:1;border:0;border-radius:12px;padding:13px;background:#f1f5f9;font-weight:700;">Annulla</button>
        <button type="button" data-si style="flex:2;border:0;border-radius:12px;padding:13px;background:#0E5A7A;color:#fff;font-weight:800;">Stampa 🏷</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  let cons = -1;   // la conservazione si sceglie sempre: nessuna e' gia' selezionata
  const gg = ov.querySelector("#ev-gg"), scad = ov.querySelector("#ev-scad");
  // prodotto gia' esistente: nome pulito, ingredienti e allergeni dalla sua scheda
  const cosaEl = ov.querySelector("#ev-cosa"), info = ov.querySelector("#ev-info");
  const applica = () => {
    const s = SUGG.get(cosaEl.value);
    if (!s) { if (scelto && cosaEl.value !== scelto.nome) { scelto = null; info.textContent = ""; } return; }
    scelto = s;
    cosaEl.value = s.nome;
    ov.querySelectorAll(".ev-all").forEach((c) => { c.checked = (s.allergeni || []).includes(c.value); });
    info.textContent = s.da === "ricetta" ? "📋 Etichetta completa dalla ricetta: ingredienti e allergeni" : "📦 Prodotto degli acquisti: allergeni dalla sua scheda";
  };
  cosaEl.addEventListener("input", applica);
  cosaEl.addEventListener("change", applica);
  // precompilata (es. "abbatti in negativo" dal magazzino): cosa e conservazione gia' scelti
  if (pre.cosa) ov.querySelector("#ev-cosa").value = pre.cosa;
  if (Number.isInteger(pre.cons)) setTimeout(() => ov.querySelector(`[data-c="${pre.cons}"]`)?.click(), 0);
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const scadenza = () => { const d = new Date(); d.setDate(d.getDate() + (Number(gg.value) || 0)); return d; };
  // nessun giorno scelto: niente scadenza da mostrare
  const mostra = () => {
    scad.textContent = gg.value === "" ? "" : "Scade il " + scadenza().toLocaleDateString("it-IT");
    ov.querySelectorAll("[data-gg]").forEach((b) => { const on = Number(b.dataset.gg) === Number(gg.value); b.style.background = on ? "#b91c1c" : "#fff"; b.style.color = on ? "#fff" : "#334155"; });
  };
  mostra();
  gg.addEventListener("input", mostra);
  ov.querySelectorAll("[data-gg]").forEach((b) => b.addEventListener("click", () => { gg.value = b.dataset.gg; mostra(); }));
  ov.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
    cons = Number(b.dataset.c);
    ov.querySelectorAll("[data-c]").forEach((x) => { const on = x === b; x.style.background = on ? "#0E5A7A" : "#fff"; x.style.color = on ? "#fff" : "#334155"; });
    if (gg.value === "") gg.value = CONSERVAZIONI[cons].gg;   // proposta: si cambia dalla griglia
    mostra();
  }));
  ov.querySelector("[data-no]").onclick = () => ov.remove();
  setTimeout(() => ov.querySelector("#ev-cosa")?.focus(), 50);

  ov.querySelector("[data-si]").onclick = async () => {
    const cosa = ov.querySelector("#ev-cosa").value.trim();
    if (!cosa) return alert("Scrivi cos'è.");
    if (cons < 0) return alert("Scegli come lo conservi (frigo, sottovuoto, abbattuto, ambiente).");
    if (gg.value === "" || !(Number(gg.value) >= 0)) return alert("Scegli i giorni di vita.");
    const pin = ov.querySelector("#ev-pin").value.trim();
    const chi = pin ? (dip || []).find((d) => String(d.pin ?? "") === pin) : (io ? { id: io.id, nome: io.nome } : null);
    if (!chi) return alert(pin ? "PIN non valido ❌" : "Serve la firma: inserisci il PIN.");
    const formato = await scegliFormatoEtichetta();
    if (!formato) return;
    const d = new Date();
    const codice = "V-" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0")
      + "-" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
    const copie = Math.max(1, Number(ov.querySelector("#ev-copie").value) || 1);
    const scadISO = iso(scadenza());
    const { data: produttore } = await sb.from("etichette_produttore").select("ragione_sociale, indirizzo, partita_iva").eq("azienda_id", az).limit(1).maybeSingle();
    // quantita': in g/kg va come peso; in pezzi, porzioni o litri si aggiunge al nome
    const qv = Number(String(ov.querySelector("#ev-q").value || "").replace(",", "."));
    const um = ov.querySelector("#ev-um").value;
    const peso = qv > 0 && (um === "g" || um === "kg") ? Math.round(um === "kg" ? qv * 1000 : qv) : null;
    const nomeEt = cosa + (qv > 0 && !peso ? " · " + String(qv).replace(".", ",") + " " + um : "");
    const dest = ov.querySelector("#ev-dest").value.trim().replace(/\s*\(\d{2}\/\d{2}\)$/, "");
    const esito = await inviaEtichetteLotto({
      etichetta: { denominazione: nomeEt, ingredienti: (scelto && scelto.nome === cosa) ? scelto.ingredienti : null,
                   origine: (scelto && scelto.nome === cosa) ? scelto.origine : null, titolo_grande: 1.4,
                   allergeni: (() => { const a = Array.from(ov.querySelectorAll(".ev-all:checked")).map((c) => c.value);
                     return a.length ? a : (scelto && scelto.nome === cosa && scelto.da === "ricetta" ? [] : null); })(),
                   conservazione: CONSERVAZIONI[cons].testo, confermata: true },
      produttore: produttore || {}, info: { codice_lotto: codice, data_scadenza: scadISO, operatore: chi.nome, destinazione: dest || null },
      peso, copie, formato,
    });
    if (esito.motivo === "troppo_lungo") return alert("Il testo non entra nell'etichetta: accorcialo o allunga l'etichetta.");
    if (!esito.ok) return alert("Errore invio etichetta: " + esito.motivo);
    sb.from("etichette_veloci").insert({ azienda_id: az, sede_id: window.state?.sedeAttiva?.id || null, codice, cosa,
      conservazione: CONSERVAZIONI[cons].t, giorni: Number(gg.value) || 0, data_scadenza: scadISO,
      operatore_id: chi.id || null, operatore_nome: chi.nome, copie,
      quantita: qv > 0 ? qv : null, unita: qv > 0 ? um : null, destinazione: dest || null }).then(() => {}, () => {});
    ov.remove();
    alert("🏷 Etichetta inviata alla Brother.");
    try { pre.dopo && pre.dopo(); } catch (_) {}
  };
}

window.apriEtichettaVeloce = apriEtichettaVeloce;
