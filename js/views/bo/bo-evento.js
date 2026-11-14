// js/views/bo/bo-evento.js
// Piattaforma → Evento: link tracciati (agenti e campagne) e gestione iscritti.
// Da qui si generano i link da mandare in giro e si vede chi porta chi.

const EVENTO = "serata-23-settembre-2026";

// data della serata: si legge da evento_config in ricarica(), niente date scritte nel codice
let DATA_EV = new Date("2027-01-18T19:30:00+01:00");
function dataEv(o) { return DATA_EV.toLocaleString("it-IT", Object.assign({ timeZone: "Europe/Rome" }, o)); }
function giornoEv() { return dataEv({ weekday: "long", day: "numeric", month: "long" }); }
function oraEv() { return dataEv({ hour: "2-digit", minute: "2-digit" }); }
const BASE = (location.origin + location.pathname).replace(/index\.html$/, "");

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;

  container.innerHTML = `
    <div class="bo-evento" style="max-width:1100px;margin:0 auto;padding:18px 14px 60px;">
      <h1 style="font-size:24px;margin:0 0 4px;">Serata di presentazione</h1>
      <p id="ev-data" style="color:#64748b;font-size:14px;margin:0 0 20px;">&nbsp;</p>
      <div id="ev-tot" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;"></div>
      <div id="ev-cfg" style="margin-bottom:24px;"></div>
      <div id="ev-fondatore" style="margin-bottom:24px;"></div>
      <div id="ev-linkbox"></div>
      <div id="ev-promemoria" style="margin-top:24px;"></div>
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
    if (cfg && cfg.data_ora) DATA_EV = new Date(cfg.data_ora);
    const elData = document.getElementById("ev-data");
    if (elData) {
      const g = dataEv({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
      elData.textContent = g.charAt(0).toUpperCase() + g.slice(1) + " — " + ((cfg && cfg.luogo) || "Campo Antico, Orte");
    }
    disegnaTotali(iscritti || []);
    disegnaConfig(cfg || null, iscritti || []);
    disegnaLink(inviti || [], agenti || []);
    disegnaPromemoria(iscritti || [], cfg || null);
    disegnaAggiungi();
    disegnaIscritti(iscritti || []);
    disegnaFondatore();
   } catch (e) {
    console.error("bo-evento:", e);
    document.getElementById("ev-lista").innerHTML =
      '<div style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:12px;padding:14px;font-size:14px;">'
      + 'Non sono riuscito a caricare i dati dell\'evento: ' + (e && e.message ? e.message : e) + '</div>';
   }
  }

  // Posto Fondatore: link e QR della pagina pubblica (generale o per agente), richieste, azienda collegata
  async function disegnaFondatore() {
    const box = document.getElementById("ev-fondatore");
    if (!box) return;
    const BASE_FO = "https://app.ristoflow-ai.com/fondatore.html";
    const [{ data: ric, error }, { data: ags }, { data: azs }] = await Promise.all([
      supabase.from("fondatori_richieste").select("*").order("created_at", { ascending: false }),
      supabase.from("agenti").select("id, nome, cognome").order("nome"),
      supabase.from("aziende").select("id, nome").order("nome"),
    ]);
    if (error) { box.innerHTML = '<div style="color:#b91c1c;font-size:14px;">Richieste Fondatore non leggibili: ' + esc(error.message) + '</div>'; return; }
    const righe = (ric || []).filter(r => r.note !== "prova tecnica");
    const agenti = ags || [];
    const nomeAg = {}; agenti.forEach(a => { nomeAg[a.id] = ((a.nome || "") + " " + (a.cognome || "")).trim(); });
    const nomeAz = {}; (azs || []).forEach(a => { nomeAz[a.id] = a.nome; });
    const pagati = righe.filter(r => r.stato === "pagato").length;
    const attesa = righe.filter(r => r.stato === "in_attesa_pagamento" || r.stato === "da_verificare").length;
    const STATI = { da_verificare: "Da verificare", in_attesa_pagamento: "In attesa di pagamento", pagato: "Pagato", annullato: "Annullato" };
    const COL = { pagato: "#059669", annullato: "#94a3b8" };
    const opzAz = (azs || []).map(a => '<option value="' + a.id + '">' + esc(a.nome) + '</option>').join("");
    box.innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
          <div style="flex:1;min-width:240px;">
            <div style="font-size:17px;font-weight:800;color:#023C59;">👑 Posto Fondatore</div>
            <div style="font-size:13px;color:#64748b;margin:2px 0 10px;">${pagati} pagati · ${attesa} in attesa · ogni agente ha il suo QR: la richiesta arriva legata a lui</div>
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">QR di</label>
            <select id="fo-chi" style="width:100%;max-width:320px;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;margin-bottom:8px;">
              <option value="">Ristoflow (la serata, senza agente)</option>
              ${agenti.map(a => '<option value="' + String(a.id).slice(0, 8) + '">' + esc(nomeAg[a.id]) + '</option>').join("")}
            </select>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <input id="fo-link" readonly style="flex:1;min-width:200px;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;">
              <button id="fo-copia" style="background:#023C59;color:#fff;border:none;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer;">Copia link</button>
              <a id="fo-apri" target="_blank" rel="noopener" style="border:1.5px solid #023C59;color:#023C59;border-radius:8px;padding:8px 14px;font-weight:700;text-decoration:none;">Apri</a>
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:6px;">Ogni agente trova il suo QR anche nella sua home, scheda Materiali.</div>
          </div>
          <div style="text-align:center;">
            <div id="fo-qr" style="background:#fff;padding:8px;border:1px solid #e5e7eb;border-radius:10px;display:inline-block;min-width:176px;min-height:176px;"></div>
            <div><button id="fo-scarica" style="margin-top:6px;background:none;border:none;color:#023C59;font-weight:700;cursor:pointer;">⬇️ Scarica QR</button></div>
          </div>
        </div>
        <div style="overflow-x:auto;margin-top:14px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">
              <th style="padding:8px 6px;">Locale</th><th>Titolare</th><th>Contatti</th><th>Metodo</th><th>Agente</th><th>Stato</th><th>Azienda</th><th></th>
            </tr></thead>
            <tbody>
              ${righe.length ? righe.map(r => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:9px 6px;font-weight:700;">${esc(r.nome_locale)}<div style="font-weight:400;color:#64748b;font-size:12px;">${esc(r.citta || "")}${r.piva ? " · P.IVA " + esc(r.piva) : ""}</div></td>
                  <td>${esc(r.titolare)}</td>
                  <td>${esc(r.telefono)}<div style="color:#64748b;font-size:12px;">${esc(r.email)}</div></td>
                  <td>${r.metodo === "carta" ? "💳 Carta" : "🏦 Bonifico"}</td>
                  <td>${r.agente_id ? esc(nomeAg[r.agente_id] || "Agente") : (r.agente_ref ? '<span title="codice non riconosciuto" style="color:#b45309;">' + esc(r.agente_ref) + ' ?</span>' : "—")}</td>
                  <td style="font-weight:700;color:${COL[r.stato] || "#b45309"};">${STATI[r.stato] || esc(r.stato)}${r.pagato_il ? '<div style="font-weight:400;color:#64748b;font-size:12px;">' + new Date(r.pagato_il).toLocaleDateString("it-IT") + '</div>' : ""}</td>
                  <td>${r.azienda_id ? esc(nomeAz[r.azienda_id] || "collegata") : (r.stato === "pagato" ? '<select data-fo-azienda="' + r.id + '" style="max-width:180px;padding:5px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;"><option value="">Collega azienda…</option>' + opzAz + '</select>' : "—")}</td>
                  <td style="white-space:nowrap;">
                    ${r.stato !== "pagato" && r.stato !== "annullato" ? `<button data-fo-pagato="${r.id}" style="background:#059669;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px;">${r.metodo === "bonifico" ? "Bonifico arrivato" : "Segna pagato"}</button>
                    <button data-fo-annulla="${r.id}" style="background:none;border:1px solid #cbd5e1;border-radius:6px;padding:5px 8px;cursor:pointer;font-size:12px;">Annulla</button>` : ""}
                  </td>
                </tr>`).join("") : '<tr><td colspan="8" style="padding:12px 6px;color:#64748b;">Nessuna richiesta per ora.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;

    const qrEl = document.getElementById("fo-qr");
    const linkAttuale = () => { const c = document.getElementById("fo-chi").value; return c ? BASE_FO + "?ag=" + c : BASE_FO; };
    const disegnaQR = () => {
      if (!window.QRCode) { setTimeout(disegnaQR, 300); return; }
      const l = linkAttuale();
      document.getElementById("fo-link").value = l;
      document.getElementById("fo-apri").href = l;
      qrEl.innerHTML = "";
      new window.QRCode(qrEl, { text: l + (l.indexOf("?") > 0 ? "&" : "?") + "qr=1", width: 160, height: 160, correctLevel: window.QRCode.CorrectLevel.M });
    };
    disegnaQR();
    document.getElementById("fo-chi").onchange = disegnaQR;
    document.getElementById("fo-scarica").onclick = () => {
      if (!window.QRCode) return;
      const l = linkAttuale();
      const tmp = document.createElement("div");
      new window.QRCode(tmp, { text: l + (l.indexOf("?") > 0 ? "&" : "?") + "qr=1", width: 1024, height: 1024, correctLevel: window.QRCode.CorrectLevel.M });
      setTimeout(() => {
        const c = tmp.querySelector("canvas"); const im = tmp.querySelector("img");
        const a = document.createElement("a");
        a.href = c ? c.toDataURL("image/png") : (im ? im.src : "");
        const sel = document.getElementById("fo-chi");
        a.download = "qr-fondatore-" + (sel.value ? sel.options[sel.selectedIndex].text.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "ristoflow") + ".png";
        a.click();
      }, 200);
    };
    document.getElementById("fo-copia").onclick = async () => {
      try { await navigator.clipboard.writeText(linkAttuale()); document.getElementById("fo-copia").textContent = "Copiato ✓"; }
      catch (e) { document.getElementById("fo-link").select(); }
    };
    box.querySelectorAll("[data-fo-pagato]").forEach(b => b.onclick = async () => {
      if (!confirm("Confermi che il pagamento è arrivato? Il posto Fondatore diventa suo.")) return;
      const { error } = await supabase.from("fondatori_richieste").update({ stato: "pagato", pagato_il: new Date().toISOString() }).eq("id", b.dataset.foPagato);
      if (error) alert(error.message); else disegnaFondatore();
    });
    box.querySelectorAll("[data-fo-annulla]").forEach(b => b.onclick = async () => {
      if (!confirm("Annullare questa richiesta?")) return;
      const { error } = await supabase.from("fondatori_richieste").update({ stato: "annullato" }).eq("id", b.dataset.foAnnulla);
      if (error) alert(error.message); else disegnaFondatore();
    });
    box.querySelectorAll("[data-fo-azienda]").forEach(sel => sel.onchange = async () => {
      if (!sel.value) return;
      if (!confirm("Collego questa richiesta all'azienda scelta? L'azienda prende l'agente e il piano Fondatore, se non li ha già.")) { sel.value = ""; return; }
      const { error } = await supabase.rpc("fondatore_collega_azienda", { p_richiesta: sel.dataset.foAzienda, p_azienda: sel.value });
      if (error) alert(error.message); else disegnaFondatore();
    });
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

  function disegnaPromemoria(righe, cfg) {
    const box = document.getElementById("ev-promemoria");
    const quando = cfg && cfg.data_ora ? new Date(cfg.data_ora) : DATA_EV;
    const oreMancanti = (quando - Date.now()) / 3600000;

    // fase attiva: 48h prima, poi 24h prima
    const fase = oreMancanti <= 26 ? "24h" : (oreMancanti <= 50 ? "48h" : null);
    const campo = fase === "24h" ? "promemoria_24h_il" : "promemoria_48h_il";

    const attesi = righe.filter(r => ["confermato", "iscritto"].includes(r.stato));
    const daFare = fase ? attesi.filter(r => !r[campo]) : [];
    const fatti = fase ? attesi.filter(r => r[campo]).length : 0;

    if (!fase) {
      const giorni = Math.max(Math.ceil(oreMancanti / 24), 0);
      box.innerHTML = `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;">
          <h2 style="font-size:17px;margin:0 0 6px;">Promemoria</h2>
          <p style="font-size:13px;color:#64748b;margin:0;line-height:1.55;">
            Si accendono da soli due giorni prima: prima tornata a <b>48 ore</b>, seconda a <b>24 ore</b>.
            Mancano ${giorni} giorni. Chi conferma da qui in poi entra in lista in automatico.</p>
        </div>`;
      return;
    }

    box.innerHTML = `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:16px 18px;">
        <h2 style="font-size:17px;margin:0 0 6px;">Promemoria ${fase} — ${daFare.length} da mandare</h2>
        <p style="font-size:13px;color:#92400e;margin:0 0 12px;line-height:1.55;">
          ${fatti} già mandati. Ogni pulsante apre WhatsApp col messaggio pronto e segna l'invio.</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${daFare.length ? daFare.map(r => `
            <a class="ev-prom" data-id="${r.id}" data-campo="${campo}" href="${waPromemoria(r, fase)}"
               target="_blank" rel="noopener"
               style="background:#25D366;color:#fff;text-decoration:none;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:700;">
              💬 ${esc((r.nome || "").split(" ")[0])} · ${r.persone}</a>`).join("")
            : `<span style="font-size:14px;color:#15803d;font-weight:600;">Tutti avvisati ✓</span>`}
        </div>
      </div>`;

    container.querySelectorAll(".ev-prom").forEach(a => {
      a.addEventListener("click", async () => {
        const patch = {}; patch[a.dataset.campo] = new Date().toISOString();
        await supabase.from("evento_iscrizioni").update(patch).eq("id", a.dataset.id);
        setTimeout(ricarica, 1200);
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
      + `Ti confermo il posto per ${giornoEv()}, dalle ${oraEv()}, a Campo Antico di Orte — ${cop} a nome tuo.\n\n`
      + `Qui trovi tutto, mappa compresa: ${link}\n\n`
      + `Alla cena pensiamo noi, tu porta solo la fame. A presto!`;
  } else {
    testo = `Ciao ${nome}, sono Antonio.\n\n`
      + `Ci vediamo ${giornoEv()} dalle ${oraEv()} a Campo Antico, Orte — ${cop} a nome tuo.\n\n`
      + `Tutti i dettagli qui: ${link}`;
  }
  return "https://wa.me/" + numero + "?text=" + encodeURIComponent(testo);
}

function waPromemoria(r, fase) {
  const tel = (r.telefono || "").replace(/\D/g, "");
  const numero = tel.startsWith("39") ? tel : ("39" + tel.replace(/^0+/, ""));
  const link = BASE + "#/evento-prenotazione?t=" + r.token_pubblico;
  const cop = r.persone === 1 ? "1 coperto" : r.persone + " coperti";
  const nome = (r.nome || "").split(" ")[0];

  const testo = fase === "24h"
    ? `Ciao ${nome}, ci vediamo domani sera dalle ${oraEv()} a Campo Antico, Orte — ${cop} a nome tuo.\n\n`
      + `Mappa e dettagli qui: ${link}\n\nA domani!`
    : `Ciao ${nome}, ci siamo: dopodomani sera, ${dataEv({ weekday: "long", day: "numeric" })}, dalle ${oraEv()} a Campo Antico di Orte.\n\n`
      + `Ti aspetto con ${cop}. Se nel frattempo è cambiato qualcosa dimmelo pure, così passo il posto a un altro.\n\n`
      + `Dettagli e mappa: ${link}`;
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
