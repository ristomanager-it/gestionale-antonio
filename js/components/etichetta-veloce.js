// Etichetta veloce: per conservare al volo qualcosa che non ha ricetta né lotto
// (mezzo pomodoro, una salsa avanzata, un trancio di pesce). Si scrive cosa è,
// si sceglie la conservazione e i giorni, si firma col PIN: esce dalla Brother
// con un codice (V-AAMMGG-HHMM), la scadenza e il nome di chi l'ha fatta.
import { inviaEtichetteLotto, scegliFormatoEtichetta } from "../modules/produzione/etichette-lotto.js?v=20261009";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CONSERVAZIONI = [
  { t: "Frigo +4 °C", testo: "Conservare in frigorifero tra 0 e +4 °C", gg: 2 },
  { t: "Sottovuoto in frigo", testo: "Sottovuoto, in frigorifero tra 0 e +4 °C", gg: 5 },
  { t: "Congelato -18 °C", testo: "Conservare in congelatore a -18 °C. Una volta scongelato non ricongelare", gg: 90 },
  { t: "Ambiente", testo: "Conservare in luogo fresco e asciutto", gg: 1 },
];

export async function apriEtichettaVeloce() {
  const sb = window.supabaseClient || window.supabase;
  const az = window.state?.azienda?.id;
  if (!sb || !az) return;
  const { data: dip } = await sb.from("dipendenti").select("id, nome, pin").eq("azienda_id", az).eq("attivo", true);
  const io = window.state?.dipendente || null;

  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;";
  const st = "width:100%;font-size:16px;padding:11px;border:1.5px solid #e2e8f0;border-radius:10px;";
  ov.innerHTML = `
    <div style="background:#fff;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));max-height:92vh;overflow:auto;">
      <div style="font-size:17px;font-weight:800;">🏷 Etichetta veloce</div>
      <div style="font-size:12.5px;color:#64748b;margin:4px 0 12px;">Per conservare al volo qualcosa che non ha una ricetta: scrivi cos'è, scegli come lo conservi, firma.</div>
      <label style="font-size:12px;font-weight:700;">Cos'è</label>
      <input id="ev-cosa" placeholder="Es: mezzo pomodoro cuore di bue" style="${st}margin-bottom:10px;">
      <label style="font-size:12px;font-weight:700;">Conservazione</label>
      <div id="ev-cons" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px;">
        ${CONSERVAZIONI.map((c, i) => `<button type="button" data-c="${i}" style="border:1.5px solid #cbd5e1;background:${i === 0 ? "#0E5A7A" : "#fff"};color:${i === 0 ? "#fff" : "#334155"};border-radius:10px;padding:8px 10px;font-weight:700;font-size:13.5px;">${esc(c.t)}</button>`).join("")}
      </div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;"><label style="font-size:12px;font-weight:700;">Giorni di vita</label>
          <input id="ev-gg" type="number" inputmode="numeric" min="0" value="${CONSERVAZIONI[0].gg}" style="${st}"></div>
        <div style="width:100px;"><label style="font-size:12px;font-weight:700;">Copie</label>
          <input id="ev-copie" type="number" inputmode="numeric" min="1" value="1" style="${st}"></div>
      </div>
      <div id="ev-scad" style="font-size:13px;color:#b91c1c;font-weight:700;margin:6px 2px 10px;"></div>
      <label style="font-size:12px;font-weight:700;">Firma: PIN di chi lo fa</label>
      <input id="ev-pin" type="password" inputmode="numeric" autocomplete="off" placeholder="${io?.nome ? "PIN (vuoto = " + esc(io.nome) + ")" : "PIN"}" style="${st}">
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button type="button" data-no style="flex:1;border:0;border-radius:12px;padding:13px;background:#f1f5f9;font-weight:700;">Annulla</button>
        <button type="button" data-si style="flex:2;border:0;border-radius:12px;padding:13px;background:#0E5A7A;color:#fff;font-weight:800;">Stampa 🏷</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  let cons = 0;
  const gg = ov.querySelector("#ev-gg"), scad = ov.querySelector("#ev-scad");
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const scadenza = () => { const d = new Date(); d.setDate(d.getDate() + (Number(gg.value) || 0)); return d; };
  const mostra = () => { scad.textContent = "Scade il " + scadenza().toLocaleDateString("it-IT"); };
  mostra();
  gg.addEventListener("input", mostra);
  ov.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
    cons = Number(b.dataset.c);
    ov.querySelectorAll("[data-c]").forEach((x) => { const on = x === b; x.style.background = on ? "#0E5A7A" : "#fff"; x.style.color = on ? "#fff" : "#334155"; });
    gg.value = CONSERVAZIONI[cons].gg; mostra();
  }));
  ov.querySelector("[data-no]").onclick = () => ov.remove();
  setTimeout(() => ov.querySelector("#ev-cosa")?.focus(), 50);

  ov.querySelector("[data-si]").onclick = async () => {
    const cosa = ov.querySelector("#ev-cosa").value.trim();
    if (!cosa) return alert("Scrivi cos'è.");
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
    const esito = await inviaEtichetteLotto({
      etichetta: { denominazione: cosa, ingredienti: null, allergeni: [], conservazione: CONSERVAZIONI[cons].testo, confermata: true },
      produttore: produttore || {}, info: { codice_lotto: codice, data_scadenza: scadISO, operatore: chi.nome },
      peso: null, copie, formato,
    });
    if (esito.motivo === "troppo_lungo") return alert("Il testo non entra nell'etichetta: accorcialo o allunga l'etichetta.");
    if (!esito.ok) return alert("Errore invio etichetta: " + esito.motivo);
    sb.from("etichette_veloci").insert({ azienda_id: az, sede_id: window.state?.sedeAttiva?.id || null, codice, cosa,
      conservazione: CONSERVAZIONI[cons].t, giorni: Number(gg.value) || 0, data_scadenza: scadISO,
      operatore_id: chi.id || null, operatore_nome: chi.nome, copie }).then(() => {}, () => {});
    ov.remove();
    alert("🏷 Etichetta inviata alla Brother.");
  };
}

window.apriEtichettaVeloce = apriEtichettaVeloce;
