// js/views/registro-supporto.js
// Piattaforma → Supporto tecnico: iscrizione dei tecnici, sessioni di accesso ai clienti
// e registro di tutto quello che hanno fatto (pagine, modifiche ai dati, note). Solo superadmin.
import { sb, esc } from "../utils/assistenza.js";

const quando = (ts) => new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const ICONE = { sessione_aperta: "🔑", sessione_chiusa: "🔒", pagina: "📄", modifica: "✏️", nota: "📝", operatore: "👤", query: "🔎" };

export async function render(container) {
  container.innerHTML = `
  <style>
    .rs{max-width:1200px;margin:0 auto;padding:16px 12px 60px;}
    .rs h1{font-size:22px;margin:0 0 4px;color:#023C59;}
    .rs .sub{color:#64748B;font-size:13px;margin-bottom:14px;}
    .rs-card{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:14px;margin-bottom:14px;}
    .rs-card h3{margin:0 0 10px;font-size:16px;color:#023C59;}
    .rs-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0;}
    .rs input,.rs select{border:1px solid #CBD5E1;border-radius:10px;padding:9px;font:inherit;font-size:14px;}
    .rs-btn{border:1px solid #CBD5E1;background:#fff;border-radius:10px;padding:9px 13px;font-weight:700;font-size:13px;cursor:pointer;color:#023C59;}
    .rs-btn.pri{background:#E66101;border-color:#E66101;color:#fff;}
    .rs-btn.ross{background:#DC2626;border-color:#DC2626;color:#fff;}
    .rs-s{padding:10px;border:1px solid #F1F5F9;border-radius:12px;margin:6px 0;cursor:pointer;}
    .rs-s:hover{background:#F8FAFC;}
    .rs-s.ap{border-color:#E66101;background:#FFF7ED;}
    .rs-ev{padding:8px 0;border-bottom:1px solid #F1F5F9;font-size:13.5px;}
    .rs-ev pre{white-space:pre-wrap;word-break:break-word;background:#F8FAFC;border-radius:8px;padding:8px;font-size:12px;margin:6px 0 0;max-height:220px;overflow:auto;}
    .rs-tag{display:inline-block;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:800;background:#E2E8F0;color:#334155;}
    .rs-grid{display:grid;grid-template-columns:380px 1fr;gap:14px;}
    @media (max-width:860px){.rs-grid{grid-template-columns:1fr;}}
  </style>
  <div class="rs">
    <h1>🛟 Supporto tecnico</h1>
    <div class="sub">I tecnici entrano nei clienti solo con un accesso a tempo e motivato. Qui vedi tutto quello che fanno.</div>

    <div class="rs-card">
      <h3>Tecnici</h3>
      <div id="rs-tec">…</div>
      <div class="rs-row" style="margin-top:10px;">
        <input id="rs-nome" placeholder="Nome e cognome" style="flex:1;min-width:150px;">
        <input id="rs-email" placeholder="email" type="email" style="flex:1;min-width:180px;">
        <button class="rs-btn pri" id="rs-iscrivi">➕ Iscrivi tecnico</button>
      </div>
      <div id="rs-esito" style="font-size:13px;margin-top:6px;"></div>
    </div>

    <div class="rs-grid">
      <div class="rs-card">
        <h3>Sessioni</h3>
        <div class="rs-row">
          <select id="rs-f-stato"><option value="">Tutte</option><option value="aperte">Solo aperte</option></select>
          <select id="rs-f-tec"><option value="">Tutti i tecnici</option></select>
        </div>
        <div id="rs-sess">…</div>
      </div>
      <div class="rs-card" id="rs-dett"><h3>Dettaglio</h3><div style="color:#94A3B8;">Scegli una sessione</div></div>
    </div>
    <div class="rs-card"><h3>Fuori dalle sessioni (letture del database, iscrizioni)</h3><div id="rs-fuori">…</div></div>
  </div>`;

  const $ = (s) => container.querySelector(s);
  let tecnici = [];

  async function caricaTecnici() {
    const { data } = await sb().from("assistenza_operatori").select("*").order("nome");
    tecnici = data || [];
    $("#rs-tec").innerHTML = tecnici.map(t => `
      <div class="rs-row"><span style="flex:1;">${esc(t.nome)}</span>
        <label style="font-size:13px;"><input type="checkbox" data-op="${t.user_id}" ${t.attivo ? "checked" : ""}> attivo</label></div>`).join("")
      || `<div style="color:#94A3B8;">Nessun tecnico iscritto</div>`;
    $("#rs-tec").querySelectorAll("[data-op]").forEach(c => c.onchange = async () => {
      await sb().from("assistenza_operatori").update({ attivo: c.checked }).eq("user_id", c.dataset.op);
      if (!c.checked) {
        // disattivato: se ha un accesso aperto, lo chiudo subito
        const { data: ap } = await sb().from("supporto_sessioni").select("id").eq("user_id", c.dataset.op).is("chiusa_at", null);
        for (const s of ap || []) await sb().rpc("supporto_chiudi_sessione", { p_esito: "Tecnico disattivato", p_sessione: s.id });
        caricaSessioni();
      }
    });
    $("#rs-f-tec").innerHTML = `<option value="">Tutti i tecnici</option>` + tecnici.map(t => `<option value="${t.user_id}">${esc(t.nome)}</option>`).join("");
  }

  $("#rs-iscrivi").onclick = async () => {
    const b = $("#rs-iscrivi"), out = $("#rs-esito");
    b.disabled = true; out.textContent = "Iscrivo…";
    const { data, error } = await sb().functions.invoke("invita-supporto", {
      body: { nome: $("#rs-nome").value, email: $("#rs-email").value },
    });
    b.disabled = false;
    if (error || !data?.ok) { out.innerHTML = `<span style="color:#DC2626;">${esc(data?.errore || error?.message || "Errore")}</span>`; return; }
    out.innerHTML = data.email_inviata
      ? `<span style="color:#16a34a;">✓ Iscritto. Gli è arrivata l'email per creare la password.</span>`
      : `<span style="color:#16a34a;">✓ Iscritto.</span> L'email non è partita: mandagli questo link su WhatsApp<br>
         <input readonly value="${esc(data.link_manuale || "")}" style="width:100%;margin-top:6px;" onclick="this.select()">`;
    if (data.accessi_fissi) out.innerHTML += `<div style="color:#DC2626;margin-top:6px;">⚠️ Questo account ha già ${data.accessi_fissi} accessi fissi ad aziende: vanno tolti, altrimenti lì lavora senza registro.</div>`;
    $("#rs-nome").value = ""; $("#rs-email").value = "";
    caricaTecnici();
  };

  async function caricaSessioni() {
    let q = sb().from("supporto_sessioni").select("*").order("aperta_at", { ascending: false }).limit(100);
    if ($("#rs-f-stato").value === "aperte") q = q.is("chiusa_at", null);
    if ($("#rs-f-tec").value) q = q.eq("user_id", $("#rs-f-tec").value);
    const { data } = await q;
    $("#rs-sess").innerHTML = (data || []).map(s => `
      <div class="rs-s ${s.chiusa_at ? "" : "ap"}" data-id="${s.id}">
        <b>${esc(s.azienda_nome || "")}</b> · ${esc(s.operatore_nome || "")}
        ${s.chiusa_at ? "" : `<span class="rs-tag" style="background:#E66101;color:#fff;">aperta</span>`}
        <span class="rs-tag">${esc(s.livello)}</span><br>
        <small style="color:#64748B;">${quando(s.aperta_at)} · ${esc(s.motivo).slice(0, 90)}</small>
      </div>`).join("") || `<div style="color:#94A3B8;">Nessuna sessione</div>`;
    $("#rs-sess").querySelectorAll(".rs-s").forEach(el => el.onclick = () => dettaglio(data.find(x => x.id === el.dataset.id)));
  }
  $("#rs-f-stato").onchange = caricaSessioni;
  $("#rs-f-tec").onchange = caricaSessioni;

  async function dettaglio(s) {
    const box = $("#rs-dett");
    box.innerHTML = `<h3>${esc(s.azienda_nome || "")} · ${esc(s.operatore_nome || "")}</h3>Caricamento…`;
    const { data: ev } = await sb().from("supporto_registro").select("*").eq("sessione_id", s.id).order("id");
    const n = (t) => (ev || []).filter(e => e.tipo === t).length;
    box.innerHTML = `
      <h3>${esc(s.azienda_nome || "")} · ${esc(s.operatore_nome || "")}</h3>
      <div style="font-size:14px;line-height:1.5;">
        <b>Motivo:</b> ${esc(s.motivo)}<br>
        <b>Livello:</b> ${esc(s.livello)} · <b>Aperta:</b> ${quando(s.aperta_at)} ·
        ${s.chiusa_at ? `<b>Chiusa:</b> ${quando(s.chiusa_at)} (${esc(s.chiusa_motivo || "")})` : `<b style="color:#E66101;">aperta fino alle ${quando(s.scade_at)}</b>`}<br>
        ${s.esito ? `<b>Esito:</b> ${esc(s.esito)}<br>` : ""}
        📄 ${n("pagina")} pagine · ✏️ ${n("modifica")} modifiche · 🔎 ${n("query")} letture · 📝 ${n("nota")} note
      </div>
      ${s.chiusa_at ? "" : `<div class="rs-row" style="margin-top:8px;"><button class="rs-btn ross" id="rs-revoca">⛔ Revoca subito</button></div>`}
      <div style="margin-top:10px;">${(ev || []).map(evento).join("")}</div>`;
    const r = box.querySelector("#rs-revoca");
    if (r) r.onclick = async () => {
      if (!confirm("Chiudere subito l'accesso del tecnico?")) return;
      const { error } = await sb().rpc("supporto_chiudi_sessione", { p_esito: "Revocata dal superadmin", p_sessione: s.id });
      if (error) return alert(error.message);
      await caricaSessioni();
      const { data: agg } = await sb().from("supporto_sessioni").select("*").eq("id", s.id).maybeSingle();
      if (agg) dettaglio(agg);
    };
  }

  function evento(e) {
    const ic = ICONE[e.tipo] || "•";
    const d = e.dettaglio || {};
    let testo = "";
    if (e.tipo === "pagina") testo = `ha aperto <b>${esc(d.route || d.hash || "")}</b>`;
    else if (e.tipo === "nota") testo = `nota: ${esc(d.testo || "")}`;
    else if (e.tipo === "query") testo = `${d.rifiutata ? "<b style='color:#DC2626;'>query rifiutata</b>" : "ha letto il database"}<pre>${esc(d.sql || "")}</pre>`;
    else if (e.tipo === "sessione_aperta") testo = `entrato · ${esc(d.motivo || "")}`;
    else if (e.tipo === "sessione_chiusa") testo = `uscito · ${esc(d.motivo_chiusura || "")}${d.esito ? " · " + esc(d.esito) : ""} · ${d.durata_min ?? "?"} min`;
    else if (e.tipo === "modifica") {
      const op = { INSERT: "ha aggiunto", UPDATE: "ha modificato", DELETE: "ha cancellato" }[e.operazione] || e.operazione;
      testo = `${op} in <b>${esc(e.tabella || "")}</b>${e.record_id ? ` (id ${esc(e.record_id)})` : ""}
        <pre>${esc(JSON.stringify(d, null, 1))}</pre>`;
    } else testo = esc(JSON.stringify(d));
    return `<div class="rs-ev">${ic} <small style="color:#64748B;">${quando(e.created_at)}</small> ${testo}</div>`;
  }

  async function caricaFuori() {
    const { data } = await sb().from("supporto_registro").select("*").is("sessione_id", null)
      .order("id", { ascending: false }).limit(60);
    $("#rs-fuori").innerHTML = (data || []).map(e => `<div style="font-size:12px;color:#023C59;font-weight:700;margin-top:6px;">${esc(e.operatore_nome || "")}</div>` + evento(e)).join("")
      || `<div style="color:#94A3B8;">Niente</div>`;
  }

  await caricaTecnici();
  await caricaSessioni();
  await caricaFuori();
}
