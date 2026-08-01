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
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">Mercoledì 23 settembre 2026 — Campo Antico, Orte</p>
      <div id="ev-tot" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;"></div>
      <div id="ev-cfg" style="margin-bottom:24px;"></div>
      <div id="ev-linkbox"></div>
      <div id="ev-aggiungi" style="margin-top:30px;"></div>
      <div id="ev-lista" style="margin-top:20px;"></div>
    </div>
  `;

  await ricarica();

  async function ricarica() {
   try {
    const [{ data: inviti }, { data: iscritti }, { data: agenti }, { data: cfg }] = await Promise.all([
      supabase.from("evento_riepilogo_inviti").select("*").eq("evento_slug", EVENTO).order("iscritti", { ascending: false }),
      supabase.from("evento_iscrizioni").select("*").eq("evento_slug", EVENTO).order("created_at", { ascending: false }),
      supabase.from("agenti").select("id, nome, cognome").order("nome"),
      supabase.from("evento_config").select("*").eq("evento_slug", EVENTO).maybeSingle(),
    ]);
    disegnaTotali(iscritti || []);
    disegnaConfig(cfg || null, iscritti || []);
    disegnaLink(inviti || [], agenti || []);
    disegnaAggiungi();
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
      ["Richieste da valutare", righe.filter(r => r.stato === "richiesta").length],
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

  function disegnaConfig(cfg, righe) {
    if (!cfg) return;
    const occupati = righe.filter(r => ["richiesta","iscritto","confermato","presente"].includes(r.stato))
                          .reduce((t, r) => t + (r.persone || 1), 0);
    const liberiPubblico = Math.max(cfg.capienza - (cfg.posti_riservati || 0) - occupati, 0);
    document.getElementById("ev-cfg").innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;">
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;">
          <div style="min-width:120px;">
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Capienza sala</label>
            <input id="ev-cap" type="number" min="1" value="${cfg.capienza}"
              style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          <div style="min-width:150px;">
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Posti tenuti da parte</label>
            <input id="ev-ris" type="number" min="0" value="${cfg.posti_riservati || 0}"
              style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          <button id="ev-salva-cfg" style="background:#023C59;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer;">Salva</button>
          <label style="font-size:13px;display:flex;align-items:center;gap:7px;margin-bottom:9px;">
            <input type="checkbox" id="ev-chiuso" ${cfg.chiuso ? "checked" : ""}> Chiudi le richieste
          </label>
        </div>
        <p style="font-size:12.5px;color:#64748b;margin:12px 0 0;line-height:1.5;">
          I posti tenuti da parte sono quelli che inviti personalmente tu (agenti, fornitori, ospiti):
          restano fuori dal conteggio pubblico, quindi la pagina mostra <b>${liberiPubblico}</b> coperti
          ancora richiedibili invece di ${Math.max(cfg.capienza - occupati, 0)}.
        </p>
      </div>`;

    document.getElementById("ev-salva-cfg").addEventListener("click", async () => {
      const { error } = await supabase.from("evento_config").update({
        capienza: parseInt(document.getElementById("ev-cap").value, 10) || cfg.capienza,
        posti_riservati: parseInt(document.getElementById("ev-ris").value, 10) || 0,
        chiuso: document.getElementById("ev-chiuso").checked,
        aggiornato_il: new Date().toISOString(),
      }).eq("evento_slug", EVENTO);
      if (error) return alert("Errore: " + error.message);
      await ricarica();
    });
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

  function disegnaAggiungi() {
    document.getElementById("ev-aggiungi").innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h2 style="font-size:17px;margin:0 0 6px;">Aggiungi una prenotazione a mano</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 14px;">
          Per chi inviti tu a voce: entra come già confermato e occupa il posto come tutti gli altri.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;align-items:end;">
          <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Nome *</label>
            <input id="am-nome" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;"></div>
          <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Locale</label>
            <input id="am-locale" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;"></div>
          <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Telefono</label>
            <input id="am-tel" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;"></div>
          <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Coperti</label>
            <input id="am-cop" type="number" min="1" value="2" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;"></div>
          <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Invitato da</label>
            <input id="am-da" placeholder="Antonio" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;"></div>
          <button id="am-salva" style="background:#023C59;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer;">Aggiungi</button>
        </div>
        <div id="am-esito" style="font-size:13px;margin-top:10px;"></div>
      </div>`;

    document.getElementById("am-salva").addEventListener("click", async () => {
      const nome = document.getElementById("am-nome").value.trim();
      if (!nome) return alert("Serve almeno il nome.");
      const riga = {
        evento_slug: EVENTO,
        nome,
        locale: document.getElementById("am-locale").value.trim() || null,
        telefono: document.getElementById("am-tel").value.trim() || "-",
        persone: parseInt(document.getElementById("am-cop").value, 10) || 1,
        invitato_da: document.getElementById("am-da").value.trim() || "Antonio",
        fonte: "invito diretto",
        stato: "confermato",
        confermato_il: new Date().toISOString(),
      };
      const { error } = await supabase.from("evento_iscrizioni").insert(riga);
      const esito = document.getElementById("am-esito");
      if (error) { esito.style.color = "#b91c1c"; esito.textContent = "Errore: " + error.message; return; }
      ["am-nome", "am-locale", "am-tel", "am-da"].forEach(id => { document.getElementById(id).value = ""; });
      await ricarica();
    });
  }

  function disegnaIscritti(righe) {
    const badge = (s) => {
      const c = { richiesta: "#b45309", iscritto: "#64748b", confermato: "#0369a1", presente: "#15803d", no_show: "#b91c1c", annullato: "#94a3b8", rifiutato: "#94a3b8" }[s] || "#64748b";
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
              <td>${esc(r.tipo_attivita || "-")}<div style="color:#94a3b8;font-size:11px;">${esc(r.citta || "")}${r.partita_iva ? " · " + esc(r.partita_iva) : ""}</div></td>
              <td>
                <a href="${waLink(r)}" target="_blank" rel="noopener"
                   style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;border-radius:6px;padding:5px 9px;font-size:12px;font-weight:700;">💬 ${r.stato === "richiesta" ? "Conferma" : "Scrivi"}</a>
                <div style="color:#94a3b8;font-size:11px;margin-top:3px;">${esc(r.telefono)}</div>
              </td>
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
                <button class="ev-stato" data-id="${r.id}" data-s="confermato" title="Accetta la richiesta" style="border:1px solid #bae6fd;background:#f0f9ff;border-radius:6px;padding:4px 7px;cursor:pointer;">✓</button>
                <button class="ev-stato" data-id="${r.id}" data-s="rifiutato" title="Rifiuta" style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:6px;padding:4px 7px;cursor:pointer;">✕</button>
                <button class="ev-stato" data-id="${r.id}" data-s="presente" title="Presente in sala" style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:6px;padding:4px 7px;cursor:pointer;">🚪</button>
                <button class="ev-stato" data-id="${r.id}" data-s="no_show" title="Non venuto" style="border:1px solid #fecaca;background:#fef2f2;border-radius:6px;padding:4px 7px;cursor:pointer;">🚫</button>
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

function waLink(r) {
  const tel = (r.telefono || "").replace(/\D/g, "");
  const numero = tel.startsWith("39") ? tel : ("39" + tel.replace(/^0+/, ""));
  const link = BASE + "#/evento-prenotazione?t=" + r.token_pubblico;
  const cop = r.persone === 1 ? "1 coperto" : r.persone + " coperti";
  const nome = (r.nome || "").split(" ")[0];

  let testo;
  if (r.stato === "richiesta") {
    testo = `Ciao ${nome}, sono Antonio Carullo.\n\n`
      + `Ti confermo il posto per mercoledì 23 settembre, dalle 19:30, a Campo Antico di Orte — ${cop} a nome tuo.\n\n`
      + `Qui trovi tutto, mappa compresa: ${link}\n\n`
      + `Alla cena pensiamo noi, tu porta solo la fame. A presto!`;
  } else {
    testo = `Ciao ${nome}, sono Antonio.\n\n`
      + `Ci vediamo mercoledì 23 settembre dalle 19:30 a Campo Antico, Orte — ${cop} a nome tuo.\n\n`
      + `Tutti i dettagli qui: ${link}`;
  }
  return "https://wa.me/" + numero + "?text=" + encodeURIComponent(testo);
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
