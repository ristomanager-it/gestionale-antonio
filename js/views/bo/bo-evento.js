// js/views/bo/bo-evento.js
// Piattaforma → Evento: link tracciati (agenti e campagne) e gestione iscritti.
// Da qui si generano i link da mandare in giro e si vede chi porta chi.

const EVENTO = "serata-23-settembre-2026";
const BASE = (location.origin + location.pathname).replace(/index\.html$/, "");

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;

  container.innerHTML = `
    <div class="bo-evento" style="max-width:1100px;margin:0 auto;padding:18px 14px 60px;">
      <h1 style="font-size:24px;margin:0 0 4px;">Serata di presentazione</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">Mercoledì 23 settembre 2026 — Campo Antico</p>
      <div id="ev-tot" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:24px;"></div>
      <div id="ev-linkbox"></div>
      <div id="ev-lista" style="margin-top:30px;"></div>
    </div>
  `;

  await ricarica();

  async function ricarica() {
   try {
    const [{ data: inviti }, { data: iscritti }, { data: agenti }] = await Promise.all([
      supabase.from("evento_riepilogo_inviti").select("*").eq("evento_slug", EVENTO).order("iscritti", { ascending: false }),
      supabase.from("evento_iscrizioni").select("*").eq("evento_slug", EVENTO).order("created_at", { ascending: false }),
      supabase.from("agenti").select("id, nome, cognome").order("nome"),
    ]);
    disegnaTotali(iscritti || []);
    disegnaLink(inviti || [], agenti || []);
    disegnaIscritti(iscritti || []);
   } catch (e) {
    console.error("bo-evento:", e);
    document.getElementById("ev-lista").innerHTML =
      '<div style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:12px;padding:14px;font-size:14px;">'
      + 'Non sono riuscito a caricare i dati dell\'evento: ' + (e && e.message ? e.message : e) + '</div>';
   }
  }

  function disegnaTotali(righe) {
    const attive = righe.filter(r => r.stato !== "annullato");
    const persone = attive.reduce((t, r) => t + (r.persone || 1), 0);
    const dati = [
      ["Iscritti", attive.length],
      ["Persone attese", persone],
      ["Confermati", righe.filter(r => r.stato === "confermato").length],
      ["Presenti", righe.filter(r => r.stato === "presente").length],
      ["Fondatori chiusi", righe.filter(r => r.esito === "fondatore").length],
    ];
    document.getElementById("ev-tot").innerHTML = dati.map(([k, v]) => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#023C59;">${v}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">${k}</div>
      </div>`).join("");
  }

  function disegnaLink(inviti, agenti) {
    const opzAgenti = agenti.map(a => `<option value="${a.id}">${esc((a.nome || "") + " " + (a.cognome || ""))}</option>`).join("");
    document.getElementById("ev-linkbox").innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h2 style="font-size:17px;margin:0 0 12px;">Link di prenotazione</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 14px;">
          Un link per ogni agente e per ogni campagna: le iscrizioni che arrivano restano attribuite,
          così si sa chi porta chi e quanto rende ogni canale.</p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:18px;">
          <div style="flex:1;min-width:150px;">
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Etichetta</label>
            <input id="ev-new-label" placeholder="Es: Fabio Mecarelli / Campagna Meta agosto"
              style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          <div style="min-width:130px;">
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Tipo</label>
            <select id="ev-new-tipo" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;">
              <option value="agente">Agente</option>
              <option value="campagna">Campagna</option>
              <option value="diretto">Diretto</option>
            </select>
          </div>
          <div style="min-width:150px;" id="ev-wrap-agente">
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Agente</label>
            <select id="ev-new-agente" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;">
              <option value="">—</option>${opzAgenti}
            </select>
          </div>
          <div style="min-width:130px;display:none;" id="ev-wrap-canale">
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Canale</label>
            <select id="ev-new-canale" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;">
              <option value="meta">Meta</option><option value="google">Google</option>
              <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
              <option value="passaparola">Passaparola</option>
            </select>
          </div>
          <button id="ev-crea" style="background:#023C59;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer;">Crea link</button>
        </div>

        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">
              <th style="padding:8px 6px;">Chi</th><th>Tipo</th><th>Click</th><th>Iscritti</th>
              <th>Persone</th><th>Presenti</th><th>Fondatori</th><th>Link</th>
            </tr></thead>
            <tbody>
              ${inviti.length ? inviti.map(i => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:9px 6px;font-weight:600;">${esc(i.etichetta)}</td>
                  <td>${esc(i.tipo)}${i.canale && i.tipo === "campagna" ? " · " + esc(i.canale) : ""}</td>
                  <td>${i.click_count || 0}</td>
                  <td><b>${i.iscritti || 0}</b></td>
                  <td>${i.persone || 0}</td>
                  <td>${i.presenti || 0}</td>
                  <td>${i.fondatori || 0}</td>
                  <td><button class="ev-copia" data-cod="${esc(i.codice)}"
                        style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;">Copia</button></td>
                </tr>`).join("")
              : `<tr><td colspan="8" style="padding:16px;color:#94a3b8;">Ancora nessun link. Creane uno qui sopra.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    const tipo = document.getElementById("ev-new-tipo");
    tipo.addEventListener("change", () => {
      document.getElementById("ev-wrap-agente").style.display = tipo.value === "agente" ? "" : "none";
      document.getElementById("ev-wrap-canale").style.display = tipo.value === "campagna" ? "" : "none";
    });

    document.getElementById("ev-crea").addEventListener("click", async () => {
      const etichetta = document.getElementById("ev-new-label").value.trim();
      if (!etichetta) return alert("Serve un'etichetta per riconoscere il link.");
      const t = tipo.value;
      const codice = generaCodice(etichetta, inviti.map(i => i.codice));
      const riga = {
        evento_slug: EVENTO, codice, tipo: t, etichetta,
        agente_id: t === "agente" ? (document.getElementById("ev-new-agente").value || null) : null,
        canale: t === "campagna" ? document.getElementById("ev-new-canale").value : (t === "agente" ? "agente" : null),
      };
      if (t === "campagna") {
        riga.utm_source = riga.canale;
        riga.utm_medium = "cpc";
        riga.utm_campaign = codice.toLowerCase();
      }
      const { error } = await supabase.from("evento_inviti").insert(riga);
      if (error) return alert("Errore: " + error.message);
      document.getElementById("ev-new-label").value = "";
      await ricarica();
    });

    container.querySelectorAll(".ev-copia").forEach(b => {
      b.addEventListener("click", async () => {
        const url = BASE + "#/evento-serata?r=" + b.dataset.cod;
        try { await navigator.clipboard.writeText(url); b.textContent = "Copiato ✓"; }
        catch { prompt("Copia il link:", url); }
        setTimeout(() => { b.textContent = "Copia"; }, 1600);
      });
    });
  }

  function disegnaIscritti(righe) {
    const badge = (s) => {
      const c = { iscritto: "#64748b", confermato: "#0369a1", presente: "#15803d", no_show: "#b91c1c", annullato: "#94a3b8" }[s] || "#64748b";
      return `<span style="background:${c}1a;color:${c};border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;">${esc(s)}</span>`;
    };
    document.getElementById("ev-lista").innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h2 style="font-size:17px;margin:0 0 12px;">Iscritti (${righe.length})</h2>
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">
            <th style="padding:8px 6px;">Chi</th><th>Attività</th><th>Telefono</th><th>Pers.</th>
            <th>Da</th><th>Stato</th><th>Esito</th><th></th>
          </tr></thead>
          <tbody>
          ${righe.length ? righe.map(r => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:9px 6px;"><b>${esc(r.nome)}</b><div style="color:#94a3b8;font-size:11px;">${esc(r.locale || "")}</div></td>
              <td>${esc(r.tipo_attivita || "-")}<div style="color:#94a3b8;font-size:11px;">${esc(r.citta || "")}</div></td>
              <td><a href="https://wa.me/${(r.telefono || "").replace(/\D/g, "")}" target="_blank" rel="noopener" style="color:#0369a1;">${esc(r.telefono)}</a></td>
              <td>${r.persone}</td>
              <td>${esc(r.invitato_da || r.canale || "diretto")}</td>
              <td>${badge(r.stato)}</td>
              <td>
                <select class="ev-esito" data-id="${r.id}" style="border:1px solid #d1d5db;border-radius:6px;padding:3px;font-size:12px;">
                  <option value="">—</option>
                  <option value="fondatore"${r.esito === "fondatore" ? " selected" : ""}>Fondatore</option>
                  <option value="prova_attivata"${r.esito === "prova_attivata" ? " selected" : ""}>Prova attivata</option>
                  <option value="da_richiamare"${r.esito === "da_richiamare" ? " selected" : ""}>Da richiamare</option>
                  <option value="non_interessato"${r.esito === "non_interessato" ? " selected" : ""}>Non interessato</option>
                </select>
              </td>
              <td style="white-space:nowrap;">
                <button class="ev-stato" data-id="${r.id}" data-s="confermato" title="Conferma" style="border:1px solid #bae6fd;background:#f0f9ff;border-radius:6px;padding:4px 7px;cursor:pointer;">✓</button>
                <button class="ev-stato" data-id="${r.id}" data-s="presente" title="Presente in sala" style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:6px;padding:4px 7px;cursor:pointer;">🚪</button>
                <button class="ev-stato" data-id="${r.id}" data-s="no_show" title="Non venuto" style="border:1px solid #fecaca;background:#fef2f2;border-radius:6px;padding:4px 7px;cursor:pointer;">✕</button>
              </td>
            </tr>`).join("")
          : `<tr><td colspan="8" style="padding:16px;color:#94a3b8;">Nessun iscritto. Aggiungili tu man mano, oppure manda in giro un link.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>`;

    container.querySelectorAll(".ev-stato").forEach(b => {
      b.addEventListener("click", async () => {
        const patch = { stato: b.dataset.s };
        if (b.dataset.s === "confermato") patch.confermato_il = new Date().toISOString();
        if (b.dataset.s === "presente") patch.checkin_il = new Date().toISOString();
        const { error } = await supabase.from("evento_iscrizioni").update(patch).eq("id", b.dataset.id);
        if (error) return alert("Errore: " + error.message);
        await ricarica();
      });
    });
    container.querySelectorAll(".ev-esito").forEach(sel => {
      sel.addEventListener("change", async () => {
        await supabase.from("evento_iscrizioni").update({ esito: sel.value || null }).eq("id", sel.dataset.id);
        await ricarica();
      });
    });
  }
}

function generaCodice(etichetta, esistenti) {
  let base = etichetta.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "LINK";
  let cod = base, n = 1;
  while (esistenti.includes(cod)) { cod = base + (++n); }
  return cod;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
