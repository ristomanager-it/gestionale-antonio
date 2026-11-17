// js/views/home-supporto.js
// Home del tecnico del supporto Ristoflow.
// Il tecnico NON ha accessi fissi ai clienti: entra in un'azienda solo aprendo un
// "accesso assistito" con motivo e durata. Scade da solo; ogni pagina aperta e ogni
// modifica ai dati finiscono nel registro che vede solo il superadmin.
import { sb, esc, ora } from "../utils/assistenza.js";
import { salvaSessioneLocale, pulisciSessioneLocale, entraInAzienda } from "../utils/supporto.js";

export async function render(container) {
  const uid = window.state?.user?.id;
  container.innerHTML = `
  <style>
    .hs{max-width:1100px;margin:0 auto;padding:16px 12px 60px;}
    .hs h1{font-size:22px;margin:0 0 4px;color:#023C59;}
    .hs .sub{color:#64748B;font-size:13px;margin-bottom:14px;}
    .hs-card{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:14px;margin-bottom:14px;}
    .hs-card h3{margin:0 0 10px;font-size:16px;color:#023C59;}
    .hs-att{border:2px solid #E66101;background:#FFF7ED;}
    .hs-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0;}
    .hs label{font-size:13px;font-weight:700;color:#334155;display:block;margin:10px 0 4px;}
    .hs select,.hs textarea,.hs input{width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:10px;font:inherit;font-size:15px;background:#fff;}
    .hs-btn{border:1px solid #CBD5E1;background:#fff;border-radius:10px;padding:10px 14px;font-weight:700;font-size:14px;cursor:pointer;color:#023C59;}
    .hs-btn.pri{background:#E66101;border-color:#E66101;color:#fff;}
    .hs-btn.blu{background:#023C59;border-color:#023C59;color:#fff;}
    .hs-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
    .hs-tabs button{border:1px solid #CBD5E1;background:#fff;border-radius:999px;padding:8px 14px;font-weight:700;cursor:pointer;color:#64748B;}
    .hs-tabs button.on{background:#023C59;color:#fff;border-color:#023C59;}
    .hs-s{padding:9px 0;border-bottom:1px solid #F1F5F9;font-size:14px;}
    .hs-s small{color:#64748B;}
    .hs-avv{font-size:12.5px;color:#64748B;line-height:1.45;margin-top:8px;}
  </style>
  <div class="hs">
    <h1>🛟 Supporto Ristoflow</h1>
    <div class="sub" id="hs-chi"></div>
    <div id="hs-attiva"></div>
    <div class="hs-tabs">
      <button data-t="entra" class="on">🔑 Entra in un'azienda</button>
      <button data-t="chat">💬 Chat clienti</button>
      <button data-t="mie">🕓 Le mie sessioni</button>
    </div>
    <div id="hs-corpo"></div>
  </div>`;

  const $ = (s) => container.querySelector(s);
  const { data: op } = await sb().from("assistenza_operatori").select("nome, attivo").eq("user_id", uid).maybeSingle();
  if (!op?.attivo) {
    $(".hs").innerHTML = `<h1>Accesso non attivo</h1><p>Il tuo account del supporto non è attivo. Contatta Ristoflow.</p>`;
    return;
  }
  $("#hs-chi").textContent = `${op.nome} · ogni accesso ai clienti è a tempo e viene registrato`;

  async function disegnaAttiva() {
    const { data: s } = await sb().from("supporto_sessioni").select("*")
      .eq("user_id", uid).is("chiusa_at", null).maybeSingle();
    const box = $("#hs-attiva");
    if (!s) { pulisciSessioneLocale(); box.innerHTML = ""; return null; }
    salvaSessioneLocale(s);
    const scade = new Date(s.scade_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
    box.innerHTML = `
      <div class="hs-card hs-att">
        <h3>Accesso aperto: ${esc(s.azienda_nome || "")}</h3>
        <div style="font-size:14px;">Motivo: ${esc(s.motivo)}<br>Livello: <b>${esc(s.livello)}</b> · scade alle <b>${scade}</b></div>
        <div class="hs-row" style="margin-top:12px;">
          <button class="hs-btn pri" id="hs-vai">➡️ Entra nel gestionale</button>
          <button class="hs-btn" id="hs-chiudi">🔒 Chiudi accesso</button>
        </div>
      </div>`;
    $("#hs-vai").onclick = () => entraInAzienda(s);
    $("#hs-chiudi").onclick = async () => {
      const esito = prompt("Com'è andata? (cosa hai trovato e cosa hai fatto)");
      if (esito === null) return;
      const { error } = await sb().rpc("supporto_chiudi_sessione", { p_esito: esito });
      if (error) return alert(error.message);
      pulisciSessioneLocale();
      await disegnaAttiva();
      if (tab === "mie") disegnaMie();
    };
    return s;
  }

  async function disegnaEntra() {
    const corpo = $("#hs-corpo");
    corpo.innerHTML = `<div class="hs-card">Caricamento…</div>`;
    const { data: az, error } = await sb().rpc("supporto_elenco_aziende");
    if (error) { corpo.innerHTML = `<div class="hs-card">Errore: ${esc(error.message)}</div>`; return; }
    corpo.innerHTML = `
      <div class="hs-card">
        <h3>Apri un accesso assistito</h3>
        <label>Azienda</label>
        <select id="hs-az"><option value="">— scegli —</option>
          ${(az || []).map(a => `<option value="${a.id}">${esc(a.nome)}${a.chat_aperte ? ` · 💬 ${a.chat_aperte} aperte` : ""}</option>`).join("")}
        </select>
        <label>Chat del cliente collegata (facoltativa)</label>
        <select id="hs-conv"><option value="">— nessuna —</option></select>
        <label>Motivo (cosa devi verificare o sistemare)</label>
        <textarea id="hs-motivo" rows="3" placeholder="Es. il cliente non riesce a stampare le etichette dei lotti"></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label>Livello</label>
            <select id="hs-liv"><option value="manager">Manager (consigliato)</option><option value="admin">Admin (vede anche bilancio e paghe)</option></select></div>
          <div><label>Durata</label>
            <select id="hs-min"><option value="30">30 minuti</option><option value="60">1 ora</option><option value="120" selected>2 ore</option><option value="240">4 ore</option></select></div>
        </div>
        <div class="hs-row" style="margin-top:14px;"><button class="hs-btn pri" id="hs-apri">🔑 Apri ed entra</button></div>
        <div class="hs-avv">Il cliente, se colleghi la sua chat, riceve un messaggio quando entri ed esci.
          Non puoi cambiare utenti, ruoli o accessi. Alla scadenza l'accesso si chiude da solo.</div>
      </div>`;
    $("#hs-az").onchange = async () => {
      const sel = $("#hs-conv");
      sel.innerHTML = `<option value="">— nessuna —</option>`;
      const id = $("#hs-az").value;
      if (!id) return;
      const { data: conv } = await sb().from("assistenza_conversazioni")
        .select("id, aperta_da_nome, ultimo_messaggio_testo, ultimo_messaggio_at, stato")
        .eq("azienda_id", id).order("ultimo_messaggio_at", { ascending: false }).limit(15);
      sel.innerHTML += (conv || []).map(c =>
        `<option value="${c.id}">${c.stato === "aperta" ? "🟠" : "⚪"} ${esc(c.aperta_da_nome || "Cliente")} · ${esc((c.ultimo_messaggio_testo || "").slice(0, 50))}</option>`).join("");
    };
    $("#hs-apri").onclick = async () => {
      const b = $("#hs-apri");
      b.disabled = true; b.textContent = "Apro…";
      const { data, error } = await sb().rpc("supporto_apri_sessione", {
        p_azienda: $("#hs-az").value || null,
        p_motivo: $("#hs-motivo").value,
        p_conversazione: $("#hs-conv").value || null,
        p_livello: $("#hs-liv").value,
        p_minuti: parseInt($("#hs-min").value, 10),
      });
      if (error || !data?.ok) { b.disabled = false; b.textContent = "🔑 Apri ed entra"; return alert(error?.message || "Errore"); }
      entraInAzienda({ id: data.sessione_id, azienda_id: data.azienda_id, azienda_nome: data.azienda_nome, scade_at: data.scade_at });
    };
  }

  async function disegnaMie() {
    const corpo = $("#hs-corpo");
    const { data } = await sb().from("supporto_sessioni").select("*").eq("user_id", uid)
      .order("aperta_at", { ascending: false }).limit(30);
    corpo.innerHTML = `<div class="hs-card"><h3>Le mie sessioni</h3>${(data || []).map(s => `
      <div class="hs-s"><b>${esc(s.azienda_nome || "")}</b> · ${ora(s.aperta_at)} ${s.chiusa_at ? "" : "· <b style='color:#E66101'>aperta</b>"}<br>
      <small>${esc(s.motivo)}${s.esito ? " → " + esc(s.esito) : ""}</small></div>`).join("") || "<div class='hs-s'>Nessuna sessione</div>"}</div>`;
  }

  async function disegnaChat() {
    const corpo = $("#hs-corpo");
    corpo.innerHTML = "";
    const m = await import("./bo/bo-assistenza.js");
    await m.render(corpo);
  }

  let tab = "entra";
  container.querySelectorAll(".hs-tabs button").forEach(b => b.onclick = () => {
    container.querySelectorAll(".hs-tabs button").forEach(x => x.classList.toggle("on", x === b));
    tab = b.dataset.t;
    if (tab === "entra") disegnaEntra(); else if (tab === "chat") disegnaChat(); else disegnaMie();
  });

  await disegnaAttiva();
  await disegnaEntra();
}
