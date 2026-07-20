// FILE: js/views/bo/alert-haccp-config.js
// Configurazione destinatari alert HACCP (manager per sede) + soglia margine ritardo.
import { createPageLayout, createCard } from "../../utils/pageLayout.js";

const supa = () => window.supabaseClient || window.supabase;

let sedi = [];
let manager = [];       // manager/admin dell'azienda con nome+telefono
let assoc = [];         // righe alert_manager_sede

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>'; return; }

  container.innerHTML = createPageLayout({
    title: "🔔 Avvisi HACCP — Manager per sede",
    subtitle: "Chi riceve gli avvisi di ritardo nelle fasi di produzione, sede per sede.",
    cards: [
      createCard({
        title: "Destinatari per sede",
        body: `
          <div style="font-size:13px;color:#64748b;margin-bottom:12px;">
            Per ogni sede scegli i manager che devono ricevere gli avvisi quando una fase
            (cottura, abbattimento, ecc.) non viene firmata entro il tempo previsto + margine.
          </div>
          <div id="ahc-wrap">Caricamento…</div>
        `
      })
    ]
  });

  await Promise.all([loadSedi(aziendaId), loadManager(aziendaId), loadAssoc(aziendaId)]);
  renderTabella();
}

async function loadSedi(aziendaId) {
  const { data } = await supa().from("sedi").select("id, nome").eq("azienda_id", aziendaId).order("nome");
  sedi = data || [];
}

async function loadManager(aziendaId) {
  // manager/admin dell'azienda con nome+telefono da dipendenti
  const { data: ua } = await supa().from("utenti_aziende")
    .select("user_id, ruolo").eq("azienda_id", aziendaId)
    .in("ruolo", ["manager", "manager_cucina", "admin"]);
  const ids = [...new Set((ua || []).map(u => u.user_id))];
  let dip = [];
  if (ids.length) {
    const { data } = await supa().from("dipendenti")
      .select("user_id, nome, cognome, telefono").in("user_id", ids);
    dip = data || [];
  }
  const ruoloDi = {};
  (ua || []).forEach(u => { ruoloDi[u.user_id] = u.ruolo; });
  const seen = new Set();
  manager = [];
  (dip.length ? dip : ids.map(id => ({ user_id: id }))).forEach(d => {
    if (seen.has(d.user_id)) return;
    seen.add(d.user_id);
    manager.push({
      user_id: d.user_id,
      nome: [d.nome, d.cognome].filter(Boolean).join(" ") || "(senza nome)",
      telefono: d.telefono || "",
      ruolo: ruoloDi[d.user_id] || ""
    });
  });
}

async function loadAssoc(aziendaId) {
  const { data } = await supa().from("alert_manager_sede")
    .select("*").eq("azienda_id", aziendaId);
  assoc = data || [];
}

function isAttivo(sedeUuid, userId) {
  return assoc.some(a => String(a.sede_uuid) === String(sedeUuid) && String(a.user_id) === String(userId) && a.attivo);
}

function renderTabella() {
  const wrap = document.getElementById("ahc-wrap");
  if (!wrap) return;
  if (!sedi.length) { wrap.innerHTML = '<div style="color:#94a3b8;">Nessuna sede.</div>'; return; }
  if (!manager.length) { wrap.innerHTML = '<div style="color:#94a3b8;">Nessun manager trovato (verifica ruoli e anagrafiche).</div>'; return; }

  let html = "";
  for (const s of sedi) {
    html += `<div style="margin-bottom:18px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#0E5A7A;color:#fff;padding:10px 14px;font-weight:700;">🏢 ${escapeHtml(s.nome)}</div>
      <div style="padding:12px 14px;display:flex;flex-direction:column;gap:8px;">`;
    for (const m of manager) {
      const on = isAttivo(s.id, m.user_id);
      const noTel = !m.telefono;
      html += `
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:6px 8px;border-radius:8px;${on ? "background:#ecfdf5;" : ""}">
          <input type="checkbox" class="ahc-chk" data-sede="${escapeAttr(s.id)}" data-user="${escapeAttr(m.user_id)}" data-nome="${escapeAttr(m.nome)}" data-tel="${escapeAttr(m.telefono)}" ${on ? "checked" : ""} style="width:18px;height:18px;">
          <span style="flex:1;">
            <strong>${escapeHtml(m.nome)}</strong>
            <span style="font-size:12px;color:#64748b;"> · ${escapeHtml(m.ruolo)}</span>
            ${noTel ? '<span style="font-size:11px;color:#b45309;"> · ⚠️ nessun telefono (niente WhatsApp)</span>' : `<span style="font-size:12px;color:#94a3b8;"> · ${escapeHtml(m.telefono)}</span>`}
          </span>
        </label>`;
    }
    html += `</div></div>`;
  }
  wrap.innerHTML = html;

  wrap.querySelectorAll(".ahc-chk").forEach(chk => {
    chk.addEventListener("change", () => toggleAssoc(chk));
  });
}

async function toggleAssoc(chk) {
  const aziendaId = window.state?.azienda?.id;
  const sedeUuid = chk.dataset.sede;
  const userId = chk.dataset.user;
  const nome = chk.dataset.nome;
  const tel = chk.dataset.tel;

  chk.disabled = true;
  try {
    if (chk.checked) {
      // se esiste disattivata la riattivo, altrimenti creo
      const esistente = assoc.find(a => String(a.sede_uuid) === String(sedeUuid) && String(a.user_id) === String(userId));
      if (esistente) {
        await supa().from("alert_manager_sede").update({ attivo: true, telefono: tel, nome }).eq("id", esistente.id);
        esistente.attivo = true; esistente.telefono = tel; esistente.nome = nome;
      } else {
        const { data } = await supa().from("alert_manager_sede").insert({
          azienda_id: aziendaId, sede_uuid: sedeUuid, user_id: userId,
          nome, telefono: tel, riceve_whatsapp: !!tel, riceve_inapp: true, attivo: true
        }).select().single();
        if (data) assoc.push(data);
      }
      chk.closest("label").style.background = "#ecfdf5";
    } else {
      const esistente = assoc.find(a => String(a.sede_uuid) === String(sedeUuid) && String(a.user_id) === String(userId));
      if (esistente) {
        await supa().from("alert_manager_sede").update({ attivo: false }).eq("id", esistente.id);
        esistente.attivo = false;
      }
      chk.closest("label").style.background = "";
    }
  } catch (e) {
    alert("Errore salvataggio: " + (e.message || "sconosciuto"));
    chk.checked = !chk.checked;
  } finally {
    chk.disabled = false;
  }
}

function escapeHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }
